import {
  GestureBinding,
  type GestureDescriptor,
  type GestureManager,
  type GesturesOptions,
  type GestureTargetElement,
} from '@hammerjs/core';
import type {ReactiveController, ReactiveControllerHost} from 'lit';

export type {GestureDescriptor, GesturesOptions, GestureTargetElement};

/**
 * Tree-shakable Lit {@link ReactiveController} that binds {@link GestureDescriptor}s (`tap`,
 * `pan`, ...) to the host element (or a resolved child target) without importing unused
 * recognizers.
 */
export class GesturesController<
  H extends ReactiveControllerHost & GestureTargetElement = ReactiveControllerHost & HTMLElement,
  T extends GestureTargetElement = H,
> implements ReactiveController {
  private readonly host: H;
  private readonly resolveTarget: () => T | null;
  private gestures: readonly GestureDescriptor[];
  private options: GesturesOptions;
  private binding: GestureBinding<T> | null = null;
  private connected = false;

  constructor(
    host: H,
    gestures: readonly GestureDescriptor[] = [],
    options: GesturesOptions = {},
    target?: () => T | null
  ) {
    this.host = host;
    this.gestures = gestures;
    this.options = options;
    this.resolveTarget = target ?? (() => this.host as unknown as T);
    host.addController(this);
  }

  /** Active {@link GestureManager} instance, or `null` when disconnected. */
  get instance(): GestureManager<T> | null {
    return this.binding?.manager ?? null;
  }

  /** Updates descriptors/options without cancelling active gestures when only callbacks change. */
  setGestures(
    gestures: readonly GestureDescriptor[],
    options: GesturesOptions = this.options
  ): void {
    this.gestures = gestures;
    this.options = options;
    if (this.connected) {
      this.sync();
    }
  }

  hostConnected(): void {
    this.connected = true;
    this.sync();
  }

  hostUpdated(): void {
    if (this.connected) {
      this.sync();
    }
  }

  hostDisconnected(): void {
    this.connected = false;
    this.teardown();
  }

  private sync(): void {
    if (typeof window === 'undefined') {
      this.teardown();
      return;
    }
    const target = this.resolveTarget();
    if (!target) {
      this.teardown();
      return;
    }
    if (this.binding && this.binding.element === target) {
      this.binding.update(this.gestures, this.options);
      return;
    }
    this.teardown();
    this.binding = new GestureBinding(target, this.gestures, this.options);
  }

  private teardown(): void {
    this.binding?.destroy();
    this.binding = null;
  }
}
