/**
 * Standard gesture distances (slops), timeouts, and velocity bounds inspired by
 * Android's `android.view.ViewConfiguration`.
 *
 * - Distances are in CSS pixels (`px`).
 * - Angles are in degrees (`deg`).
 * - Durations and horizons are in milliseconds (`ms`).
 * - Velocities are in pixels per second (`px/s`).
 */
export interface ViewConfiguration {
  /** Distance in `px` a pointer can wander before movement is treated as a pan rather than a press. Default: `8`. */
  readonly touchSlop: number;

  /** Maximum radial movement in `px` allowed from initial touch-down for a tap. Default: `10`. */
  readonly tapSlop: number;

  /** Maximum distance in `px` between consecutive tap-down locations for double-tap / Quick-Scale. Default: `100`. */
  readonly doubleTapSlop: number;

  /** Change in multi-pointer span in `px` required before scaling begins. Default: `16`. */
  readonly spanSlop: number;

  /** Minimum pointer span in `px` required to recognize scaling or rotation. Default: `27`. */
  readonly minScalingSpan: number;

  /** Minimum angular change in `deg` required before rotation begins. Default: `5`. */
  readonly rotationSlop: number;

  /**
   * Stationary hold duration in `ms` within `tapSlop` before `TapRecognizer`'s
   * `onShowPress` feedback fires (distinguishing a deliberate press from a scroll flick).
   * Default: `180`.
   */
  readonly tapTimeout: number;

  /** Maximum press duration in `ms` (`down` to `up`) for an individual tap. Default: `250`. */
  readonly maxTapDuration: number;

  /** Maximum interval in `ms` between consecutive taps in a multi-tap or Quick-Scale gesture. Default: `300`. */
  readonly doubleTapTimeout: number;

  /**
   * Minimum interval in `ms` between consecutive touch taps in a multi-tap or
   * Quick-Scale gesture to filter capacitive touch-screen bounce. Default: `40`.
   */
  readonly doubleTapMinTime: number;

  /** Stationary hold duration in `ms` within `touchSlop` required to trigger a long press. Default: `500`. */
  readonly longPressTimeout: number;

  /** Minimum release speed in `px/s` required to recognize a fling. Default: `300`. */
  readonly minimumFlingVelocity: number;

  /** Minimum net displacement in `px` required to recognize a fling. Default: `30`. */
  readonly minimumFlingDistance: number;

  /** Radial upper bound in `px/s` applied to computed velocities (`hypot(vx, vy) <= maximumFlingVelocity`). Default: `8000`. */
  readonly maximumFlingVelocity: number;

  /** Rolling lookback window in `ms` used by `VelocityTracker` (`LSQ2`). Default: `100`. */
  readonly velocityHorizonMs: number;

  /** Pause threshold in `ms` after which `VelocityTracker` assumes the pointer stopped and resets history. Default: `40`. */
  readonly assumePointerStoppedMs: number;
}

export const DEFAULT_VIEW_CONFIGURATION: ViewConfiguration = Object.freeze({
  touchSlop: 8,
  tapSlop: 10,
  doubleTapSlop: 100,
  spanSlop: 16,
  minScalingSpan: 27,
  rotationSlop: 5,
  tapTimeout: 180,
  maxTapDuration: 250,
  doubleTapTimeout: 300,
  doubleTapMinTime: 40,
  longPressTimeout: 500,
  minimumFlingVelocity: 300,
  minimumFlingDistance: 30,
  maximumFlingVelocity: 8000,
  velocityHorizonMs: 100,
  assumePointerStoppedMs: 40,
});

export function resolveViewConfiguration(
  overrides?: Partial<ViewConfiguration>
): ViewConfiguration {
  if (!overrides) {
    return DEFAULT_VIEW_CONFIGURATION;
  }
  return Object.freeze({
    ...DEFAULT_VIEW_CONFIGURATION,
    ...overrides,
  });
}
