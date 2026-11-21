import type {MotionEvent, Point} from './motion_event.js';
import type {TouchActionValue} from './touch_action.js';

export type RecognizerState =
  'possible' | 'pending' | 'began' | 'changed' | 'ended' | 'cancelled' | 'failed';

export type GestureKind = 'continuous' | 'discrete';

export interface GestureEventData {
  /** Focal point (`{x, y}`) in viewport (`clientX`/`clientY`) coordinates. */
  readonly center: Point;
  /** Input modality (`'touch'`, `'pen'`, or `'mouse'`). */
  readonly pointerType: string;
  /** DOM target of the triggering event (`originalEvent.target`). */
  readonly target: EventTarget | null;
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
    onGranted: (grantEvent?: MotionEvent) => void
  ): boolean;
  notifyTerminal(recognizer: GestureRecognizer): void;
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

  /**
   * Classification of this gesture's lifecycle (`'continuous'` for drag/pinch/rotate/hold,
   * `'discrete'` for atomic point-in-time gestures like `Tap`).
   *
   * Determines default surface coexistence (`user-select: none`, `dragstart`/`contextmenu` guards)
   * and whether multi-stroke gestures such as `QuickScale` may coexist on their opening stroke.
   */
  get gestureKind(): GestureKind {
    return 'continuous';
  }

  /**
   * Whether winning this gesture should suppress trailing synthetic DOM `click`s on pointer release.
   * Defaults to `true` for `'continuous'` gestures and `false` for `'discrete'` gestures;
   * subclasses may override independently of `gestureKind`.
   */
  get suppressesClick(): boolean {
    return this.gestureKind === 'continuous';
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

  /** Subclasses may override for conditional simultaneous cooperation (e.g. `QuickScale` stroke #1). */
  canRecognizeSimultaneouslyWith(other: GestureRecognizer): boolean {
    return this.simultaneousPeers?.has(other) ?? false;
  }

  /**
   * Processes an incoming `MotionEvent` from `GestureArena`, dispatching to the
   * pointer-stream lifecycle hooks below:
   *
   * ```
   * Single-pointer:  onDown -> onMove* -> onUp (or onPointerCancel)
   * Multi-pointer:   onDown -> onPointerDown* -> onMove* -> onPointerUp* -> onUp (or onPointerCancel)
   * ```
   */
  onMotionEvent(event: MotionEvent): void {
    switch (event.action) {
      case 'down':
        this.onDown(event);
        break;
      case 'pointer_down':
        this.onPointerDown(event);
        break;
      case 'move':
        this.onMove(event);
        break;
      case 'pointer_up':
        this.onPointerUp(event);
        break;
      case 'up':
        this.onUp(event);
        break;
      case 'cancel':
        this.onPointerCancel(event);
        break;
    }
  }

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
  get blocksTouchMove(): boolean {
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
  prepareForDown(_event: MotionEvent): void {}

  /** @internal */
  shouldResetOnDown(): boolean {
    return this.currentState !== 'pending';
  }

  /** @internal */
  deny(): void {
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

  /**
   * Called when the **first** pointer contacts the surface (`action === 'down'`), starting a new
   * pointer stream (`event.activePointerCount === 1`). Record initial anchors or arm timers here.
   */
  protected onDown(_event: MotionEvent): void {}

  /**
   * Called when an **additional** (2nd, 3rd, ...) pointer contacts the surface while at least one
   * pointer is already down (`action === 'pointer_down'`, `event.activePointerCount >= 2`).
   * The newly added pointer is `event.pointers[event.actionIndex]`. Re-anchor multi-pointer metrics
   * or fail/cancel single-pointer gestures here.
   */
  protected onPointerDown(_event: MotionEvent): void {}

  /**
   * Called when any active pointer moves (`action === 'move'`).
   * The moving pointer is `event.pointers[event.actionIndex]` (with optional coalesced samples in
   * `event.history`). Evaluate slop thresholds to call `tryBegin(...)` or emit active updates via
   * `emitChange()`.
   */
  protected onMove(_event: MotionEvent): void {}

  /**
   * Called when a non-final pointer lifts while at least one other pointer remains on the surface
   * (`action === 'pointer_up'`, `event.activePointerCount >= 1`). The lifting pointer is
   * `event.pointers[event.actionIndex]`, while `event.focus` and `event.getActivePointers()`
   * reflect the remaining pointers for jump-free re-anchoring.
   */
  protected onPointerUp(_event: MotionEvent): void {}

  /**
   * Called when the **final** remaining pointer lifts cleanly (`action === 'up'`,
   * `event.activePointerCount === 0`), ending the pointer stream. Complete active continuous
   * gestures via `completeActive()`, trigger discrete gestures via `tryRecognizeDiscrete(...)`,
   * or call `fail()` if recognition criteria were not met.
   */
  protected onUp(_event: MotionEvent): void {}

  /**
   * Called when the pointer stream is aborted externally (`action === 'cancel'`,
   * `event.activePointerCount === 0` — e.g. native scroll takeover, `pointercancel`, window `blur`,
   * lost capture, or `GestureManager.cancel()`). Defaults to calling `this.cancel()`.
   */
  protected onPointerCancel(_event: MotionEvent): void {
    this.cancel();
  }

  protected onReset(): void {}

  protected onCancel(): void {}

  protected onFail(): void {}

  protected tryBegin(onBegan: (grantEvent?: MotionEvent) => void): boolean {
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
    this.arena?.notifyTerminal(this);
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
    this.arena?.notifyTerminal(this);
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
      pointerType: event.pointerType,
      target: event.originalEvent.target,
      motionEvent: event,
      originalEvent: event.originalEvent,
    };
  }
}
