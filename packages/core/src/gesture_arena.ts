import type {MotionEvent} from './motion_event.js';
import type {GestureRecognizer} from './gesture_recognizer.js';
import {mergeTouchActions, type TouchActionValue} from './touch_behavior.js';

interface PendingClaim {
  readonly streamId: number;
  readonly targetState: 'began' | 'ended';
  readonly onGranted: () => void;
}

export interface GestureArenaOptions {
  readonly onActiveGestureStart?: () => void;
}

function isDispatchEligible(recognizer: GestureRecognizer): boolean {
  return (
    recognizer.state === 'possible' ||
    recognizer.state === 'began' ||
    recognizer.state === 'changed'
  );
}

/**
 * Coordinates competing `GestureRecognizer`s using the **Mediator** pattern:
 * - Arbitrates mutual exclusion unless either peer opts into `canRecognizeSimultaneouslyWith`.
 * - Resolves `.requireFailureOf(...)` dependencies with registration-order-independent batching.
 */
export class GestureArena {
  private readonly onActiveGestureStart?: () => void;
  private recognizers: readonly GestureRecognizer[] = [];
  private readonly winners = new Set<GestureRecognizer>();
  private readonly pendingClaims = new Map<GestureRecognizer, PendingClaim>();

  private dispatchDepth = 0;
  private streamId = 0;
  private evaluatingPending = false;
  private multiTouchAccepted = false;
  private coalescedHistoryNeeded = false;
  private suppressingWinnerInStream = false;

  constructor(options: GestureArenaOptions = {}) {
    this.onActiveGestureStart = options.onActiveGestureStart;
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

  get needsCoalescedHistory(): boolean {
    return this.coalescedHistoryNeeded;
  }

  get didSuppressingGestureWin(): boolean {
    return this.suppressingWinnerInStream;
  }

  get shouldPreventTouchMove(): boolean {
    if (this.hasActiveGesture) {
      return true;
    }
    for (const r of this.recognizers) {
      if (r.state === 'possible' && r.isPrioritized) {
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

      if (event.action === 'down') {
        this.dispatchDown(event, recognizers);
      } else if (event.action === 'up') {
        this.clearPendingBeganClaims();
      }

      for (const r of recognizers) {
        if (r.isAttachedTo(this) && isDispatchEligible(r) && r.isPrioritized) {
          r.onMotionEvent(event);
        }
      }
      for (const r of recognizers) {
        if (r.isAttachedTo(this) && isDispatchEligible(r) && !r.isPrioritized) {
          r.onMotionEvent(event);
        }
      }

      if (event.action === 'cancel') {
        this.dispatchCancel(recognizers);
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
    targetState: 'began' | 'ended',
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
      this.pendingClaims.set(recognizer, {streamId: this.streamId, targetState, onGranted});
      recognizer.setClaimState('pending');
      return false;
    }

    return this.grantClaim(recognizer, targetState, onGranted, this.streamId);
  }

  /** @internal */
  notifyStateChanged(recognizer: GestureRecognizer): void {
    this.winners.delete(recognizer);
    this.pendingClaims.delete(recognizer);
    if (this.dispatchDepth === 0) {
      this.evaluatePendingClaims();
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
    this.coalescedHistoryNeeded = false;
    for (const r of recognizers) {
      r.attach(null);
    }
  }

  private dispatchDown(event: MotionEvent, recognizers: readonly GestureRecognizer[]): void {
    // If a prior stream was orphaned without `'up'`/`'cancel'`, cancel active winners and
    // stale continuous `'began'` claims cleanly first.
    this.clearPendingBeganClaims();
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
    this.streamId++;

    for (const r of recognizers) {
      if (r.isAttachedTo(this) && r.shouldResetOnDown()) {
        this.pendingClaims.delete(r);
        r.reset();
      }
    }
  }

  private dispatchCancel(recognizers: readonly GestureRecognizer[]): void {
    for (const r of recognizers) {
      if (r.isAttachedTo(this)) {
        r.denyByArena();
      }
    }
    this.winners.clear();
    this.pendingClaims.clear();
    this.suppressingWinnerInStream = false;
  }

  private clearPendingBeganClaims(): void {
    for (const [recognizer, claim] of this.pendingClaims) {
      if (claim.targetState === 'began') {
        this.pendingClaims.delete(recognizer);
        recognizer.denyByArena();
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

  private refreshCapabilities(): void {
    this.multiTouchAccepted = this.recognizers.some(r => r.acceptsMultiTouch);
    this.coalescedHistoryNeeded = this.recognizers.some(r => r.needsCoalescedHistory);
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
      if (!dep.isAttachedTo(this)) {
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

  /** Returns `false` if a re-entrant callback detached `winner` while defeating its competitors. */
  private grantClaim(
    winner: GestureRecognizer,
    targetState: 'began' | 'ended',
    onGranted: () => void,
    claimStreamId: number
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
        if (other === winner || !other.isAttachedTo(this)) continue;
        const otherClaim = this.pendingClaims.get(other);
        const isPriorStreamPending =
          otherClaim !== undefined && otherClaim.streamId !== this.streamId;
        if (
          other.requiredFailures?.has(winner) ||
          (!isPriorStreamPending && !this.areCompatible(winner, other))
        ) {
          this.pendingClaims.delete(other);
          other.denyByArena();
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
          other.denyByArena();
        }
      }
    }

    if (!winner.isAttachedTo(this)) {
      return false;
    }

    if (isCurrentStream && targetState === 'began') {
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
          if (claim.streamId === this.streamId && !this.hasCompatibleWinners(recognizer)) {
            this.pendingClaims.delete(recognizer);
            recognizer.denyByArena();
            progressed = true;
            continue;
          }
          const depStatus = this.checkFailureDependencies(recognizer);
          if (depStatus === 'defeated') {
            this.pendingClaims.delete(recognizer);
            recognizer.denyByArena();
            progressed = true;
          } else if (depStatus === 'satisfied') {
            this.grantClaim(recognizer, claim.targetState, claim.onGranted, claim.streamId);
            progressed = true;
          }
        }
      }
    } finally {
      this.evaluatingPending = false;
    }
  }
}
