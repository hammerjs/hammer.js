import {
  DEFAULT_VIEW_CONFIGURATION,
  GestureManager,
  type GestureRecognizer,
  type LongPressEventData,
  LongPressRecognizer,
  type MotionEvent,
  type PanDirection,
  type PanEventData,
  PanRecognizer,
  QuickScaleRecognizer,
  type RotateEventData,
  RotateRecognizer,
  type ScaleEventData,
  ScaleRecognizer,
  type SwipeEventData,
  type TapEventData,
  TapRecognizer,
  type TouchActionSetting,
  type TouchActionValue,
  type ViewConfiguration,
} from '../src/index';

interface PlaygroundConfig {
  preset: string;
  pointerTouch: boolean;
  pointerPen: boolean;
  pointerMouse: boolean;
  touchAction: TouchActionSetting;

  enableSingleTap: boolean;
  enableDoubleTap: boolean;
  requireDoubleTapFailure: boolean;
  enableTwoFingerTap: boolean;

  enableLongPress: boolean;
  longPressPointers: number;
  enableLongPressMove: boolean;

  enablePan: boolean;
  enableSwipe: boolean;
  panDirection: PanDirection;
  panPointers: number;
  panSimultaneousScaleRotate: boolean;

  enableScale: boolean;
  enableQuickScale: boolean;
  quickScaleSensitivity: number;
  enableRotate: boolean;
  scaleRotateSimultaneous: boolean;

  viewConfig: ViewConfiguration;
}

interface TrackedRecognizer {
  label: string;
  recognizer: GestureRecognizer;
}

interface LogEntry {
  seq: number;
  relMs: number;
  category: 'lifecycle' | 'move' | 'dom' | 'system';
  name: string;
  summary: string;
  detail?: Record<string, unknown>;
}

interface VisualPointer {
  pointerId: number;
  pointerType: string;
  x: number;
  y: number;
  pressure: number;
}

const TOUCH_ACTION_TOKENS: readonly TouchActionValue[] = [
  'auto',
  'manipulation',
  'pan-x',
  'pan-y',
  'pan-x pan-y',
  'pan-x pinch-zoom',
  'pan-y pinch-zoom',
  'pinch-zoom',
  'none',
];

const TOUCH_ACTION_DESCRIPTIONS: Record<string, string> = {
  auto: 'Browser handles all native scrolling, pinch-zoom, and double-tap zoom.',
  manipulation:
    'Native 2D scrolling + pinch-zoom active; 300ms double-tap zoom delay disabled (100% passive on Tap-only).',
  'pan-y pinch-zoom':
    'Horizontal gestures handled by Hammer; vertical page scroll & pinch-zoom stay native.',
  'pan-x pinch-zoom':
    'Vertical gestures handled by Hammer; horizontal scroll & pinch-zoom stay native.',
  'pan-x pan-y':
    '1-finger scrolling stays native on both axes; 2-finger pinch/rotate claimed by Hammer.',
  'pan-x': 'Only horizontal native scroll allowed; vertical & zoom claimed by Hammer.',
  'pan-y': 'Only vertical native scroll allowed; horizontal & zoom claimed by Hammer.',
  'pinch-zoom': 'Only native 2-finger pinch-zoom allowed; 1-finger panning claimed by Hammer.',
  none: 'All touch scrolling and zooming disabled on stage; Hammer owns every pointer gesture.',
  false: 'Hammer leaves element inline touch-action and selection styles completely untouched.',
};

const VIEW_CONFIG_KEYS: ReadonlyArray<keyof ViewConfiguration> = [
  'touchSlop',
  'doubleTapSlop',
  'spanSlop',
  'minScalingSpan',
  'rotationSlop',
  'maxTapDuration',
  'doubleTapTimeout',
  'longPressTimeout',
  'minimumSwipeVelocity',
  'minimumSwipeDistance',
  'maximumSwipeVelocity',
  'ghostClickTimeout',
];

const POINTER_PALETTE = ['#0ea5e9', '#f97316', '#10b981', '#a855f7', '#ec4899'];
const MAX_LOG_ENTRIES = 250;

function createBaseConfig(): PlaygroundConfig {
  return {
    preset: 'default',
    pointerTouch: true,
    pointerPen: true,
    pointerMouse: true,
    touchAction: 'compute',

    enableSingleTap: true,
    enableDoubleTap: true,
    requireDoubleTapFailure: true,
    enableTwoFingerTap: false,

    enableLongPress: true,
    longPressPointers: 1,
    enableLongPressMove: false,

    enablePan: true,
    enableSwipe: true,
    panDirection: 'both',
    panPointers: 1,
    panSimultaneousScaleRotate: false,

    enableScale: true,
    enableQuickScale: true,
    quickScaleSensitivity: 200,
    enableRotate: true,
    scaleRotateSimultaneous: true,

    viewConfig: {...DEFAULT_VIEW_CONFIGURATION},
  };
}

function applyPresetOverrides(preset: string, base: PlaygroundConfig): PlaygroundConfig {
  const next: PlaygroundConfig = {
    ...createBaseConfig(),
    pointerTouch: base.pointerTouch,
    pointerPen: base.pointerPen,
    pointerMouse: base.pointerMouse,
    viewConfig: {...base.viewConfig},
    preset,
  };

  switch (preset) {
    case 'carousel':
      next.enablePan = true;
      next.enableSwipe = true;
      next.panDirection = 'horizontal';
      next.enableScale = false;
      next.enableQuickScale = false;
      next.enableRotate = false;
      next.enableLongPress = false;
      break;

    case 'drawer':
      next.enablePan = true;
      next.enableSwipe = true;
      next.panDirection = 'vertical';
      next.enableScale = false;
      next.enableQuickScale = false;
      next.enableRotate = false;
      next.enableLongPress = false;
      break;

    case 'feed-card':
      next.enableSingleTap = true;
      next.enableDoubleTap = true;
      next.requireDoubleTapFailure = true;
      next.enableLongPress = true;
      next.enablePan = false;
      next.enableSwipe = false;
      next.enableScale = false;
      next.enableQuickScale = false;
      next.enableRotate = false;
      break;

    case 'image-viewer':
      next.enableSingleTap = false;
      next.enableDoubleTap = true;
      next.enableLongPress = false;
      next.enablePan = false;
      next.enableSwipe = false;
      next.enableScale = true;
      next.enableQuickScale = true;
      next.enableRotate = true;
      next.scaleRotateSimultaneous = true;
      break;

    case 'map-2d':
      next.enableSingleTap = true;
      next.enableDoubleTap = true;
      next.requireDoubleTapFailure = true;
      next.enableTwoFingerTap = true;
      next.enableLongPress = true;
      next.enablePan = true;
      next.enableSwipe = true;
      next.panDirection = 'both';
      next.panPointers = 0;
      next.panSimultaneousScaleRotate = true;
      next.enableScale = true;
      next.enableQuickScale = true;
      next.enableRotate = true;
      next.scaleRotateSimultaneous = true;
      break;

    case 'multitouch':
      next.enableSingleTap = false;
      next.enableDoubleTap = false;
      next.enableTwoFingerTap = true;
      next.enableLongPress = true;
      next.longPressPointers = 2;
      next.enablePan = true;
      next.enableSwipe = true;
      next.panDirection = 'both';
      next.panPointers = 2;
      next.enableScale = true;
      next.enableQuickScale = false;
      next.enableRotate = true;
      break;

    default:
      break;
  }

  return next;
}

function round(val: number, digits = 1): number {
  const factor = Math.pow(10, digits);
  return Math.round(val * factor) / factor;
}

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) {
    throw new Error(`Missing playground element #${id}`);
  }
  return found as T;
}

let config: PlaygroundConfig = createBaseConfig();
let hammer: GestureManager | null = null;
let trackedRecognizers: TrackedRecognizer[] = [];
let statePollTimer: ReturnType<typeof setInterval> | null = null;
let statePollStopTimeout: ReturnType<typeof setTimeout> | null = null;

