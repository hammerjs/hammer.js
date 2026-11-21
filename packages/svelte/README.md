# @hammerjs/svelte

Tree-shakable Svelte action (`use:gestures`) for [`@hammerjs/core`](../core/README.md).

## Install

```bash
npm install @hammerjs/core @hammerjs/svelte
```

## Usage

```svelte
<script lang="ts">
  import {pan, tap} from '@hammerjs/core';
  import {gestures} from '@hammerjs/svelte';

  let x = $state(0);
  let enabled = $state(true);
</script>

<div
  use:gestures={{
    enabled,
    gestures: [
      tap({onTap: () => (x = 0)}),
      pan({direction: 'horizontal', onPan: ev => (x += ev.stepX)}),
    ],
  }}
  style:transform={`translate3d(${x}px, 0, 0)`}
>
  Drag horizontally or tap to reset
</div>
```

You can also pass a descriptor array directly when no extra options are needed:

```svelte
<div use:gestures={[tap({onTap: ev => console.log('Tap', ev.center)})]}>Tap me</div>
```
