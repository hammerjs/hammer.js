import {MotionAction, type MotionEvent} from './motion_event.js';
import {
  type GestureRecognizer,
  RecognizerState,
  type RecognizerStateType,
} from './gesture_recognizer.js';
import {mergeTouchActions, type TouchActionValue} from './touch_behavior.js';
import {resolveViewConfiguration, type ViewConfiguration} from './view_configuration.js';

interface PendingClaim {
  readonly targetState: typeof RecognizerState.BEGAN | typeof RecognizerState.ENDED;
  readonly onGranted: () => void;
}

export interface GestureArenaOptions {
  readonly onActiveGestureStart?: () => void;
}

function isDispatchEligible(recognizer: GestureRecognizer): boolean {
  return (
    recognizer.state === RecognizerState.POSSIBLE ||
    recognizer.state === RecognizerState.BEGAN ||
    recognizer.state === RecognizerState.CHANGED
  );
}

/**
 * Coordinates competing `GestureRecognizer`s using the **Mediator** pattern:
 * - Arbitrates mutual exclusion unless either peer opts into `canRecognizeSimultaneouslyWith`.
 * - Resolves `.requireFailureOf(...)` dependencies with registration-order-independent batching.
 */
export class GestureArena {
  private currentConfig: ViewConfiguration;

  private readonly onActiveGestureStart?: () => void;
  private recognizers: readonly GestureRecognizer[] = [];
  private readonly winners = new Set<GestureRecognizer>();
  private readonly pendingClaims = new Map<GestureRecognizer, PendingClaim>();

  private dispatchDepth = 0;
  private evaluatingPending = false;
  private nextDispatchToken = 0;
  private multiTouchAccepted = false;
  private totalWinnersInStream = 0;
  private yieldedWinnersInStream = 0;
  private suppressingWinnerInStream = false;

  constructor(configOverrides?: Partial<ViewConfiguration>, options: GestureArenaOptions = {}) {
    this.currentConfig = resolveViewConfiguration(configOverrides);
    this.onActiveGestureStart = options.onActiveGestureStart;
  }

  get config(): ViewConfiguration {
    return this.currentConfig;
  }

  setConfig(configOverrides?: Partial<ViewConfiguration>): void {
    this.currentConfig = resolveViewConfiguration(configOverrides);
  }

  get hasActiveGesture(): boolean {
    for (const w of this.winners) {
      if (w.active) {
        return true;
      }
    }
    return false;
  }

  get acceptsMultiTouch(): boolean {
    return this.multiTouchAccepted;
  }

  get didSuppressingGestureWin(): boolean {
    return this.suppressingWinnerInStream;
  }

  get shouldPreventTouchMove(): boolean {
    if (this.hasActiveGesture) {
      return true;
    }
    for (const r of this.recognizers) {
      if (r.state === RecognizerState.POSSIBLE && r.isPrioritized) {
        return true;
      }
    }
    return false;
  }

  computeTouchAction(): TouchActionValue {
    return mergeTouchActions(this.recognizers.map(r => r.getTouchAction()));
  }

  add(recognizer: GestureRecognizer): void {
    if (this.recognizers.includes(recognizer)) {
      return;
    }
    this.recognizers = [...this.recognizers, recognizer];
    recognizer.attach(this);
    this.refreshCapabilities();
  }

  remove(recognizer: GestureRecognizer): void {
    if (!this.recognizers.includes(recognizer)) {
      return;
    }
    this.recognizers = this.recognizers.filter(r => r !== recognizer);
    this.refreshCapabilities();
    this.winners.delete(recognizer);
    this.pendingClaims.delete(recognizer);
    recognizer.attach(null);
    if (this.dispatchDepth === 0) {
      this.evaluatePendingClaims();
    }
  }

  getRecognizers(): readonly GestureRecognizer[] {
    return this.recognizers;
  }

