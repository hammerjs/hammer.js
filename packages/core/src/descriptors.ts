import type {GestureRecognizer} from './gesture_recognizer.js';

export type GestureDescriptorKind =
  'tap' | 'longPress' | 'pan' | 'scale' | 'quickScale' | 'rotate' | 'custom';

export type GestureCallbackMap = Readonly<
  Record<string, ((...args: never[]) => unknown) | undefined>
>;

/**
 * Tree-shakable, declarative description of a gesture recognizer, its options, callbacks,
 * and arena relationships.
 *
 * Construct with the built-in factories (`tap`, `doubleTap`, `longPress`, `pan`, `scale`,
 * `quickScale`, `rotate`) or `gesture(...)` for custom `GestureRecognizer` subclasses.
 */
export interface GestureDescriptor {
  readonly kind: GestureDescriptorKind;
  readonly config: unknown;
  readonly callbacks: GestureCallbackMap;
  readonly simultaneousPeers: readonly GestureDescriptor[];
  readonly requiredFailures: readonly GestureDescriptor[];

  /** Allows this gesture and `others` to recognize simultaneously in the arena. */
  simultaneousWith(...others: GestureDescriptor[]): this;

  /** Delays this gesture until all `others` transition to `'failed'`. */
  requireFailureOf(...others: GestureDescriptor[]): this;

  /** @internal */
  create(callbacks: GestureCallbackMap, peers: readonly GestureDescriptor[]): GestureRecognizer;
}

export interface ResolveGesturesOptions {
  /**
   * Automatically wires standard gesture relationships matching `Hammer` defaults:
   * - Single `tap` waits on multi-tap (`taps > 1`) with matching `numPointers` and 1-finger `quickScale`.
   * - `scale` and `rotate` recognize simultaneously.
   * - Multi-pointer `pan` (`numPointers !== 1`) recognizes simultaneously with `scale` and `rotate`.
   * - `quickScale` caps its default `slop` against `pan.slop` when `pan` is present.
   *
   * Explicit `.simultaneousWith(...)` and `.requireFailureOf(...)` edges always apply regardless.
   * Default: `true`.
   */
  autoWire?: boolean;
  /** @internal */
  resolveCallbacks?: (index: number, descriptor: GestureDescriptor) => GestureCallbackMap;
}

class GestureDescriptorImpl implements GestureDescriptor {
  readonly kind: GestureDescriptorKind;
  readonly config: unknown;
  readonly callbacks: GestureCallbackMap;
  readonly simultaneousPeers: GestureDescriptor[] = [];
  readonly requiredFailures: GestureDescriptor[] = [];
  private readonly factory: (
    callbacks: GestureCallbackMap,
    peers: readonly GestureDescriptor[]
  ) => GestureRecognizer;

  constructor(
    kind: GestureDescriptorKind,
    config: unknown,
    callbacks: GestureCallbackMap,
    factory: (
      callbacks: GestureCallbackMap,
      peers: readonly GestureDescriptor[]
    ) => GestureRecognizer
  ) {
    this.kind = kind;
    this.config = config;
    this.callbacks = callbacks;
    this.factory = factory;
  }

  simultaneousWith(...others: GestureDescriptor[]): this {
    for (const other of others) {
      if (other !== this && !this.simultaneousPeers.includes(other)) {
        this.simultaneousPeers.push(other);
      }
    }
    return this;
  }

  requireFailureOf(...others: GestureDescriptor[]): this {
    for (const other of others) {
      if (other !== this && !this.requiredFailures.includes(other)) {
        this.requiredFailures.push(other);
      }
    }
    return this;
  }

  /** @internal */
  create(callbacks: GestureCallbackMap, peers: readonly GestureDescriptor[]): GestureRecognizer {
    return this.factory(callbacks, peers);
  }
}

/** @internal */
export function createDescriptor(
  kind: GestureDescriptorKind,
  input: Record<string, unknown> | undefined,
  factory: (
    callbacks: GestureCallbackMap,
    config: Record<string, unknown>,
    peers: readonly GestureDescriptor[]
  ) => GestureRecognizer
): GestureDescriptor {
  const config: Record<string, unknown> = {};
  const callbacks: Record<string, ((...args: never[]) => unknown) | undefined> = {};

  if (input) {
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) {
        continue;
      }
      if (typeof value === 'function') {
        callbacks[key] = value as (...args: never[]) => unknown;
      } else {
        config[key] = value;
      }
    }
  }

  return new GestureDescriptorImpl(kind, config, callbacks, (resolvedCallbacks, peers) =>
    factory(resolvedCallbacks, config, peers)
  );
}

/**
 * Wraps a custom `GestureRecognizer` factory into a `GestureDescriptor` so it can compose
 * with built-in descriptors (`tap`, `pan`, ...) in `GestureManager` and framework adapters.
 *
 * Pass inline handlers in `callbacks` so framework adapters hot-swap closures without cancelling
 * active gestures, and pass structural parameters in `config` so changes trigger recreation.
 */
export function gesture<C extends object = Record<string, never>>(
  create: (callbacks: C) => GestureRecognizer,
  callbacks?: C,
  config?: unknown
): GestureDescriptor {
  const callbackMap: Record<string, ((...args: never[]) => unknown) | undefined> = {};
  if (callbacks) {
    for (const [key, value] of Object.entries(callbacks)) {
      if (typeof value === 'function') {
        callbackMap[key] = value as (...args: never[]) => unknown;
      }
    }
  }
  return new GestureDescriptorImpl('custom', config, callbackMap, resolved =>
    create(resolved as C)
  );
}

