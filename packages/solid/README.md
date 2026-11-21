# @hammerjs/solid

Tree-shakable SolidJS primitive (`createGestures`) and directive (`use:gestures`) for [`@hammerjs/core`](../core/README.md).

## Install

```bash
npm install @hammerjs/core @hammerjs/solid
```

## Usage

### Primitive (`createGestures`)

```tsx
import {pan, tap} from '@hammerjs/core';
import {createGestures} from '@hammerjs/solid';
import {createSignal} from 'solid-js';

export function DraggableCard() {
  const [el, setEl] = createSignal<HTMLDivElement | null>(null);
  const [x, setX] = createSignal(0);

  createGestures(el, () => [
    tap({onTap: () => setX(0)}),
    pan({direction: 'horizontal', onPan: ev => setX(prev => prev + ev.stepX)}),
  ]);

  return (
    <div ref={setEl} style={{transform: `translate3d(${x()}px, 0, 0)`}}>
      Drag horizontally or tap to reset
    </div>
  );
}
```

### Directive (`use:gestures`)

```tsx
import {swipe, tap} from '@hammerjs/core';
import {gestures} from '@hammerjs/solid';

void gestures; // prevent bundler from dropping directive import

export function SwipeCard() {
  return (
    <div
      use:gestures={[
        tap({onTap: ev => console.log('Tap', ev.center)}),
        swipe({direction: 'horizontal', onSwipe: ev => console.log('Swipe', ev.direction)}),
      ]}
    >
      Swipe or tap me
    </div>
  );
}
```