// Transform & live stage state
let persistTransform = false;
let baseTx = 0;
let baseTy = 0;
let baseScale = 1;
let baseRot = 0;
let activeTx = 0;
let activeTy = 0;
let activeScale = 1;
let activeRot = 0;
let panOriginX = 0;
let panOriginY = 0;
let scaleOrigin = 1;
let rotOrigin = 0;

let peakStrokeSpeed = 0;
let gestureCount = 0;
let childClickCount = 0;
let logSeq = 0;
let streamOriginTime = performance.now();
let logPaused = false;
const logEntries: LogEntry[] = [];
const activePointers = new Map<number, VisualPointer>();

// Cached DOM nodes
const hitarea = el<HTMLElement>('hitarea');
const transformCard = el<HTMLElement>('transformCard');
const stageGestureLabel = el<HTMLElement>('stageGestureLabel');
const stageTransformMeta = el<HTMLElement>('stageTransformMeta');
const pointerOverlay = el<HTMLElement>('pointerOverlay') as unknown as SVGSVGElement;
const childButton = el<HTMLButtonElement>('childButton');
const childClickCountEl = el<HTMLElement>('childClickCount');

const computedTouchActionEl = el<HTMLElement>('computedTouchAction');
const appliedTouchActionEl = el<HTMLElement>('appliedTouchAction');
const touchActionHintEl = el<HTMLElement>('touchActionHint');
const arenaStatesEl = el<HTMLElement>('arenaStates');

const telGesture = el<HTMLElement>('telGesture');
const telPointers = el<HTMLElement>('telPointers');
const telDelta = el<HTMLElement>('telDelta');
const telVelocity = el<HTMLElement>('telVelocity');
const telScale = el<HTMLElement>('telScale');
const telRotation = el<HTMLElement>('telRotation');

const eventLogCode = el<HTMLElement>('eventLogCode');
const logCountBadge = el<HTMLElement>('logCountBadge');
const codePreviewEl = el<HTMLElement>('codePreview');
const viewOverridesBadge = el<HTMLElement>('viewOverridesBadge');

const filterLifecycle = el<HTMLInputElement>('filterLifecycle');
const filterMove = el<HTMLInputElement>('filterMove');
const filterDom = el<HTMLInputElement>('filterDom');
const pauseLogBtn = el<HTMLButtonElement>('pauseLogBtn');
const copyReportBtn = el<HTMLButtonElement>('copyReportBtn');
const clearLogBtn = el<HTMLButtonElement>('clearLogBtn');
const copyCodeBtn = el<HTMLButtonElement>('copyCodeBtn');
const shareUrlBtn = el<HTMLButtonElement>('shareUrlBtn');

function localPoint(point: {x: number; y: number}): {x: number; y: number} {
  const rect = hitarea.getBoundingClientRect();
  return {x: point.x - rect.left, y: point.y - rect.top};
}

function updateCardTransform(animate = false): void {
  transformCard.classList.toggle('spring-back', animate);
  transformCard.style.setProperty('--tx', `${round(activeTx, 1)}px`);
  transformCard.style.setProperty('--ty', `${round(activeTy, 1)}px`);
  transformCard.style.setProperty('--scale', `${round(activeScale, 3)}`);
  transformCard.style.setProperty('--rot', `${round(activeRot, 1)}deg`);
  stageTransformMeta.textContent = `(${Math.round(activeTx)}, ${Math.round(activeTy)})px · ${activeScale.toFixed(2)}× · ${activeRot.toFixed(1)}°`;
}

function resetStageTransform(animate = true): void {
  baseTx = 0;
  baseTy = 0;
  baseScale = 1;
  baseRot = 0;
  activeTx = 0;
  activeTy = 0;
  activeScale = 1;
  activeRot = 0;
  updateCardTransform(animate);
}

function settleOrPersistTransform(swipeVx = 0, swipeVy = 0): void {
  if (persistTransform) {
    const rect = hitarea.getBoundingClientRect();
    const maxOffsetX = Math.max(80, rect.width * 0.42);
    const maxOffsetY = Math.max(80, rect.height * 0.42);
    activeTx = Math.max(-maxOffsetX, Math.min(maxOffsetX, activeTx));
    activeTy = Math.max(-maxOffsetY, Math.min(maxOffsetY, activeTy));
    activeScale = Math.max(0.35, Math.min(3.5, activeScale));
    baseTx = activeTx;
    baseTy = activeTy;
    baseScale = activeScale;
    baseRot = activeRot;
    updateCardTransform(true);
    return;
  }

  if (swipeVx !== 0 || swipeVy !== 0) {
    // Brief visual impulse in the swipe vector before springing cleanly back to center
    activeTx += Math.max(-48, Math.min(48, swipeVx * 0.035));
    activeTy += Math.max(-48, Math.min(48, swipeVy * 0.035));
    updateCardTransform(true);
    setTimeout(() => {
      if (activePointers.size === 0 && !persistTransform) {
        resetStageTransform(true);
      }
    }, 140);
    return;
  }

  if (activePointers.size === 0) {
    resetStageTransform(true);
  }
}

function renderPointerOverlay(): void {
  const rect = hitarea.getBoundingClientRect();
  pointerOverlay.setAttribute(
    'viewBox',
    `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`
  );
  while (pointerOverlay.firstChild) {
    pointerOverlay.removeChild(pointerOverlay.firstChild);
  }

  if (activePointers.size === 0) {
    return;
  }

  const svgNs = 'http://www.w3.org/2000/svg';
  const pts = Array.from(activePointers.values()).map(p => ({
    ...p,
    lx: p.x - rect.left,
    ly: p.y - rect.top,
  }));

  let sumX = 0;
  let sumY = 0;
  for (const pt of pts) {
    sumX += pt.lx;
    sumY += pt.ly;
  }
  const cx = sumX / pts.length;
  const cy = sumY / pts.length;

  if (pts.length >= 2) {
    let devX = 0;
    let devY = 0;
    for (const pt of pts) {
      devX += Math.abs(pt.lx - cx);
      devY += Math.abs(pt.ly - cy);
      const line = document.createElementNS(svgNs, 'line');
      line.setAttribute('x1', `${cx}`);
      line.setAttribute('y1', `${cy}`);
      line.setAttribute('x2', `${pt.lx}`);
      line.setAttribute('y2', `${pt.ly}`);
      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-opacity', '0.35');
      line.setAttribute('stroke-dasharray', '4 4');
      pointerOverlay.appendChild(line);
    }
    const spanRadius = Math.hypot((devX / pts.length) * 2, (devY / pts.length) * 2) / 2;
    const spanCircle = document.createElementNS(svgNs, 'circle');
    spanCircle.setAttribute('cx', `${cx}`);
    spanCircle.setAttribute('cy', `${cy}`);
    spanCircle.setAttribute('r', `${Math.max(4, spanRadius)}`);
    spanCircle.setAttribute('fill', 'none');
    spanCircle.setAttribute('stroke', 'currentColor');
    spanCircle.setAttribute('stroke-opacity', '0.28');
    pointerOverlay.appendChild(spanCircle);
  }

  // Centroid crosshair
  const cross = document.createElementNS(svgNs, 'circle');
  cross.setAttribute('cx', `${cx}`);
  cross.setAttribute('cy', `${cy}`);
  cross.setAttribute('r', '5');
  cross.setAttribute('fill', 'currentColor');
  cross.setAttribute('fill-opacity', '0.65');
  pointerOverlay.appendChild(cross);

  for (const p of pts) {
    const color = POINTER_PALETTE[Math.abs(p.pointerId) % POINTER_PALETTE.length];
    const ring = document.createElementNS(svgNs, 'circle');
    ring.setAttribute('cx', `${p.lx}`);
    ring.setAttribute('cy', `${p.ly}`);
    ring.setAttribute('r', `${18 + p.pressure * 10}`);
    ring.setAttribute('fill', color);
    ring.setAttribute('fill-opacity', '0.2');
    ring.setAttribute('stroke', color);
    ring.setAttribute('stroke-width', '2');
    pointerOverlay.appendChild(ring);

    const label = document.createElementNS(svgNs, 'text');
    label.setAttribute('x', `${p.lx + 22}`);
    label.setAttribute('y', `${p.ly - 10}`);
    label.setAttribute('fill', color);
    label.setAttribute('font-size', '11');
    label.setAttribute('font-family', 'monospace');
    label.textContent = `#${p.pointerId} ${p.pointerType}`;
    pointerOverlay.appendChild(label);
  }
}

