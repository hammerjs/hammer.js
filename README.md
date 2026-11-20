# Hammer.js v3 (Experimental)

> **Note:** This branch is an active experiment exploring what a modern Hammer.js could look like today. APIs are evolving and not yet ready for production use.
>
> **Try the live playground:** https://hammerjs.github.io/hammer.js/3.x/

Hammer.js 2.x was built for a different era of the web. This experiment rethinks it from scratch around:

- **W3C Pointer Events** instead of legacy mouse/touch juggling
- **Android-inspired gesture physics & arbitration** (`MotionEvent`, polynomial `VelocityTracker`, and an order-independent `GestureArena`)
- **One-finger Quick Scale** (`QuickScaleRecognizer` / `quickScale: true`) for double-tap-and-drag zooming alongside standard two-finger pinch
- **Web-native scrolling & coexistence** via computed CSS `touch-action` and lazy pointer capture
- **Small, tree-shakeable ESM** written in strict TypeScript
- **Framework adapters** alongside the core engine (`@hammerjs/core`, `@hammerjs/react`, `@hammerjs/angular`)

## Quick Example

```ts
import {Hammer} from '@hammerjs/core';

const hammer = new Hammer(element, {
  onTap: ev => console.log('Tap', ev.center),
  onLongPress: ev => console.log('Hold', ev.center),
  onPan: ev => console.log('Pan', ev.deltaX, ev.deltaY),
  onSwipe: ev => console.log('Swipe', ev.direction),
  onScale: ev => console.log('Scale', ev.scale),
  onRotate: ev => console.log('Rotate', ev.rotation),
  quickScale: true, // Double-tap and drag vertically to zoom with one finger
});

// Clean up listeners when done
hammer.destroy();
```

For minimal tree-shaken bundles or custom gesture graphs, compose `GestureManager` with individual recognizers directly:

```ts
import {
  GestureManager,
  TapRecognizer,
  LongPressRecognizer,
  PanRecognizer,
  ScaleRecognizer,
  QuickScaleRecognizer,
  RotateRecognizer,
} from '@hammerjs/core';

const doubleTap = new TapRecognizer({onTap: ev => console.log('Double tap', ev.center)}, {taps: 2});
const quickScale = new QuickScaleRecognizer({onScale: ev => console.log('QuickScale', ev.scale)});
const tap = new TapRecognizer({
  onTap: ev => console.log('Tap', ev.center),
}).requireFailureOf(doubleTap, quickScale);

const rotate = new RotateRecognizer({onRotate: ev => console.log('Rotate', ev.rotation)});
const scale = new ScaleRecognizer({
  onScale: ev => console.log('Scale', ev.scale),
}).simultaneousWith(rotate);

const manager = new GestureManager(element, {
  recognizers: [
    tap,
    doubleTap,
    quickScale,
    new LongPressRecognizer({onLongPress: ev => console.log('Hold', ev.center)}),
    new PanRecognizer({onPan: ev => console.log('Pan', ev.deltaX, ev.deltaY)}),
    scale,
    rotate,
  ],
});
```

## Browser Support

`@hammerjs/core` is built to match its required Web APIs ([Pointer Events](https://caniuse.com/pointer), [CSS `touch-action`](https://caniuse.com/css-touch-action), [Shadow DOM v1](https://caniuse.com/shadowdomv1), and [ES Modules](https://caniuse.com/es6-module)):

| Browser     | Minimum Version | Released | Platform Notes                                             |
| :---------- | :-------------- | :------- | :--------------------------------------------------------- |
| **Chrome**  | 61+             | Sep 2017 | Desktop & Android 4.1+ (updatable WebView on Android 5.0+) |
| **Edge**    | 79+             | Jan 2020 | First Chromium-based Edge                                  |
| **Firefox** | 63+             | Oct 2018 | Desktop & Android                                          |
| **Safari**  | 13+             | Sep 2019 | macOS & iOS / iPadOS 13+ (iPhone 6s and newer)             |

Optional APIs such as [`PointerEvent.getCoalescedEvents()`](https://caniuse.com/mdn-api_pointerevent_getcoalescedevents), [`Event.composedPath()`](https://caniuse.com/mdn-api_event_composedpath), and compound `touch-action` tokens (`pan-x pinch-zoom`) are feature-detected and used progressively.

## Packages

- [`@hammerjs/core`](packages/core) — Core pointer/gesture recognition engine and built-in recognizers
- [`@hammerjs/react`](packages/react) — React adapter
- [`@hammerjs/angular`](packages/angular) — Angular adapter

## Development

```bash
npm install
npm run dev        # Open the interactive gesture playground
npm run test:unit  # Run unit tests across all packages
npm test           # Full suite (including Playwright browser tests and lint)
```
