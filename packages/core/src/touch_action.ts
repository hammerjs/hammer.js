export type GestureTargetElement = HTMLElement | SVGElement;

export type TouchActionValue =
  | 'auto'
  | 'manipulation'
  | 'pan-x'
  | 'pan-y'
  | 'pan-x pan-y'
  | 'pan-x pinch-zoom'
  | 'pan-y pinch-zoom'
  | 'pinch-zoom'
  | 'none';

export type TouchActionSetting = 'compute' | TouchActionValue | false;

// 4-bit capability lattice representing native browser actions allowed by W3C CSS `touch-action`:
const ALLOW_PAN_X = 1 << 0;
const ALLOW_PAN_Y = 1 << 1;
const ALLOW_PINCH_ZOOM = 1 << 2;
const ALLOW_DOUBLE_TAP_ZOOM = 1 << 3;
const ALLOW_ALL = ALLOW_PAN_X | ALLOW_PAN_Y | ALLOW_PINCH_ZOOM | ALLOW_DOUBLE_TAP_ZOOM;

const TOUCH_ACTION_MASKS: Record<TouchActionValue, number> = {
  none: 0,
  'pan-x': ALLOW_PAN_X,
  'pan-y': ALLOW_PAN_Y,
  'pan-x pan-y': ALLOW_PAN_X | ALLOW_PAN_Y,
  'pinch-zoom': ALLOW_PINCH_ZOOM,
  'pan-x pinch-zoom': ALLOW_PAN_X | ALLOW_PINCH_ZOOM,
  'pan-y pinch-zoom': ALLOW_PAN_Y | ALLOW_PINCH_ZOOM,
  manipulation: ALLOW_PAN_X | ALLOW_PAN_Y | ALLOW_PINCH_ZOOM,
  auto: ALLOW_ALL,
};

const MASK_TO_TOUCH_ACTION: readonly TouchActionValue[] = [
  'none',
  'pan-x',
  'pan-y',
  'pan-x pan-y',
  'pinch-zoom',
  'pan-x pinch-zoom',
  'pan-y pinch-zoom',
  'manipulation',
];

/** Returns `true` when `action` permits native 2-finger browser pinch-zoom. */
export function allowsPinchZoom(action: TouchActionValue): boolean {
  return (TOUCH_ACTION_MASKS[action] & ALLOW_PINCH_ZOOM) !== 0;
}

/**
 * Checks whether the current browser CSS parser supports `value` for `touch-action`,
 * falling back cleanly on older WebKit / iOS Safari builds that reject `pinch-zoom`
 * compound tokens (where setting an unsupported token would drop the declaration).
 */
export function resolveSupportedTouchAction(value: TouchActionValue): TouchActionValue {
  if (value !== 'pan-x pinch-zoom' && value !== 'pan-y pinch-zoom' && value !== 'pinch-zoom') {
    return value;
  }
  if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') {
    return value;
  }
  if (CSS.supports('touch-action', value)) {
    return value;
  }
  return value === 'pan-x pinch-zoom' ? 'pan-x' : value === 'pan-y pinch-zoom' ? 'pan-y' : 'none';
}

/**
 * Combines multiple recognizer `TouchActionValue` intents via intersection (`&`)
 * over the W3C capability lattice so native scrolling and zooming remain enabled
 * on every axis not claimed by a registered recognizer.
 */
export function mergeTouchActions(actions: readonly TouchActionValue[]): TouchActionValue {
  let mask = ALLOW_ALL;
  for (const action of actions) {
    mask &= TOUCH_ACTION_MASKS[action];
  }
  const merged = mask === ALLOW_ALL ? 'auto' : MASK_TO_TOUCH_ACTION[mask & 7];
  return resolveSupportedTouchAction(merged);
}
