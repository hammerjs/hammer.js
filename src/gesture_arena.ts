import {MotionAction, type MotionEvent} from './motion_event';
import {
  type ArenaContext,
  type GestureRecognizer,
  RecognizerState,
  type RecognizerStateType,
} from './gesture_recognizer';
import {mergeTouchActions, type TouchActionValue} from './touch_behavior';
import {VelocityTracker} from './velocity_tracker';
import {resolveViewConfiguration, type ViewConfiguration} from './view_configuration';

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
 * - Maintains a shared `VelocityTracker` across the stream.
 * - Arbitrates mutual exclusion unless either peer opts into `canRecognizeSimultaneouslyWith`.
 * - Resolves `.requireFailureOf(...)` dependencies with registration-order-independent batching.
 */
export class GestureArena implements ArenaContext {
  readonly config: ViewConfiguration;
  readonly velocityTracker: VelocityTracker;

  private readonly onActiveGestureStart?: () => void;
  private readonly recognizers: GestureRecognizer[] = [];
  private readonly winners = new Set<GestureRecognizer>();
  private readonly pendingClaims = new Map<GestureRecognizer, PendingClaim>();

  private dispatchDepth = 0;
  private nextDispatchToken = 0;
  private velocityNeeded = false;
  private totalWinnersInStream = 0;
  private yieldedWinnersInStream = 0;
  private suppressingWinnerInStream = false;

  constructor(configOverrides?: Partial<ViewConfiguration>, options: GestureArenaOptions = {}) {
    this.config = resolveViewConfiguration(configOverrides);
    this.onActiveGestureStart = options.onActiveGestureStart;
    this.velocityTracker = new VelocityTracker({
      horizonMs: this.config.velocityHorizonMs,
      assumePointerStoppedMs: this.config.assumePointerStoppedMs,
    });
  }

  get hasActiveGesture(): boolean {
    for (const w of this.winners) {
      if (w.active) {
        return true;
      }
    }
    return false;
  }

  get needsVelocity(): boolean {
    return this.velocityNeeded;
  }

  get didSuppressingGestureWin(): boolean {
    return this.suppressingWinnerInStream;
  }

  get shouldPreventTouchMove(): boolean {
    if (this.hasActiveGesture) {
      return true;
    }
    for (let i = 0; i < this.recognizers.length; i++) {
      const r = this.recognizers[i];
      if (r.state === RecognizerState.POSSIBLE && r._locksTouchMove) {
        return true;
      }
    }
    return false;
  }

