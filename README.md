# Hammer.js (Experimental v3)

Modern TypeScript gesture recognition engine built on W3C Pointer Events, combining the best parts of Android's gesture physics (`MotionEvent`, `VelocityTracker`, `ViewConfiguration`, `ScaleGestureDetector`) with clean web-native coexistence across desktop, Android, and iOS Safari.

## Architecture Highlights

- **`MotionEvent` & `MotionEventStream` (`src/motion_event.ts`)**: Adapts DOM `PointerEvent` streams (including high-frequency `getCoalescedEvents()` samples when velocity is needed) into immutable multi-pointer snapshots with Android actions (`down`, `pointer_down`, `move`, `pointer_up`, `up`, `cancel`), jump-free focal point continuity across pointer lifts, element-local coordinates (`event.relativeTo(element)`), and multi-pointer mean-deviation span metrics.
- **`VelocityTracker` (`src/velocity_tracker.ts`)**: Android AOSP's 2nd-order polynomial least-squares fit (`LSQ2`, with 2-sample linear fallback) over a single zero-allocation circular buffer per pointer (`px/s` by default). Includes dirty-flag frame caching, radial magnitude clamping (`speed <= maxVelocity`), a `100ms` horizon window, `40ms` stop/pause reset detection, capacitive peel-off filtering, multi-pointer centroid velocity, and opposing-vector pinch cancellation.
- **`GestureArena` & `GestureRecognizer` (`src/gesture_arena.ts`, `src/gesture_recognizer.ts`)**: Order-independent arena arbitration (`possible` -> `pending` -> `began` -> `changed` -> `ended` | `cancelled` | `failed`) with simultaneous cooperation (`.simultaneousWith(...)`) and causal failure dependencies (`.requireFailureOf(...)`).
- **Zero-Scroll-Lock Web `touch-action` & iOS Safari Coexistence (`src/touch_behavior.ts`, `src/gesture_manager.ts`)**: Automatically computes the least-restrictive W3C CSS `touch-action` (`touchAction: 'compute'` by default) from the registered recognizers (`Tap` / `LongPress` / `QuickScale` -> `'manipulation'`, horizontal `Pan` -> `'pan-y pinch-zoom'`, `Scale` / `Rotate` -> `'pan-x pan-y'`, 2D `Pan` -> `'none'`) with `CSS.supports()` fallbacks for older WebKit parsers. Paired with selective `{passive: false}` `touchmove` and WebKit `GestureEvent` guards only when non-tap gestures coexist with native scroll/zoom—keeping `Tap`-only surfaces 100% passive and preserving 120fps native page scrolling.
- **Lazy Pointer Capture & Scoped Ghost-Click Guard (`src/gesture_manager.ts`)**: Attaches only `pointerdown` and `lostpointercapture` while idle, acquires `setPointerCapture()` lazily when a continuous gesture enters `began` (ignoring bubbling descendant implicit-capture transfers, and tracking straddling multi-touch pointers landing outside the target), preserves native `click` events on child controls during taps, and suppresses accidental trailing `click`s (within `ViewConfiguration.ghostClickTimeout`) after continuous gestures.
- **Tree-Shakeable Recognizers (`src/recognizers/*`)**: Focused, decoupled recognizers (`TapRecognizer`, `LongPressRecognizer`, `PanRecognizer` with integrated `onSwipe`, `ScaleRecognizer`, `QuickScaleRecognizer`, `RotateRecognizer`) with `"sideEffects": false` for dead-code elimination when using named imports—bundles omitting `PanRecognizer` automatically tree-shake `VelocityTracker` as well.
- **ESM-only package**: a single `dist/hammer.es.js` build. CommonJS consumers on Node >= 20.19 load it through native `require(esm)`.

## Usage

### Quick Start (`Hammer`)

`Hammer` sets up only the recognizers needed for the callbacks you pass, pairs simultaneous gestures (`Scale` + `Rotate`), coordinates `onTap` with `onDoubleTap` / `QuickScale`, and computes the least-restrictive CSS `touch-action`:

```ts
import {Hammer} from 'hammerjs';

const hammer = new Hammer(myElement, {
  onTap: ev => console.log('Confirmed single tap', ev.center),
  onDoubleTap: ev => console.log('Double tap', ev.center),
  onLongPress: ev => console.log('LongPress', ev),
  onPan: ev => console.log('Pan', ev.deltaX, ev.deltaY),
  onSwipe: ev => console.log('Swipe', ev.direction, ev.speed),
  pan: {direction: 'horizontal'},
  onScale: ev => console.log('Scale', ev.scale),
  onRotate: ev => console.log('Rotate', ev.rotation),
  quickScale: true,
});
```

### Custom Arena Composition (`GestureManager`)

For custom recognizer graphs or minimal tree-shaken bundles, wire `GestureManager` and individual recognizers directly:

```ts
import {
  GestureManager,
  TapRecognizer,
  LongPressRecognizer,
  PanRecognizer,
  ScaleRecognizer,
  QuickScaleRecognizer,
  RotateRecognizer,
} from 'hammerjs';

const doubleTap = new TapRecognizer({onTap: ev => console.log('Double tap', ev.center)}, {taps: 2});
const quickScale = new QuickScaleRecognizer({onScale: ev => console.log('QuickScale', ev.scale)});
const singleTap = new TapRecognizer({
  onTap: ev => console.log('Confirmed single tap', ev.center),
}).requireFailureOf(doubleTap, quickScale);

// Recognizers are mutually exclusive unless paired; pairing is symmetric, so one call is enough.
const rotate = new RotateRecognizer({onRotate: ev => console.log('Rotate', ev.rotation)});
const scale = new ScaleRecognizer({
  onScale: ev => console.log('Scale', ev.scale, 'factor', ev.scaleFactor),
}).simultaneousWith(rotate);

const manager = new GestureManager(myElement, {
  touchAction: 'compute', // Keeps unclaimed scroll and zoom axes native
  recognizers: [
    singleTap,
    doubleTap,
    quickScale,
    new LongPressRecognizer({onLongPress: ev => console.log('LongPress', ev)}),
    new PanRecognizer({
      onPanStart: ev => console.log('Pan start', ev),
      onPan: ev => console.log('Pan delta', ev.deltaX, ev.deltaY, 'step', ev.stepX, ev.stepY),
      onPanEnd: ev => console.log('Release velocity (px/s)', ev.velocityX, ev.velocityY),
      onSwipe: ev => console.log('Swipe', ev.direction, ev.velocityX, ev.velocityY),
    }),
    scale,
    rotate,
  ],
});
```

## Development

- `npm test`: builds, then runs unit tests (jsdom), package checks, and real-browser multi-touch tests
  (Chromium via Playwright; run `npx playwright install chromium` once), followed by lint.
- `npm run test:unit` / `npm run test:browser`: run either half on its own.
