import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {GestureManager} from '../src/gesture_manager';
import {GestureRecognizer} from '../src/gesture_recognizer';
import {MotionAction, type MotionEvent, MotionEventStream} from '../src/motion_event';
import {FlingRecognizer} from '../src/recognizers/fling_recognizer';
import {LongPressRecognizer} from '../src/recognizers/long_press_recognizer';
import {PanRecognizer} from '../src/recognizers/pan_recognizer';
import {RotateRecognizer} from '../src/recognizers/rotate_recognizer';
import {ScaleRecognizer} from '../src/recognizers/scale_recognizer';
import {TapRecognizer} from '../src/recognizers/tap_recognizer';
import {pointerEvent} from './test_helpers';

class SpyRecognizer extends GestureRecognizer {
  readonly type = 'spy';
  readonly events: MotionEvent[] = [];
  cancelled = false;

  onMotionEvent(event: MotionEvent): void {
    this.events.push(event);
    if (event.action === MotionAction.DOWN) {
      this.tryBegin(() => {});
    }
  }

  protected override onCancel(): void {
    this.cancelled = true;
  }
}

describe('GestureManager', () => {
  let element: HTMLElement;
  let manager: GestureManager;
  let recognizer: SpyRecognizer;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
    manager = new GestureManager(element, {supportedPointerTypes: ['touch', 'mouse']});
    recognizer = new SpyRecognizer();
    manager.register(recognizer);
  });

  afterEach(() => {
    manager.destroy();
    element.remove();
  });

  it('dispatches normalized MotionEvents for supported pointer types', () => {
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.events).toHaveLength(1);
    expect(recognizer.events[0].action).toBe(MotionAction.DOWN);
  });

  it('ignores unsupported pointer types', () => {
    const touchOnly = new GestureManager(element, {supportedPointerTypes: ['touch']});
    const spy = new SpyRecognizer();
    touchOnly.register(spy);

    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'mouse', pointerId: 1}));
    element.dispatchEvent(pointerEvent('pointerup', {pointerType: 'mouse', pointerId: 1}));
    element.dispatchEvent(pointerEvent('pointercancel', {pointerType: 'mouse', pointerId: 1}));
    expect(spy.events).toHaveLength(0);
    touchOnly.destroy();
  });

  it('acquires setPointerCapture lazily ONLY once a continuous gesture begins, preserving child clicks on taps', () => {
    const container = document.createElement('div');
    const childButton = document.createElement('button');
    container.appendChild(childButton);
    document.body.appendChild(container);

    const captureSpy = vi.fn();
    container.setPointerCapture = captureSpy;
    container.hasPointerCapture = () => true;
    container.releasePointerCapture = vi.fn();

    const onTap = vi.fn();
    const onPanStart = vi.fn();
    const gm = new GestureManager(container, {supportedPointerTypes: ['touch', 'mouse']});
    gm.register(new TapRecognizer({onTap})).register(new PanRecognizer({onPanStart}, {slop: 8}));

    // 1. Simple tap on `<button>`: MUST NOT call `setPointerCapture`!
    childButton.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 20, clientY: 20, timeStamp: 0})
    );
    expect(captureSpy).not.toHaveBeenCalled();

    childButton.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 20, clientY: 20, timeStamp: 40})
    );
    expect(captureSpy).not.toHaveBeenCalled();
    expect(onTap).toHaveBeenCalledTimes(1);

    // 2. Drag starting on `<button>`: lazily calls `setPointerCapture` right as `Pan` enters `BEGAN`!
    childButton.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 20, clientY: 20, timeStamp: 100})
    );
    expect(captureSpy).not.toHaveBeenCalled();

    childButton.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 24, clientY: 20, timeStamp: 110})
    );
    expect(captureSpy).not.toHaveBeenCalled();

    childButton.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 40, clientY: 20, timeStamp: 120})
    );
    expect(onPanStart).toHaveBeenCalledTimes(1);
    expect(captureSpy).toHaveBeenCalledWith(2);

    gm.destroy();
    container.remove();
  });

  it('cancels active gestures cleanly on lostpointercapture mid-gesture', () => {
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.active).toBe(true);

    element.dispatchEvent(pointerEvent('lostpointercapture', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.cancelled).toBe(true);
    expect(recognizer.active).toBe(false);
  });

  it('cleans up listeners on destroy', () => {
    manager.destroy();
    manager.destroy(); // idempotent second call
    manager.register(new SpyRecognizer()); // ignored after destroy
    manager.unregister(recognizer); // ignored after destroy
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(recognizer.events).toHaveLength(0);
  });

  it('covers config, unregister, onTouchEvent, reset, document pointerup/cancel, and touchAction: false', () => {
    const unstyledEl = document.createElement('div');
    const customManager = new GestureManager(unstyledEl, {
      supportedPointerTypes: ['touch', 'mouse'],
      touchAction: false,
      viewConfiguration: {touchSlop: 12},
    });
    expect(customManager.config.touchSlop).toBe(12);
    expect(unstyledEl.style.touchAction || '').toBe('');

    const spy = new SpyRecognizer();
    customManager.register(spy);
    expect(unstyledEl.style.touchAction || '').toBe('');

    // Disconnected element still dispatches element-bound events cleanly:
    unstyledEl.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 1}));
    expect(spy.events).toHaveLength(1);
    customManager.reset();

    // Direct `onTouchEvent` dispatch & `unregister`:
    const localStream = new MotionEventStream();
    const directDown = localStream.onPointerDown(
      pointerEvent('pointerdown', {pointerId: 5, clientX: 10, clientY: 10, timeStamp: 0})
    )!;
    customManager.onTouchEvent(directDown);
    expect(spy.events).toHaveLength(2);

    customManager.unregister(spy);
    customManager.onTouchEvent(directDown);
    expect(spy.events).toHaveLength(2);
    customManager.destroy();
    customManager.onTouchEvent(directDown); // ignored after destroy

    // Document-level pointerup & pointercancel outside `element`, plus harmless post-up lostpointercapture:
    const captureSetSpy = vi.fn();
    const captureReleaseSpy = vi.fn();
    element.setPointerCapture = captureSetSpy;
    element.hasPointerCapture = () => true;
    element.releasePointerCapture = captureReleaseSpy;

    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 10}));
    // Second finger joining an already-active gesture captures immediately on pointerdown:
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 11}));
    expect(captureSetSpy).toHaveBeenCalledWith(10);
    expect(captureSetSpy).toHaveBeenCalledWith(11);

    // Non-primary mouse button on pointerdown is ignored by stream:
    element.dispatchEvent(
      pointerEvent('pointerdown', {pointerType: 'mouse', pointerId: 12, button: 2})
    );

    // Release pointer 10 & 11 via `document` (outside element):
    document.dispatchEvent(pointerEvent('pointerup', {pointerType: 'touch', pointerId: 10}));
    document.dispatchEvent(pointerEvent('pointerup', {pointerType: 'touch', pointerId: 11}));
    expect(captureReleaseSpy).toHaveBeenCalledWith(10);
    expect(captureReleaseSpy).toHaveBeenCalledWith(11);

    // Normal post-pointerup `lostpointercapture` is a harmless no-op:
    element.dispatchEvent(
      pointerEvent('lostpointercapture', {pointerType: 'touch', pointerId: 10})
    );

    // Start another gesture and cancel via `element` & `document`:
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 20}));
    document.dispatchEvent(pointerEvent('pointercancel', {pointerType: 'touch', pointerId: 20}));
    expect(recognizer.cancelled).toBe(true);

    recognizer.cancelled = false;
    element.dispatchEvent(pointerEvent('pointerdown', {pointerType: 'touch', pointerId: 21}));
    element.dispatchEvent(pointerEvent('pointercancel', {pointerType: 'touch', pointerId: 21}));
    expect(recognizer.cancelled).toBe(true);
  });

  it('dynamically computes least-restrictive CSS touch-action without scroll-locking mobile pages', () => {
    const card = document.createElement('div');
    document.body.appendChild(card);

    const addListenerSpy = vi.spyOn(card, 'addEventListener');
    // Default options support touch, pen, AND desktop mouse out of the box, with touchAction: 'compute':
    const gm = new GestureManager(card);
    expect(card.style.touchAction || '').toBe('');

    // 1. Tap-only surface: `manipulation`, NO `user-select: none`, NO `{passive: false}` `touchmove`!
    const mouseTapSpy = vi.fn();
    const tap = new TapRecognizer({onTap: mouseTapSpy});
    gm.register(tap);
    expect(gm.computeTouchAction()).toBe('manipulation');
    expect(card.style.touchAction).toBe('manipulation');
    expect(card.style.userSelect || '').toBe('');
    expect(addListenerSpy.mock.calls.some(([type]) => type === 'touchmove')).toBe(false);

    // Desktop mouse tap works out of the box without custom `supportedPointerTypes`:
    card.dispatchEvent(
      pointerEvent('pointerdown', {
        pointerType: 'mouse',
        pointerId: 1,
        clientX: 5,
        clientY: 5,
        timeStamp: 0,
      })
    );
    card.dispatchEvent(
      pointerEvent('pointerup', {
        pointerType: 'mouse',
        pointerId: 1,
        clientX: 5,
        clientY: 5,
        timeStamp: 20,
      })
    );
    expect(mouseTapSpy).toHaveBeenCalledTimes(1);

    // 2. Horizontal Pan carousel: `pan-y pinch-zoom` (vertical page scroll + pinch-zoom preserved!)
    const horizPan = new PanRecognizer({}, {direction: 'horizontal'});
    gm.register(horizPan);
    expect(card.style.touchAction).toBe('pan-y pinch-zoom');
    expect(card.style.userSelect).toBe('none');
    expect((card.style as unknown as Record<string, string>).webkitTouchCallout).toBe('none');

    // 3. Adding Scale intersects `pan-y pinch-zoom` & `pan-x pan-y` -> `pan-y`:
    const scale = new ScaleRecognizer({});
    gm.register(scale);
    expect(card.style.touchAction).toBe('pan-y');

    // 4. Unregistering horizontal Pan leaves Tap + Scale -> `pan-x pan-y` (1-finger X/Y scroll preserved!):
    gm.unregister(horizPan);
    expect(card.style.touchAction).toBe('pan-x pan-y');

    // 5. Check vertical Pan, Rotate, LongPress, and directional Fling touch-action mappings:
    expect(new PanRecognizer({}, {direction: 'vertical'}).getTouchAction()).toBe(
      'pan-x pinch-zoom'
    );
    expect(new FlingRecognizer({}, {direction: 'left'}).getTouchAction()).toBe('pan-y pinch-zoom');
    expect(new FlingRecognizer({}, {direction: 'up'}).getTouchAction()).toBe('pan-x pinch-zoom');
    expect(new FlingRecognizer({}, {direction: 'all'}).getTouchAction()).toBe('none');
    expect(new LongPressRecognizer({onLongPress: () => {}}).getTouchAction()).toBe('manipulation');
    expect(new RotateRecognizer({}).getTouchAction()).toBe('pan-x pan-y');

    // 6. Unregistering all recognizers restores inline styles cleanly to empty:
    gm.unregister(scale);
    expect(card.style.touchAction).toBe('manipulation');
    expect(card.style.userSelect || '').toBe('');
    gm.unregister(tap);
    expect(card.style.touchAction).toBe('');

    // 7. Explicit `touchAction` string override:
    const explicitActionEl = document.createElement('div');
    const gmExplicitAction = new GestureManager(explicitActionEl, {touchAction: 'pan-x'});
    expect(explicitActionEl.style.touchAction).toBe('pan-x');
    gmExplicitAction.destroy();

    gm.destroy();
    card.remove();
  });

  it('coexists cleanly with iOS Safari scrolling, 2-finger GestureEvent zoom, Quick-Scale, and directional Fling', () => {
    const dispatchTouchMove = (
      target: HTMLElement,
      touchCount: number,
      cancelable = true
    ): {event: Event; prevented: boolean} => {
      const ev = new Event('touchmove', {bubbles: true, cancelable});
      Object.defineProperty(ev, 'touches', {
        value: Array.from({length: touchCount}, (_, i) => ({identifier: i + 1})),
      });
      target.dispatchEvent(ev);
      return {event: ev, prevented: ev.defaultPrevented};
    };

    // --- Part A: Horizontal Carousel (`Pan` horizontal -> `pan-y pinch-zoom`) ---
    const carousel = document.createElement('div');
    document.body.appendChild(carousel);
    const onPan = vi.fn();
    const gmCarousel = new GestureManager(carousel);
    gmCarousel.register(new PanRecognizer({onPan}, {direction: 'horizontal', slop: 8}));

    // A1. User scrolls page vertically (`dy = 25, dx = 2`): Pan fails, `touchmove` is NOT prevented!
    carousel.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
    );
    carousel.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 52, clientY: 75, timeStamp: 16})
    );
    expect(dispatchTouchMove(carousel, 1).prevented).toBe(false);
    // 2-finger pinch-zoom on horizontal carousel is ALSO preserved for accessibility:
    expect(dispatchTouchMove(carousel, 2).prevented).toBe(false);
    carousel.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 52, clientY: 75, timeStamp: 32})
    );

    // A2. User drags carousel horizontally (`dx = 20, dy = 2`): `touchmove` IS prevented on that exact frame!
    carousel.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 50, clientY: 50, timeStamp: 100})
    );
    carousel.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 70, clientY: 52, timeStamp: 116})
    );
    expect(onPan).toHaveBeenCalled();
    expect(dispatchTouchMove(carousel, 1, true).prevented).toBe(true);
    // Non-cancelable `touchmove` (`cancelable: false`) is safely ignored without errors:
    expect(dispatchTouchMove(carousel, 1, false).prevented).toBe(false);
    carousel.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 70, clientY: 52, timeStamp: 132})
    );
    gmCarousel.destroy();
    carousel.remove();

    // --- Part B: Standalone Directional Fling (`direction: 'left'` & `'up'`) ---
    const swipeCard = document.createElement('div');
    document.body.appendChild(swipeCard);
    const onFling = vi.fn();
    const gmSwipe = new GestureManager(swipeCard);
    gmSwipe.register(new FlingRecognizer({onFling}, {direction: 'left'}));

    // Vertical scroll does NOT lock `touchmove`:
    swipeCard.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 1, clientX: 100, clientY: 100, timeStamp: 0})
    );
    swipeCard.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 1, clientX: 101, clientY: 120, timeStamp: 16})
    );
    expect(dispatchTouchMove(swipeCard, 1).prevented).toBe(false);
    swipeCard.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 1, clientX: 101, clientY: 120, timeStamp: 32})
    );

    // Horizontal flick locks `touchmove` once past `touchSlop` so iOS diagonal drift cannot cancel it:
    swipeCard.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 2, clientX: 100, clientY: 100, timeStamp: 50})
    );
    swipeCard.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 2, clientX: 70, clientY: 102, timeStamp: 65})
    );
    expect(dispatchTouchMove(swipeCard, 1).prevented).toBe(true);
    swipeCard.dispatchEvent(
      pointerEvent('pointerup', {pointerId: 2, clientX: 20, clientY: 105, timeStamp: 80})
    );
    expect(onFling).toHaveBeenCalledTimes(1);

    // Also verify vertical Fling axis lock (`direction: 'up'`):
    gmSwipe.destroy();
    const gmVertSwipe = new GestureManager(swipeCard);
    gmVertSwipe.register(new FlingRecognizer({}, {direction: 'up'}));
    swipeCard.dispatchEvent(
      pointerEvent('pointerdown', {pointerId: 3, clientX: 100, clientY: 100, timeStamp: 100})
    );
    swipeCard.dispatchEvent(
      pointerEvent('pointermove', {pointerId: 3, clientX: 102, clientY: 75, timeStamp: 115})
    );
    expect(dispatchTouchMove(swipeCard, 1).prevented).toBe(true);
    swipeCard.dispatchEvent(
      pointerEvent('pointercancel', {pointerId: 3, clientX: 102, clientY: 75, timeStamp: 120})
    );
    gmVertSwipe.destroy();
    swipeCard.remove();

    // --- Part C: iOS Safari WebKit `GestureEvent` + `Scale({quickScale: true})` ---
    (window as unknown as Record<string, unknown>).GestureEvent = class MockGestureEvent extends (
      Event
    ) {};
    try {
      const photo = document.createElement('div');
      document.body.appendChild(photo);
      const gmPhoto = new GestureManager(photo);
      gmPhoto.register(new ScaleRecognizer({}, {quickScale: true}));
      expect(photo.style.touchAction).toBe('pan-x pan-y');

      // 1-finger page scroll over zoomable photo is NOT prevented:
      photo.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 50, clientY: 50, timeStamp: 0})
      );
      photo.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 1, clientX: 50, clientY: 80, timeStamp: 16})
      );
      expect(dispatchTouchMove(photo, 1).prevented).toBe(false);
      photo.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 1, clientX: 50, clientY: 80, timeStamp: 32})
      );

      // 2-finger pinch immediately prevents `touchmove` AND Safari `gesturestart`/`gesturechange`:
      expect(dispatchTouchMove(photo, 2).prevented).toBe(true);

      const gsCancelable = new Event('gesturestart', {cancelable: true});
      photo.dispatchEvent(gsCancelable);
      expect(gsCancelable.defaultPrevented).toBe(true);

      const gcNonCancelable = new Event('gesturechange', {cancelable: false});
      photo.dispatchEvent(gcNonCancelable);
      expect(gcNonCancelable.defaultPrevented).toBe(false);

      // Armed Quick-Scale stroke (tap then second press within 300ms) locks `touchmove` immediately:
      photo.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 60, clientY: 60, timeStamp: 500})
      );
      photo.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 2, clientX: 60, clientY: 60, timeStamp: 530})
      );
      photo.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 62, clientY: 62, timeStamp: 620})
      );
      expect(dispatchTouchMove(photo, 1).prevented).toBe(true);
      photo.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 3, clientX: 62, clientY: 62, timeStamp: 650})
      );

      // Auto `contextmenu`: desktop mouse right-click is allowed, touch/pen long-press is prevented!
      const desktopRightClick = pointerEvent('contextmenu', {pointerType: 'mouse', button: 2});
      photo.dispatchEvent(desktopRightClick);
      expect(desktopRightClick.defaultPrevented).toBe(false);

      const touchContextMenu = pointerEvent('contextmenu', {pointerType: 'touch'});
      photo.dispatchEvent(touchContextMenu);
      expect(touchContextMenu.defaultPrevented).toBe(true);

      const penContextMenu = pointerEvent('contextmenu', {pointerType: 'pen'});
      photo.dispatchEvent(penContextMenu);
      expect(penContextMenu.defaultPrevented).toBe(true);

      gmPhoto.destroy();
      photo.remove();
    } finally {
      delete (window as unknown as Record<string, unknown>).GestureEvent;
    }
  });

  it('aborts stuck pointers on window blur and hidden visibilitychange, suppresses trailing ghost clicks, and short-circuits dead streams', () => {
    vi.useFakeTimers();
    try {
      const link = document.createElement('a');
      link.href = '#target';
      document.body.appendChild(link);

      const onPanCancel = vi.fn();
      const onPanEnd = vi.fn();
      const clickSpy = vi.fn((e: MouseEvent) => e.preventDefault());
      link.addEventListener('click', clickSpy);

      const gm = new GestureManager(link);
      const tap = new TapRecognizer({});
      const pan = new PanRecognizer({onPanCancel, onPanEnd}, {slop: 5});
      gm.register(tap).register(pan);

      // 1. `window` `blur` aborts active gesture stream cleanly:
      link.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 1, clientX: 10, clientY: 10, timeStamp: 10})
      );
      link.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 1, clientX: 30, clientY: 10, timeStamp: 20})
      );
      window.dispatchEvent(new Event('blur'));
      expect(onPanCancel).toHaveBeenCalledTimes(1);

      // 2. `document` `visibilitychange` cancels ONLY when `visibilityState === 'hidden'`:
      onPanCancel.mockClear();
      link.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 2, clientX: 10, clientY: 10, timeStamp: 30})
      );
      link.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 2, clientX: 30, clientY: 10, timeStamp: 40})
      );
      Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true});
      document.dispatchEvent(new Event('visibilitychange'));
      expect(onPanCancel).not.toHaveBeenCalled();

      Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true});
      document.dispatchEvent(new Event('visibilitychange'));
      expect(onPanCancel).toHaveBeenCalledTimes(1);
      Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true});

      // 3. Trailing pointer `click` (`detail: 1`) after `Pan` is suppressed, while keyboard `detail: 0` works:
      link.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 3, clientX: 10, clientY: 10, timeStamp: 100})
      );
      link.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 3, clientX: 40, clientY: 10, timeStamp: 116})
      );
      link.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 3, clientX: 40, clientY: 10, timeStamp: 132})
      );
      expect(onPanEnd).toHaveBeenCalledTimes(1);

      // Keyboard activation (`detail === 0`) is NOT suppressed:
      const kbClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 0});
      link.dispatchEvent(kbClick);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Browser's trailing pointer click (`detail === 1`) IS suppressed!
      const ghostClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
      link.dispatchEvent(ghostClick);
      expect(ghostClick.defaultPrevented).toBe(true);
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Expired suppression window (`> 400ms`) allows normal clicks again:
      link.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 4, clientX: 10, clientY: 10, timeStamp: 200})
      );
      link.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 4, clientX: 40, clientY: 10, timeStamp: 216})
      );
      link.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 4, clientX: 40, clientY: 10, timeStamp: 232})
      );
      vi.advanceTimersByTime(500);
      const laterClick = new MouseEvent('click', {bubbles: true, cancelable: true, detail: 1});
      link.dispatchEvent(laterClick);
      expect(clickSpy).toHaveBeenCalledTimes(2);

      // 4. 120Hz short-circuit on Tap-only surface: skips `getCoalescedEvents` AND dead-stream moves!
      gm.unregister(pan);
      const coalescedSpy = vi.fn(() => []);
      link.dispatchEvent(
        pointerEvent('pointerdown', {pointerId: 5, clientX: 0, clientY: 0, timeStamp: 300})
      );
      const movePastSlop = pointerEvent('pointermove', {
        pointerId: 5,
        clientX: 25,
        clientY: 0,
        timeStamp: 316,
      });
      Object.defineProperty(movePastSlop, 'getCoalescedEvents', {value: coalescedSpy});
      link.dispatchEvent(movePastSlop);
      expect(coalescedSpy).not.toHaveBeenCalled();

      // Subsequent move frame hits `!arena.hasLiveRecognizers` silent fast path:
      const moveSpy = vi.spyOn(tap, 'onMotionEvent');
      link.dispatchEvent(
        pointerEvent('pointermove', {pointerId: 5, clientX: 60, clientY: 0, timeStamp: 332})
      );
      expect(moveSpy).not.toHaveBeenCalled();
      link.dispatchEvent(
        pointerEvent('pointerup', {pointerId: 5, clientX: 60, clientY: 0, timeStamp: 348})
      );

      gm.destroy();
      link.remove();
    } finally {
      vi.useRealTimers();
    }
  });
});