function renderArenaStates(): void {
  if (trackedRecognizers.length === 0) {
    arenaStatesEl.textContent = 'No recognizers enabled';
    return;
  }

  arenaStatesEl.innerHTML = '';
  for (const {label, recognizer} of trackedRecognizers) {
    const pill = document.createElement('span');
    pill.className = `state-pill state-${recognizer.state}`;
    pill.textContent = `${label}: ${recognizer.state}`;
    arenaStatesEl.appendChild(pill);
  }
}

function scheduleArenaStateWatch(): void {
  renderArenaStates();
  if (!statePollTimer) {
    statePollTimer = setInterval(renderArenaStates, 50);
  }
  if (statePollStopTimeout) {
    clearTimeout(statePollStopTimeout);
  }
  statePollStopTimeout = setTimeout(() => {
    if (activePointers.size === 0 && statePollTimer) {
      clearInterval(statePollTimer);
      statePollTimer = null;
      renderArenaStates();
    }
  }, 700);
}

function shouldDisplayEntry(entry: LogEntry): boolean {
  if (entry.category === 'system') return true;
  if (entry.category === 'lifecycle') return filterLifecycle.checked;
  if (entry.category === 'move') return filterMove.checked;
  return filterDom.checked;
}

function renderLog(): void {
  const visible: string[] = [];
  for (let i = logEntries.length - 1; i >= 0; i--) {
    const entry = logEntries[i];
    if (!shouldDisplayEntry(entry)) continue;
    const rel = `+${entry.relMs.toFixed(0).padStart(4, ' ')}ms`;
    const tag = entry.name.padEnd(16, ' ');
    visible.push(`#${String(entry.seq).padStart(3, '0')} ${rel}  ${tag} ${entry.summary}`);
    if (visible.length >= 120) break;
  }
  eventLogCode.textContent =
    visible.length > 0
      ? visible.join('\n')
      : 'Waiting for gestures… Touch, drag, pinch, double-tap, or rotate inside the stage above.';
  logCountBadge.textContent = `${logEntries.length}`;
}

function appendLog(
  category: LogEntry['category'],
  name: string,
  summary: string,
  detail?: Record<string, unknown>
): void {
  if (logPaused && category !== 'system') {
    return;
  }
  logSeq++;
  const relMs = Math.max(0, performance.now() - streamOriginTime);
  logEntries.push({
    seq: logSeq,
    relMs,
    category,
    name,
    summary,
    detail,
  });
  if (logEntries.length > MAX_LOG_ENTRIES) {
    logEntries.shift();
  }
  renderLog();
}

function updateCommonTelemetry(gestureName: string, motionEvent?: MotionEvent): void {
  telGesture.textContent = `${gestureName} (#${gestureCount})`;
  stageGestureLabel.textContent = gestureName;
  if (motionEvent) {
    const coalescedCount = motionEvent.history.length + 1;
    telPointers.textContent = `${motionEvent.activePointerCount} active (${motionEvent.pointerType}) · ${coalescedCount} smp`;
  }
}

function flashStage(): void {
  hitarea.dataset.flash = 'true';
  setTimeout(() => {
    delete hitarea.dataset.flash;
  }, 160);
}

function buildViewConfigOverrides(vc: ViewConfiguration): Partial<ViewConfiguration> {
  const overrides: Partial<Record<keyof ViewConfiguration, number>> = {};
  for (const key of VIEW_CONFIG_KEYS) {
    if (vc[key] !== DEFAULT_VIEW_CONFIGURATION[key]) {
      overrides[key] = vc[key];
    }
  }
  return overrides as Partial<ViewConfiguration>;
}

function generateCodePreview(cfg: PlaygroundConfig): string {
  const imports: string[] = ['GestureManager'];
  if (cfg.enableSingleTap || cfg.enableDoubleTap || cfg.enableTwoFingerTap) {
    imports.push('TapRecognizer');
  }
  if (cfg.enableLongPress) imports.push('LongPressRecognizer');
  if (cfg.enablePan) imports.push('PanRecognizer');
  if (cfg.enableScale) imports.push('ScaleRecognizer');
  if (cfg.enableQuickScale) imports.push('QuickScaleRecognizer');
  if (cfg.enableRotate) imports.push('RotateRecognizer');

  const lines: string[] = [`import {${imports.join(', ')}} from 'hammerjs';`, ''];
  const recognizerVars: string[] = [];

  if (cfg.enableDoubleTap) {
    lines.push(
      "const doubleTap = new TapRecognizer({onTap: ev => console.log('DoubleTap', ev)}, {taps: 2});"
    );
  }
  if (cfg.enableSingleTap) {
    const chain = cfg.enableDoubleTap
      ? cfg.requireDoubleTapFailure
        ? '.requireFailureOf(doubleTap)'
        : '.simultaneousWith(doubleTap)'
      : '';
    lines.push(
      `const singleTap = new TapRecognizer({onTap: ev => console.log('Tap', ev)})${chain};`
    );
    recognizerVars.push('singleTap');
  }
  if (cfg.enableDoubleTap) {
    recognizerVars.push('doubleTap');
  }
  if (cfg.enableTwoFingerTap) {
    lines.push(
      "const twoFingerTap = new TapRecognizer({onTap: ev => console.log('2F Tap', ev)}, {numPointers: 2});"
    );
    recognizerVars.push('twoFingerTap');
  }
  if (cfg.enableLongPress) {
    const lpOpts = cfg.longPressPointers !== 1 ? `, {numPointers: ${cfg.longPressPointers}}` : '';
    lines.push(
      `const longPress = new LongPressRecognizer({onLongPress: ev => console.log('LongPress', ev)}${lpOpts});`
    );
    recognizerVars.push('longPress');
  }
  if (cfg.enableScale) {
    lines.push(
      "const scale = new ScaleRecognizer({onScale: ev => console.log('Scale', ev.scale)});"
    );
    recognizerVars.push('scale');
  }
  if (cfg.enableRotate) {
    lines.push(
      "const rotate = new RotateRecognizer({onRotate: ev => console.log('Rotate', ev.rotation)});"
    );
    recognizerVars.push('rotate');
  }
  if (cfg.enableScale && cfg.enableRotate && cfg.scaleRotateSimultaneous) {
    lines.push('scale.simultaneousWith(rotate);');
    lines.push('rotate.simultaneousWith(scale);');
  }
  if (cfg.enableQuickScale) {
    const qsOpts =
      cfg.quickScaleSensitivity !== 200 ? `, {sensitivity: ${cfg.quickScaleSensitivity}}` : '';
    lines.push(
      `const quickScale = new QuickScaleRecognizer({onScale: ev => console.log('QuickScale', ev.scale)}${qsOpts});`
    );
    recognizerVars.push('quickScale');
  }
  if (cfg.enablePan) {
    const panCbs = ["onPan: ev => console.log('Pan', ev.deltaX, ev.deltaY)"];
    if (cfg.enableSwipe) {
      panCbs.push("onSwipe: ev => console.log('Swipe', ev.direction, ev.velocityX, ev.velocityY)");
    }
    const panOptEntries: string[] = [];
    if (cfg.panDirection !== 'both') panOptEntries.push(`direction: '${cfg.panDirection}'`);
    if (cfg.panPointers !== 1) panOptEntries.push(`numPointers: ${cfg.panPointers}`);
    const panOptsStr = panOptEntries.length > 0 ? `, {${panOptEntries.join(', ')}}` : '';
    lines.push(`const pan = new PanRecognizer({${panCbs.join(', ')}}${panOptsStr});`);
    if (cfg.panSimultaneousScaleRotate) {
      if (cfg.enableScale) {
        lines.push('pan.simultaneousWith(scale);');
        lines.push('scale.simultaneousWith(pan);');
      }
      if (cfg.enableRotate) {
        lines.push('pan.simultaneousWith(rotate);');
        lines.push('rotate.simultaneousWith(pan);');
      }
    }
    recognizerVars.push('pan');
  }

  const pointerTypes: string[] = [];
  if (cfg.pointerTouch) pointerTypes.push("'touch'");
  if (cfg.pointerPen) pointerTypes.push("'pen'");
  if (cfg.pointerMouse) pointerTypes.push("'mouse'");

  const vcOverrides = buildViewConfigOverrides(cfg.viewConfig);
  const vcKeys = Object.keys(vcOverrides) as Array<keyof ViewConfiguration>;

  lines.push('');
  lines.push('const manager = new GestureManager(element, {');
  if (pointerTypes.length !== 3) {
    lines.push(`  supportedPointerTypes: [${pointerTypes.join(', ')}],`);
  }
  lines.push(`  touchAction: ${cfg.touchAction === false ? 'false' : `'${cfg.touchAction}'`},`);
  if (vcKeys.length > 0) {
    lines.push('  viewConfiguration: {');
    for (const k of vcKeys) {
      lines.push(`    ${k}: ${vcOverrides[k]},`);
    }
    lines.push('  },');
  }
  lines.push(`  recognizers: [${recognizerVars.join(', ')}],`);
  lines.push('});');

  return lines.join('\n');
}

