import type {MotionEvent, Point} from './motion_event.js';
import type {TouchActionValue} from './touch_behavior.js';

/** @internal */
export const TOUCH_SLOP = 8;
/** @internal */
export const DOUBLE_TAP_SLOP = 100;
/** @internal */
export const MIN_SCALING_SPAN = 27;
/** @internal */
export const SPAN_SLOP = 16;
/** @internal */
export const ROTATION_SLOP = 5;
/** @internal */
export const MAX_TAP_DURATION_MS = 250;
/** @internal */
export const DOUBLE_TAP_TIMEOUT_MS = 300;
/** @internal */
export const DOUBLE_TAP_MIN_TIME_MS = 40;
/** @internal */
export const LONG_PRESS_DURATION_MS = 500;
/** @internal */
export const QUICK_SCALE_SENSITIVITY = 200;
/** @internal */
export const MIN_SWIPE_VELOCITY = 300;
/** @internal */
export const MAX_SWIPE_VELOCITY = 8000;
/** @internal */
export const MIN_SWIPE_DISTANCE = 30;

export type RecognizerState =
  'possible' | 'pending' | 'began' | 'changed' | 'ended' | 'cancelled' | 'failed';

export interface GestureEventData {
  /** Focal point (`{x, y}`) in viewport (`clientX`/`clientY`) coordinates. */
  readonly center: Point;
  /** Underlying normalized multi-pointer `MotionEvent`. */
  readonly motionEvent: MotionEvent;
  /** DOM event that triggered this update (a `PointerEvent` for every pointer-driven update). */
  readonly originalEvent: Event;
}

/** @internal */
export interface ArenaContext {
  requestClaim(
    recognizer: GestureRecognizer,
    targetState: 'began' | 'ended',
    onGranted: () => void
  ): boolean;
  notifyStateChanged(
    recognizer: GestureRecognizer,
    nextState: RecognizerState,
    yieldedForMultiTouch?: boolean
  ): void;
}

/**
 * Base class for all gesture recognizers, implementing the **State** and
 * **Template Method** patterns in coordination with `GestureArena`.
 */
export abstract class GestureRecognizer {
  /** @internal */
  deniedByArena = false;

  private currentState: RecognizerState = 'possible';
  private arena: ArenaContext | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  private readonly simultaneousPeers = new Set<GestureRecognizer>();
  private readonly failureDependencies = new Set<GestureRecognizer>();

  get state(): RecognizerState {
    return this.currentState;
  }

  get active(): boolean {
    return this.currentState === 'began' || this.currentState === 'changed';
  }

  /** Allows this recognizer and `others` to win in `GestureArena` simultaneously. */
  simultaneousWith(...others: GestureRecognizer[]): this {
    for (const other of others) {
      if (other !== this) {
        this.simultaneousPeers.add(other);
      }
    }
    return this;
  }

  /**
   * Delays this recognizer's claim until all `others` transition to `'failed'`
   * (e.g. `singleTap.requireFailureOf(doubleTap)`).
   */
  requireFailureOf(...others: GestureRecognizer[]): this {
    for (const other of others) {
      if (other !== this) {
        this.failureDependencies.add(other);
      }
    }
    return this;
  }

  /**
   * Returns the least-restrictive W3C CSS `touch-action` required by this recognizer
   * so native browser scrolling and zooming remain enabled on unclaimed axes.
   */
  getTouchAction(): TouchActionValue {
    return 'none';
  }

  /**
   * Whether winning this gesture should suppress trailing synthetic DOM `click`s
   * on pointer release (true for `Pan`, `LongPress`, `Scale`, `QuickScale`, `Rotate`; false for `Tap`).
   */
  get suppressesClick(): boolean {
    return true;
  }

