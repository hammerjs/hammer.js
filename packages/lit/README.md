# @hammerjs/lit

Tree-shakable Lit `ReactiveController` (`GesturesController`) for [`@hammerjs/core`](../core/README.md).

## Install

```bash
npm install @hammerjs/core @hammerjs/lit
```

## Usage

```ts
import {pan, tap} from '@hammerjs/core';
import {GesturesController} from '@hammerjs/lit';
import {LitElement, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';

@customElement('draggable-card')
export class DraggableCard extends LitElement {
  @state() private x = 0;

  private readonly gestures = new GesturesController(this, [
    tap({onTap: () => (this.x = 0)}),
    pan({direction: 'horizontal', onPan: ev => (this.x += ev.stepX)}),
  ]);

  override render() {
    return html`
      <div style="transform: translate3d(${this.x}px, 0, 0)">Drag horizontally or tap to reset</div>
    `;
  }
}
```

Call `this.gestures.setGestures(nextGestures, nextOptions)` to update descriptors or toggle `{enabled: false}` dynamically; inline callbacks hot-swap without cancelling active gestures.