function rebuildHammer(): void {
  if (hammer) {
    hammer.destroy();
    hammer = null;
  }
  trackedRecognizers = [];

  const supportedPointerTypes: Array<'touch' | 'pen' | 'mouse'> = [];
  if (config.pointerTouch) supportedPointerTypes.push('touch');
  if (config.pointerPen) supportedPointerTypes.push('pen');
  if (config.pointerMouse) supportedPointerTypes.push('mouse');

  const vcOverrides = buildViewConfigOverrides(config.viewConfig);
  const overrideCount = Object.keys(vcOverrides).length;
  viewOverridesBadge.textContent = overrideCount > 0 ? `${overrideCount} custom` : 'defaults';

  let doubleTapRec: GestureRecognizer | null = null;
  if (config.enableDoubleTap) {
    doubleTapRec = new TapRecognizer(
      {
        onTap: (ev: TapEventData) => {
          gestureCount++;
          flashStage();
          const local = localPoint(ev.center);
          updateCommonTelemetry('DoubleTap', ev.motionEvent);
          telDelta.textContent = `at (${Math.round(local.x)}, ${Math.round(local.y)}) px`;
          if (persistTransform) {
            activeScale = activeScale > 1.2 ? 1 : 1.6;
            baseScale = activeScale;
            updateCardTransform(true);
          }
          appendLog(
            'lifecycle',
            'DoubleTap',
            `taps=${ev.tapCount} center=(${Math.round(local.x)}, ${Math.round(local.y)}) type=${ev.motionEvent.pointerType}`,
            {tapCount: ev.tapCount, center: local}
          );
          scheduleArenaStateWatch();
        },
      },
      {taps: 2}
    );
  }

  if (config.enableSingleTap) {
    const singleTap = new TapRecognizer({
      onTap: (ev: TapEventData) => {
        gestureCount++;
        flashStage();
        const local = localPoint(ev.center);
        const label =
          doubleTapRec && config.requireDoubleTapFailure ? 'SingleTap (Conf)' : 'SingleTap';
        updateCommonTelemetry(label, ev.motionEvent);
        telDelta.textContent = `at (${Math.round(local.x)}, ${Math.round(local.y)}) px`;
        appendLog(
          'lifecycle',
          label,
          `center=(${Math.round(local.x)}, ${Math.round(local.y)}) type=${ev.motionEvent.pointerType}`,
          {center: local}
        );
        scheduleArenaStateWatch();
      },
    });
    if (doubleTapRec) {
      if (config.requireDoubleTapFailure) {
        singleTap.requireFailureOf(doubleTapRec);
      } else {
        singleTap.simultaneousWith(doubleTapRec);
      }
    }
    trackedRecognizers.push({label: 'SingleTap', recognizer: singleTap});
  }

  if (doubleTapRec) {
    trackedRecognizers.push({label: 'DoubleTap', recognizer: doubleTapRec});
  }

  if (config.enableTwoFingerTap) {
    const twoFingerTap = new TapRecognizer(
      {
        onTap: (ev: TapEventData) => {
          gestureCount++;
          flashStage();
          const local = localPoint(ev.center);
          updateCommonTelemetry('2-Finger Tap', ev.motionEvent);
          appendLog(
            'lifecycle',
            '2FingerTap',
            `center=(${Math.round(local.x)}, ${Math.round(local.y)}) span=${Math.round(ev.motionEvent.getSpan())}px`
          );
          scheduleArenaStateWatch();
        },
      },
      {numPointers: 2}
    );
    trackedRecognizers.push({label: '2F-Tap', recognizer: twoFingerTap});
  }

  if (config.enableLongPress) {
    const longPress = new LongPressRecognizer(
      {
        onLongPress: (ev: LongPressEventData) => {
          gestureCount++;
          flashStage();
          panOriginX = baseTx;
          panOriginY = baseTy;
          const local = localPoint(ev.center);
          updateCommonTelemetry('LongPress', ev.motionEvent);
          telDelta.textContent = `held at (${Math.round(local.x)}, ${Math.round(local.y)}) px`;
          appendLog(
            'lifecycle',
            'LongPress',
            `ptrs=${config.longPressPointers} center=(${Math.round(local.x)}, ${Math.round(local.y)})`
          );
          scheduleArenaStateWatch();
        },
        onLongPressMove: config.enableLongPressMove
          ? (ev: LongPressEventData) => {
              activeTx = panOriginX + ev.deltaX;
              activeTy = panOriginY + ev.deltaY;
              updateCardTransform(false);
              updateCommonTelemetry('LongPressMove', ev.motionEvent);
              telDelta.textContent = `dx=${round(ev.deltaX)} dy=${round(ev.deltaY)} px`;
              appendLog('move', 'LongPressMove', `dx=${round(ev.deltaX)} dy=${round(ev.deltaY)}`);
            }
          : undefined,
        onLongPressUp: (ev: LongPressEventData) => {
          updateCommonTelemetry('LongPressUp', ev.motionEvent);
          appendLog('lifecycle', 'LongPressUp', `dx=${round(ev.deltaX)} dy=${round(ev.deltaY)}`);
          settleOrPersistTransform();
          scheduleArenaStateWatch();
        },
        onLongPressCancel: () => {
          appendLog('lifecycle', 'LongPressCancel', 'cancelled');
          settleOrPersistTransform();
          scheduleArenaStateWatch();
        },
      },
      {numPointers: config.longPressPointers}
    );
    trackedRecognizers.push({label: 'LongPress', recognizer: longPress});
  }

  let scaleRec: GestureRecognizer | null = null;
  if (config.enableScale) {
    scaleRec = new ScaleRecognizer({
      onScaleStart: (ev: ScaleEventData) => {
        const span = ev.motionEvent.getSpan();
        gestureCount++;
        scaleOrigin = baseScale;
        updateCommonTelemetry('ScaleStart', ev.motionEvent);
        telScale.textContent = `${ev.scale.toFixed(2)}× · span ${Math.round(span)}px`;
        appendLog(
          'lifecycle',
          'ScaleStart',
          `span=${round(span)}px ptrs=${ev.motionEvent.activePointerCount}`
        );
        scheduleArenaStateWatch();
      },
      onScale: (ev: ScaleEventData) => {
        const span = ev.motionEvent.getSpan();
        activeScale = scaleOrigin * ev.scale;
        updateCardTransform(false);
        updateCommonTelemetry('Scale', ev.motionEvent);
        telScale.textContent = `${ev.scale.toFixed(2)}× · span ${Math.round(span)}px`;
        appendLog(
          'move',
          'Scale',
          `scale=${ev.scale.toFixed(3)} factor=${ev.scaleFactor.toFixed(3)} span=${round(span)}px`
        );
      },
      onScaleEnd: (ev: ScaleEventData) => {
        const span = ev.motionEvent.getSpan();
        baseScale = activeScale;
        updateCommonTelemetry('ScaleEnd', ev.motionEvent);
        appendLog(
          'lifecycle',
          'ScaleEnd',
          `finalScale=${ev.scale.toFixed(3)} span=${round(span)}px`
        );
        settleOrPersistTransform();
        scheduleArenaStateWatch();
      },
      onScaleCancel: () => {
        appendLog('lifecycle', 'ScaleCancel', 'cancelled');
        settleOrPersistTransform();
        scheduleArenaStateWatch();
      },
    });
    trackedRecognizers.push({label: 'Scale', recognizer: scaleRec});
  }

  let rotateRec: GestureRecognizer | null = null;
  if (config.enableRotate) {
    rotateRec = new RotateRecognizer({
      onRotateStart: (ev: RotateEventData) => {
        gestureCount++;
        rotOrigin = baseRot;
        updateCommonTelemetry('RotateStart', ev.motionEvent);
        telRotation.textContent = `${ev.rotation.toFixed(1)}°`;
        appendLog(
          'lifecycle',
          'RotateStart',
          `span=${round(ev.motionEvent.getSpan())}px ptrs=${ev.motionEvent.activePointerCount}`
        );
        scheduleArenaStateWatch();
      },
      onRotate: (ev: RotateEventData) => {
        activeRot = rotOrigin + ev.rotation;
        updateCardTransform(false);
        updateCommonTelemetry('Rotate', ev.motionEvent);
        telRotation.textContent = `${ev.rotation.toFixed(1)}° (Δ${ev.rotationDelta.toFixed(1)}°)`;
        appendLog(
          'move',
          'Rotate',
          `rot=${ev.rotation.toFixed(1)}° step=${ev.rotationDelta.toFixed(1)}°`
        );
      },
      onRotateEnd: (ev: RotateEventData) => {
        baseRot = activeRot;
        updateCommonTelemetry('RotateEnd', ev.motionEvent);
        appendLog('lifecycle', 'RotateEnd', `totalRot=${ev.rotation.toFixed(1)}°`);
        settleOrPersistTransform();
        scheduleArenaStateWatch();
      },
      onRotateCancel: () => {
        appendLog('lifecycle', 'RotateCancel', 'cancelled');
        settleOrPersistTransform();
        scheduleArenaStateWatch();
      },
    });
    trackedRecognizers.push({label: 'Rotate', recognizer: rotateRec});
  }

  if (config.scaleRotateSimultaneous && scaleRec && rotateRec) {
    scaleRec.simultaneousWith(rotateRec);
    rotateRec.simultaneousWith(scaleRec);
  }

  if (config.enableQuickScale) {
    const quickScale = new QuickScaleRecognizer(
      {
        onScaleStart: (ev: ScaleEventData) => {
          gestureCount++;
          scaleOrigin = baseScale;
          const local = localPoint(ev.center);
          updateCommonTelemetry('QuickScaleStart', ev.motionEvent);
          telScale.textContent = `${ev.scale.toFixed(2)}× (quick)`;
          appendLog(
            'lifecycle',
            'QuickScaleStart',
            `anchor=(${Math.round(local.x)}, ${Math.round(local.y)})`
          );
          scheduleArenaStateWatch();
        },
        onScale: (ev: ScaleEventData) => {
          activeScale = scaleOrigin * ev.scale;
          updateCardTransform(false);
          updateCommonTelemetry('QuickScale', ev.motionEvent);
          telScale.textContent = `${ev.scale.toFixed(2)}× (quick)`;
          appendLog(
            'move',
            'QuickScale',
            `scale=${ev.scale.toFixed(3)} factor=${ev.scaleFactor.toFixed(3)}`
          );
        },
        onScaleEnd: (ev: ScaleEventData) => {
          baseScale = activeScale;
          updateCommonTelemetry('QuickScaleEnd', ev.motionEvent);
          appendLog('lifecycle', 'QuickScaleEnd', `finalScale=${ev.scale.toFixed(3)}`);
          settleOrPersistTransform();
          scheduleArenaStateWatch();
        },
        onScaleCancel: () => {
          appendLog('lifecycle', 'QuickScaleCancel', 'cancelled');
          settleOrPersistTransform();
          scheduleArenaStateWatch();
        },
      },
      {sensitivity: config.quickScaleSensitivity}
    );
    trackedRecognizers.push({label: 'QuickScale', recognizer: quickScale});
  }

  if (config.enablePan) {
    let swipedInStroke = false;
    const pan = new PanRecognizer(
      {
        onPanStart: (ev: PanEventData) => {
          gestureCount++;
          swipedInStroke = false;
          peakStrokeSpeed = Math.hypot(ev.velocityX, ev.velocityY);
          panOriginX = baseTx;
          panOriginY = baseTy;
          updateCommonTelemetry('PanStart', ev.motionEvent);
          telDelta.textContent = 'dx=0 dy=0 px';
          appendLog(
            'lifecycle',
            'PanStart',
            `ptrs=${ev.motionEvent.activePointerCount} type=${ev.motionEvent.pointerType}`
          );
          scheduleArenaStateWatch();
        },
        onPan: (ev: PanEventData) => {
          const speed = Math.hypot(ev.velocityX, ev.velocityY);
          activeTx = panOriginX + ev.deltaX;
          activeTy = panOriginY + ev.deltaY;
          if (speed > peakStrokeSpeed) {
            peakStrokeSpeed = speed;
          }
          updateCardTransform(false);
          updateCommonTelemetry('Pan', ev.motionEvent);
          telDelta.textContent = `dx=${round(ev.deltaX)} dy=${round(ev.deltaY)} (step ${round(ev.stepX)}, ${round(ev.stepY)})`;
          telVelocity.textContent = `${Math.round(speed)} px/s (${Math.round(ev.velocityX)}, ${Math.round(ev.velocityY)}) · peak ${Math.round(peakStrokeSpeed)}`;
          appendLog(
            'move',
            'Pan',
            `dx=${round(ev.deltaX)} dy=${round(ev.deltaY)} speed=${Math.round(speed)}px/s ptrs=${ev.motionEvent.activePointerCount}`
          );
        },
        onPanEnd: (ev: PanEventData) => {
          const speed = Math.hypot(ev.velocityX, ev.velocityY);
          baseTx = activeTx;
          baseTy = activeTy;
          if (speed > peakStrokeSpeed) {
            peakStrokeSpeed = speed;
          }
          updateCommonTelemetry('PanEnd', ev.motionEvent);
          telVelocity.textContent = `${Math.round(speed)} px/s release · peak ${Math.round(peakStrokeSpeed)}`;
          appendLog(
            'lifecycle',
            'PanEnd',
            `dx=${round(ev.deltaX)} dy=${round(ev.deltaY)} vx=${Math.round(ev.velocityX)} vy=${Math.round(ev.velocityY)} speed=${Math.round(speed)}px/s`
          );
          if (!config.enableSwipe) {
            settleOrPersistTransform();
          } else {
            // Defer settle by a microtask so `onSwipe` (emitted immediately after `onPanEnd`) can supply swipe velocity
            queueMicrotask(() => {
              if (!swipedInStroke) {
                settleOrPersistTransform();
              }
            });
          }
          scheduleArenaStateWatch();
        },
        onSwipe: config.enableSwipe
          ? (ev: SwipeEventData) => {
              const speed = Math.hypot(ev.velocityX, ev.velocityY);
              swipedInStroke = true;
              gestureCount++;
              flashStage();
              updateCommonTelemetry(`Swipe (${ev.direction})`, ev.motionEvent);
              telVelocity.textContent = `SWIPE ${ev.direction} · ${Math.round(speed)} px/s (${Math.round(ev.velocityX)}, ${Math.round(ev.velocityY)})`;
              appendLog(
                'lifecycle',
                `Swipe:${ev.direction}`,
                `speed=${Math.round(speed)}px/s vx=${Math.round(ev.velocityX)} vy=${Math.round(ev.velocityY)} dx=${round(ev.deltaX)} dy=${round(ev.deltaY)}`
              );
              settleOrPersistTransform(ev.velocityX, ev.velocityY);
              scheduleArenaStateWatch();
            }
          : undefined,
        onPanCancel: () => {
          appendLog('lifecycle', 'PanCancel', 'cancelled (yielded or interrupted)');
          settleOrPersistTransform();
          scheduleArenaStateWatch();
        },
      },
      {
        direction: config.panDirection,
        numPointers: config.panPointers,
      }
    );

    if (config.panSimultaneousScaleRotate) {
      if (scaleRec) {
        pan.simultaneousWith(scaleRec);
        scaleRec.simultaneousWith(pan);
      }
      if (rotateRec) {
        pan.simultaneousWith(rotateRec);
        rotateRec.simultaneousWith(pan);
      }
    }
    trackedRecognizers.push({label: 'Pan', recognizer: pan});
  }

  hammer = new GestureManager(hitarea, {
    supportedPointerTypes,
    touchAction: config.touchAction,
    viewConfiguration: vcOverrides,
    recognizers: trackedRecognizers.map(item => item.recognizer),
  });

  const computedAction = hammer.computeTouchAction();
  const inlineAction = hitarea.style.touchAction || '(none / CSS default)';
  computedTouchActionEl.textContent = computedAction;
  appliedTouchActionEl.textContent = inlineAction;

  const descKey =
    config.touchAction === false ? 'false' : hitarea.style.touchAction || computedAction;
  touchActionHintEl.textContent =
    TOUCH_ACTION_DESCRIPTIONS[descKey] ??
    `Active CSS touch-action: ${inlineAction} (computed from recognizers: ${computedAction}).`;

  codePreviewEl.textContent = generateCodePreview(config);
  renderArenaStates();
  appendLog(
    'system',
    'Config',
    `recognizers=${trackedRecognizers.length} computed="${computedAction}" style.touchAction="${inlineAction}"`
  );
}

