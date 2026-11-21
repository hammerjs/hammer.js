import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cdp} from 'vitest/browser';
import {
  GestureBinding,
  GestureManager,
  Hammer,
  pan,
  PanRecognizer,
  ScaleRecognizer,
  swipe,
  tap,
  TapRecognizer,
  type RotateEventData,
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

function waitMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendTouch(
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  points: readonly TouchPoint[],
  timestampSec?: number
): Promise<void> {
  await cdp().send('Input.dispatchTouchEvent', {
    type,
    ...(timestampSec !== undefined ? {timestamp: timestampSec} : {}),
    touchPoints: points.map(p => ({
      id: p.id,
      radiusX: 1,
      radiusY: 1,
      force: 1,
      ...toPage(p.x, p.y),
    })),
  });
}

/**
 * Sends a real multi-touch frame through Chromium's input pipeline (hit-testing, implicit
 * touch capture, `touch-action`, and PointerEvent generation all run natively).
 */
async function touch(
  type: 'touchStart' | 'touchMove' | 'touchEnd',
  points: readonly TouchPoint[]
): Promise<void> {
  await sendTouch(type, points);
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

/** Moves a single finger smoothly from `from` to `to` and lifts it. */
async function touchDrag(
  id: number,
  from: {x: number; y: number},
  to: {x: number; y: number},
  steps = 8
): Promise<void> {
  await touch('touchStart', [{id, ...from}]);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await touch('touchMove', [
      {id, x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t},
    ]);
  }
  await touch('touchEnd', []);
}

/**
 * Performs a fast single-finger flick with deterministic 10ms CDP timestamps and no
 * multi-frame pause before liftoff so velocity stays reliable even on slow CI runners.
 */
async function touchFlick(
  id: number,
  from: {x: number; y: number},
  to: {x: number; y: number},
  steps = 4
): Promise<void> {
  const baseSec = Date.now() / 1000;
  await sendTouch('touchStart', [{id, ...from}], baseSec);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await sendTouch(
      'touchMove',
      [{id, x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t}],
      baseSec + i * 0.01
    );
  }
  await sendTouch('touchEnd', [], baseSec + steps * 0.01 + 0.005);
  await nextFrames();
}

