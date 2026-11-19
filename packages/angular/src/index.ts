import {
  Directive,
  ElementRef,
  NgZone,
  Output,
  computed,
  effect,
  inject,
  input,
  untracked,
  type OutputRef,
  type OutputRefSubscription,
} from '@angular/core';
import {
  Hammer,
  type GestureEventData,
  type GestureTarget,
  type HammerOptions,
  type LongPressEventData,
  type PanEventData,
  type RotateEventData,
  type ScaleEventData,
  type SwipeEventData,
} from '@hammerjs/core';

export type {GestureTarget, HammerOptions};

export type HammerDirectiveOptions = Pick<
  HammerOptions,
  | 'supportedPointerTypes'
  | 'touchAction'
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

  get observed(): boolean {
    return this.listeners.size > 0;
  }

  subscribe(callback: (value: T) => void): OutputRefSubscription {
    this.listeners.add(callback);
    return {
      unsubscribe: () => {
        this.listeners.delete(callback);
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

function serializeConfig(config: HammerDirectiveOptions): string {
  return JSON.stringify(
    Object.entries(config)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  );
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
export class HammerDirective<T extends GestureTarget = HTMLElement> {
  private readonly elementRef = inject<ElementRef<T>>(ElementRef);
  private readonly ngZone = inject(NgZone, {optional: true});

  /** Recognizer & pointer configuration. Accepts `''` for bare `<div hammer>` usage. */
  readonly hammer = input<HammerDirectiveOptions | ''>('');

  @Output() readonly hammerTap: OutputRef<GestureEventData> = new TrackedOutput();
  @Output() readonly hammerDoubleTap: OutputRef<GestureEventData> = new TrackedOutput();
  @Output() readonly hammerLongPress: OutputRef<LongPressEventData> = new TrackedOutput();
  @Output() readonly hammerLongPressMove: OutputRef<LongPressEventData> = new TrackedOutput();
  @Output() readonly hammerLongPressUp: OutputRef<LongPressEventData> = new TrackedOutput();
  @Output() readonly hammerLongPressCancel: OutputRef<void> = new TrackedOutput();
  @Output() readonly hammerPanStart: OutputRef<PanEventData> = new TrackedOutput();
  @Output() readonly hammerPan: OutputRef<PanEventData> = new TrackedOutput();
  @Output() readonly hammerPanEnd: OutputRef<PanEventData> = new TrackedOutput();
  @Output() readonly hammerPanCancel: OutputRef<void> = new TrackedOutput();
  @Output() readonly hammerSwipe: OutputRef<SwipeEventData> = new TrackedOutput();
  @Output() readonly hammerScaleStart: OutputRef<ScaleEventData> = new TrackedOutput();
  @Output() readonly hammerScale: OutputRef<ScaleEventData> = new TrackedOutput();
  @Output() readonly hammerScaleEnd: OutputRef<ScaleEventData> = new TrackedOutput();
  @Output() readonly hammerScaleCancel: OutputRef<void> = new TrackedOutput();
  @Output() readonly hammerRotateStart: OutputRef<RotateEventData> = new TrackedOutput();
  @Output() readonly hammerRotate: OutputRef<RotateEventData> = new TrackedOutput();
  @Output() readonly hammerRotateEnd: OutputRef<RotateEventData> = new TrackedOutput();
  @Output() readonly hammerRotateCancel: OutputRef<void> = new TrackedOutput();

  /** Active {@link Hammer} instance, or `null` on the server / after destroy. */
  instance: Hammer<T> | null = null;

  private readonly configKey = computed(() => {
    const raw = this.hammer();
    return serializeConfig(raw === '' ? {} : raw);
  });

  constructor() {
    effect(onCleanup => {
      this.configKey();
      if (typeof window === 'undefined') {
        return;
      }

      const rawOptions = untracked(() => this.hammer());
      const options = this.buildOptions(rawOptions === '' ? {} : rawOptions);
      const create = () => new Hammer(this.elementRef.nativeElement, options);
      const instance = this.ngZone ? this.ngZone.runOutsideAngular(create) : create();
      this.instance = instance;

      onCleanup(() => {
        instance.destroy();
        if (this.instance === instance) {
          this.instance = null;
        }
      });
    });
  }

  private buildOptions(config: HammerDirectiveOptions): HammerOptions {
    const options: Record<string, unknown> = {...config};
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
