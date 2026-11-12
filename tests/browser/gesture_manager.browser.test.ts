import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cdp} from 'vitest/browser';
import {
  GestureManager,
  PanRecognizer,
  ScaleRecognizer,
  TapRecognizer,
  type ScaleEventData,
} from '../../src/index';

interface TouchPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

/** Maps tester-iframe CSS coordinates to top-level page coordinates expected by CDP `Input.*`. */
function toPage(x: number, y: number): {x: number; y: number} {
  const frame = window.frameElement as HTMLElement | null;
  if (!frame) {
    return {x, y};
  }
  const rect = frame.getBoundingClientRect();
  const scaleX = rect.width / frame.clientWidth;
  const scaleY = rect.height / frame.clientHeight;
  return {x: rect.left + x * scaleX, y: rect.top + y * scaleY};
}

function nextFrames(): Promise<void> {
  return new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

/**
 * Sends a real multi-touch frame through Chromium's input pipeline (hit-testing, implicit
 * touch capture, `touch-action`, and PointerEvent generation all run natively).
 */
async function touch(
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  points: readonly TouchPoint[]
): Promise<void> {
  await cdp().send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map(p => ({
      id: p.id,
      radiusX: 1,
      radiusY: 1,
      force: 1,
      ...toPage(p.x, p.y),
    })),
  });
  await nextFrames();
}

async function mouse(type: 'mousePressed' | 'mouseMoved' | 'mouseReleased', x: number, y: number) {
  await cdp().send('Input.dispatchMouseEvent', {
    type,
    button: 'left',
    buttons: type === 'mouseReleased' ? 0 : 1,
    clickCount: 1,
    ...toPage(x, y),
  });
  await nextFrames();
}

/** Moves two fingers apart horizontally in small steps, as a real pinch-out would. */
async function pinchOut(a: TouchPoint, b: TouchPoint, distance: number): Promise<void> {
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const offset = (distance / 2) * (i / steps);
    await touch('touchMove', [
      {...a, x: a.x - offset},
      {...b, x: b.x + offset},
    ]);
  }
  await touch('touchEnd', []);
}

describe('GestureManager in a real browser (Chromium)', () => {
  let surface: HTMLElement;
  let manager: GestureManager | null = null;

  beforeEach(() => {
    document.body.style.margin = '0';
    document.body.innerHTML = `
      <div id="surface" style="position: absolute; left: 0; top: 0; width: 300px; height: 300px;">
        <span id="child-a" style="position: absolute; left: 20px; top: 130px; width: 60px; height: 40px;">A</span>
        <button id="child-b" type="button" style="position: absolute; left: 200px; top: 130px; width: 80px; height: 40px;">B</button>
      </div>`;
    surface = document.getElementById('surface')!;
  });

  afterEach(() => {
    manager?.destroy();
    manager = null;
    document.body.innerHTML = '';
  });

  it('recognizes a pinch whose fingers start on two different child elements', async () => {
    const scales: ScaleEventData[] = [];
    manager = new GestureManager(surface, {
      recognizers: [new ScaleRecognizer({onScale: ev => scales.push(ev)})],
    });

    const a = {id: 1, x: 50, y: 150};
    const b = {id: 2, x: 240, y: 150};
    expect(document.elementFromPoint(a.x, a.y)?.id).toBe('child-a');
    expect(document.elementFromPoint(b.x, b.y)?.id).toBe('child-b');

    await touch('touchStart', [a]);
    await touch('touchStart', [a, b]);
    await pinchOut(a, b, 80);

    expect(scales.length).toBeGreaterThan(0);
    expect(scales.at(-1)!.scale).toBeGreaterThan(1.2);
  });

  it('includes a second finger that lands outside the element (straddling pinch)', async () => {
    const onScaleStart = vi.fn();
    manager = new GestureManager(surface, {
      recognizers: [new ScaleRecognizer({onScaleStart})],
    });

    const inside = {id: 1, x: 150, y: 150};
    const outside = {id: 2, x: 380, y: 150};
    expect(surface.contains(document.elementFromPoint(outside.x, outside.y))).toBe(false);

    await touch('touchStart', [inside]);
    await touch('touchStart', [inside, outside]);
    await pinchOut(inside, outside, 60);

    expect(onScaleStart).toHaveBeenCalledTimes(1);
  });

  it('keeps native clicks on child controls for taps', async () => {
    const onTap = vi.fn();
    const onButtonClick = vi.fn();
    document.getElementById('child-b')!.addEventListener('click', onButtonClick);
    manager = new GestureManager(surface, {recognizers: [new TapRecognizer({onTap})]});

    const finger = {id: 1, x: 240, y: 150};
    await touch('touchStart', [finger]);
    await touch('touchEnd', []);

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onButtonClick).toHaveBeenCalledTimes(1);
  });

  it('captures the pointer for a drag that leaves the element and swallows the trailing click', async () => {
    const onPanEnd = vi.fn();
    const onSurfaceClick = vi.fn();
    surface.addEventListener('click', onSurfaceClick);
    manager = new GestureManager(surface, {recognizers: [new PanRecognizer({onPanEnd})]});

    await mouse('mousePressed', 240, 150);
    for (const x of [260, 300, 360, 420]) {
      await mouse('mouseMoved', x, 150);
    }
    await mouse('mouseReleased', 420, 150);

    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(onSurfaceClick).not.toHaveBeenCalled();
  });

  it('applies the computed touch-action natively', () => {
    manager = new GestureManager(surface, {
      recognizers: [new PanRecognizer({}, {direction: 'horizontal'})],
    });
    expect(getComputedStyle(surface).touchAction).toBe('pan-y pinch-zoom');
  });
});
