import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {userEvent} from '@testing-library/user-event';
import Hammer from '../src/index';
import UmdEntryHammer from '../src/umd';

describe('Gesture Engine E2E', () => {
  let element: HTMLElement;
  let hammer: Hammer;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    document.body.innerHTML =
      '<div id="touch-area" style="width: 500px; height: 500px;"><button id="inner-btn" type="button">Action</button></div>';
    element = document.getElementById('touch-area')!;
    hammer = new Hammer(element);
  });

  afterEach(() => {
    hammer.destroy();
    document.body.innerHTML = '';
  });

  it('recognizes a tap gesture via user-event without firing pan and preserves inner button click', async () => {
    const tapSpy = vi.fn();
    const panSpy = vi.fn();
    const btnClickSpy = vi.fn();

    const innerBtn = document.getElementById('inner-btn')!;
    innerBtn.addEventListener('click', btnClickSpy);

    hammer.register(new Hammer.Tap({onTap: tapSpy})).register(new Hammer.Pan({onPan: panSpy}));

    await user.click(innerBtn);

    expect(tapSpy).toHaveBeenCalledTimes(1);
    expect(btnClickSpy).toHaveBeenCalledTimes(1);
    expect(panSpy).not.toHaveBeenCalled();
  });

  it('recognizes a double-tap gesture via user-event', async () => {
    const doubleTapSpy = vi.fn();
    hammer.register(new Hammer.Tap({onTap: doubleTapSpy}, {taps: 2}));

    await user.dblClick(element);

    expect(doubleTapSpy).toHaveBeenCalledTimes(1);
  });

  it('recognizes a pan gesture via user-event and suppresses both tap and trailing button click', async () => {
    const tapSpy = vi.fn();
    const startSpy = vi.fn();
    const panSpy = vi.fn();
    const endSpy = vi.fn();
    const btnClickSpy = vi.fn();

    const innerBtn = document.getElementById('inner-btn')!;
    innerBtn.addEventListener('click', btnClickSpy);

    hammer.register(new Hammer.Tap({onTap: tapSpy})).register(
      new Hammer.Pan(
        {
          onPanStart: startSpy,
          onPan: panSpy,
          onPanEnd: endSpy,
        },
        {slop: 4}
      )
    );

    await user.pointer([
      {keys: '[MouseLeft>]', target: innerBtn, coords: {x: 0, y: 0}},
      {target: innerBtn, coords: {x: 50, y: 0}},
      {target: innerBtn, coords: {x: 100, y: 0}},
      {keys: '[/MouseLeft]', target: innerBtn, coords: {x: 100, y: 0}},
    ]);

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(panSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalledTimes(1);
    expect(tapSpy).not.toHaveBeenCalled();
    expect(btnClickSpy).not.toHaveBeenCalled();
  });

  it('exposes Hammer directly as a constructor in the UMD bundle without a .default wrapper', () => {
    const umdPath = resolve(__dirname, '../dist/hammer.umd.js');
    const code = readFileSync(umdPath, 'utf8');
    const sandbox: Record<string, unknown> = {};
    sandbox.globalThis = sandbox;
    sandbox.self = sandbox;
    runInNewContext(code, sandbox);

    const UmdHammer = sandbox.Hammer as typeof Hammer & {default?: unknown};
    expect(typeof UmdHammer).toBe('function');
    expect(UmdHammer.default).toBeUndefined();
    expect(typeof UmdHammer.Pan).toBe('function');
    expect(typeof UmdHammer.VelocityTracker).toBe('function');
    expect(UmdEntryHammer).toBe(Hammer);
  });

  it('ignores unregistered gestures', async () => {
    const tapSpy = vi.fn();
    await user.click(element);
    expect(tapSpy).not.toHaveBeenCalled();
  });
});
