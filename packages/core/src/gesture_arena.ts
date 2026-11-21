import type {MotionEvent} from './motion_event.js';
import type {ArenaContext, GestureRecognizer} from './gesture_recognizer.js';
import {mergeTouchActions, type TouchActionValue} from './touch_action.js';

interface PendingClaim {
  readonly streamId: number;
  readonly targetState: 'began' | 'ended';
  readonly onGranted: (grantEvent?: MotionEvent) => void;
}

export interface GestureArenaOptions {
  readonly onGestureClaim?: (targetState: 'began' | 'ended') => void;
}

function isDispatchEligible(recognizer: GestureRecognizer): boolean {
  return (
    recognizer.state === 'possible' ||
    recognizer.state === 'began' ||
    recognizer.state === 'changed'
  );
}

/**
 * Coordinates a fixed set of competing `GestureRecognizer`s using the **Mediator** pattern:
 * - Arbitrates mutual exclusion unless either peer opts into `canRecognizeSimultaneouslyWith`.
 * - Resolves `.requireFailureOf(...)` dependencies with registration-order-independent batching.
 */
export class GestureArena implements ArenaContext {
  readonly acceptsMultiTouch: boolean;
  readonly needsCoalescedHistory: boolean;

  private readonly onGestureClaim?: (targetState: 'began' | 'ended') => void;
  private recognizers: readonly GestureRecognizer[];
  private readonly winners = new Set<GestureRecognizer>();
  private readonly pendingClaims = new Map<GestureRecognizer, PendingClaim>();

  private dispatchDepth = 0;
  private streamId = 0;
  private evaluatingPending = false;
  private suppressingWinnerInStream = false;

  constructor(recognizers: readonly GestureRecognizer[] = [], options: GestureArenaOptions = {}) {
    this.onGestureClaim = options.onGestureClaim;
    const unique = Array.from(new Set(recognizers));
    this.recognizers = unique;
    this.acceptsMultiTouch = unique.some(r => r.acceptsMultiTouch);
    this.needsCoalescedHistory = unique.some(r => r.needsCoalescedHistory);
    for (const r of unique) {
      r.attach(this);
    }
  }

  get hasActiveGesture(): boolean {
    for (const w of this.winners) {
      if (w.active) {
        return true;
      }
    }
    return false;
  }

  get didSuppressingGestureWin(): boolean {
    return this.suppressingWinnerInStream;
  }

  get shouldPreventTouchMove(): boolean {
    if (this.hasActiveGesture) {
      return true;
    }
    for (const r of this.recognizers) {
      if (r.state === 'possible' && r.blocksTouchMove) {
        return true;
      }
    }
    return false;
  }

  computeTouchAction(): TouchActionValue {
    return mergeTouchActions(this.recognizers.map(r => r.getTouchAction()));
  }

  getRecognizers(): readonly GestureRecognizer[] {
    return this.recognizers;
  }

  dispatch(event: MotionEvent): void {
    this.dispatchDepth++;
    try {
      if (event.action === 'down') {
        this.dispatchDown(event);
      } else if (event.action === 'up') {
        this.clearPendingBeganClaims();
      }

      for (const r of this.recognizers) {
        if (isDispatchEligible(r) && r.isPrioritized) {
          r.onMotionEvent(event);
        }
      }
      for (const r of this.recognizers) {
        if (isDispatchEligible(r) && !r.isPrioritized) {
          r.onMotionEvent(event);
        }
      }

      if (event.action === 'cancel') {
        for (const r of this.recognizers) {
          r.deny();
        }
        this.clearStreamTracking(true);
      }
    } finally {
      this.dispatchDepth--;
      if (this.dispatchDepth === 0) {
        this.evaluatePendingClaims(event);
      }
    }
  }

  /** @internal */
  requestClaim(
    recognizer: GestureRecognizer,
    targetState: 'began' | 'ended',
    onGranted: (grantEvent?: MotionEvent) => void
  ): boolean {
    if (!this.hasCompatibleWinners(recognizer)) {
      recognizer.deny();
      return false;
    }

    const depStatus = this.checkFailureDependencies(recognizer);
    if (depStatus === 'defeated') {
      recognizer.deny();
      return false;
    }

    if (depStatus === 'waiting') {
      this.pendingClaims.set(recognizer, {streamId: this.streamId, targetState, onGranted});
      recognizer.setClaimState('pending');
      return false;
    }

    return this.grantClaim(recognizer, targetState, onGranted, this.streamId);
  }

  /** @internal */
  notifyTerminal(recognizer: GestureRecognizer): void {
    this.winners.delete(recognizer);
    this.pendingClaims.delete(recognizer);
    if (this.dispatchDepth === 0) {
      this.evaluatePendingClaims();
    }
  }

