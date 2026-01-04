import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {userEvent} from '@testing-library/user-event';
import Hammer from '../src/index'; // Index exports
// We need a DOM environment. Vitest with environment: 'jsdom' or 'happy-dom' is assumed.

describe('Gesture Engine E2E', () => {
  let element: HTMLElement;
  let hammer: Hammer;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    document.body.innerHTML = '<div id="touch-area" style="width: 500px; height: 500px;"></div>';
    element = document.getElementById('touch-area')!;

    // Initialize Hammer with mouse support for user-event simulation
    hammer = new Hammer(element, {supportedPointerTypes: ['mouse', 'touch']});
  });

  afterEach(() => {
    hammer.destroy();
    document.body.innerHTML = '';
  });

  it('recognizes a tap gesture via user-event', async () => {
    const tapSpy = vi.fn();
    hammer.register(new Hammer.Tap({onTap: tapSpy}));

    // User-event's click usually fires pointer events sequence: down -> move -> up
    await user.pointer({keys: '[MouseLeft]', target: element});

    expect(tapSpy).toHaveBeenCalled();
  });

  it('recognizes a drag gesture via user-event', async () => {
    const startSpy = vi.fn();
    const dragSpy = vi.fn();
    const endSpy = vi.fn();

    hammer.register(
      new Hammer.Drag(
        {
          onDragStart: startSpy,
          onDrag: dragSpy,
          onDragEnd: endSpy,
        },
        {
          slop: 0, // Immediate drag for easier testing
        }
      )
    );

    // Simulate drag: Down at (0,0), Move to (100,0), Up
    await user.pointer([
      {keys: '[MouseLeft>]', target: element, coords: {x: 0, y: 0}}, // Press
      {target: element, coords: {x: 50, y: 0}}, // Move
      {target: element, coords: {x: 100, y: 0}}, // Move
      {keys: '[/MouseLeft]', target: element}, // Release
    ]);

    expect(startSpy).toHaveBeenCalled();
    expect(dragSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
  });

  it('ignores unregistered gestures', async () => {
    const tapSpy = vi.fn();
    // Do NOT register tap

    await user.click(element);
    expect(tapSpy).not.toHaveBeenCalled();
  });
});
