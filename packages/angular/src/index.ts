import {
  Directive,
  ElementRef,
  NgZone,
  Output,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type OutputRef,
  type OutputRefSubscription,
} from '@angular/core';
import {
  Hammer,
  type GestureEventData,
  type GestureTargetElement,
  type HammerOptions,
  type LongPressEventData,
  type PanEventData,
  type RotateEventData,
  type ScaleEventData,
  type SwipeEventData,
} from '@hammerjs/core';

export type {GestureTargetElement, HammerOptions};

export type HammerDirectiveOptions = Pick<
  HammerOptions,
  | 'supportedPointerTypes'
  | 'touchAction'
  | 'ignoreTarget'
  | 'tap'
  | 'doubleTap'
  | 'longPress'
  | 'pan'
  | 'scale'
  | 'quickScale'
  | 'rotate'
>;

class TrackedOutput<T> implements OutputRef<T> {
  private readonly listeners = new Set<(value: T) => void>();
  private readonly onObservedChange?: () => void;

  constructor(onObservedChange?: () => void) {
    this.onObservedChange = onObservedChange;
  }

  get observed(): boolean {
    return this.listeners.size > 0;
  }

  subscribe(callback: (value: T) => void): OutputRefSubscription {
    const wasObserved = this.listeners.size > 0;
    this.listeners.add(callback);
    if (!wasObserved) {
      this.onObservedChange?.();
    }
    return {
      unsubscribe: () => {
        if (this.listeners.delete(callback) && this.listeners.size === 0) {
          this.onObservedChange?.();
        }
      },
    };
  }

  emit(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }
}

type OutputMapping = readonly [keyof HammerDirective, keyof HammerOptions];

const OUTPUT_MAP: readonly OutputMapping[] = [
  ['hammerTap', 'onTap'],
  ['hammerDoubleTap', 'onDoubleTap'],
  ['hammerLongPress', 'onLongPress'],
  ['hammerLongPressMove', 'onLongPressMove'],
  ['hammerLongPressUp', 'onLongPressUp'],
  ['hammerLongPressCancel', 'onLongPressCancel'],
  ['hammerPanStart', 'onPanStart'],
  ['hammerPan', 'onPan'],
  ['hammerPanEnd', 'onPanEnd'],
  ['hammerPanCancel', 'onPanCancel'],
  ['hammerSwipe', 'onSwipe'],
  ['hammerScaleStart', 'onScaleStart'],
  ['hammerScale', 'onScale'],
  ['hammerScaleEnd', 'onScaleEnd'],
  ['hammerScaleCancel', 'onScaleCancel'],
  ['hammerRotateStart', 'onRotateStart'],
  ['hammerRotate', 'onRotate'],
  ['hammerRotateEnd', 'onRotateEnd'],
  ['hammerRotateCancel', 'onRotateCancel'],
];

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'function') {
    return '[fn]';
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => [k, normalizeValue(v)]);
  }
  return value;
}

function serializeConfig(config: HammerDirectiveOptions): string {
  return JSON.stringify(normalizeValue(config));
}

/**
 * Standalone Angular directive that attaches a {@link Hammer} instance to its host element.
 *
 * - Runs DOM pointer listeners outside `NgZone` (when present) and re-enters the zone only when
 *   a gesture event actually fires.
 * - Only registers recognizers for outputs that have active listeners, preserving least-restrictive
 *   CSS `touch-action`.
 * - Automatically cleans up listeners and inline styles on destroy.
 */
@Directive({
  selector: '[hammer]',
  standalone: true,
  exportAs: 'hammer',
})
export class HammerDirective<T extends GestureTargetElement = HTMLElement> {
  private readonly elementRef = inject<ElementRef<T>>(ElementRef);
  private readonly ngZone = inject(NgZone, {optional: true});
  private readonly outputVersion = signal(0);

  private readonly onOutputObservedChange = (): void => {
    this.outputVersion.update(v => v + 1);
  };

  /** Recognizer & pointer configuration. Accepts `''` for bare `<div hammer>` usage. */
  readonly hammer = input<HammerDirectiveOptions | ''>('');

  @Output() readonly hammerTap: OutputRef<GestureEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerDoubleTap: OutputRef<GestureEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerLongPress: OutputRef<LongPressEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerLongPressMove: OutputRef<LongPressEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerLongPressUp: OutputRef<LongPressEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerLongPressCancel: OutputRef<void> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerPanStart: OutputRef<PanEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerPan: OutputRef<PanEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerPanEnd: OutputRef<PanEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerPanCancel: OutputRef<void> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerSwipe: OutputRef<SwipeEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerScaleStart: OutputRef<ScaleEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerScale: OutputRef<ScaleEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerScaleEnd: OutputRef<ScaleEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerScaleCancel: OutputRef<void> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerRotateStart: OutputRef<RotateEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerRotate: OutputRef<RotateEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerRotateEnd: OutputRef<RotateEventData> = new TrackedOutput(
    this.onOutputObservedChange
  );
  @Output() readonly hammerRotateCancel: OutputRef<void> = new TrackedOutput(
    this.onOutputObservedChange
  );

  /** Active {@link Hammer} instance, or `null` on the server / after destroy. */
  instance: Hammer<T> | null = null;

  private readonly configKey = computed(() => {
    const raw = this.hammer();
    return serializeConfig(raw === '' ? {} : raw);
  });

  constructor() {
    effect(onCleanup => {
      this.configKey();
      this.outputVersion();
      if (typeof window === 'undefined') {
        return;
      }

      const rawOptions = untracked(() => this.hammer());
      const options = this.buildOptions(rawOptions === '' ? {} : rawOptions);
      const create = () => new Hammer(this.elementRef.nativeElement, options);
      const hammer = this.ngZone ? this.ngZone.runOutsideAngular(create) : create();
      this.instance = hammer;

      onCleanup(() => {
        hammer.destroy();
        if (this.instance === hammer) {
          this.instance = null;
        }
      });
    });
  }

  private buildOptions(config: HammerDirectiveOptions): HammerOptions {
    const options: Record<string, unknown> = {...config};
    if (typeof config.ignoreTarget === 'function') {
      options.ignoreTarget = (target: EventTarget) => {
        const latest = untracked(() => this.hammer());
        const predicate = latest === '' ? undefined : latest.ignoreTarget;
        return typeof predicate === 'function' ? predicate(target) : Boolean(predicate ?? true);
      };
    }
    for (const [outputKey, callbackKey] of OUTPUT_MAP) {
      const emitter = this[outputKey] as TrackedOutput<unknown>;
      if (emitter.observed) {
        options[callbackKey] = (event?: unknown) => {
          if (this.ngZone) {
            this.ngZone.run(() => emitter.emit(event));
          } else {
            emitter.emit(event);
          }
        };
      }
    }
    return options as HammerOptions;
  }
}