  /** Subclasses may override for conditional simultaneous cooperation (e.g. `QuickScale` stroke #1). */
  canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
    return this.simultaneousPeers.has(other);
  }

  /** Processes an incoming `MotionEvent` from `GestureArena`. */
  abstract onMotionEvent(event: MotionEvent): void;

  /** Resets recognizer state and clears any scheduled timer. */
  reset(): void {
    this.clearTimer();
    this.currentState = 'possible';
    this.deniedByArena = false;
    this.onReset();
  }

  /** @internal */
  get requiredFailures(): ReadonlySet<GestureRecognizer> {
    return this.failureDependencies;
  }

  /** @internal */
  get isPrioritized(): boolean {
    return false;
  }

  /** @internal */
  get acceptsMultiTouch(): boolean {
    return false;
  }

  /** @internal */
  attach(arena: ArenaContext | null): void {
    if (this.arena && !arena) {
      this.reset();
    }
    this.arena = arena;
  }

  /** @internal */
  isAttachedTo(arena: ArenaContext): boolean {
    return this.arena === arena;
  }

  /** @internal */
  prepareForDown(_event: MotionEvent): void {}

  /** @internal */
  shouldResetOnDown(_event: MotionEvent): boolean {
    return this.currentState !== 'pending';
  }

  /** @internal */
  canRearmOnPointerDown(_event: MotionEvent): boolean {
    return false;
  }

  /** @internal */
  canSustainPendingBegan(activePointerCount: number): boolean {
    return activePointerCount >= 1;
  }

  /** @internal */
  denyByArena(): void {
    if (this.currentState === 'possible' || this.currentState === 'pending') {
      this.failInternal(true);
    } else if (this.active) {
      this.cancel();
    }
  }

  /** @internal */
  setClaimState(targetState: 'pending' | 'began' | 'ended'): void {
    if (targetState === 'ended') {
      this.clearTimer();
    }
    this.currentState = targetState;
  }

  protected onReset(): void {}

  protected onCancel(): void {}

  protected onFail(): void {}

  protected tryBegin(onBegan: () => void): boolean {
    if (this.currentState !== 'possible' || !this.arena) {
      return false;
    }
    return this.arena.requestClaim(this, 'began', onBegan);
  }

  protected emitChange(onChange: () => void): void {
    if (!this.active) {
      return;
    }
    if (this.currentState === 'began') {
      this.currentState = 'changed';
      this.arena?.notifyStateChanged(this, 'changed');
    }
    onChange();
  }

  protected completeActive(onEnded?: () => void): void {
    if (!this.active) {
      return;
    }
    this.clearTimer();
    this.currentState = 'ended';
    onEnded?.();
    this.arena?.notifyStateChanged(this, 'ended');
  }

  protected tryRecognizeDiscrete(onRecognized: () => void): boolean {
    if (this.currentState !== 'possible' || !this.arena) {
      return false;
    }
    return this.arena.requestClaim(this, 'ended', onRecognized);
  }

  protected fail(): void {
    this.failInternal(false);
  }

  protected cancel(yieldedForMultiTouch = false): void {
    if (
      this.currentState === 'cancelled' ||
      this.currentState === 'ended' ||
      this.currentState === 'failed'
    ) {
      return;
    }
    const wasActive = this.active;
    this.clearTimer();
    this.currentState = 'cancelled';
    if (wasActive) {
      this.onCancel();
    }
    this.arena?.notifyStateChanged(this, 'cancelled', yieldedForMultiTouch);
  }

  protected setTimer(delayMs: number, callback: () => void): void {
    this.clearTimer();
    this.timerId = setTimeout(() => {
      this.timerId = null;
      callback();
    }, delayMs);
  }

  protected clearTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  protected createEventData(event: MotionEvent, centerOverride?: Point): GestureEventData {
    return {
      center: centerOverride ?? event.focus,
      motionEvent: event,
      originalEvent: event.originalEvent,
    };
  }

  private failInternal(byArena: boolean): void {
    if (
      this.currentState === 'failed' ||
      this.currentState === 'ended' ||
      this.currentState === 'cancelled'
    ) {
      return;
    }
    this.deniedByArena = byArena;
    this.clearTimer();
    this.currentState = 'failed';
    this.onFail();
    this.arena?.notifyStateChanged(this, 'failed');
  }
}
