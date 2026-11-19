import {
  Directive,
  ElementRef,
  NgZone,
  effect,
  inject,
  input,
  output,
  type OutputEmitterRef,
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

function hasListeners(ref: OutputEmitterRef<unknown>): boolean {
  const internal = ref as unknown as {listeners?: unknown[] | null};
  return (internal.listeners?.length ?? 0) > 0;
}

/**
 * Standalone Angular directive that attaches a {@link Hammer} instance to its host element.
 *
 * - Runs DOM pointer listeners outside `NgZone` (when present) and re-enters the zone only when
 *   a gesture event actually fires.
 * - Only registers recognizers for outputs that have active listeners, preserving least-restrictive
 *   CSS `touch-action`.
 * - Automatically cleans up listeners and inline styles on destroy or when `[hammerEnabled]` is `false`.
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

  /** Enables or disables gesture recognition reactively. */
  readonly hammerEnabled = input(true);

  readonly hammerTap = output<GestureEventData>();
  readonly hammerDoubleTap = output<GestureEventData>();
  readonly hammerLongPress = output<LongPressEventData>();
  readonly hammerLongPressMove = output<LongPressEventData>();
  readonly hammerLongPressUp = output<LongPressEventData>();
  readonly hammerLongPressCancel = output<void>();
  readonly hammerPanStart = output<PanEventData>();
  readonly hammerPan = output<PanEventData>();
  readonly hammerPanEnd = output<PanEventData>();
  readonly hammerPanCancel = output<void>();
  readonly hammerSwipe = output<SwipeEventData>();
  readonly hammerScaleStart = output<ScaleEventData>();
  readonly hammerScale = output<ScaleEventData>();
  readonly hammerScaleEnd = output<ScaleEventData>();
  readonly hammerScaleCancel = output<void>();
  readonly hammerRotateStart = output<RotateEventData>();
  readonly hammerRotate = output<RotateEventData>();
  readonly hammerRotateEnd = output<RotateEventData>();
  readonly hammerRotateCancel = output<void>();

  /** Active {@link Hammer} instance, or `null` when disabled / on the server. */
  instance: Hammer<T> | null = null;

  constructor() {
    effect(onCleanup => {
      const enabled = this.hammerEnabled();
      const rawOptions = this.hammer();
      if (!enabled || typeof window === 'undefined') {
        return;
      }

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
      const emitter = this[outputKey] as OutputEmitterRef<unknown>;
      if (hasListeners(emitter)) {
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
