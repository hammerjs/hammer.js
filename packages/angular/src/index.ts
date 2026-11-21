import {DestroyRef, Directive, ElementRef, NgZone, effect, inject, input} from '@angular/core';
import {
  GestureBinding,
  type CallbackWrapper,
  type GestureBindingOptions,
  type GestureDescriptor,
  type GestureManager,
  type GesturesOptions,
  type GestureTargetElement,
} from '@hammerjs/core';

export type {GestureDescriptor, GesturesOptions, GestureTargetElement};

/**
 * Tree-shakable standalone Angular directive that binds declarative {@link GestureDescriptor}s
 * (`tap`, `pan`, `scale`, ...) to its host element without importing unused recognizers.
 *
 * - Runs DOM pointer listeners outside `NgZone` (when present) and re-enters the zone only when
 *   a gesture callback actually fires.
 * - Inline descriptor arrays never cancel active gestures when only callbacks change.
 * - Automatically cleans up listeners and inline styles on destroy.
 */
@Directive({
  selector: '[gestures]',
  standalone: true,
  exportAs: 'gestures',
})
export class GesturesDirective<T extends GestureTargetElement = HTMLElement> {
  private readonly elementRef = inject<ElementRef<T>>(ElementRef);
  private readonly ngZone = inject(NgZone, {optional: true});
  private binding: GestureBinding<T> | null = null;

  /** Tree-shakable gesture descriptors (`[tap({ onTap }), pan({ onPan })]`). */
  readonly gestures = input<readonly GestureDescriptor[]>([]);
  /** Optional surface/pointer configuration (`touchAction`, `ignoreTarget`, `autoWire`, ...). */
  readonly gesturesOptions = input<GesturesOptions>({});

  /** Active {@link GestureManager} instance, or `null` on the server / after destroy. */
  get instance(): GestureManager<T> | null {
    return this.binding?.manager ?? null;
  }

  private readonly wrapCallback: CallbackWrapper | undefined = this.ngZone
    ? fn => ((...args: never[]) => this.ngZone!.run(() => fn(...args))) as typeof fn
    : undefined;

  constructor() {
    effect(() => {
      const list = this.gestures();
      const opts = this.gesturesOptions();
      if (typeof window === 'undefined') {
        return;
      }
      const bindingOpts: GestureBindingOptions = this.wrapCallback
        ? {...opts, wrapCallback: this.wrapCallback}
        : opts;
      const sync = () => {
        if (!this.binding) {
          this.binding = new GestureBinding(this.elementRef.nativeElement, list, bindingOpts);
        } else {
          this.binding.update(list, bindingOpts);
        }
      };
      if (this.ngZone) {
        this.ngZone.runOutsideAngular(sync);
      } else {
        sync();
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.binding?.destroy();
      this.binding = null;
    });
  }
}