  dispatch(event: MotionEvent): void {
    this.dispatchDepth++;
    try {
      const recognizers = this.recognizers;

      if (event.action === MotionAction.DOWN) {
        // If a prior stream was orphaned without `UP`/`CANCEL`, cancel active winners cleanly first.
        for (const r of recognizers) {
          if (r.isAttachedTo(this) && r.active) {
            r.denyByArena();
          }
        }

        for (const r of recognizers) {
          if (r.isAttachedTo(this)) {
            r.prepareForDown(event);
          }
        }
        this.evaluatePendingClaims();
        this.clearStreamTracking(false);

        for (const r of recognizers) {
          if (r.isAttachedTo(this) && r.shouldResetOnDown(event)) {
            this.pendingClaims.delete(r);
            r.reset();
          }
        }
      }

      if (event.action === MotionAction.POINTER_DOWN) {
        const token = ++this.nextDispatchToken;
        for (const r of recognizers) {
          if (r.isAttachedTo(this) && r.active) {
            r.lastDispatchToken = token;
            r.onMotionEvent(event);
          }
        }

        const canHandoffToMultiTouch =
          this.totalWinnersInStream > 0 &&
          this.yieldedWinnersInStream === this.totalWinnersInStream;

        if (canHandoffToMultiTouch) {
          for (const r of recognizers) {
            if (
              r.isAttachedTo(this) &&
              r.state === RecognizerState.FAILED &&
              r.deniedByArena &&
              r.canRearmOnPointerDown(event) &&
              this.hasCompatibleWinners(r)
            ) {
              r.reset();
            }
          }
        }

        for (const r of recognizers) {
          if (r.isAttachedTo(this) && r.lastDispatchToken !== token && isDispatchEligible(r)) {
            r.lastDispatchToken = token;
            r.onMotionEvent(event);
          }
        }
        return;
      }

      const token = ++this.nextDispatchToken;
      for (const r of recognizers) {
        if (r.isAttachedTo(this) && isDispatchEligible(r) && r.isPrioritized) {
          r.lastDispatchToken = token;
          r.onMotionEvent(event);
        }
      }
      for (const r of recognizers) {
        if (r.isAttachedTo(this) && r.lastDispatchToken !== token && isDispatchEligible(r)) {
          r.lastDispatchToken = token;
          r.onMotionEvent(event);
        }
      }

      if (event.action === MotionAction.CANCEL) {
        for (const r of recognizers) {
          if (r.isAttachedTo(this)) {
            r.denyByArena();
          }
        }
        this.winners.clear();
        this.pendingClaims.clear();
        this.suppressingWinnerInStream = false;
      }
    } finally {
      this.dispatchDepth--;
      if (this.dispatchDepth === 0) {
        this.evaluatePendingClaims();
      }
    }
  }

  /** @internal */
  requestClaim(
    recognizer: GestureRecognizer,
    targetState: typeof RecognizerState.BEGAN | typeof RecognizerState.ENDED,
    onGranted: () => void
  ): boolean {
    if (!this.hasCompatibleWinners(recognizer)) {
      recognizer.denyByArena();
      return false;
    }

    const dependencyStatus = this.checkFailureDependencies(recognizer);
    if (dependencyStatus === 'defeated') {
      recognizer.denyByArena();
      return false;
    }

    if (dependencyStatus === 'waiting') {
      this.pendingClaims.set(recognizer, {targetState, onGranted});
      recognizer.markPending();
      return false;
    }

    return this.grantClaim(recognizer, targetState, onGranted);
  }

  /** @internal */
  notifyStateChanged(
    recognizer: GestureRecognizer,
    nextState: RecognizerStateType,
    yieldedForMultiTouch = false
  ): void {
    if (nextState === RecognizerState.FAILED || nextState === RecognizerState.CANCELLED) {
      const wasWinner = this.winners.delete(recognizer);
      if (wasWinner && nextState === RecognizerState.CANCELLED && yieldedForMultiTouch) {
        this.yieldedWinnersInStream++;
      }
      this.pendingClaims.delete(recognizer);
      if (this.dispatchDepth === 0) {
        this.evaluatePendingClaims();
      }
    }
  }

