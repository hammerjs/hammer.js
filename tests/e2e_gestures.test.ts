import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {userEvent} from '@testing-library/user-event';
import {GestureManager, PanRecognizer, TapRecognizer} from '../src/index';

describe('Gesture Engine E2E', () => {
  let element: HTMLElement;
  let manager: GestureManager;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    document.body.innerHTML =
      '<div id="touch-area" style="width: 500px; height: 500px;"><button id="inner-btn" type="button">Action</button></div>';
    element = document.getElementById('touch-area')!;
    manager = new GestureManager(element);
  });

  afterEach(() => {
    manager.destroy();
    document.body.innerHTML = '';
  });

  it('recognizes a tap gesture via user-event without firing pan and preserves inner button click', async () => {
    const tapSpy = vi.fn();
    const panSpy = vi.fn();
    const btnClickSpy = vi.fn();

    const innerBtn = document.getElementById('inner-btn')!;
    innerBtn.addEventListener('click', btnClickSpy);

    manager.register(new TapRecognizer({onTap: tapSpy}), new PanRecognizer({onPan: panSpy}));

    await user.click(innerBtn);

    expect(tapSpy).toHaveBeenCalledTimes(1);
    expect(btnClickSpy).toHaveBeenCalledTimes(1);
    expect(panSpy).not.toHaveBeenCalled();
  });

  it('recognizes a double-tap gesture via user-event', async () => {
    const doubleTapSpy = vi.fn();
    manager.register(new TapRecognizer({onTap: doubleTapSpy}, {taps: 2}));

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

    manager.register(
      new TapRecognizer({onTap: tapSpy}),
      new PanRecognizer(
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
});