function numOption(config: unknown, key: string, fallback: number): number {
  const val = (config as Record<string, unknown> | undefined)?.[key];
  return typeof val === 'number' ? val : fallback;
}

function wireSingleTapDep(
  a: GestureDescriptor,
  recA: GestureRecognizer,
  b: GestureDescriptor,
  recB: GestureRecognizer
): void {
  if (a.kind !== 'tap' || numOption(a.config, 'taps', 1) !== 1) {
    return;
  }
  const pointers = numOption(a.config, 'numPointers', 1);
  if (
    (b.kind === 'tap' &&
      numOption(b.config, 'taps', 1) > 1 &&
      numOption(b.config, 'numPointers', 1) === pointers) ||
    (b.kind === 'quickScale' && pointers === 1)
  ) {
    recA.requireFailureOf(recB);
  }
}

function isMultiPointerPan(d: GestureDescriptor): boolean {
  return d.kind === 'pan' && numOption(d.config, 'numPointers', 1) !== 1;
}

function isTransformGesture(d: GestureDescriptor): boolean {
  return d.kind === 'scale' || d.kind === 'rotate';
}

const EMPTY_PEERS: readonly GestureDescriptor[] = [];

/**
 * Materializes an array of `GestureDescriptor`s into configured `GestureRecognizer` instances,
 * applying both smart default relationships (when `autoWire !== false`) and explicit
 * `.simultaneousWith(...)` / `.requireFailureOf(...)` edges.
 */
export function resolveGestures(
  descriptors: readonly GestureDescriptor[],
  options: ResolveGesturesOptions = {}
): GestureRecognizer[] {
  if (descriptors.length === 0) {
    return [];
  }

  const autoWire = options.autoWire !== false;
  const peersForCreate = autoWire ? descriptors : EMPTY_PEERS;
  const byDescriptor = new Map<GestureDescriptor, GestureRecognizer>();
  const recognizers = descriptors.map((desc, i) => {
    const cbs = options.resolveCallbacks ? options.resolveCallbacks(i, desc) : desc.callbacks;
    const rec = desc.create(cbs, peersForCreate);
    byDescriptor.set(desc, rec);
    return rec;
  });

  if (autoWire) {
    for (let i = 0; i < descriptors.length; i++) {
      const a = descriptors[i];
      const recA = recognizers[i];
      for (let j = i + 1; j < descriptors.length; j++) {
        const b = descriptors[j];
        const recB = recognizers[j];
        wireSingleTapDep(a, recA, b, recB);
        wireSingleTapDep(b, recB, a, recA);
        if (
          (a.kind === 'scale' && b.kind === 'rotate') ||
          (a.kind === 'rotate' && b.kind === 'scale') ||
          (isMultiPointerPan(a) && isTransformGesture(b)) ||
          (isMultiPointerPan(b) && isTransformGesture(a))
        ) {
          recA.simultaneousWith(recB);
        }
      }
    }
  }

  for (let i = 0; i < descriptors.length; i++) {
    const desc = descriptors[i];
    const rec = recognizers[i];
    for (const peer of desc.simultaneousPeers) {
      const peerRec = byDescriptor.get(peer);
      if (peerRec) {
        rec.simultaneousWith(peerRec);
      }
    }
    for (const dep of desc.requiredFailures) {
      const depRec = byDescriptor.get(dep);
      if (depRec) {
        rec.requireFailureOf(depRec);
      }
    }
  }

  return recognizers;
}

const FN_SENTINEL = Symbol('fn');

/** @internal */
export function snapshotStructure(value: unknown): unknown {
  if (typeof value === 'function') {
    return FN_SENTINEL;
  }
  if (Array.isArray(value)) {
    return value.map(snapshotStructure);
  }
  if (value !== null && typeof value === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        copy[k] = snapshotStructure(v);
      }
    }
    return copy;
  }
  return value;
}

/** @internal */
export function matchesSnapshot(snapshot: unknown, live: unknown): boolean {
  if (snapshot === FN_SENTINEL) {
    return typeof live === 'function';
  }
  if (typeof live === 'function') {
    return false;
  }
  if (Object.is(snapshot, live)) {
    return true;
  }
  if (Array.isArray(snapshot)) {
    return (
      Array.isArray(live) &&
      snapshot.length === live.length &&
      snapshot.every((item, i) => matchesSnapshot(item, live[i]))
    );
  }
  if (
    snapshot !== null &&
    live !== null &&
    typeof snapshot === 'object' &&
    typeof live === 'object' &&
    !Array.isArray(live)
  ) {
    const snapObj = snapshot as Record<string, unknown>;
    const liveObj = live as Record<string, unknown>;
    const snapKeys = Object.keys(snapObj);
    let liveCount = 0;
    for (const k of Object.keys(liveObj)) {
      if (liveObj[k] !== undefined) {
        liveCount++;
      }
    }
    return (
      snapKeys.length === liveCount &&
      snapKeys.every(k => liveObj[k] !== undefined && matchesSnapshot(snapObj[k], liveObj[k]))
    );
  }
  return false;
}
