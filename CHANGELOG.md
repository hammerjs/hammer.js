# Changelog

### 2.1.0, 2026-11-28

> **Notes:**
> - `SwipeRecognizer` now uses a recency-weighted velocity tracker (with coalesced `PointerEvent` support and signed velocity along `offsetDirection`) instead of whole-gesture average `overallVelocity`, raises its default `threshold` from `10` to `30`, and caps outlier peaks with a new `maxVelocity` option (default `80` px/ms).
> - `getCenter()` and `simpleCloneInputData()` preserve sub-pixel floating-point pointer coordinates instead of rounding to integers.
> - Computed single-axis `touch-action` values now emit `pan-x pinch-zoom` / `pan-y pinch-zoom` when natively supported, preserving browser pinch-zoom when no multi-touch recognizer is active.
> - `hammer.mjs` (ESM) and `hammer.js` (UMD/CommonJS) are standalone builds; avoid mixing `import 'hammerjs'` and `require('hammerjs')` for the same `Manager` instance.

##### New Features
- Ship native ES module bundle (`hammer.mjs`) with `"module"`, `"exports"`, and `"sideEffects": true` in `package.json`, Web Worker `self` fallback, and safe `try/catch` global assignment for frozen/read-only `window` environments ([#1358](https://github.com/hammerjs/hammer.js/pull/1358), [#1422](https://github.com/hammerjs/hammer.js/pull/1422), [#1436](https://github.com/hammerjs/hammer.js/pull/1436))
- Add recency-weighted LSQ1 velocity tracker using hardware `srcEvent.timeStamp` and sub-frame coalesced `PointerEvent` samples, integrated into `SwipeRecognizer` with signed velocity checks for curved and diagonal swipes, default `threshold: 30`, and a `maxVelocity` option (default `80` px/ms; `0`/`null` disables) to reject extreme velocity peaks ([#1356](https://github.com/hammerjs/hammer.js/pull/1356), [#1404](https://github.com/hammerjs/hammer.js/pull/1404), [#1406](https://github.com/hammerjs/hammer.js/pull/1406), [#1412](https://github.com/hammerjs/hammer.js/pull/1412), [#1441](https://github.com/hammerjs/hammer.js/pull/1441))
- Preserve sub-pixel pointer positions in `getCenter()` and `simpleCloneInputData()` for smoother high-DPI dragging ([#1357](https://github.com/hammerjs/hammer.js/pull/1357))
- Add optional `pointerTypes` manager option (e.g. `['touch']`, `['touch', 'pen']`, `['mouse']`) to filter input sources, resetting active state when updated via `Manager.set()` ([#1361](https://github.com/hammerjs/hammer.js/pull/1361), [#1405](https://github.com/hammerjs/hammer.js/pull/1405))
- Support `pinch-zoom` and dynamic `CSS.supports()` `touch-action` values, emitting `pan-x pinch-zoom` / `pan-y pinch-zoom` when supported and providing JS polyfill fallback ([#1359](https://github.com/hammerjs/hammer.js/pull/1359), [#1413](https://github.com/hammerjs/hammer.js/pull/1413), [#1435](https://github.com/hammerjs/hammer.js/pull/1435))
- Recognize `PressRecognizer` synchronously without a timer when `time: 0` ([#1360](https://github.com/hammerjs/hammer.js/pull/1360))
- Support Shadow DOM: resolve inner targets via `composedPath()` / `ShadowRoot.host` and dispatch `composed: true` DOM events when `domEvents: true` ([#1363](https://github.com/hammerjs/hammer.js/pull/1363), [#1403](https://github.com/hammerjs/hammer.js/pull/1403))
- Support optional 4th `options` parameter on `Hammer.on()` / `Hammer.off()` (`addEventListeners` / `removeEventListeners`) and scope touch listeners to `{ passive: true }` when native CSS `touch-action` handles scrolling or on `SingleTouchInput` window bindings, reserving `{ passive: false }` for targets requiring the JS `preventDefault()` fallback ([#1428](https://github.com/hammerjs/hammer.js/pull/1428), [#1434](https://github.com/hammerjs/hammer.js/pull/1434))

##### Manager
- Prevent duplicate handler registration in `Manager.on()` ([#1367](https://github.com/hammerjs/hammer.js/pull/1367))
- Support forward `recognizeWith`/`requireFailure` references in `options.recognizers`, skip displaced duplicate preset entries, clone `options.cssProps`, and use null-prototype maps for `handlers` and `oldCssProps` ([#1427](https://github.com/hammerjs/hammer.js/pull/1427), [#1433](https://github.com/hammerjs/hammer.js/pull/1433))
- Snapshot `recognizers` during `Manager.recognize()` so calling `add()` or `remove()` inside a handler cannot loop infinitely or skip siblings ([#1402](https://github.com/hammerjs/hammer.js/pull/1402))
- Clean up state, `session.curRecognizer`, and reciprocal recognizer links in `Manager.remove()` and `Manager.destroy()`, clear `curRecognizer` on cancel/fail so `Pinch`/`Rotate` can start cleanly, and halt remaining emits after `destroy()`, `remove()`, or `stop(true)` ([#1396](https://github.com/hammerjs/hammer.js/pull/1396), [#1416](https://github.com/hammerjs/hammer.js/pull/1416), [#1418](https://github.com/hammerjs/hammer.js/pull/1418), [#1420](https://github.com/hammerjs/hammer.js/pull/1420), [#1433](https://github.com/hammerjs/hammer.js/pull/1433))
- Allow disabling `cssProps` (`false`/`null`) and resetting `inputTarget` (`null`) in `Manager.set()`, stop active sessions/timers before rebinding `inputTarget`, and cancel pending timers on dynamic disable or `stop(true)` ([#1410](https://github.com/hammerjs/hammer.js/pull/1410), [#1433](https://github.com/hammerjs/hammer.js/pull/1433))

##### Input
- Self-heal leaked pointers on fresh primary `pointerdown` / single `touchstart` and cancel active inputs cleanly on window `blur` ([#1365](https://github.com/hammerjs/hammer.js/pull/1365))
- Normalize `getRotation()` and unwrap continuous multi-touch rotation across the ±180° boundary, and clear stale `session.firstMultiple` when remaining pointers drop below 2 ([#1390](https://github.com/hammerjs/hammer.js/pull/1390), [#1415](https://github.com/hammerjs/hammer.js/pull/1415))
- Rebase `computeDeltaXY()` after partial `INPUT_CANCEL`, guard zero `deltaTime` in `overallVelocity`, guard empty `getCenter([])`, and skip coalesced velocity ingestion on post-liftoff rebase frames ([#1370](https://github.com/hammerjs/hammer.js/pull/1370), [#1408](https://github.com/hammerjs/hammer.js/pull/1408), [#1426](https://github.com/hammerjs/hammer.js/pull/1426), [#1434](https://github.com/hammerjs/hammer.js/pull/1434))
- Reset active recognizers on fresh session start (`isFirst`) while preserving `TapRecognizer` `tapCount` when not stopped, and reset full input state when disabled or destroyed ([#1368](https://github.com/hammerjs/hammer.js/pull/1368), [#1384](https://github.com/hammerjs/hammer.js/pull/1384), [#1394](https://github.com/hammerjs/hammer.js/pull/1394), [#1432](https://github.com/hammerjs/hammer.js/pull/1432), [#1434](https://github.com/hammerjs/hammer.js/pull/1434))
- End hovering pen (`buttons === 0`) and chorded mouse drags on primary button release in `PointerEventInput`, ignore non-primary buttons during active drags or on already-tracked `pointerId`s, and use null-prototype lookup tables across input drivers ([#1419](https://github.com/hammerjs/hammer.js/pull/1419), [#1421](https://github.com/hammerjs/hammer.js/pull/1421), [#1434](https://github.com/hammerjs/hammer.js/pull/1434))
- Reset child `MouseInput` when suppressing synthetic mouse events in `TouchMouseInput`, keep active mouse drags alive when crossing within 25px of a recent touch, and keep deduplicating synthetic mouse events when `pointerTypes: ['mouse']` filters touch ([#1411](https://github.com/hammerjs/hammer.js/pull/1411), [#1434](https://github.com/hammerjs/hammer.js/pull/1434))
- Deduplicate bubbled `touchstart` events in `SingleTouchInput` (including after `stop(true)`), isolate sibling element `touchstart`s, guard empty touch lists, block untracked `TouchInput` resume, and traverse `Document.defaultView` in `hasParent()` for window-bound `TouchInput` ([#1410](https://github.com/hammerjs/hammer.js/pull/1410), [#1414](https://github.com/hammerjs/hammer.js/pull/1414), [#1424](https://github.com/hammerjs/hammer.js/pull/1424), [#1426](https://github.com/hammerjs/hammer.js/pull/1426), [#1434](https://github.com/hammerjs/hammer.js/pull/1434))

##### Recognizers
- `PanRecognizer`: preserve direction on slow drags (>40ms) and fix `DIRECTION_ALL` vertical pans, enforce single-axis threshold against perpendicular drag, and evaluate cumulative displacement so opposite wiggles do not trigger `panstart` ([#1371](https://github.com/hammerjs/hammer.js/pull/1371), [#1401](https://github.com/hammerjs/hammer.js/pull/1401), [#1417](https://github.com/hammerjs/hammer.js/pull/1417), [#1433](https://github.com/hammerjs/hammer.js/pull/1433))
- `TapRecognizer`: enforce `maxPointers`, reset tap count across intervening gestures, preserve state/timers/tap count on sequential trailing finger liftoff for multi-pointer taps, and release `_input` on emit/reset ([#1423](https://github.com/hammerjs/hammer.js/pull/1423), [#1433](https://github.com/hammerjs/hammer.js/pull/1433))
- `PressRecognizer`: require `press` to have been emitted before `pressup`, stay invalidated across movement and non-final multi-touch releases, check recognizer enable and exclusive `curRecognizer` on async timers, and release `_input` on emit/reset ([#1385](https://github.com/hammerjs/hammer.js/pull/1385), [#1392](https://github.com/hammerjs/hammer.js/pull/1392), [#1409](https://github.com/hammerjs/hammer.js/pull/1409), [#1433](https://github.com/hammerjs/hammer.js/pull/1433))
- `Recognizer` & `AttrRecognizer`: require `AttrRecognizer` start before end on 1-frame gestures, reset recognizer when `tryEmit()` fails `requireFailure` or `Recognizer.set({ enable: false })` disables it, ignore raw string references on unattached recognizers, and guard `SwipeRecognizer.emit()` against `FORCED_STOP` ([#1369](https://github.com/hammerjs/hammer.js/pull/1369), [#1407](https://github.com/hammerjs/hammer.js/pull/1407), [#1433](https://github.com/hammerjs/hammer.js/pull/1433))

##### Touch-action
- Restore original inline `touch-action` style on `Manager.destroy()` and when switching to a valid-but-unsupported value falling back to the JS polyfill ([#1391](https://github.com/hammerjs/hammer.js/pull/1391), [#1435](https://github.com/hammerjs/hammer.js/pull/1435))
- Track native application so styleless targets (`document`, `window`) fall back to JS `preventDefault()` ([#1425](https://github.com/hammerjs/hammer.js/pull/1425))
- Allowlist valid CSS `touch-action` tokens before caching in `TOUCH_ACTION_MAP` (blocking unbounded cache growth and non-`touch-action` CSS keywords like `var(--x)`/`inherit`), match whole tokens instead of substrings, guard non-string `set()` and clobbered `CSS.supports`, and support `pinch-zoom` in the JS polyfill ([#1413](https://github.com/hammerjs/hammer.js/pull/1413), [#1435](https://github.com/hammerjs/hammer.js/pull/1435))

##### Performance
- Remove dead `TapRecognizer` `failTimeout` timer churn, replace per-touch `TouchMouseInput` `setTimeout` timers with timestamp pruning, skip `inputData` cloning when statically disabled, avoid per-emit closures and empty slices, fast-path native `TouchAction.preventDefaults()` and standard `PointerEvent` lookups, skip `composedPath()` on Light DOM targets, and check `targetIds` before `hasParent()` in `TouchInput` ([#1373](https://github.com/hammerjs/hammer.js/pull/1373), [#1374](https://github.com/hammerjs/hammer.js/pull/1374), [#1375](https://github.com/hammerjs/hammer.js/pull/1375), [#1376](https://github.com/hammerjs/hammer.js/pull/1376), [#1377](https://github.com/hammerjs/hammer.js/pull/1377), [#1378](https://github.com/hammerjs/hammer.js/pull/1378), [#1386](https://github.com/hammerjs/hammer.js/pull/1386), [#1434](https://github.com/hammerjs/hammer.js/pull/1434))

##### Core, Build, Tests & Packaging
- Harden utilities for null-prototype objects (`Object.prototype.hasOwnProperty.call`), non-function `obj.forEach`, empty/non-string `prefixed()` keys, `null` `navigator`, and cross-realm `window` objects in `getWindowForElement()` ([#1387](https://github.com/hammerjs/hammer.js/pull/1387), [#1434](https://github.com/hammerjs/hammer.js/pull/1434))
- Apply license banner before UglifyJS so `hammer.min.js.map` line mappings align accurately, preserve `'use strict'` in `hammer.min.js`, remove UMD globals from `hammer.mjs` lint rules, and use literal function replacement in `string-replace` ([#1372](https://github.com/hammerjs/hammer.js/pull/1372), [#1436](https://github.com/hammerjs/hammer.js/pull/1436))
- Clean up internal helpers and bundle wrappers, update `engines.node` to `>=14.0.0`, fail QUnit on uncaught `pageerror`, run minification and expanded SSR/ESM/strict-mode/frozen-window checks in `npm test`, and update `README.md` / `RELEASING.md` ([#1379](https://github.com/hammerjs/hammer.js/pull/1379), [#1380](https://github.com/hammerjs/hammer.js/pull/1380), [#1381](https://github.com/hammerjs/hammer.js/pull/1381), [#1382](https://github.com/hammerjs/hammer.js/pull/1382), [#1383](https://github.com/hammerjs/hammer.js/pull/1383), [#1388](https://github.com/hammerjs/hammer.js/pull/1388), [#1389](https://github.com/hammerjs/hammer.js/pull/1389), [#1397](https://github.com/hammerjs/hammer.js/pull/1397), [#1429](https://github.com/hammerjs/hammer.js/pull/1429), [#1431](https://github.com/hammerjs/hammer.js/pull/1431), [#1436](https://github.com/hammerjs/hammer.js/pull/1436))
- Modernize test and lint tooling: tighten gesture test durations, upgrade to QUnit 3 with `grunt-contrib-qunit`, replace the custom ESLint Grunt task with `grunt-eslint`, and enable ESLint across `tests/` ([#1442](https://github.com/hammerjs/hammer.js/pull/1442), [#1444](https://github.com/hammerjs/hammer.js/pull/1444), [#1445](https://github.com/hammerjs/hammer.js/pull/1445), [#1446](https://github.com/hammerjs/hammer.js/pull/1446))

### 2.0.10, 2026-11-26

##### Build
- Disable ES6 arrow-function compression in `uglify:min` so `hammer.min.js` remains strictly ES5-compatible, and lint `hammer.min.js` as ES5 in `grunt lint` ([#1398](https://github.com/hammerjs/hammer.js/pull/1398))

### 2.0.9, 2026-11-25

> **Note:** [#1328](https://github.com/hammerjs/hammer.js/pull/1328) fixes a long-standing sign bug in `getRotation()` (`endAngle - startAngle` instead of `endAngle + startAngle`) so initial two-finger rotation starts at `0°` rather than `2 * startAngle`. If your application previously worked around the old offset, please verify rotation handling when upgrading.

##### Manager
- Guard index before splicing in `Manager.off()` when removing an unregistered handler ([#1308](https://github.com/hammerjs/hammer.js/pull/1308))
- Skip unsupported `cssProps` in `toggleCssProps()` instead of writing `element.style[undefined]` ([#1312](https://github.com/hammerjs/hammer.js/pull/1312))
- Clear `input` and `options.inputTarget` DOM references on `Manager.destroy()` ([#1325](https://github.com/hammerjs/hammer.js/pull/1325))
- Reset recognizers and clear `recognizer.manager` in `Manager.remove()`, halt active `recognize()` cycles and cancel pending timers in `Manager.destroy()`, and guard `TouchAction.set()` after `destroy()` ([#1330](https://github.com/hammerjs/hammer.js/pull/1330))
- Restore previous inline styles and apply updated `cssProps` when changed via `Manager.set({ cssProps })` ([#1333](https://github.com/hammerjs/hammer.js/pull/1333), fixes [#1286](https://github.com/hammerjs/hammer.js/issues/1286))
- Populate `data.type` and `data.preventDefault` before dispatching DOM events when `domEvents: true` ([#1335](https://github.com/hammerjs/hammer.js/pull/1335))
- Stop the active session and reset recognizers when disabling a manager mid-gesture via `Manager.set({ enable: false })` ([#1343](https://github.com/hammerjs/hammer.js/pull/1343))

##### Input
- Check `srcEvent.sourceCapabilities.firesTouchEvents` in `TouchMouseInput` to suppress synthetic mouse events ([#1310](https://github.com/hammerjs/hammer.js/pull/1310))
- Return `DIRECTION_NONE` only when both `x` and `y` are zero in `getDirection()` ([#1313](https://github.com/hammerjs/hammer.js/pull/1313))
- Snapshot `PointerEventInput` `pointers` array and remove ended/cancelled pointers from `store` before invoking the callback ([#1316](https://github.com/hammerjs/hammer.js/pull/1316), fixes [#1213](https://github.com/hammerjs/hammer.js/issues/1213))
- Fix `getRotation()` to subtract the start angle instead of adding ([#1328](https://github.com/hammerjs/hammer.js/pull/1328), fixes [#914](https://github.com/hammerjs/hammer.js/issues/914), [#791](https://github.com/hammerjs/hammer.js/issues/791), [#1208](https://github.com/hammerjs/hammer.js/issues/1208))
- Rebind child `TouchInput` and `MouseInput` targets and listeners in `TouchMouseInput.init()` on `Manager.set({ inputTarget })` ([#1329](https://github.com/hammerjs/hammer.js/pull/1329))
- Reset recognizers (including `PanRecognizer.pX`/`pY`) on the next session after `Manager.stop()` so `panstart` is not skipped ([#1332](https://github.com/hammerjs/hammer.js/pull/1332), fixes [#811](https://github.com/hammerjs/hammer.js/issues/811))
- Guard zero initial pointer distance in `getScale()` to return `1` instead of `NaN`/`Infinity` ([#1334](https://github.com/hammerjs/hammer.js/pull/1334))
- Support standard `MouseEvent.buttons` bitmask alongside legacy `ev.which` on `mousemove` in `MouseInput` ([#1336](https://github.com/hammerjs/hammer.js/pull/1336), fixes [#976](https://github.com/hammerjs/hammer.js/issues/976))
- End stuck mouse pointers in `PointerEventInput` when `pointermove` arrives with `ev.buttons === 0`, and clear `this.store` on `destroy()` ([#1337](https://github.com/hammerjs/hammer.js/pull/1337))
- Avoid re-attaching `manager.session.prevInput` in `inputHandler()` after `Manager.destroy()` ([#1341](https://github.com/hammerjs/hammer.js/pull/1341))
- Ignore `Input.domHandler` events if the manager was already destroyed during the same dispatch ([#1342](https://github.com/hammerjs/hammer.js/pull/1342), fixes [#1016](https://github.com/hammerjs/hammer.js/issues/1016))
- Keep already-tracked touches in `TouchInput` `targetTouches` if their child target element is detached from the DOM mid-gesture ([#1345](https://github.com/hammerjs/hammer.js/pull/1345))

##### Recognizers
- Check axis-specific velocity (`overallVelocityX` / `overallVelocityY`) in `SwipeRecognizer` when only one axis is configured ([#1314](https://github.com/hammerjs/hammer.js/pull/1314))
- Guard null lookups in `Recognizer.recognizeWith()`, `dropRecognizeWith()`, `requireFailure()`, and `dropRequireFailure()` ([#1315](https://github.com/hammerjs/hammer.js/pull/1315))
- Return `STATE_FAILED` in `AttrRecognizer.process()` when `INPUT_CANCEL` arrives before recognition ([#1327](https://github.com/hammerjs/hammer.js/pull/1327), fixes [#1050](https://github.com/hammerjs/hammer.js/issues/1050), [#1132](https://github.com/hammerjs/hammer.js/issues/1132))
- Always clear `PressRecognizer._timer` on `INPUT_END` and `INPUT_CANCEL` regardless of `deltaTime` ([#1331](https://github.com/hammerjs/hammer.js/pull/1331), fixes [#1129](https://github.com/hammerjs/hammer.js/issues/1129))
- Do not recognize pans when `PanRecognizer` `direction` is set to `Hammer.DIRECTION_NONE` ([#1338](https://github.com/hammerjs/hammer.js/pull/1338), fixes [#1257](https://github.com/hammerjs/hammer.js/issues/1257))

##### Touch-action
- Skip `preventDefault()` on non-cancelable events (`srcEvent.cancelable === false`) ([#1311](https://github.com/hammerjs/hammer.js/pull/1311))
- Normalize whitespace and casing in `TouchAction.set()` before `compute` and native CSS `touch-action` lookup ([#1344](https://github.com/hammerjs/hammer.js/pull/1344))

##### Core & Utils
- Return numeric `-1`/`0`/`1` comparator in `uniqueArray()` sort for stable cross-engine pointer ordering ([#1307](https://github.com/hammerjs/hammer.js/pull/1307), fixes [#985](https://github.com/hammerjs/hammer.js/issues/985))
- Return an empty array for empty or whitespace-only strings in `splitStr()` ([#1309](https://github.com/hammerjs/hammer.js/pull/1309))
- Guard `window`, `document`, and `navigator` on module load for SSR / Node.js compatibility ([#1324](https://github.com/hammerjs/hammer.js/pull/1324), fixes [#1060](https://github.com/hammerjs/hammer.js/issues/1060), [#930](https://github.com/hammerjs/hammer.js/issues/930), [#1245](https://github.com/hammerjs/hammer.js/issues/1245), [#1296](https://github.com/hammerjs/hammer.js/issues/1296), [#1290](https://github.com/hammerjs/hammer.js/issues/1290))
- Guard `prefixed()` against `null` or `undefined` target objects ([#1326](https://github.com/hammerjs/hammer.js/pull/1326))
- Shallow-clone caller `options` in `Hammer()` so caller objects are not mutated and `Object.freeze()` options work ([#1339](https://github.com/hammerjs/hammer.js/pull/1339))
- Restore `.constructor` property on `Recognizer`, `Manager`, `Input`, and `TouchAction` prototypes ([#1340](https://github.com/hammerjs/hammer.js/pull/1340), fixes [#881](https://github.com/hammerjs/hammer.js/issues/881))

##### Packaging, Build, Tests & CI
- Add npm `"files"` allowlist (excluding `tests/` from published tarball), update vendored test jQuery to `3.7.1`, and drop unused Lo-Dash `2.4.1` ([#1317](https://github.com/hammerjs/hammer.js/pull/1317))
- Modernize `devDependencies` (0 `npm audit` vulnerabilities), replace JSHint/JSCS with ESLint v10, and run QUnit in headless Chrome via Puppeteer ([#1318](https://github.com/hammerjs/hammer.js/pull/1318))
- Add GitHub Actions CI (`ci.yml`), automated GitHub Release + npm OIDC Trusted Publishing workflow (`release.yml`), untrack compiled `hammer.js` / `hammer.min.js` / `hammer.min.js.map` from git, and add Dependabot config ([#1321](https://github.com/hammerjs/hammer.js/pull/1321), [#1347](https://github.com/hammerjs/hammer.js/pull/1347), [#1350](https://github.com/hammerjs/hammer.js/pull/1350))
- Expand unit test suite coverage, add SSR smoke test, and disable `window.PointerEvent` in `tests/unit/index.html` for direct browser test runs ([#1322](https://github.com/hammerjs/hammer.js/pull/1322), [#1353](https://github.com/hammerjs/hammer.js/pull/1353))
- Add `RELEASING.md`, modernize `README.md`, update `package.json` metadata (`https` homepage, `jsdelivr`/`unpkg`, keywords), and remove obsolete legacy files (`component.json`, `.bowerrc`, `bower.json`, `hammer.min.map`, `changelog.js`) ([#1319](https://github.com/hammerjs/hammer.js/pull/1319), [#1323](https://github.com/hammerjs/hammer.js/pull/1323), [#1346](https://github.com/hammerjs/hammer.js/pull/1346), [#1348](https://github.com/hammerjs/hammer.js/pull/1348), [#1349](https://github.com/hammerjs/hammer.js/pull/1349), [#1351](https://github.com/hammerjs/hammer.js/pull/1351))

### 2.0.8, 2016-04-22

##### Manager
- Added check to ensure that the required parameters are present ([#908](https://github.com/hammerjs/hammer.js/issues/908), [085d3a8](https://github.com/hammerjs/hammer.js/commit/085d3a87eab8674c45e9d3a14c4ca44ad7b97e26))
- Fixed restoration of Hammer.defaults.cssProps on destroy ([#904](https://github.com/hammerjs/hammer.js/issues/904), [7d0e60f](https://github.com/hammerjs/hammer.js/commit/7d0e60f6743517db3c05a38e966fb9fb5052fa03))

##### Input
- Fixed de-duping of mouse events on mouse touch combo devices ([#917](https://github.com/hammerjs/hammer.js/issues/917), [#863](https://github.com/hammerjs/hammer.js/issues/863), [bfeb89a](https://github.com/hammerjs/hammer.js/commit/bfeb89a77f778c527f771150d1e9687bd318ce8d))

##### Touch-action
- Added support map for specific values of touch-action ([#952](https://github.com/hammerjs/hammer.js/issues/952), [fbe9fd7](https://github.com/hammerjs/hammer.js/commit/fbe9fd775fe8cb3d43faa9428bfa56b61b16edc7))

### 2.0.6, 2015-12-23
- Add Assign method and deprecate merge and extend ([#895](https://github.com/hammerjs/hammer.js/pull/895)[fc01eae](https://github.com/hammerjs/hammer.js/commit/fc01eaea678acc430c664eb374555fbe3d403bdd))
- Expose Hammer on window or self if either is defined to avoid issues when AMD is present but not used. ( [356f795](https://github.com/hammerjs/hammer.js/commit/356f7955b01f3679c29d6c45931679256b45036e))
- Add support for PointerEvent instead of MSPointerEvent if supported. ([#754](https://github.com/hammerjs/hammer.js/issues/754), [439c7a6](https://github.com/hammerjs/hammer.js/commit/439c7a6c46978ab387b4b8289399e904d1c49535))
- Fixed moz-prefix, prefix should be Moz not moz. ([3ea47f3](https://github.com/hammerjs/hammer.js/commit/3ea47f3aebadc9d3bb6bf52bc8402cad135ef8a9))
- Removed non-existant recognizer ([f1c2d3b](https://github.com/hammerjs/hammer.js/commit/f1c2d3bf05f530ae092ecfc2335fceeff0e9eec9))
- Fixed config leaking between instances([189098f](https://github.com/hammerjs/hammer.js/commit/189098ff7736f6ed2fce9a3d3e1f5a3afee085ba))
- Fixed gaps in gesture configs and update tests to match ([70c2902](https://github.com/hammerjs/hammer.js/commit/70c2902d773a750e92ce8c423f8a4165c07eab97))
- Fixed Manager off method ([#768](https://github.com/hammerjs/hammer.js/issues/768), [da49a27](https://github.com/hammerjs/hammer.js/commit/da49a2730779ecc3b4dd147cc418a0df7c70fad9))
- Added compatibility with requirejs optimizer namespaces ( [70075f2](https://github.com/hammerjs/hammer.js/commit/70075f2df1b855f7c6d8d3caac49b9276b88c8d6))
- Made touchaction test zoomable ( [50264a7](https://github.com/hammerjs/hammer.js/commit/50264a70251ca88bbaf7b666401e527eee616de5))
- Fixed preventing default when for `pan-x pan-y` case ( [95eaafa](https://github.com/hammerjs/hammer.js/commit/95eaafadad27bd1b25d20cf976811a451922f1c4))
- Fixed incorrect touch action pan direction ( [a81da57](https://github.com/hammerjs/hammer.js/commit/a81da57a82ebf37e695e7c443e4e2715e7f32856))
- Fixed combined pan-x pan-y to resolve to none ( [fdae07b](https://github.com/hammerjs/hammer.js/commit/fdae07bc2ba3c90aad28da6791b3d5df627bc612))
- Fixed inverted touch-action for pan recognizer ([#728](https://github.com/hammerjs/hammer.js/issues/728), [605bd3b](https://github.com/hammerjs/hammer.js/commit/605bd3beca780be91dd43f9da8b809d155a43d1a))
- Fixed dependency on non standard touch list ordering ([#610](https://github.com/hammerjs/hammer.js/issues/610), [#791](https://github.com/hammerjs/hammer.js/issues/791), [287720a](https://github.com/hammerjs/hammer.js/commit/287720a6e5067e7f28be8b8b3b266d22905361c4))
- Fixed swipe to not trigger after multitouch gesture ([#640](https://github.com/hammerjs/hammer.js/issues/640), [711d8a1](https://github.com/hammerjs/hammer.js/commit/711d8a1df1aa5057ecb536454a36257e3c0d6d91))
- Fixed swipe recognizer to use overall gesture direction and velocity ( [963fe69](https://github.com/hammerjs/hammer.js/commit/963fe697515273fee508414bc29e2656465cea55))
- Fixed getDirection returning reversed direction ( [e40dcde](https://github.com/hammerjs/hammer.js/commit/e40dcde43bdac7a74c8ce5c05a4f62121089cd91))
- Fixed detection of tap when multi touch gestures are present ( [c46cbba](https://github.com/hammerjs/hammer.js/commit/c46cbba1c2cbbf874b59913416858d9dae297e64))
- Fixed incorrect event order ([#824](https://github.com/hammerjs/hammer.js/issues/824), [92f2d76](https://github.com/hammerjs/hammer.js/commit/92f2d76188480d967e738a19cd508d0b94a31329))
- Fixed leaking options between recognizer instances ([#813](https://github.com/hammerjs/hammer.js/issues/813), [af32c9b](https://github.com/hammerjs/hammer.js/commit/af32c9bace3f04bb34bee852ff56a33cc8fc27cd))
- Fixed detection when element has no style attribute ( [5ca6d8c](https://github.com/hammerjs/hammer.js/commit/5ca6d8cbead02c71929a8073e95ddf98e11c0e06))

### 2.0.4, 2014-09-28
- Fix IE pointer issue. [#665](https://github.com/hammerjs/hammer.js/pull/665)
- Fix multi-touch at different elements. [#668](https://github.com/hammerjs/hammer.js/pull/668)
- Added experimental [single-user Touch input handler](src/input/singletouch.js). This to improve performance/ux when only a single user has to be supported. Plans are to release 2.1 with this as default, and a settings to enable the multi-user handler.

### 2.0.3, 2014-09-10
- Manager.set improvements. 
- Fix requireFailure() call in Manager.options.recognizers. 
- Make DIRECTION_ALL for pan and swipe gestures less blocking.
- Fix Swipe recognizer threshold option.
- Expose the Input classes.
- Added the option `inputClass` to set the used input handler.

### 2.0.2, 2014-07-26
- Improved mouse and pointer-events input, now able to move outside the window.
- Added the export name (`Hammer`) as an argument to the wrapper.
- Add the option *experimental* `inputTarget` to change the element that receives the events.
- Improved performance when only one touch being active.
- Fixed the jumping deltaXY bug when going from single to multi-touch.
- Improved velocity calculations.

### 2.0.1, 2014-07-15
- Fix issue when no document.body is available
- Added pressup event for the press recognizer
- Removed alternative for Object.create

### 2.0.0, 2014-07-11
- Full rewrite of the library.