function syncFormFromConfig(cfg: PlaygroundConfig): void {
  el<HTMLSelectElement>('presetSelect').value = cfg.preset;
  el<HTMLInputElement>('pointerTouch').checked = cfg.pointerTouch;
  el<HTMLInputElement>('pointerPen').checked = cfg.pointerPen;
  el<HTMLInputElement>('pointerMouse').checked = cfg.pointerMouse;
  el<HTMLSelectElement>('touchActionSelect').value =
    cfg.touchAction === false ? 'false' : cfg.touchAction;

  el<HTMLInputElement>('enableSingleTap').checked = cfg.enableSingleTap;
  el<HTMLInputElement>('enableDoubleTap').checked = cfg.enableDoubleTap;
  el<HTMLInputElement>('requireDoubleTapFailure').checked = cfg.requireDoubleTapFailure;
  el<HTMLInputElement>('requireDoubleTapFailure').disabled =
    !cfg.enableSingleTap || !cfg.enableDoubleTap;
  el<HTMLInputElement>('enableTwoFingerTap').checked = cfg.enableTwoFingerTap;

  el<HTMLInputElement>('enableLongPress').checked = cfg.enableLongPress;
  el<HTMLSelectElement>('longPressPointers').value = String(cfg.longPressPointers);
  el<HTMLInputElement>('enableLongPressMove').checked = cfg.enableLongPressMove;

  el<HTMLInputElement>('enablePan').checked = cfg.enablePan;
  el<HTMLInputElement>('enableSwipe').checked = cfg.enableSwipe;
  el<HTMLInputElement>('enableSwipe').disabled = !cfg.enablePan;
  el<HTMLSelectElement>('panDirection').value = cfg.panDirection;
  el<HTMLSelectElement>('panPointers').value = String(cfg.panPointers);
  el<HTMLInputElement>('panSimultaneousScaleRotate').checked = cfg.panSimultaneousScaleRotate;

  el<HTMLInputElement>('enableScale').checked = cfg.enableScale;
  el<HTMLInputElement>('enableQuickScale').checked = cfg.enableQuickScale;
  el<HTMLInputElement>('quickScaleSensitivity').value = String(cfg.quickScaleSensitivity);
  el<HTMLInputElement>('enableRotate').checked = cfg.enableRotate;
  el<HTMLInputElement>('scaleRotateSimultaneous').checked = cfg.scaleRotateSimultaneous;

  for (const key of VIEW_CONFIG_KEYS) {
    const input = el<HTMLInputElement>(`vc_${key}`);
    input.value = String(cfg.viewConfig[key]);
  }
}