describe('GestureManager in a real browser (Chromium)', () => {
  let surface: HTMLElement;
  let manager: GestureManager | null = null;
  let hammer: Hammer | null = null;

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
    hammer?.destroy();
    hammer = null;
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

  it('allows native vertical scrolling while recognizing horizontal pans on a carousel', async () => {
    document.body.innerHTML = `
      <div id="scroller" style="position: absolute; left: 0; top: 0; width: 300px; height: 200px; overflow-y: auto;">
        <div id="carousel" style="width: 300px; height: 800px;"></div>
      </div>`;
    const scroller = document.getElementById('scroller')!;
    const carousel = document.getElementById('carousel')!;
    const onPan = vi.fn();

    manager = new GestureManager(carousel, {
      recognizers: [new PanRecognizer({onPan}, {direction: 'horizontal'})],
    });
    expect(getComputedStyle(carousel).touchAction).toBe('pan-y pinch-zoom');

    // Vertical touch drag should scroll the container natively without triggering horizontal pan:
    await touchDrag(1, {x: 150, y: 160}, {x: 150, y: 40});
    expect(scroller.scrollTop).toBeGreaterThan(0);
    expect(onPan).not.toHaveBeenCalled();

    // Horizontal touch drag should trigger onPan without changing scrollTop:
    const scrollAfterVert = scroller.scrollTop;
    await touchDrag(2, {x: 60, y: 100}, {x: 220, y: 100});
    expect(onPan).toHaveBeenCalled();
    expect(scroller.scrollTop).toBe(scrollAfterVert);
  });

  it('suppresses ghost clicks on child buttons after a touch pan', async () => {
    const onPanEnd = vi.fn();
    const onButtonClick = vi.fn();
    document.getElementById('child-b')!.addEventListener('click', onButtonClick);
    manager = new GestureManager(surface, {
      recognizers: [new PanRecognizer({onPanEnd})],
    });

    await touchDrag(1, {x: 240, y: 150}, {x: 120, y: 150});

    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(onButtonClick).not.toHaveBeenCalled();
  });

  it('preserves clicks on shadow-DOM taps and suppresses ancestor clicks after shadow-DOM pans', async () => {
    document.body.innerHTML = `
      <div id="outer" style="position: absolute; left: 0; top: 0; width: 300px; height: 300px;">
        <div id="host" style="width: 300px; height: 300px;"></div>
      </div>`;
    const outer = document.getElementById('outer')!;
    const host = document.getElementById('host')!;
    const shadow = host.attachShadow({mode: 'open'});
    const inner = document.createElement('div');
    inner.style.cssText = 'width: 300px; height: 300px;';
    shadow.appendChild(inner);

    const onOuterClick = vi.fn();
    const onTap = vi.fn();
    const onPanEnd = vi.fn();
    outer.addEventListener('click', onOuterClick);

    manager = new GestureManager(inner, {
      recognizers: [new TapRecognizer({onTap}), new PanRecognizer({onPanEnd})],
    });

    await touch('touchStart', [{id: 1, x: 150, y: 150}]);
    await touch('touchEnd', []);
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onOuterClick).toHaveBeenCalledTimes(1);

    onOuterClick.mockClear();
    await touchDrag(2, {x: 100, y: 150}, {x: 220, y: 150});
    expect(onPanEnd).toHaveBeenCalledTimes(1);
    expect(onOuterClick).not.toHaveBeenCalled();
  });

  it('recognizes simultaneous 2-finger Scale, Rotate, and Pan via Hammer', async () => {
    const scales: ScaleEventData[] = [];
    const rotations: RotateEventData[] = [];
    const onPan = vi.fn();

    hammer = new Hammer(surface, {
      onScale: ev => scales.push(ev),
      onRotate: ev => rotations.push(ev),
      onPan,
      pan: {numPointers: 0},
    });

    const steps = 8;
    const cx = 150;
    const cy = 150;
    const startRadius = 50;
    const endRadius = 100;
    const endAngle = Math.PI / 3; // 60 degrees

    const pairAt = (t: number): [TouchPoint, TouchPoint] => {
      const r = startRadius + (endRadius - startRadius) * t;
      const a = endAngle * t;
      const shiftX = 40 * t;
      return [
        {id: 1, x: cx + shiftX - Math.cos(a) * r, y: cy - Math.sin(a) * r},
        {id: 2, x: cx + shiftX + Math.cos(a) * r, y: cy + Math.sin(a) * r},
      ];
    };

    const [p1, p2] = pairAt(0);
    await touch('touchStart', [p1]);
    await touch('touchStart', [p1, p2]);
    for (let i = 1; i <= steps; i++) {
      await touch('touchMove', pairAt(i / steps));
    }
    await touch('touchEnd', []);

    expect(scales.length).toBeGreaterThan(0);
    expect(scales.at(-1)!.scale).toBeGreaterThan(1.4);
    expect(rotations.length).toBeGreaterThan(0);
    expect(rotations.at(-1)!.rotation).toBeGreaterThan(30);
    expect(onPan).toHaveBeenCalled();
  });

  it('recognizes one-finger QuickScale (double-tap and drag) while suppressing tap', async () => {
    const scales: ScaleEventData[] = [];
    const onTap = vi.fn();

    hammer = new Hammer(surface, {
      onTap,
      onScale: ev => scales.push(ev),
      quickScale: {sensitivity: 100},
    });

    // Tap #1:
    await touch('touchStart', [{id: 1, x: 150, y: 80}]);
    await touch('touchEnd', []);
    await waitMs(60);

    // Tap #2 + drag down:
    await touchDrag(2, {x: 150, y: 80}, {x: 150, y: 200});

    expect(scales.length).toBeGreaterThan(0);
    expect(scales.every(ev => ev.isQuickScale)).toBe(true);
    expect(scales.at(-1)!.scale).toBeGreaterThan(1.5);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('coordinates nested gesture surfaces and reports pointerType/target in a real browser', async () => {
    const outer = document.getElementById('surface')!;
    const inner = document.getElementById('child-b')!;

    const onOuterPan = vi.fn();
    const onInnerPan = vi.fn();
    const onOuterTap = vi.fn();
    const onInnerTap = vi.fn();

    const outerGm = new GestureManager(outer, {
      gestures: [pan({direction: 'horizontal', onPan: onOuterPan}), tap({onTap: onOuterTap})],
    });
    const innerGm = new GestureManager(inner, {
      gestures: [pan({direction: 'horizontal', onPan: onInnerPan}), tap({onTap: onInnerTap})],
    });

    try {
      // Tap on inner button fires only inner tap with real pointerType & target:
      await touch('touchStart', [{id: 1, x: 240, y: 150}]);
      await touch('touchEnd', []);
      expect(onInnerTap).toHaveBeenCalledTimes(1);
      expect(onInnerTap).toHaveBeenLastCalledWith(
        expect.objectContaining({pointerType: 'touch', target: inner})
      );
      expect(onOuterTap).not.toHaveBeenCalled();

      // Drag starting on inner button pans only inner, automatically cancelling outer:
      await touchDrag(2, {x: 240, y: 150}, {x: 160, y: 150});
      expect(onInnerPan).toHaveBeenCalled();
      expect(onOuterPan).not.toHaveBeenCalled();
    } finally {
      innerGm.destroy();
      outerGm.destroy();
    }
  });

  it('supports swipe() descriptor and enabled toggling via GestureBinding in a real browser', async () => {
    const onSwipe = vi.fn();
    const binding = new GestureBinding(
      surface,
      [swipe({direction: 'horizontal', minSwipeVelocity: 100, minSwipeDistance: 40, onSwipe})],
      {enabled: false}
    );

    try {
      expect(getComputedStyle(surface).touchAction).toBe('auto');
      await touchFlick(1, {x: 40, y: 150}, {x: 240, y: 150});
      expect(onSwipe).not.toHaveBeenCalled();

      binding.update(
        [swipe({direction: 'horizontal', minSwipeVelocity: 100, minSwipeDistance: 40, onSwipe})],
        {enabled: true}
      );
      expect(getComputedStyle(surface).touchAction).toBe('pan-y pinch-zoom');

      await touchFlick(2, {x: 40, y: 150}, {x: 240, y: 150});
      expect(onSwipe).toHaveBeenCalledWith(
        expect.objectContaining({direction: 'right', pointerType: 'touch'})
      );
    } finally {
      binding.destroy();
    }
  });
});
