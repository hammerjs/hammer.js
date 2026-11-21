import {
  type GestureCallbackMap,
  type GestureDescriptor,
  type GestureDescriptorKind,
  matchesSnapshot,
  resolveGestures,
  snapshotStructure,
} from './descriptors.js';
import {GestureManager, type PointerType} from './gesture_manager.js';
import type {GestureTargetElement, TouchActionSetting} from './touch_action.js';

export type CallbackWrapper = <F extends (...args: never[]) => unknown>(fn: F) => F;

export interface GesturesOptions {
  supportedPointerTypes?: readonly PointerType[];
  touchAction?: TouchActionSetting;
  ignoreTarget?: boolean | ((target: EventTarget) => boolean);
  autoWire?: boolean;
}

export interface GestureBindingOptions extends GesturesOptions {
  /** Optional wrapper applied when invoking callbacks (e.g. Angular `NgZone.run`). */
  wrapCallback?: CallbackWrapper;
}

interface BindingSnapshot {
  readonly touchAction: TouchActionSetting | undefined;
  readonly autoWire: boolean | undefined;
  readonly supportedPointerTypes: unknown;
  readonly ignoreTarget: unknown;
  readonly gestures: ReadonlyArray<{
    readonly kind: GestureDescriptorKind;
    readonly config: unknown;
    readonly callbackKeys: readonly string[];
    readonly simIndices: readonly number[];
    readonly failIndices: readonly number[];
  }>;
}

function snapshotBinding(
  descriptors: readonly GestureDescriptor[],
  options: GesturesOptions
): BindingSnapshot {
  return {
    touchAction: options.touchAction,
    autoWire: options.autoWire,
    supportedPointerTypes: snapshotStructure(options.supportedPointerTypes),
    ignoreTarget: snapshotStructure(options.ignoreTarget),
    gestures: descriptors.map(d => ({
      kind: d.kind,
      config: snapshotStructure(d.config),
      callbackKeys: Object.keys(d.callbacks).filter(k => typeof d.callbacks[k] === 'function'),
      simIndices: d.simultaneousPeers.map(p => descriptors.indexOf(p)),
      failIndices: d.requiredFailures.map(p => descriptors.indexOf(p)),
    })),
  };
}

function matchesBinding(
  snap: BindingSnapshot,
  descriptors: readonly GestureDescriptor[],
  options: GesturesOptions
): boolean {
  if (
    snap.touchAction !== options.touchAction ||
    snap.autoWire !== options.autoWire ||
    snap.gestures.length !== descriptors.length ||
    !matchesSnapshot(snap.supportedPointerTypes, options.supportedPointerTypes) ||
    !matchesSnapshot(snap.ignoreTarget, options.ignoreTarget)
  ) {
    return false;
  }
  for (let i = 0; i < descriptors.length; i++) {
    const s = snap.gestures[i];
    const d = descriptors[i];
    if (
      s.kind !== d.kind ||
      !matchesSnapshot(s.config, d.config) ||
      s.simIndices.length !== d.simultaneousPeers.length ||
      s.failIndices.length !== d.requiredFailures.length ||
      !s.simIndices.every((idx, j) => idx === descriptors.indexOf(d.simultaneousPeers[j])) ||
      !s.failIndices.every((idx, j) => idx === descriptors.indexOf(d.requiredFailures[j]))
    ) {
      return false;
    }
    let liveCbCount = 0;
    for (const k of Object.keys(d.callbacks)) {
      if (typeof d.callbacks[k] === 'function') {
        liveCbCount++;
      }
    }
    if (
      s.callbackKeys.length !== liveCbCount ||
      !s.callbackKeys.every(k => typeof d.callbacks[k] === 'function')
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Reactive, tree-shakable lifecycle controller that binds `GestureDescriptor`s to a DOM element.
 *
 * Inline callback changes hot-swap seamlessly without tearing down active gestures; the underlying
 * `GestureManager` is only recreated when structural options, descriptor composition, or arena
 * relationships change.
 */
export class GestureBinding<T extends GestureTargetElement = GestureTargetElement> {
  readonly element: T;
  private currentManager: GestureManager<T> | null = null;
  private latestGestures: readonly GestureDescriptor[];
  private latestOptions: GestureBindingOptions;
  private mountedSnapshot: BindingSnapshot | null = null;
  private destroyed = false;

  constructor(
    element: T,
    gestures: readonly GestureDescriptor[] = [],
    options: GestureBindingOptions = {}
  ) {
    this.element = element;
    this.latestGestures = gestures;
    this.latestOptions = options;
    this.mount();
  }

  get manager(): GestureManager<T> | null {
    return this.currentManager;
  }

  /**
   * Syncs new descriptors and options, hot-swapping callbacks in place when structurally equal
   * and recreating the `GestureManager` only when structural configuration changes.
   */
  update(gestures: readonly GestureDescriptor[], options: GestureBindingOptions = {}): void {
    this.latestGestures = gestures;
    this.latestOptions = options;
    if (this.destroyed) {
      return;
    }
    if (
      this.currentManager &&
      this.mountedSnapshot &&
      matchesBinding(this.mountedSnapshot, gestures, options)
    ) {
      return;
    }
    this.currentManager?.destroy();
    this.mount();
  }

  cancel(): void {
    this.currentManager?.cancel();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.currentManager?.destroy();
    this.currentManager = null;
    this.mountedSnapshot = null;
  }

  private mount(): void {
    const gestures = this.latestGestures;
    const options = this.latestOptions;
    this.mountedSnapshot = snapshotBinding(gestures, options);

    const recognizers = resolveGestures(gestures, {
      autoWire: options.autoWire,
      resolveCallbacks: (index, desc) => this.proxyCallbacks(index, desc.callbacks),
    });

    const ignoreTarget =
      typeof options.ignoreTarget === 'function'
        ? (target: EventTarget) => {
            const pred = this.latestOptions.ignoreTarget;
            return typeof pred === 'function' ? pred(target) : Boolean(pred ?? true);
          }
        : options.ignoreTarget;

    this.currentManager = new GestureManager(this.element, {
      supportedPointerTypes: options.supportedPointerTypes,
      touchAction: options.touchAction,
      ignoreTarget,
      recognizers,
    });
  }

  private proxyCallbacks(index: number, initial: GestureCallbackMap): GestureCallbackMap {
    const proxied: Record<string, ((...args: never[]) => unknown) | undefined> = {};
    for (const key of Object.keys(initial)) {
      if (typeof initial[key] !== 'function') {
        continue;
      }
      proxied[key] = (...args: never[]) => {
        const fn = this.latestGestures[index]?.callbacks[key];
        if (typeof fn !== 'function') {
          return undefined;
        }
        const wrap = this.latestOptions.wrapCallback;
        return wrap ? wrap(fn)(...args) : fn(...args);
      };
    }
    return proxied;
  }
}