function readConfigFromForm(): PlaygroundConfig {
  const rawTouchAction = el<HTMLSelectElement>('touchActionSelect').value;
  const touchAction: TouchActionSetting =
    rawTouchAction === 'false' ? false : (rawTouchAction as TouchActionSetting);

  const nextVc: Record<string, number> = {};
  for (const key of VIEW_CONFIG_KEYS) {
    const raw = Number(el<HTMLInputElement>(`vc_${key}`).value);
    nextVc[key] = Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_VIEW_CONFIGURATION[key];
  }

  const sensitivityRaw = Number(el<HTMLInputElement>('quickScaleSensitivity').value);

  return {
    preset: el<HTMLSelectElement>('presetSelect').value,
    pointerTouch: el<HTMLInputElement>('pointerTouch').checked,
    pointerPen: el<HTMLInputElement>('pointerPen').checked,
    pointerMouse: el<HTMLInputElement>('pointerMouse').checked,
    touchAction,

    enableSingleTap: el<HTMLInputElement>('enableSingleTap').checked,
    enableDoubleTap: el<HTMLInputElement>('enableDoubleTap').checked,
    requireDoubleTapFailure: el<HTMLInputElement>('requireDoubleTapFailure').checked,
    enableTwoFingerTap: el<HTMLInputElement>('enableTwoFingerTap').checked,

    enableLongPress: el<HTMLInputElement>('enableLongPress').checked,
    longPressPointers: Number(el<HTMLSelectElement>('longPressPointers').value),
    enableLongPressMove: el<HTMLInputElement>('enableLongPressMove').checked,

    enablePan: el<HTMLInputElement>('enablePan').checked,
    enableSwipe: el<HTMLInputElement>('enableSwipe').checked,
    panDirection: el<HTMLSelectElement>('panDirection').value as PanDirection,
    panPointers: Number(el<HTMLSelectElement>('panPointers').value),
    panSimultaneousScaleRotate: el<HTMLInputElement>('panSimultaneousScaleRotate').checked,

    enableScale: el<HTMLInputElement>('enableScale').checked,
    enableQuickScale: el<HTMLInputElement>('enableQuickScale').checked,
    quickScaleSensitivity:
      Number.isFinite(sensitivityRaw) && sensitivityRaw >= 10 ? sensitivityRaw : 200,
    enableRotate: el<HTMLInputElement>('enableRotate').checked,
    scaleRotateSimultaneous: el<HTMLInputElement>('scaleRotateSimultaneous').checked,

    viewConfig: nextVc as unknown as ViewConfiguration,
  };
}