  reset(): void {
    this.clearStreamTracking(true);
    for (const r of this.recognizers) {
      r.reset();
    }
  }

  destroy(): void {
    const prev = this.recognizers;
    this.recognizers = [];
    this.clearStreamTracking(true);
    for (const r of prev) {
      r.attach(null);
    }
  }

  private dispatchDown(event: MotionEvent): void {
    // Cancel orphaned active winners and stale pending continuous claims if a prior stream lost `up`.
    this.clearPendingBeganClaims();
    for (const r of this.recognizers) {
      if (r.active) {
        r.deny();
      }
    }

    for (const r of this.recognizers) {
      r.prepareForDown(event);
    }
    this.evaluatePendingClaims();
    this.clearStreamTracking(false);
    this.streamId++;

    for (const r of this.recognizers) {
      if (r.shouldResetOnDown()) {
        this.pendingClaims.delete(r);
        r.reset();
      }
    }
  }

  private clearPendingBeganClaims(): void {
    for (const [recognizer, claim] of this.pendingClaims) {
      if (claim.targetState === 'began') {
        this.pendingClaims.delete(recognizer);
        recognizer.deny();
      }
    }
  }

  private clearStreamTracking(includePendingClaims: boolean): void {
    this.winners.clear();
    if (includePendingClaims) {
      this.pendingClaims.clear();
    }
    this.suppressingWinnerInStream = false;
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
    const deps = recognizer.requiredFailures;
    if (!deps || deps.size === 0) {
      return 'satisfied';
    }
    for (const dep of deps) {
      if (!this.recognizers.includes(dep)) {
        continue;
      }
      if (dep.state === 'began' || dep.state === 'changed' || dep.state === 'ended') {
        return 'defeated';
      }
      if (dep.state === 'possible' || dep.state === 'pending') {
        return 'waiting';
      }
    }
    return 'satisfied';
  }

  private grantClaim(
    winner: GestureRecognizer,
    targetState: 'began' | 'ended',
    onGranted: (grantEvent?: MotionEvent) => void,
    claimStreamId: number,
    grantEvent?: MotionEvent
  ): boolean {
    const isCurrentStream = claimStreamId === this.streamId;
    this.pendingClaims.delete(winner);

    if (isCurrentStream) {
      this.winners.add(winner);
      if (winner.suppressesClick) {
        this.suppressingWinnerInStream = true;
      }
    }

    winner.setClaimState(targetState);

    if (isCurrentStream) {
      for (const other of this.recognizers) {
        if (other === winner) continue;
        const otherClaim = this.pendingClaims.get(other);
        const isPriorStreamPending =
          otherClaim !== undefined && otherClaim.streamId !== this.streamId;
        if (
          other.requiredFailures?.has(winner) ||
          (!isPriorStreamPending && !this.areCompatible(winner, other))
        ) {
          this.pendingClaims.delete(other);
          other.deny();
        }
      }
    } else {
      // A pending claim from an earlier stream (e.g. Tap #1's delayed `singleTap` resolving
      // during Tap #2) only settles peers from that same stream and never defeats the current stream.
      for (const [other, otherClaim] of this.pendingClaims) {
        if (
          other !== winner &&
          otherClaim.streamId === claimStreamId &&
          (!this.areCompatible(winner, other) || other.requiredFailures?.has(winner))
        ) {
          this.pendingClaims.delete(other);
          other.deny();
        }
      }
    }

    if (isCurrentStream) {
      this.onGestureClaim?.(targetState);
    }

    onGranted(grantEvent);
    return true;
  }

  private evaluatePendingClaims(triggerEvent?: MotionEvent): void {
    if (this.evaluatingPending || this.pendingClaims.size === 0) {
      return;
    }
    this.evaluatingPending = true;
    try {
      let progressed = true;
      while (progressed && this.pendingClaims.size > 0) {
        progressed = false;
        for (const [recognizer, claim] of this.pendingClaims) {
          if (claim.streamId === this.streamId && !this.hasCompatibleWinners(recognizer)) {
            this.pendingClaims.delete(recognizer);
            recognizer.deny();
            progressed = true;
            continue;
          }
          const depStatus = this.checkFailureDependencies(recognizer);
          if (depStatus === 'defeated') {
            this.pendingClaims.delete(recognizer);
            recognizer.deny();
            progressed = true;
          } else if (depStatus === 'satisfied') {
            const grantEvent =
              claim.streamId === this.streamId && claim.targetState === 'began'
                ? triggerEvent
                : undefined;
            this.grantClaim(
              recognizer,
              claim.targetState,
              claim.onGranted,
              claim.streamId,
              grantEvent
            );
            progressed = true;
          }
        }
      }
    } finally {
      this.evaluatingPending = false;
    }
  }
}
