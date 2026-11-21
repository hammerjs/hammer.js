# @hammerjs/angular

Tree-shakable standalone Angular directive (`[gestures]`) for [`@hammerjs/core`](../core/README.md). Runs DOM pointer listeners outside `NgZone` and re-enters only when a gesture callback fires.

## Install

```bash
npm install @hammerjs/core @hammerjs/angular
```

## Usage

```ts
import {Component, signal} from '@angular/core';
import {pan, tap} from '@hammerjs/core';
import {GesturesDirective} from '@hammerjs/angular';

@Component({
  selector: 'app-draggable-card',
  standalone: true,
  imports: [GesturesDirective],
  template: `
    <div
      [gestures]="gestures"
      [gesturesOptions]="{enabled: enabled()}"
      [style.transform]="'translate3d(' + x() + 'px, 0, 0)'"
    >
      Drag horizontally or tap to reset
    </div>
  `,
})
export class DraggableCardComponent {
  readonly x = signal(0);
  readonly enabled = signal(true);

  readonly gestures = [
    tap({onTap: () => this.x.set(0)}),
    pan({direction: 'horizontal', onPan: ev => this.x.update(v => v + ev.stepX)}),
  ];
}
```
