# Hammer.js (Experimental v3)

Modern TypeScript gesture recognition engine built on W3C Pointer Events, combining the best parts of Android's gesture physics (`MotionEvent`, `VelocityTracker`, `ViewConfiguration`, `ScaleGestureDetector`) with clean web-native coexistence across desktop, Android, and iOS Safari.

## Architecture Highlights

- **`MotionEvent` & `MotionEventStream` (`src/motion_event.ts`)**: Adapts DOM `PointerEvent` streams (including high-frequency `getCoalescedEvents()` samples when velocity is needed) into immutable multi-pointer snapshots with Android actions (`down`, `pointer_down`, `move`, `pointer_up`, `up`, `cancel`), jump-free focal point continuity across pointer lifts, element-local coordinates (`event.relativeTo(element)`), and multi-pointer mean-deviation span metrics.
- **`VelocityTracker` (`src/velocity_tracker.ts`)**: Android AOSP's 2nd-order polynomial least-squares fit (`LSQ2`, with 2-sample linear fallback) over a single zero-allocation circular buffer per pointer (`px/s` by default). Includes dirty-flag frame caching, radial magnitude clamping (`speed <= maxVelocity`), a `100ms` horizon window, `40ms` stop/pause reset detection, multi-pointer centroid velocity, and opposing-vector pinch cancellation.
- **`GestureArena` & `GestureRecognizer` (`src/gesture_arena.ts`, `src/gesture_recognizer.ts`)**: Order-independent arena arbitration (`possible` -> `pending` -> `began` -> `changed` -> `ended` | `cancelled` | `failed`) with simultaneous cooperation (`.simultaneousWith(...)`) and causal failure dependencies (`.requireFailureOf(...)`).
- **Zero-Scroll-Lock Web `touch-action` & iOS Safari Coexistence (`src/touch_behavior.ts`, `src/gesture_manager.ts`)**: Automatically computes the least-restrictive W3C CSS `touch-action` (`touchAction: 'compute'` by default) from the registered recognizers (`Tap` / `LongPress` -> `'manipulation'`, horizontal `Pan` / `Fling` -> `'pan-y pinch-zoom'`, `Scale` / `Rotate` -> `'pan-x pan-y'`, 2D `Pan` -> `'none'`) with `CSS.supports()` fallbacks for older WebKit parsers. Paired with selective `{passive: false}` `touchmove` and WebKit `GestureEvent` guards only when non-tap gestures coexist with native scroll/zoom—keeping `Tap`-only surfaces 100% passive and preserving 120fps native page scrolling.
- **Lazy Pointer Capture & Ghost-Click Guard (`src/gesture_manager.ts`)**: Acquires `setPointerCapture()` only when a continuous gesture transitions to `began`, preserving native `click` events on child controls during taps while suppressing accidental trailing `click`s after `Pan`, `Fling`, `LongPress`, `Scale`, or `Rotate`.
- **`ViewConfiguration` (`src/view_configuration.ts`)**: Centralized spatial slops, timeouts, and velocity bounds modeled on `android.view.ViewConfiguration`.

## Usage

```ts
import Hammer from 'hammerjs';

const hammer = new Hammer(myElement, {
  touchAction: 'compute', // Automatically keeps unclaimed scroll/zoom axes native!
});

const doubleTap = new Hammer.Tap({onTap: ev => console.log('Double tap', ev.center)}, {taps: 2});
const singleTap = new Hammer.Tap({
  onTap: ev => console.log('Confirmed single tap', ev.center),
}).requireFailureOf(doubleTap);

hammer
  .register(singleTap)
  .register(doubleTap)
  .register(new Hammer.LongPress({onLongPress: ev => console.log('LongPress', ev)}))
  .register(
    new Hammer.Pan({
      onPanStart: ev => console.log('Pan start', ev),
      onPan: ev => console.log('Pan delta', ev.deltaX, ev.deltaY, 'step', ev.stepX, ev.stepY),
      onPanEnd: ev => console.log('Release velocity (px/s)', ev.velocityX, ev.velocityY),
    })
  )
  .register(
    new Hammer.Fling({
      onFling: ev => console.log('Fling', ev.direction, ev.velocityX, ev.velocityY),
    })
  )
  .register(
    new Hammer.Scale(
      {onScale: ev => console.log('Scale', ev.scale, 'factor', ev.scaleFactor)},
      {quickScale: true} // Supports Android double-tap + vertical drag zoom
    )
  )
  .register(new Hammer.Rotate({onRotate: ev => console.log('Rotate', ev.rotation)}));
```