  get hasLiveRecognizers(): boolean {
    for (let i = 0; i < this.recognizers.length; i++) {
      const r = this.recognizers[i];
      const state = r.state;
      if (
        state === RecognizerState.POSSIBLE ||
        state === RecognizerState.PENDING ||
        state === RecognizerState.BEGAN ||
        state === RecognizerState.CHANGED
      ) {
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
    this.recognizers.push(recognizer);
    this.velocityNeeded = this.recognizers.some(r => r.usesVelocity);
    recognizer._attach(this);
  }

  remove(recognizer: GestureRecognizer): void {
    const idx = this.recognizers.indexOf(recognizer);
    if (idx === -1) {
      return;
    }
    this.recognizers.splice(idx, 1);
    this.velocityNeeded = this.recognizers.some(r => r.usesVelocity);
    this.winners.delete(recognizer);
    this.pendingClaims.delete(recognizer);
    recognizer._attach(null);
    if (this.dispatchDepth === 0) {
      this.evaluatePendingClaims();
    }
  }

  getRecognizers(): readonly GestureRecognizer[] {
    return this.recognizers;
  }

  dispatch(event: MotionEvent): void {
    if (this.velocityNeeded) {
      this.velocityTracker.recordStreamEvent(event, this.config.maximumFlingVelocity);
    }

    this.dispatchDepth++;
    try {
      if (event.action === MotionAction.DOWN) {
        for (let i = 0; i < this.recognizers.length; i++) {
          this.recognizers[i]._prepareForDown(event);
        }
        this.evaluatePendingClaims();

        this.winners.clear();
        this.totalWinnersInStream = 0;
        this.yieldedWinnersInStream = 0;
        this.suppressingWinnerInStream = false;

        for (let i = 0; i < this.recognizers.length; i++) {
          const r = this.recognizers[i];
          if (r._shouldResetOnDown(event)) {
            this.pendingClaims.delete(r);
            r.reset();
          }
        }
      }

      if (event.action === MotionAction.POINTER_DOWN) {
        const token = ++this.nextDispatchToken;
        for (let i = 0; i < this.recognizers.length; i++) {
          const r = this.recognizers[i];
          if (r.active) {
            r._lastDispatchToken = token;
            r.onMotionEvent(event);
          }
        }

        const canHandoffToMultiTouch =
          this.totalWinnersInStream > 0 &&
          this.yieldedWinnersInStream === this.totalWinnersInStream;

        if (canHandoffToMultiTouch) {
          for (let i = 0; i < this.recognizers.length; i++) {
            const r = this.recognizers[i];
            if (
              r.state === RecognizerState.FAILED &&
              r._deniedByArena &&
              r._canRearmOnPointerDown(event) &&
              this.hasCompatibleWinners(r)
            ) {
              r.reset();
            }
          }
        }

        for (let i = 0; i < this.recognizers.length; i++) {
          const r = this.recognizers[i];
          if (!isDispatchEligible(r) || r._lastDispatchToken === token) continue;
          r.onMotionEvent(event);
        }
        return;
      }

      const token = ++this.nextDispatchToken;
      for (let i = 0; i < this.recognizers.length; i++) {
        const r = this.recognizers[i];
        if (isDispatchEligible(r) && r._isPrioritized) {
          r._lastDispatchToken = token;
          r.onMotionEvent(event);
        }
      }
      for (let i = 0; i < this.recognizers.length; i++) {
        const r = this.recognizers[i];
        if (!isDispatchEligible(r) || r._lastDispatchToken === token) continue;
        r.onMotionEvent(event);
      }

      if (event.action === MotionAction.CANCEL) {
        for (let i = 0; i < this.recognizers.length; i++) {
          this.recognizers[i]._denyByArena();
        }
        this.winners.clear();
        this.pendingClaims.clear();
        this.suppressingWinnerInStream = false;
      }
    } finally {
      this.dispatchDepth--;
      if (this.dispatchDepth === 0) {
        this.evaluatePendingClaims();
        for (let i = 0; i < this.recognizers.length; i++) {
          this.recognizers[i]._observeStreamEvent(event);
        }
      }
    }
  }

  requestClaim(
    recognizer: GestureRecognizer,
    targetState: typeof RecognizerState.BEGAN | typeof RecognizerState.ENDED,
    onGranted: () => void
  ): boolean {
    if (!this.hasCompatibleWinners(recognizer)) {
      recognizer._denyByArena();
      return false;
    }

    const dependencyStatus = this.checkFailureDependencies(recognizer);
    if (dependencyStatus === 'defeated') {
      recognizer._denyByArena();
      return false;
    }

    if (dependencyStatus === 'waiting') {
      this.pendingClaims.set(recognizer, {targetState, onGranted});
      recognizer._markPending();
      return false;
    }

    this.grantClaim(recognizer, targetState, onGranted);
    return true;
  }

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
    this.winners.clear();
    this.pendingClaims.clear();
    this.velocityTracker.clear();
    this.totalWinnersInStream = 0;
    this.yieldedWinnersInStream = 0;
    this.suppressingWinnerInStream = false;
    for (const r of this.recognizers) {
      r.reset();
    }
  }

  destroy(): void {
    this.reset();
    for (const r of this.recognizers) {
      r._attach(null);
    }
    this.recognizers.length = 0;
    this.velocityNeeded = false;
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
    for (const dep of recognizer._requiredFailures) {
      if (!this.recognizers.includes(dep)) {
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

  private grantClaim(
    winner: GestureRecognizer,
    targetState: typeof RecognizerState.BEGAN | typeof RecognizerState.ENDED,
    onGranted: () => void
  ): void {
    this.pendingClaims.delete(winner);
    this.winners.add(winner);
    this.totalWinnersInStream++;
    if (winner.suppressesClick) {
      this.suppressingWinnerInStream = true;
    }

    if (targetState === RecognizerState.BEGAN) {
      this.onActiveGestureStart?.();
    }

    winner._acceptClaim(targetState, onGranted);

    for (const other of this.recognizers) {
      if (other === winner) continue;
      if (!this.areCompatible(winner, other) || other._requiredFailures.has(winner)) {
        this.pendingClaims.delete(other);
        other._denyByArena();
      }
    }
  }

  private evaluatePendingClaims(): void {
    if (this.pendingClaims.size === 0) {
      return;
    }
    for (const [recognizer, claim] of Array.from(this.pendingClaims.entries())) {
      if (!this.pendingClaims.has(recognizer)) continue;
      if (this.checkFailureDependencies(recognizer) === 'satisfied') {
        this.grantClaim(recognizer, claim.targetState, claim.onGranted);
      }
    }
  }
}
