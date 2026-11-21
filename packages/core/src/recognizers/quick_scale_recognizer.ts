import {createDescriptor, type GestureDescriptor} from '../descriptors.js';
import {distance, type MotionEvent, type Point} from '../motion_event.js';
import {GestureRecognizer} from '../gesture_recognizer.js';
import type {TouchActionValue} from '../touch_action.js';
import {
  DOUBLE_TAP_TIMEOUT_MS,
  isWithinTapSlop,
  isWithinTapWindow,
  MAX_TAP_DURATION_MS,
  type TapAnchor,
} from './multi_tap_window.js';
import type {ScaleCallbacks, ScaleEventData} from './scale_recognizer.js';

const DEFAULT_SLOP = 8;
const DEFAULT_SENSITIVITY = 200;

interface ScalingPhase {
  readonly kind: 'scaling';
  readonly anchor: Point;
  readonly startY: number;
  scale: number;
}

type QuickScalePhase =
  | {readonly kind: 'idle'}
  | {readonly kind: 'stroke1'; readonly tapDown: Point; readonly tapDownTime: number}
  | {readonly kind: 'awaitingSecondDown'; readonly anchor: TapAnchor}
  | {readonly kind: 'armed'; readonly anchor: Point}
  | ScalingPhase;

const IDLE_PHASE: QuickScalePhase = {kind: 'idle'};

export interface QuickScaleOptions {
  /** Movement distance in `px` required before Quick-Scale begins (and max tap wander on stroke #1). Default: `8`. */
  slop: number;
  /** Vertical drag distance in `px` that doubles (`2x`) or halves (`0.5x`) scale. Default: `200`. */
  sensitivity: number;
}

/**
 * Single-pointer Anchored / Quick-Scale recognizer (double-tap and drag vertically
 * to zoom in/out around the tap anchor, matching Android's `ScaleGestureDetector`
 * Quick-Scale gesture).
 */
export class QuickScaleRecognizer extends GestureRecognizer {
  private readonly callbacks: ScaleCallbacks;
  private readonly slop: number;
  private readonly sensitivity: number;

  private phase: QuickScalePhase = IDLE_PHASE;

  constructor(callbacks: ScaleCallbacks, options: Partial<QuickScaleOptions> = {}) {
    super();
    this.callbacks = callbacks;
    this.slop = Math.max(0, options.slop ?? DEFAULT_SLOP);
    this.sensitivity =
      options.sensitivity !== undefined && options.sensitivity > 0
        ? options.sensitivity
        : DEFAULT_SENSITIVITY;
  }

  override getTouchAction(): TouchActionValue {
    return 'manipulation';
  }