  reset(): void {
    const recognizers = this.recognizers;
    this.clearStreamTracking(true);
    for (const r of recognizers) {
      r.reset();
    }
  }

  destroy(): void {
    const recognizers = this.recognizers;
    this.recognizers = [];
    this.clearStreamTracking(true);
    this.multiTouchAccepted = false;
    for (const r of recognizers) {
      r.attach(null);
    }
  }

  private clearStreamTracking(includePendingClaims: boolean): void {
    this.winners.clear();
    if (includePendingClaims) {
      this.pendingClaims.clear();
    }
    this.totalWinnersInStream = 0;
    this.yieldedWinnersInStream = 0;
    this.suppressingWinnerInStream = false;
  }

  private refreshCapabilities(): void {
    this.multiTouchAccepted = this.recognizers.some(r => r.acceptsMultiTouch);
  }

  private areCompatible(a: GestureRecognizer, b: GestureRecognizer): boolean {
    return a.canRecognizeSimultaneouslyWith(b) || b.canRecognizeSimultaneouslyWith(a);
  }

  private hasCompatibleWinners(candidate: GestureRecognizer): boolean {
    for (const winner of this.winners) {
      if (!this.areCompatible(candidate, winner)) {
        return false;
      }
    }
    return true;
  }

  private checkFailureDependencies(
    recognizer: GestureRecognizer
  ): 'satisfied' | 'waiting' | 'defeated' {
    for (const dep of recognizer.requiredFailures) {
      if (!dep.isAttachedTo(this)) {
        continue;
      }
      if (
        dep.state === RecognizerState.BEGAN ||
        dep.state === RecognizerState.CHANGED ||
        dep.state === RecognizerState.ENDED
      ) {
        return 'defeated';
      }
      if (dep.state === RecognizerState.POSSIBLE || dep.state === RecognizerState.PENDING) {
        return 'waiting';
      }
    }
    return 'satisfied';
  }

  /** Returns `false` if a re-entrant callback detached `winner` while defeating its competitors. */
  private grantClaim(
    winner: GestureRecognizer,
    targetState: typeof RecognizerState.BEGAN | typeof RecognizerState.ENDED,
    onGranted: () => void
  ): boolean {
    this.pendingClaims.delete(winner);
    this.winners.add(winner);
    this.totalWinnersInStream++;
    if (winner.suppressesClick) {
      this.suppressingWinnerInStream = true;
    }

    winner.setClaimState(targetState);

    for (const other of this.recognizers) {
      if (other === winner || !other.isAttachedTo(this)) continue;
      if (!this.areCompatible(winner, other) || other.requiredFailures.has(winner)) {
        this.pendingClaims.delete(other);
        other.denyByArena();
      }
    }

    if (!winner.isAttachedTo(this)) {
      return false;
    }

    if (targetState === RecognizerState.BEGAN) {
      this.onActiveGestureStart?.();
    }

    onGranted();
    return true;
  }

  private evaluatePendingClaims(): void {
    if (this.evaluatingPending || this.pendingClaims.size === 0) {
      return;
    }
    this.evaluatingPending = true;
    try {
      let progressed = true;
      while (progressed && this.pendingClaims.size > 0) {
        progressed = false;
        for (const [recognizer, claim] of this.pendingClaims) {
          if (!this.hasCompatibleWinners(recognizer)) {
            this.pendingClaims.delete(recognizer);
            recognizer.denyByArena();
            progressed = true;
            continue;
          }
          if (this.checkFailureDependencies(recognizer) === 'satisfied') {
            this.grantClaim(recognizer, claim.targetState, claim.onGranted);
            progressed = true;
          }
        }
      }
    } finally {
      this.evaluatingPending = false;
    }
  }
}
