import {Hammer, type GestureTargetElement, type HammerOptions} from '@hammerjs/core';
import type {ReactiveController, ReactiveControllerHost} from 'lit';

export type {GestureTargetElement, HammerOptions};

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

function serializeConfig(options: HammerOptions): string {
  return JSON.stringify(normalizeValue(options));
}

function wrapCallbacks(optionsRef: {current: HammerOptions}): HammerOptions {
  const wrapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(optionsRef.current)) {
    if (typeof value === 'function') {
      wrapped[key] = (...args: unknown[]) => {
        const fn = (optionsRef.current as Record<string, unknown>)[key];
        if (typeof fn === 'function') {
          return fn(...args);
        }
        return undefined;
      };
    } else if (value !== undefined) {
      wrapped[key] = value;
    }
  }
  return wrapped as HammerOptions;
}

/**
 * Lit {@link ReactiveController} that attaches a {@link Hammer} instance to the host element
 * (or a resolved child target) and cleans it up automatically on disconnect.
 */
export class HammerController<
  H extends ReactiveControllerHost & GestureTargetElement = ReactiveControllerHost & HTMLElement,
  T extends GestureTargetElement = H,
> implements ReactiveController {
  private readonly host: H;
  private readonly resolveTarget: () => T | null;
  private readonly optionsRef: {current: HammerOptions} = {current: {}};
  private configKey = '';
  private attachedTarget: T | null = null;
  private attachedKey: string | null = null;
  private connected = false;

  /** Active {@link Hammer} instance, or `null` when disconnected. */
  instance: Hammer<T> | null = null;

  constructor(host: H, options: HammerOptions = {}, target?: () => T | null) {
    this.host = host;
    this.resolveTarget = target ?? (() => this.host as unknown as T);
    this.applyOptions(options);
    host.addController(this);
  }

  /** Updates options without cancelling active gestures when only callbacks change. */
  setOptions(options: HammerOptions): void {
    this.applyOptions(options);
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

  private applyOptions(options: HammerOptions): void {
    this.optionsRef.current = options;
    this.configKey = serializeConfig(options);
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
    if (this.instance && this.attachedTarget === target && this.attachedKey === this.configKey) {
      return;
    }
    this.teardown();
    this.instance = new Hammer(target, wrapCallbacks(this.optionsRef));
    this.attachedTarget = target;
    this.attachedKey = this.configKey;
  }

  private teardown(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
      this.attachedTarget = null;
      this.attachedKey = null;
    }
  }
}