  /**
   * Quick-Scale can only claim the arena on the second stroke, so during the first stroke a
   * standalone discrete gesture (`Tap`) completing on stroke #1 must not deny it.
   * Continuous gestures (`Pan`, `LongPress`, `Scale`, `Rotate`) winning on stroke #1 do deny it,
   * and once armed on stroke #2 it follows normal mutual exclusion.
   */
  override canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
    return this.phase.kind !== 'armed' &&
      this.phase.kind !== 'scaling' &&
      other.gestureKind === 'discrete'
      ? true
      : super.canRecognizeSimultaneouslyWith(other);
  }

  /** @internal */
  override get isPrioritized(): boolean {
    return this.phase.kind === 'armed';
  }

  /** @internal */
  override get blocksTouchMove(): boolean {
    return this.phase.kind === 'armed';
  }

  /** @internal */
  override prepareForDown(event: MotionEvent): void {
    if (this.phase.kind !== 'awaitingSecondDown') {
      return;
    }

    this.clearTimer();
    if (
      event.activePointerCount === 1 &&
      isWithinTapWindow(event, this.phase.anchor) &&
      isWithinTapSlop(event.focus, this.phase.anchor)
    ) {
      this.phase = {kind: 'armed', anchor: event.focus};
    } else {
      this.phase = IDLE_PHASE;
      this.fail();
    }
  }

  /** @internal */
  override shouldResetOnDown(): boolean {
    return this.phase.kind === 'armed' ? false : super.shouldResetOnDown();
  }

  protected override onDown(event: MotionEvent): void {
    if (event.activePointerCount > 1) {
      this.fail();
      return;
    }
    if (this.phase.kind === 'armed') {
      return;
    }
    this.phase = {kind: 'stroke1', tapDown: event.focus, tapDownTime: event.eventTime};
    // A first stroke held longer than a tap can never arm Quick-Scale.
    this.setTimer(MAX_TAP_DURATION_MS, () => this.fail());
  }

  protected override onPointerDown(): void {
    this.phase = IDLE_PHASE;
    if (this.active) {
      this.cancel();
    } else {
      this.fail();
    }
  }

  protected override onMove(event: MotionEvent): void {
    if (this.phase.kind === 'stroke1') {
      if (distance(event.focus, this.phase.tapDown) > this.slop) {
        this.fail();
      }
      return;
    }

    if (this.phase.kind === 'armed') {
      const {anchor} = this.phase;
      const dx = event.focus.x - anchor.x;
      const dy = event.focus.y - anchor.y;
      if (Math.hypot(dx, dy) <= this.slop) {
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        this.fail();
        return;
      }

      // Start scaling from the slop boundary on the vertical axis (never past the finger).
      const startY = anchor.y + Math.sign(dy) * Math.min(this.slop, Math.abs(dy));
      const scalingPhase: ScalingPhase = {kind: 'scaling', anchor, startY, scale: 1};

      this.tryBegin(grantEvent => {
        const startEvent = grantEvent ?? event;
        this.phase = scalingPhase;
        if (this.callbacks.onScaleStart) {
          this.callbacks.onScaleStart(this.buildEvent(startEvent, anchor, 1, 1));
        }
        this.updateScaling(startEvent, scalingPhase);
      });
      return;
    }

    if (this.phase.kind === 'scaling') {
      this.updateScaling(event, this.phase);
    }
  }

  protected override onUp(event: MotionEvent): void {
    this.clearTimer();

    if (this.phase.kind === 'scaling') {
      const {anchor, scale} = this.phase;
      this.phase = IDLE_PHASE;
      if (this.completeActive() && this.callbacks.onScaleEnd) {
        this.callbacks.onScaleEnd(this.buildEvent(event, anchor, scale, 1));
      }
      return;
    }

    if (this.phase.kind === 'armed') {
      this.phase = IDLE_PHASE;
      this.fail();
      return;
    }

    if (
      this.phase.kind === 'stroke1' &&
      event.eventTime - this.phase.tapDownTime <= MAX_TAP_DURATION_MS &&
      distance(event.focus, this.phase.tapDown) <= this.slop
    ) {
      const anchor: TapAnchor = {
        downFocus: this.phase.tapDown,
        upTime: event.eventTime,
        pointerType: event.pointerType,
      };
      this.phase = {kind: 'awaitingSecondDown', anchor};
      this.setTimer(DOUBLE_TAP_TIMEOUT_MS, () => {
        this.phase = IDLE_PHASE;
        this.fail();
      });
      return;
    }

    this.fail();
  }

  protected override onPointerCancel(): void {
    this.phase = IDLE_PHASE;
    this.cancel();
  }

  protected override onCancel(): void {
    this.phase = IDLE_PHASE;
    this.callbacks.onScaleCancel?.();
  }

  protected override onReset(): void {
    this.phase = IDLE_PHASE;
  }

  protected override onFail(): void {
    this.phase = IDLE_PHASE;
  }

  private updateScaling(event: MotionEvent, scaling: ScalingPhase): void {
    const nextScale = Math.pow(2, (event.focus.y - scaling.startY) / this.sensitivity);
    const scaleFactor = nextScale / scaling.scale;
    if (scaleFactor !== 1 && this.emitChange()) {
      scaling.scale = nextScale;
      if (this.callbacks.onScale) {
        this.callbacks.onScale(this.buildEvent(event, scaling.anchor, nextScale, scaleFactor));
      }
    }
  }

  private buildEvent(
    event: MotionEvent,
    anchor: Point,
    scale: number,
    scaleFactor: number
  ): ScaleEventData {
    return {
      ...this.createEventData(event, anchor),
      scale,
      scaleFactor,
      isQuickScale: true,
    };
  }
}

export type QuickScaleGestureOptions = Partial<QuickScaleOptions> & ScaleCallbacks;

/** Creates a tree-shakable `QuickScaleRecognizer` descriptor (1-finger double-tap-and-drag zoom). */
export function quickScale(options?: QuickScaleGestureOptions): GestureDescriptor {
  return createDescriptor(
    'quickScale',
    options as Record<string, unknown> | undefined,
    (cbs, cfg, peers) => {
      const opts = {...cfg} as Partial<QuickScaleOptions>;
      if (opts.slop === undefined) {
        // Cap default slop against any peer `pan` slop so a low-slop `PanRecognizer` cannot
        // claim stroke #2 before an armed `QuickScaleRecognizer` crosses its own threshold.
        let minPanSlop: number | undefined;
        for (const peer of peers) {
          if (peer.kind === 'pan') {
            const panSlop = (peer.config as {slop?: number} | undefined)?.slop;
            if (typeof panSlop === 'number') {
              minPanSlop = minPanSlop === undefined ? panSlop : Math.min(minPanSlop, panSlop);
            }
          }
        }
        if (minPanSlop !== undefined) {
          opts.slop = Math.min(DEFAULT_SLOP, minPanSlop);
        }
      }
      return new QuickScaleRecognizer(cbs as ScaleCallbacks, opts);
    }
  );
}
