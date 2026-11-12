import type {MotionEvent, Point} from './motion_event.js';
import type {TouchActionValue} from './touch_behavior.js';
import {DEFAULT_VIEW_CONFIGURATION, type ViewConfiguration} from './view_configuration.js';

export const RecognizerState = {
  /** Evaluating incoming events; has not yet claimed the gesture arena. */
  POSSIBLE: 'possible',
  /** Met recognition criteria, waiting on `requireFailureOf` dependencies to fail. */
  PENDING: 'pending',
  /** Continuous gesture claimed the arena and started. */
  BEGAN: 'began',
  /** Continuous gesture is actively updating. */
  CHANGED: 'changed',
  /** Gesture completed successfully. */
  ENDED: 'ended',
  /** Active continuous gesture was interrupted (system cancel or preemption). */
  CANCELLED: 'cancelled',
  /** Disqualified for the current gesture sequence. */
  FAILED: 'failed',
} as const;

export type RecognizerStateType = (typeof RecognizerState)[keyof typeof RecognizerState];

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
  readonly config: ViewConfiguration;
  requestClaim(
    recognizer: GestureRecognizer,
    targetState: typeof RecognizerState.BEGAN | typeof RecognizerState.ENDED,
    onGranted: () => void
  ): boolean;
  notifyStateChanged(
    recognizer: GestureRecognizer,
    nextState: RecognizerStateType,
    yieldedForMultiTouch?: boolean
  ): void;
}

/**
 * Base class for all gesture recognizers, implementing the **State** and
 * **Template Method** patterns in coordination with `GestureArena`.
 */
export abstract class GestureRecognizer {
  /** @internal */
  lastDispatchToken = 0;
  /** @internal */
  deniedByArena = false;

  private currentState: RecognizerStateType = RecognizerState.POSSIBLE;
  private arena: ArenaContext | null = null;

  private readonly simultaneousPeers = new Set<GestureRecognizer>();
  private readonly failureDependencies = new Set<GestureRecognizer>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  get state(): RecognizerStateType {
    return this.currentState;
  }

  get active(): boolean {
    return (
      this.currentState === RecognizerState.BEGAN || this.currentState === RecognizerState.CHANGED
    );
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
   * Delays this recognizer's claim until all `others` transition to `FAILED`
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

  /** Resets recognizer state and clears all scheduled timers. */
  reset(): void {
    this.clearAllTimers();
    this.currentState = RecognizerState.POSSIBLE;
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
    return this.currentState !== RecognizerState.PENDING;
  }

  /** @internal */
  canRearmOnPointerDown(_event: MotionEvent): boolean {
    return false;
  }

  /** @internal */
  denyByArena(): void {
    if (
      this.currentState === RecognizerState.POSSIBLE ||
      this.currentState === RecognizerState.PENDING
    ) {
      this.failInternal(true);
    } else if (this.active) {
      this.cancel();
    }
  }

  /** @internal */
  markPending(): void {
    this.currentState = RecognizerState.PENDING;
  }

  /** @internal */
  setClaimState(targetState: typeof RecognizerState.BEGAN | typeof RecognizerState.ENDED): void {
    if (targetState === RecognizerState.ENDED) {
      this.clearAllTimers();
    }
    this.currentState = targetState;
  }

  protected get config(): ViewConfiguration {
    return this.arena?.config ?? DEFAULT_VIEW_CONFIGURATION;
  }

  protected onReset(): void {}

  protected onCancel(): void {}

  protected onFail(): void {}

  protected tryBegin(onBegan: () => void): boolean {
    if (this.currentState !== RecognizerState.POSSIBLE || !this.arena) {
      return false;
    }
    return this.arena.requestClaim(this, RecognizerState.BEGAN, onBegan);
  }

  protected emitChange(onChange: () => void): void {
    if (!this.active) {
      return;
    }
    if (this.currentState === RecognizerState.BEGAN) {
      this.currentState = RecognizerState.CHANGED;
      this.arena?.notifyStateChanged(this, RecognizerState.CHANGED);
    }
    onChange();
  }

  protected completeActive(onEnded?: () => void): void {
    if (!this.active) {
      return;
    }
    this.clearAllTimers();
    this.currentState = RecognizerState.ENDED;
    onEnded?.();
    this.arena?.notifyStateChanged(this, RecognizerState.ENDED);
  }

  protected tryRecognizeDiscrete(onRecognized: () => void): boolean {
    if (this.currentState !== RecognizerState.POSSIBLE || !this.arena) {
      return false;
    }
    return this.arena.requestClaim(this, RecognizerState.ENDED, onRecognized);
  }

  protected fail(): void {
    this.failInternal(false);
  }

  protected cancel(yieldedForMultiTouch = false): void {
    if (
      this.currentState === RecognizerState.CANCELLED ||
      this.currentState === RecognizerState.ENDED ||
      this.currentState === RecognizerState.FAILED
    ) {
      return;
    }
    const wasActive = this.active;
    this.clearAllTimers();
    this.currentState = RecognizerState.CANCELLED;
    if (wasActive) {
      this.onCancel();
    }
    this.arena?.notifyStateChanged(this, RecognizerState.CANCELLED, yieldedForMultiTouch);
  }

  protected setTimer(key: string, delayMs: number, callback: () => void): void {
    this.clearTimer(key);
    const id = setTimeout(() => {
      this.timers.delete(key);
      callback();
    }, delayMs);
    this.timers.set(key, id);
  }

  protected clearTimer(key: string): void {
    const existing = this.timers.get(key);
    if (existing !== undefined) {
      clearTimeout(existing);
      this.timers.delete(key);
    }
  }

  protected clearAllTimers(): void {
    for (const id of this.timers.values()) {
      clearTimeout(id);
    }
    this.timers.clear();
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
      this.currentState === RecognizerState.FAILED ||
      this.currentState === RecognizerState.ENDED ||
      this.currentState === RecognizerState.CANCELLED
    ) {
      return;
    }
    this.deniedByArena = byArena;
    this.clearAllTimers();
    this.currentState = RecognizerState.FAILED;
    this.onFail();
    this.arena?.notifyStateChanged(this, RecognizerState.FAILED);
  }
}
