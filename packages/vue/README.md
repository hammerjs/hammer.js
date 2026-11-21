# @hammerjs/vue

Tree-shakable Vue 3 composable (`useGestures`) and directive (`vGestures`) for [`@hammerjs/core`](../core/README.md).

## Install

```bash
npm install @hammerjs/core @hammerjs/vue
```

## Usage

### Composable (`useGestures`)

```vue
<script setup lang="ts">
import {pan, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/vue';
import {ref} from 'vue';

const cardRef = ref<HTMLDivElement | null>(null);
const enabled = ref(true);

useGestures(
  cardRef,
  () => [
    tap({onTap: ev => console.log('Tap', ev.center)}),
    pan({direction: 'horizontal', onPan: ev => console.log('Pan', ev.deltaX)}),
  ],
  () => ({enabled: enabled.value})
);
</script>

<template>
  <div ref="cardRef">Drag or tap me</div>
</template>
```

### Directive (`vGestures`)

```vue
<script setup lang="ts">
import {swipe, tap} from '@hammerjs/core';
import {vGestures} from '@hammerjs/vue';

const gestures = [
  tap({onTap: ev => console.log('Tap', ev.center)}),
  swipe({direction: 'horizontal', onSwipe: ev => console.log('Swipe', ev.direction)}),
];
</script>

<template>
  <div v-gestures="gestures">Swipe or tap me</div>
</template>
```
