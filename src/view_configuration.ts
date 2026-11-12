/** @internal */
export const DOUBLE_TAP_MIN_TIME_MS = 40;

/**
 * Standard gesture distances (slops), timeouts, and velocity bounds inspired by
 * Android's `android.view.ViewConfiguration`.
 *
 * - Distances are in CSS pixels (`px`).
 * - Angles are in degrees (`deg`).
 * - Durations are in milliseconds (`ms`).
 * - Velocities are in pixels per second (`px/s`).
 */
export interface ViewConfiguration {
  /** Distance in `px` a pointer can wander before movement disqualifies a tap/press or starts a pan. Default: `8`. */
  readonly touchSlop: number;

  /** Maximum distance in `px` between consecutive tap-down locations for double-tap / Quick-Scale. Default: `100`. */
  readonly doubleTapSlop: number;

  /** Change in multi-pointer span in `px` required before scaling begins. Default: `16`. */
  readonly spanSlop: number;

  /** Minimum pointer span in `px` required to recognize scaling or rotation. Default: `27`. */
  readonly minScalingSpan: number;

  /** Minimum angular change in `deg` required before rotation begins. Default: `5`. */
  readonly rotationSlop: number;

  /** Maximum press duration in `ms` (`down` to `up`) for an individual tap. Default: `250`. */
  readonly maxTapDuration: number;

  /** Maximum interval in `ms` between consecutive taps in a multi-tap or Quick-Scale gesture. Default: `300`. */
  readonly doubleTapTimeout: number;

  /** Stationary hold duration in `ms` within `touchSlop` required to trigger a long press. Default: `500`. */
  readonly longPressTimeout: number;

  /** Minimum release speed in `px/s` required to recognize a swipe. Default: `300`. */
  readonly minimumSwipeVelocity: number;

  /** Minimum net displacement in `px` required to recognize a swipe. Default: `30`. */
  readonly minimumSwipeDistance: number;

  /** Radial upper bound in `px/s` applied to computed velocities (`hypot(vx, vy) <= maximumSwipeVelocity`). Default: `8000`. */
  readonly maximumSwipeVelocity: number;

  /**
   * Window in `ms` after a continuous gesture (`Pan`, `Scale`, `LongPress`, ...) ends during which
   * a trailing browser-synthesized `click` on the element is suppressed. Default: `400`.
   */
  readonly ghostClickTimeout: number;
}

export const DEFAULT_VIEW_CONFIGURATION: ViewConfiguration = {
  touchSlop: 8,
  doubleTapSlop: 100,
  spanSlop: 16,
  minScalingSpan: 27,
  rotationSlop: 5,
  maxTapDuration: 250,
  doubleTapTimeout: 300,
  longPressTimeout: 500,
  minimumSwipeVelocity: 300,
  minimumSwipeDistance: 30,
  maximumSwipeVelocity: 8000,
  ghostClickTimeout: 400,
};

export function resolveViewConfiguration(
  overrides?: Partial<ViewConfiguration>
): ViewConfiguration {
  return overrides && overrides !== DEFAULT_VIEW_CONFIGURATION
    ? {...DEFAULT_VIEW_CONFIGURATION, ...overrides}
    : DEFAULT_VIEW_CONFIGURATION;
}
