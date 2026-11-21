# Hammer.js v3 (Experimental)

> **Note:** This branch is an active experiment exploring what a modern Hammer.js could look like today. APIs are evolving and not yet ready for production use.
>
> **Try the live playground:** https://hammerjs.github.io/hammer.js/3.x/

Hammer.js 2.x was built for a different era of the web. This experiment rethinks it from scratch around:

- **W3C Pointer Events** instead of legacy mouse/touch juggling
- **Android-inspired gesture physics & arbitration** (`MotionEvent`, polynomial `VelocityTracker`, and an order-independent `GestureArena`)
- **Tree-shakable gesture descriptors** (`tap`, `doubleTap`, `longPress`, `pan`, `swipe`, `scale`, `quickScale`, `rotate`, `gesture`) so you only ship the recognizers you import
- **One-finger Quick Scale** (`quickScale`) for double-tap-and-drag zooming alongside two-finger pinch
- **Web-native scrolling & coexistence** via computed CSS `touch-action`, lazy pointer capture, ghost-click suppression, and automatic nested surface coordination
- **Tiny framework adapters** (`@hammerjs/react`, `@hammerjs/angular`) that hot-swap inline callbacks without cancelling active gestures

## Quick Start

### Tree-shakable descriptors (recommended)

Import only the gesture factories you need. Standard relationships (e.g. `tap` waiting on `doubleTap`/`quickScale`, `scale` simultaneous with `rotate`) are auto-wired by default:

```ts
import {GestureManager, doubleTap, pan, rotate, scale, tap} from '@hammerjs/core';

const manager = new GestureManager(element, {
  gestures: [
    tap({onTap: ev => console.log('Tap', ev.center, ev.pointerType)}),
    doubleTap({onTap: ev => console.log('Double tap', ev.center)}),
    pan({
      numPointers: 0,
      onPan: ev => console.log('Pan', ev.deltaX, ev.deltaY),
      onSwipe: ev => console.log('Swipe', ev.direction),
    }),
    scale({onScale: ev => console.log('Scale', ev.scale)}),
    rotate({onRotate: ev => console.log('Rotate', ev.rotation)}),
  ],
});

// Clean up listeners and restore inline styles when done
manager.destroy();
```

For swipe-only surfaces (without continuous pan tracking), use `swipe({direction: 'horizontal', onSwipe})`.

### Explicit relationships, `enabled`, and nested surfaces

- Chain `.requireFailureOf(...)` and `.simultaneousWith(...)` on descriptors for custom arbitration (pass `autoWire: false` to disable default wiring).
- Pass `enabled: false` to disable gestures without removing bindings or mutating `touch-action` / `user-select`.
- Nested `GestureManager` surfaces coordinate automatically: when an inner surface claims a gesture, competing ancestor surfaces in the same pointer stream are cancelled (pass `propagate: true` to observe simultaneously without cancelling).

```ts
import {GestureManager, longPress, pan} from '@hammerjs/core';

const hold = longPress({duration: 400, onLongPress: ev => console.log('Hold', ev.center)});
const drag = pan({onPan: ev => console.log('Drag', ev.deltaX, ev.deltaY)}).requireFailureOf(hold);

const manager = new GestureManager(element, {
  gestures: [hold, drag],
  enabled: true,
});
```

### Batteries-included `Hammer` wrapper

For quick prototypes where tree-shaking isn’t needed, `Hammer` configures all built-in gestures from a single options object:

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

hammer.destroy();
```

### Classic `<script>` Drop-in (`window.Hammer`)

Prefer no bundler or ES modules? Load `dist/hammer.min.js` directly — it exposes `window.Hammer` (plus `Hammer.GestureManager`, `Hammer.tap`, `Hammer.pan`, etc.) as a compact, property-mangled IIFE build:

```html
<script src="https://cdn.jsdelivr.net/npm/@hammerjs/core/dist/hammer.min.js"></script>
<script>
  const hammer = new Hammer(element, {
    onTap: ev => console.log('Tap', ev.center),
    onSwipe: ev => console.log('Swipe', ev.direction),
  });
</script>
```

### Framework Adapters

All framework adapters wrap `GestureBinding` — inline callbacks never cancel active drags on re-render, and only imported gesture descriptors end up in your bundle.

```tsx
// React (@hammerjs/react)
import {pan, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';

function Card({enabled = true}: {enabled?: boolean}) {
  const ref = useGestures<HTMLDivElement>(
    [
      tap({onTap: ev => console.log('Tap', ev.center)}),
      pan({onPan: ev => console.log('Pan', ev.deltaX, ev.deltaY)}),
    ],
    {enabled}
  );
  return <div ref={ref}>Drag or tap me</div>;
}
```

## Packages

All packages are versioned in lockstep:

- [`@hammerjs/core`](packages/core/README.md) — Core pointer/gesture engine, descriptors, and built-in recognizers
- [`@hammerjs/react`](packages/react/README.md) — React `useGestures` hook
- [`@hammerjs/angular`](packages/angular/README.md) — Standalone Angular `[gestures]` directive (zone-aware)

## Browser Support & Scope

`@hammerjs/core` is **Pointer Events only** — it relies on [W3C Pointer Events](https://caniuse.com/pointer) and [CSS `touch-action`](https://caniuse.com/css-touch-action) rather than legacy `TouchEvent`/`MouseEvent` recognizers. Note that laptop trackpad pinch-to-zoom (`ctrl` + `wheel` / macOS Safari `GestureEvent`) does not emit multi-touch Pointer Events and is intentionally outside the scope of `@hammerjs/core`.

| Browser     | Minimum Version | Released | Platform Notes                                             |
| :---------- | :-------------- | :------- | :--------------------------------------------------------- |
| **Chrome**  | 60+             | Jul 2017 | Desktop & Android 4.1+ (updatable WebView on Android 5.0+) |
| **Edge**    | 79+             | Jan 2020 | First Chromium-based Edge                                  |
| **Firefox** | 59+             | Mar 2018 | Desktop & Android                                          |
| **Safari**  | 13+             | Sep 2019 | macOS & iOS / iPadOS 13+ (iPhone 6s and newer)             |

Optional APIs such as [`PointerEvent.getCoalescedEvents()`](https://caniuse.com/mdn-api_pointerevent_getcoalescedevents) and compound `touch-action` tokens (`pan-x pinch-zoom`) are feature-detected and used progressively.

## Development

```bash
npm install
npm run dev        # Open the interactive gesture playground
npm run test:unit  # Run unit tests across all packages
npm test           # Full suite (including Playwright browser tests and lint)
```