function serializeConfigToQuery(cfg: PlaygroundConfig): string {
  const params = new URLSearchParams();
  const def = createBaseConfig();
  if (cfg.preset !== def.preset) params.set('preset', cfg.preset);
  if (cfg.touchAction !== def.touchAction) params.set('ta', String(cfg.touchAction));
  if (!cfg.pointerTouch) params.set('pt', '0');
  if (!cfg.pointerPen) params.set('pp', '0');
  if (!cfg.pointerMouse) params.set('pm', '0');
  if (cfg.enableSingleTap !== def.enableSingleTap)
    params.set('st', cfg.enableSingleTap ? '1' : '0');
  if (cfg.enableDoubleTap !== def.enableDoubleTap)
    params.set('dt', cfg.enableDoubleTap ? '1' : '0');
  if (cfg.requireDoubleTapFailure !== def.requireDoubleTapFailure)
    params.set('req', cfg.requireDoubleTapFailure ? '1' : '0');
  if (cfg.enableTwoFingerTap) params.set('tft', '1');
  if (cfg.enableLongPress !== def.enableLongPress)
    params.set('lp', cfg.enableLongPress ? '1' : '0');
  if (cfg.longPressPointers !== 1) params.set('lpp', String(cfg.longPressPointers));
  if (cfg.enableLongPressMove) params.set('lpm', '1');
  if (cfg.enablePan !== def.enablePan) params.set('pan', cfg.enablePan ? '1' : '0');
  if (cfg.enableSwipe !== def.enableSwipe) params.set('sw', cfg.enableSwipe ? '1' : '0');
  if (cfg.panDirection !== 'both') params.set('dir', cfg.panDirection);
  if (cfg.panPointers !== 1) params.set('ppn', String(cfg.panPointers));
  if (cfg.panSimultaneousScaleRotate) params.set('psim', '1');
  if (cfg.enableScale !== def.enableScale) params.set('sc', cfg.enableScale ? '1' : '0');
  if (cfg.enableQuickScale !== def.enableQuickScale)
    params.set('qs', cfg.enableQuickScale ? '1' : '0');
  if (cfg.quickScaleSensitivity !== 200) params.set('qss', String(cfg.quickScaleSensitivity));
  if (cfg.enableRotate !== def.enableRotate) params.set('rot', cfg.enableRotate ? '1' : '0');
  if (!cfg.scaleRotateSimultaneous) params.set('srsim', '0');

  for (const key of VIEW_CONFIG_KEYS) {
    if (cfg.viewConfig[key] !== DEFAULT_VIEW_CONFIGURATION[key]) {
      params.set(`vc.${key}`, String(cfg.viewConfig[key]));
    }
  }
  return params.toString();
}

function loadConfigFromUrl(): PlaygroundConfig {
  const params = new URLSearchParams(window.location.search);
  let cfg = createBaseConfig();
  const preset = params.get('preset');
  if (preset) {
    cfg = applyPresetOverrides(preset, cfg);
  }
  const boolParam = (name: string, fallback: boolean): boolean => {
    const val = params.get(name);
    if (val === '1') return true;
    if (val === '0') return false;
    return fallback;
  };

  const ta = params.get('ta');
  if (ta !== null) {
    cfg.touchAction = ta === 'false' ? false : (ta as TouchActionSetting);
  }
  cfg.pointerTouch = boolParam('pt', cfg.pointerTouch);
  cfg.pointerPen = boolParam('pp', cfg.pointerPen);
  cfg.pointerMouse = boolParam('pm', cfg.pointerMouse);
  cfg.enableSingleTap = boolParam('st', cfg.enableSingleTap);
  cfg.enableDoubleTap = boolParam('dt', cfg.enableDoubleTap);
  cfg.requireDoubleTapFailure = boolParam('req', cfg.requireDoubleTapFailure);
  cfg.enableTwoFingerTap = boolParam('tft', cfg.enableTwoFingerTap);
  cfg.enableLongPress = boolParam('lp', cfg.enableLongPress);
  if (params.has('lpp')) cfg.longPressPointers = Number(params.get('lpp')) || 1;
  cfg.enableLongPressMove = boolParam('lpm', cfg.enableLongPressMove);
  cfg.enablePan = boolParam('pan', cfg.enablePan);
  cfg.enableSwipe = boolParam('sw', cfg.enableSwipe);
  if (params.has('dir')) cfg.panDirection = params.get('dir') as PanDirection;
  if (params.has('ppn')) cfg.panPointers = Number(params.get('ppn'));
  cfg.panSimultaneousScaleRotate = boolParam('psim', cfg.panSimultaneousScaleRotate);
  cfg.enableScale = boolParam('sc', cfg.enableScale);
  cfg.enableQuickScale = boolParam('qs', cfg.enableQuickScale);
  if (params.has('qss')) cfg.quickScaleSensitivity = Number(params.get('qss')) || 200;
  cfg.enableRotate = boolParam('rot', cfg.enableRotate);
  cfg.scaleRotateSimultaneous = boolParam('srsim', cfg.scaleRotateSimultaneous);

  const vcCopy = {...cfg.viewConfig};
  for (const key of VIEW_CONFIG_KEYS) {
    const raw = params.get(`vc.${key}`);
    if (raw !== null && Number.isFinite(Number(raw))) {
      (vcCopy as Record<string, number>)[key] = Number(raw);
    }
  }
  cfg.viewConfig = vcCopy;
  return cfg;
}

function matchesMedia(query: string): boolean {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false;
}

function collectEnvironmentInfo(): Record<string, unknown> {
  const cssTouchActionSupport: Record<string, boolean> = {};
  for (const token of TOUCH_ACTION_TOKENS) {
    cssTouchActionSupport[token] =
      typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
        ? CSS.supports('touch-action', token)
        : false;
  }

  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    devicePixelRatio: round(window.devicePixelRatio || 1, 2),
    viewport: `${window.innerWidth} × ${window.innerHeight}`,
    pointerPrimary: matchesMedia('(pointer: coarse)')
      ? 'coarse (touch)'
      : matchesMedia('(pointer: fine)')
        ? 'fine (mouse/trackpad)'
        : 'none',
    anyCoarsePointer: matchesMedia('(any-pointer: coarse)'),
    anyHover: matchesMedia('(any-hover: hover)'),
    coalescedEvents:
      typeof PointerEvent !== 'undefined' && 'getCoalescedEvents' in PointerEvent.prototype,
    webkitGestureEvent: 'GestureEvent' in window,
    cssTouchActionSupport,
  };
}

function renderEnvironmentTable(): void {
  const info = collectEnvironmentInfo();
  const tbody = el<HTMLElement>('envTableBody');
  const cssSupport = info.cssTouchActionSupport as Record<string, boolean>;
  const unsupportedTokens = TOUCH_ACTION_TOKENS.filter(t => !cssSupport[t]);

  const rows: Array<[string, string]> = [
    ['Viewport / DPR', `${info.viewport} CSS px @ ${info.devicePixelRatio}x`],
    ['Max Touch Points', `${info.maxTouchPoints}`],
    [
      'Pointer & Hover',
      `${info.pointerPrimary} · any-coarse=${info.anyCoarsePointer} · hover=${info.anyHover}`,
    ],
    ['getCoalescedEvents()', info.coalescedEvents ? 'Supported' : 'Unsupported'],
    ['WebKit GestureEvent', info.webkitGestureEvent ? 'Present (Safari/WebKit)' : 'Not present'],
    [
      'CSS touch-action',
      unsupportedTokens.length === 0
        ? 'All 9 W3C tokens supported'
        : `Unsupported tokens: ${unsupportedTokens.join(', ')}`,
    ],
    ['User Agent', String(info.userAgent)],
  ];

  tbody.innerHTML = '';
  for (const [label, value] of rows) {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = document.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    tbody.appendChild(tr);
  }
}

