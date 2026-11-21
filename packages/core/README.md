# @hammerjs/core

Modern multi-touch and pointer gesture recognition engine for the web. Zero dependencies, strict TypeScript, tree-shakable ESM.

## Install

```bash
npm install @hammerjs/core
```

Or drop the classic minified browser build directly into a `<script>` tag (exposes `window.Hammer`, no ES modules required):

```html
<script src="https://cdn.jsdelivr.net/npm/@hammerjs/core/dist/hammer.min.js"></script>
<script>
  const hammer = new Hammer(document.getElementById('stage'), {
    onTap: ev => console.log('Tap', ev.center),
    onPan: ev => console.log('Pan', ev.deltaX, ev.deltaY),
  });

  // Modular descriptors are also available on window.Hammer:
  // new Hammer.GestureManager(el, { gestures: [Hammer.tap(...), Hammer.pan(...)] })
</script>
```

## Usage

### Declarative descriptors (tree-shakable)

```ts
import {
  GestureManager,
  doubleTap,
  longPress,
  pan,
  quickScale,
  rotate,
  scale,
  tap,
} from '@hammerjs/core';

const manager = new GestureManager(element, {
  gestures: [
    tap({onTap: ev => console.log('Tap', ev.center, ev.pointerType, ev.target)}),
    doubleTap({onTap: ev => console.log('Double tap', ev.center)}),
    longPress({duration: 500, onLongPress: ev => console.log('Hold', ev.center)}),
    pan({
      numPointers: 0,
      onPan: ev => console.log('Pan', ev.deltaX, ev.deltaY),
      onSwipe: ev => console.log('Swipe', ev.direction),
    }),
    scale({onScale: ev => console.log('Scale', ev.scale)}),
    quickScale({onScale: ev => console.log('QuickScale', ev.scale)}),
    rotate({onRotate: ev => console.log('Rotate', ev.rotation)}),
  ],
});

manager.destroy();
```

Use `swipe({direction: 'horizontal', onSwipe})` when you only need flick detection without continuous pan tracking.

> **Pointer Events only:** `@hammerjs/core` recognizes W3C Pointer Events (`touch`, `pen`, `mouse`) and does not synthesize `scale` events from laptop trackpad `ctrl` + `wheel` or macOS Safari `GestureEvent` zoom.

### Custom recognizers

Subclass `GestureRecognizer` and wrap it with `gesture(...)` to compose seamlessly alongside built-in descriptors:

```ts
import {GestureManager, GestureRecognizer, gesture, tap, type MotionEvent} from '@hammerjs/core';

class InstantPressRecognizer extends GestureRecognizer {
  constructor(private readonly callbacks: {onPress?: () => void}) {
    super();
  }
  protected override onDown(_event: MotionEvent): void {
    this.tryRecognizeDiscrete(() => this.callbacks.onPress?.());
  }
}

const press = gesture(cbs => new InstantPressRecognizer(cbs), {
  onPress: () => console.log('Pressed'),
});

const manager = new GestureManager(element, {
  gestures: [press, tap({onTap: () => console.log('Tap')}).simultaneousWith(press)],
});
```

### Options

| Option                  | Default                     | Description                                                                                                                    |
| :---------------------- | :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `gestures`              | `[]`                        | Tree-shakable `GestureDescriptor[]` (`tap`, `doubleTap`, `longPress`, `pan`, `swipe`, `scale`, `quickScale`, `rotate`).        |
| `recognizers`           | `[]`                        | Low-level `GestureRecognizer[]` instances registered directly in the arena.                                                    |
| `enabled`               | `true`                      | Set to `false` to disable listeners and surface guards (`touch-action` / `user-select`).                                       |
| `autoWire`              | `true`                      | Automatically wires standard relationships (`tap` waits on `doubleTap`/`quickScale`, `scale` simultaneous with `rotate`).      |
| `touchAction`           | `'compute'`                 | Automatically computes least-restrictive CSS `touch-action`, accepts an explicit value, or `false` to opt out.                 |
| `supportedPointerTypes` | `['touch', 'pen', 'mouse']` | Pointer modalities to observe.                                                                                                 |
| `ignoreTarget`          | `true`                      | Ignores `<input>`, `<textarea>`, `<select>`, `<option>`, `[contenteditable]`; accepts `false` or `(target, event) => boolean`. |
| `propagate`             | `false`                     | When `false`, winning a gesture cancels competing nested `GestureManager` surfaces sharing the pointer stream.                 |

## Event Data

Every gesture event extends `GestureEventData`:

- `center` (`{x, y}`) — viewport focal point
- `pointerType` (`'touch' | 'pen' | 'mouse'`) — input modality
- `target` (`EventTarget | null`) — triggering DOM target
- `motionEvent` — normalized multi-pointer `MotionEvent` snapshot
- `originalEvent` — underlying DOM event
