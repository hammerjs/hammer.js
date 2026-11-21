import {distance, type MotionEvent, type Point} from '../motion_event.js';

export const MAX_TAP_DURATION_MS = 250;
export const DOUBLE_TAP_TIMEOUT_MS = 300;
export const DOUBLE_TAP_SLOP = 100;
const DOUBLE_TAP_MIN_TIME_MS = 40;

/** Captures the timing, location, and pointer device of a completed tap for follow-up validation. */
export interface TapAnchor {
  readonly downFocus: Point;
  readonly upTime: number;
  readonly pointerType: string;
}

/**
 * Returns `true` when `event` arrives within the multi-tap interval of `anchor`,
 * rejecting cross-device mismatches and sub-40ms capacitive touch bounces.
 */
export function isWithinTapWindow(
  event: MotionEvent,
  anchor: TapAnchor,
  maxInterval = DOUBLE_TAP_TIMEOUT_MS
): boolean {
  const dt = event.eventTime - anchor.upTime;
  const minInterval = event.pointerType === 'touch' ? DOUBLE_TAP_MIN_TIME_MS : 0;
  const pointerMatches = anchor.pointerType === '' || event.pointerType === anchor.pointerType;
  return pointerMatches && dt >= minInterval && dt <= maxInterval;
}

/** Returns `true` when `focus` lands within `maxSlop` px of `anchor.downFocus`. */
export function isWithinTapSlop(
  focus: Point,
  anchor: TapAnchor,
  maxSlop = DOUBLE_TAP_SLOP
): boolean {
  return distance(focus, anchor.downFocus) <= maxSlop;
}