function bindStageDiagnostics(): void {
  const updateVisualPointer = (e: PointerEvent) => {
    activePointers.set(e.pointerId, {
      pointerId: e.pointerId,
      pointerType: e.pointerType || 'touch',
      x: e.clientX,
      y: e.clientY,
      pressure: typeof e.pressure === 'number' ? e.pressure : 0.5,
    });
    renderPointerOverlay();
  };

  const removeVisualPointer = (e: PointerEvent) => {
    activePointers.delete(e.pointerId);
    renderPointerOverlay();
    if (activePointers.size === 0 && !persistTransform) {
      setTimeout(() => {
        if (activePointers.size === 0 && !persistTransform) {
          resetStageTransform(true);
        }
      }, 160);
    }
  };

  hitarea.addEventListener('pointerdown', (e: PointerEvent) => {
    if (activePointers.size === 0) {
      streamOriginTime = performance.now();
      peakStrokeSpeed = 0;
    }
    updateVisualPointer(e);
    scheduleArenaStateWatch();
    const rect = hitarea.getBoundingClientRect();
    appendLog(
      'dom',
      'pointerdown',
      `id=${e.pointerId} type=${e.pointerType} primary=${e.isPrimary} pos=(${Math.round(e.clientX - rect.left)}, ${Math.round(e.clientY - rect.top)}) target=${(e.target as HTMLElement)?.id || (e.target as HTMLElement)?.tagName}`
    );
  });

  document.addEventListener('pointermove', (e: PointerEvent) => {
    if (!activePointers.has(e.pointerId)) return;
    updateVisualPointer(e);
  });

  const handleEnd = (type: 'pointerup' | 'pointercancel') => (e: PointerEvent) => {
    const tracked = activePointers.has(e.pointerId);
    removeVisualPointer(e);
    if (!tracked) return;
    scheduleArenaStateWatch();
    appendLog(
      'dom',
      type,
      `id=${e.pointerId} type=${e.pointerType} remaining=${activePointers.size}`
    );
  };

  document.addEventListener('pointerup', handleEnd('pointerup'));
  document.addEventListener('pointercancel', handleEnd('pointercancel'));

  hitarea.addEventListener('gotpointercapture', (e: PointerEvent) => {
    appendLog(
      'dom',
      'gotcapture',
      `id=${e.pointerId} target=${(e.target as HTMLElement)?.id || (e.target as HTMLElement)?.tagName}`
    );
  });

  hitarea.addEventListener('lostpointercapture', (e: PointerEvent) => {
    appendLog(
      'dom',
      'lostcapture',
      `id=${e.pointerId} target=${(e.target as HTMLElement)?.id || (e.target as HTMLElement)?.tagName}`
    );
  });

  hitarea.addEventListener('contextmenu', (e: MouseEvent) => {
    appendLog('dom', 'contextmenu', `defaultPrevented=${e.defaultPrevented}`);
  });

  childButton.addEventListener('click', () => {
    childClickCount++;
    childClickCountEl.textContent = String(childClickCount);
    appendLog(
      'lifecycle',
      'ChildButtonClick',
      `Native <button> click #${childClickCount} (not suppressed)`
    );
  });
}

function flashButtonFeedback(btn: HTMLButtonElement, message: string): void {
  const prev = btn.textContent ?? '';
  btn.textContent = message;
  setTimeout(() => {
    btn.textContent = prev;
  }, 1400);
}

function copyText(text: string, btn: HTMLButtonElement, okLabel = 'Copied!'): void {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard
      .writeText(text)
      .then(() => flashButtonFeedback(btn, okLabel))
      .catch(() => flashButtonFeedback(btn, 'Copy failed'));
  }
}

function init(): void {
  config = loadConfigFromUrl();
  syncFormFromConfig(config);
  renderEnvironmentTable();
  bindStageDiagnostics();
  updateCardTransform(false);
  rebuildHammer();

  window.addEventListener('resize', renderEnvironmentTable);

  const themeSelect = el<HTMLSelectElement>('themeSelect');
  themeSelect.addEventListener('change', () => {
    const val = themeSelect.value;
    if (val === 'auto') {
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.style.colorScheme = 'light dark';
    } else {
      document.documentElement.setAttribute('data-theme', val);
      document.documentElement.style.colorScheme = val;
    }
  });

  const presetSelect = el<HTMLSelectElement>('presetSelect');
  presetSelect.addEventListener('change', () => {
    config = applyPresetOverrides(presetSelect.value, config);
    syncFormFromConfig(config);
    resetStageTransform(true);
    rebuildHammer();
  });

  const configForm = el<HTMLFormElement>('configForm');
  configForm.addEventListener('submit', e => e.preventDefault());
  configForm.addEventListener('change', e => {
    const target = e.target as HTMLElement | null;
    if (!target || target.id === 'presetSelect') return;
    if (!target.id.startsWith('vc_') && !target.id.startsWith('pointer')) {
      el<HTMLSelectElement>('presetSelect').value = 'custom';
    }
    config = readConfigFromForm();
    syncFormFromConfig(config);
    rebuildHammer();
  });

  el<HTMLButtonElement>('resetViewConfigBtn').addEventListener('click', () => {
    config.viewConfig = {...DEFAULT_VIEW_CONFIGURATION};
    syncFormFromConfig(config);
    rebuildHammer();
  });

  el<HTMLButtonElement>('resetAllBtn').addEventListener('click', () => {
    config = createBaseConfig();
    childClickCount = 0;
    childClickCountEl.textContent = '0';
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    syncFormFromConfig(config);
    resetStageTransform(true);
    rebuildHammer();
  });

  const persistToggle = el<HTMLInputElement>('persistTransformToggle');
  persistToggle.addEventListener('change', () => {
    persistTransform = persistToggle.checked;
    if (!persistTransform) {
      resetStageTransform(true);
    }
  });

  el<HTMLButtonElement>('resetTransformBtn').addEventListener('click', () => {
    resetStageTransform(true);
  });

  const tallStageToggle = el<HTMLInputElement>('tallStageToggle');
  tallStageToggle.addEventListener('change', () => {
    hitarea.classList.toggle('tall-stage', tallStageToggle.checked);
  });

  filterLifecycle.addEventListener('change', renderLog);
  filterMove.addEventListener('change', renderLog);
  filterDom.addEventListener('change', renderLog);

  pauseLogBtn.addEventListener('click', () => {
    logPaused = !logPaused;
    pauseLogBtn.setAttribute('aria-pressed', String(logPaused));
    pauseLogBtn.textContent = logPaused ? 'Resume' : 'Pause';
  });

  clearLogBtn.addEventListener('click', () => {
    logEntries.length = 0;
    logSeq = 0;
    streamOriginTime = performance.now();
    renderLog();
  });

  copyReportBtn.addEventListener('click', () => {
    const report = {
      timestamp: new Date().toISOString(),
      environment: collectEnvironmentInfo(),
      appliedTouchAction: hitarea.style.touchAction || '(unset)',
      computedTouchAction: hammer?.computeTouchAction() ?? '(none)',
      config,
      recognizerStates: Object.fromEntries(
        trackedRecognizers.map(r => [r.label, r.recognizer.state])
      ),
      recentLogs: logEntries.slice(-80),
    };
    copyText(JSON.stringify(report, null, 2), copyReportBtn, 'Report copied!');
  });

  copyCodeBtn.addEventListener('click', () => {
    copyText(generateCodePreview(config), copyCodeBtn, 'Code copied!');
  });

  shareUrlBtn.addEventListener('click', () => {
    const query = serializeConfigToQuery(config);
    const nextUrl = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
    copyText(nextUrl, shareUrlBtn, 'URL copied!');
  });
}

init();
