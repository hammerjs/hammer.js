# Hammer.js

[![CI](https://github.com/hammerjs/hammer.js/actions/workflows/ci.yml/badge.svg)](https://github.com/hammerjs/hammer.js/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/hammerjs.svg)](https://www.npmjs.com/package/hammerjs)

A JavaScript library for multi-touch gestures.

Visit [hammerjs.github.io](https://hammerjs.github.io) for detailed documentation.

## Installation

```bash
npm install hammerjs
```

Or include the pre-built script directly in your page:

```html
<script src="hammer.min.js"></script>
```

## Usage

Create a `Hammer` instance on a DOM element to listen for the default gestures (`pan`, `swipe`, `tap`, `doubletap`, and `press`):

```js
import Hammer from 'hammerjs';

const element = document.getElementById('my-element');
const mc = new Hammer(element);

mc.on('panleft panright tap press', (ev) => {
    console.log(ev.type + ' gesture detected.');
});
```

For full control over recognizers and how they interact (such as simultaneous gestures or requiring another gesture to fail), use `Hammer.Manager`:

```js
const mc = new Hammer.Manager(element);

mc.add(new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 }));
mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
mc.add(new Hammer.Tap());

mc.get('doubletap').recognizeWith('tap');
mc.get('tap').requireFailure('doubletap');

mc.on('doubletap', (ev) => {
    console.log('doubletap', ev);
});

mc.on('tap', (ev) => {
    console.log('tap', ev);
});
```

## Building & Testing

Requires **Node.js >= 22**.

```bash
npm install
npm test       # runs ESLint and the QUnit suite in headless Chrome
npm run lint   # runs ESLint only
npm run build  # builds hammer.js, hammer.min.js, sourcemaps, and runs tests
```

## Contributing

Read the [contributing guidelines](./CONTRIBUTING.md) before opening an issue or pull request.

For pull requests:

- Use [Angular-style commit messages](https://github.com/angular/angular.js/blob/v1.4.8/CONTRIBUTING.md#commit)
- Make changes in `src/` and `tests/` (do not commit rebuilt `hammer.js` / `hammer.min.js` bundles)
- Add or update unit tests for any bug fix or behavior change
- Run `npm test` to verify linting and all unit tests pass

For maintainers cutting a release, see [RELEASING.md](./RELEASING.md).

## License

Licensed under the [MIT License](./LICENSE.md).
