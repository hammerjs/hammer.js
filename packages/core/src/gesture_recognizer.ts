import type {MotionEvent, Point} from './motion_event.js';
import type {TouchActionValue} from './touch_behavior.js';

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
  notifyStateChanged(recognizer: GestureRecognizer): void;
}

/**
 * Base class for all gesture recognizers, implementing the **State** and
 * **Template Method** patterns in coordination with `GestureArena`.
 */
export abstract class GestureRecognizer {
  private currentState: RecognizerState = 'possible';
  private arena: ArenaContext | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;

  private simultaneousPeers: Set<GestureRecognizer> | null = null;
  private failureDependencies: Set<GestureRecognizer> | null = null;

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
        (this.simultaneousPeers ??= new Set()).add(other);
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
        (this.failureDependencies ??= new Set()).add(other);
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
    return this.simultaneousPeers?.has(other) ?? false;
  }

  /** Processes an incoming `MotionEvent` from `GestureArena`. */
  abstract onMotionEvent(event: MotionEvent): void;

  /** @internal */
  reset(): void {
    this.clearTimer();
    this.currentState = 'possible';
    this.onReset();
  }

  /** @internal */
  get requiredFailures(): ReadonlySet<GestureRecognizer> | null {
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
  get needsCoalescedHistory(): boolean {
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
  shouldResetOnDown(): boolean {
    return this.currentState !== 'pending';
  }

  /** @internal */
  denyByArena(): void {
    if (this.currentState === 'possible' || this.currentState === 'pending') {
      this.fail();
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

  protected emitChange(): boolean {
    if (!this.active) {
      return false;
    }
    if (this.currentState === 'began') {
      this.currentState = 'changed';
    }
    return true;
  }

  protected completeActive(): boolean {
    if (!this.active) {
      return false;
    }
    this.clearTimer();
    this.currentState = 'ended';
    return true;
  }

  protected tryRecognizeDiscrete(onRecognized: () => void): boolean {
    if (this.currentState !== 'possible' || !this.arena) {
      return false;
    }
    return this.arena.requestClaim(this, 'ended', onRecognized);
  }

  protected fail(): void {
    if (
      this.currentState === 'failed' ||
      this.currentState === 'ended' ||
      this.currentState === 'cancelled'
    ) {
      return;
    }
    this.clearTimer();
    this.currentState = 'failed';
    this.onFail();
    this.arena?.notifyStateChanged(this);
  }

  protected cancel(): void {
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
    this.arena?.notifyStateChanged(this);
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
}
