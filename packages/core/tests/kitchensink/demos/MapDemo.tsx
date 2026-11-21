import {doubleTap, pan, quickScale, rotate, scale, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';
import {Button, Card, Toggle} from 'konsta/react';
import {Compass, Lock, Minus, Plus, RotateCcw, Unlock} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import type {DemoMeta, DemoProps} from '../types';

interface Landmark {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly x: number;
  readonly y: number;
}

const LANDMARKS: readonly Landmark[] = [
  {
    id: 'harbor',
    name: 'Oaktown Harbor',
    note: "MC Hammer's hometown — pinch & rotate with 2 fingers!",
    x: 112,
    y: 122,
  },
  {
    id: 'park',
    name: 'Hammer Time Plaza',
    note: 'Auto-wired tap vs doubleTap — double-tap to zoom the stage!',
    x: 248,
    y: 174,
  },
  {
    id: 'tower',
    name: 'Parachute Park',
    note: 'Double-tap & drag with 1 thumb for Quick Scale — break it down!',
    x: 175,
    y: 282,
  },
];

export const mapMeta: DemoMeta = {
  id: 'map',
  label: 'Map',
  title: 'Oaktown Tour Map',
  subtitle: 'Simultaneous pan, pinch-zoom, rotate, double-tap & 1-finger Quick Scale',
  badges: ['pan (0)', 'scale', 'rotate', 'quickScale', 'doubleTap', 'enabled'],
  hint: 'Drag to pan Oaktown, pinch/rotate with 2 fingers, double-tap to zoom, or double-tap-and-drag vertically for Quick Scale. Flip "Can\'t Touch This" to lock gestures.',
  code: `import {doubleTap, pan, quickScale, rotate, scale, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';

function MapCanvas({locked}) {
  // All gesture relationships auto-wire:
  // - pan({numPointers: 0}) + scale + rotate run simultaneously
  // - tap waits for doubleTap & quickScale before firing
  // - \`enabled: !locked\` detaches listeners when locked
  const mapRef = useGestures(
    [
      pan({numPointers: 0, onPan: ev => translate(ev.stepX, ev.stepY)}),
      scale({onScale: ev => zoomAround(ev.scaleFactor, ev.center)}),
      quickScale({sensitivity: 160, onScale: ev => zoomAround(ev.scaleFactor, ev.center)}),
      rotate({onRotate: ev => rotateAround(ev.rotationDelta, ev.center)}),
      doubleTap({onTap: ev => cycleZoom(ev.center)}),
      tap({onTap: ev => selectLandmark(ev.target)}),
    ],
    {enabled: !locked}
  );

  return <div ref={mapRef}>{/* SVG Map */}</div>;
}`,
};

interface MapTransform {
  tx: number;
  ty: number;
  scale: number;
  rotation: number;
}

const INITIAL_TRANSFORM: MapTransform = {tx: 0, ty: 0, scale: 1, rotation: 0};

export function MapDemo({onEmit}: DemoProps) {
  const [transform, setTransform] = useState<MapTransform>(INITIAL_TRANSFORM);
  const [animating, setAnimating] = useState(false);
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState<Landmark | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<MapTransform>(INITIAL_TRANSFORM);

  const commit = (next: MapTransform, animate: boolean) => {
    stateRef.current = next;
    setAnimating(animate);
    setTransform(next);
  };

  const viewportLocal = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return {x: 0, y: 0};
    return {
      x: clientX - (rect.left + rect.width / 2),
      y: clientY - (rect.top + rect.height / 2),
    };
  };

  const zoomAround = (factor: number, clientX: number, clientY: number, animate: boolean) => {
    const cur = stateRef.current;
    const nextScale = Math.max(0.65, Math.min(4.5, cur.scale * factor));
    const actual = nextScale / cur.scale;
    if (actual === 1) return cur;
    const p = viewportLocal(clientX, clientY);
    const next: MapTransform = {
      ...cur,
      tx: p.x - (p.x - cur.tx) * actual,
      ty: p.y - (p.y - cur.ty) * actual,
      scale: nextScale,
    };
    commit(next, animate);
    return next;
  };

  const rotateAround = (deltaDeg: number, clientX: number, clientY: number) => {
    const cur = stateRef.current;
    const p = viewportLocal(clientX, clientY);
    const rad = (deltaDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = cur.tx - p.x;
    const dy = cur.ty - p.y;
    const next: MapTransform = {
      ...cur,
      tx: p.x + dx * cos - dy * sin,
      ty: p.y + dx * sin + dy * cos,
      rotation: cur.rotation + deltaDeg,
    };
    commit(next, false);
    return next;
  };

  const gestureRef = useGestures<HTMLDivElement>(
    [
      pan({
        numPointers: 0,
        slop: 4,
        onPan: ev => {
          const cur = stateRef.current;
          const next = {...cur, tx: cur.tx + ev.stepX, ty: cur.ty + ev.stepY};
          commit(next, false);
          onEmit({
            gesture: 'pan (0)',
            detail: `x=${Math.round(next.tx)}, y=${Math.round(next.ty)}`,
            pointerType: ev.pointerType,
            touchAction: viewportRef.current?.style.touchAction,
          });
        },
      }),
      scale({
        spanSlop: 8,
        minSpan: 20,
        onScale: ev => {
          const next = zoomAround(ev.scaleFactor, ev.center.x, ev.center.y, false);
          onEmit({
            gesture: 'scale',
            detail: `${next.scale.toFixed(2)}×`,
            pointerType: ev.pointerType,
            touchAction: viewportRef.current?.style.touchAction,
          });
        },
      }),
      quickScale({
        sensitivity: 160,
        onScale: ev => {
          const next = zoomAround(ev.scaleFactor, ev.center.x, ev.center.y, false);
          onEmit({
            gesture: 'quickScale',
            detail: `${next.scale.toFixed(2)}× (1-finger)`,
            pointerType: ev.pointerType,
            touchAction: viewportRef.current?.style.touchAction,
          });
        },
      }),
      rotate({
        rotationSlop: 3,
        minSpan: 20,
        onRotate: ev => {
          const next = rotateAround(ev.rotationDelta, ev.center.x, ev.center.y);
          onEmit({
            gesture: 'rotate',
            detail: `${Math.round(next.rotation)}°`,
            pointerType: ev.pointerType,
            touchAction: viewportRef.current?.style.touchAction,
          });
        },
      }),
      doubleTap({
        onTap: ev => {
          const cur = stateRef.current;
          const target = cur.scale < 1.8 ? 2.2 : cur.scale < 3 ? 3.5 : 1;
          if (target === 1) {
            commit(INITIAL_TRANSFORM, true);
          } else {
            zoomAround(target / cur.scale, ev.center.x, ev.center.y, true);
          }
          onEmit({
            gesture: 'doubleTap',
            detail: `Zoom → ${stateRef.current.scale.toFixed(1)}×`,
            pointerType: ev.pointerType,
            touchAction: viewportRef.current?.style.touchAction,
          });
        },
      }),
      tap({
        onTap: ev => {
          const pin =
            ev.target instanceof Element ? ev.target.closest<SVGGElement>('[data-landmark]') : null;
          const hit = pin ? (LANDMARKS.find(l => l.id === pin.dataset.landmark) ?? null) : null;
          setSelected(prev => (hit && hit.id === prev?.id ? null : hit));
          onEmit({
            gesture: 'tap (confirmed)',
            detail: hit ? `Selected ${hit.name}` : 'Cleared pin selection',
            pointerType: ev.pointerType,
            touchAction: viewportRef.current?.style.touchAction,
          });
        },
      }),
    ],
    {
      enabled: !locked,
      ignoreTarget: target =>
        target instanceof Element && Boolean(target.closest('[data-map-hud]')),
    }
  );

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node;
      gestureRef(node);
    },
    [gestureRef]
  );

  const zoomCenter = (factor: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 0;
    const cy = rect ? rect.top + rect.height / 2 : 0;
    const next = zoomAround(factor, cx, cy, true);
    onEmit({gesture: 'button zoom', detail: `${next.scale.toFixed(1)}×`});
  };

  const resetView = () => {
    commit(INITIAL_TRANSFORM, true);
    onEmit({gesture: 'reset', detail: '1.0× · 0°'});
  };

  const handleToggleLock = () => {
    const nextLocked = !locked;
    setLocked(nextLocked);
    onEmit({
      gesture: nextLocked ? "Can't Touch This" : 'Hammer Time!',
      detail: nextLocked ? 'enabled: false (0 listeners attached)' : 'enabled: true (map unlocked)',
      touchAction: nextLocked ? '(none)' : viewportRef.current?.style.touchAction,
    });
  };

  return (
    <div
      ref={setRefs}
      className="relative h-full min-h-0 flex-1 overflow-hidden select-none bg-sky-100 dark:bg-slate-900 cursor-grab active:cursor-grabbing"
    >
      {/* Transformed SVG Map Layer */}
      <div
        className={`ks-anim absolute inset-0 flex items-center justify-center origin-center will-change-transform ${
          animating ? 'transition-transform duration-200 ease-out' : ''
        }`}
        style={{
          transform: `translate3d(${transform.tx}px, ${transform.ty}px, 0) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
        }}
      >
        <svg viewBox="0 0 360 420" className="h-full w-full" aria-label="Interactive vector map">
          <rect width="360" height="420" className="fill-slate-200 dark:fill-slate-800" />
          <path
            d="M-20,65 C80,95 110,165 70,255 C45,310 110,360 155,440 L-20,440 Z"
            className="fill-sky-300 dark:fill-blue-900"
          />
          <path
            d="M210,130 Q275,115 305,180 Q320,235 250,245 Q195,235 210,130 Z"
            className="fill-emerald-300 dark:fill-emerald-900"
          />
          <path
            d="M20,20 L340,390 M330,30 L40,370 M0,195 L360,185 M175,0 L185,420"
            className="fill-none stroke-white dark:stroke-slate-700"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M-10,120 Q160,145 370,110 M135,-10 Q180,195 165,430 M40,320 Q200,260 365,305"
            className="fill-none stroke-amber-200 dark:stroke-amber-700"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {LANDMARKS.map(l => {
            const active = selected?.id === l.id;
            return (
              <g
                key={l.id}
                data-landmark={l.id}
                transform={`translate(${l.x}, ${l.y})`}
                className="cursor-pointer"
              >
                <circle r="16" className={active ? 'fill-rose-500/30' : 'fill-sky-500/25'} />
                <circle
                  r="7"
                  className={`stroke-white stroke-2 ${active ? 'fill-rose-500' : 'fill-sky-600'}`}
                />
                <text
                  y="23"
                  textAnchor="middle"
                  className="fill-slate-900 dark:fill-white text-[11px] font-bold"
                  style={{paintOrder: 'stroke', strokeWidth: 3}}
                  stroke="rgba(128,128,128,0.28)"
                >
                  {l.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Top Map HUD */}
      <div
        data-map-hud
        className="pointer-events-none absolute top-3 right-3 left-3 z-10 flex items-center justify-between gap-2"
      >
        <label className="pointer-events-auto flex items-center gap-2 rounded-full border border-black/10 dark:border-white/15 bg-white/90 dark:bg-zinc-900/90 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-md">
          {locked ? (
            <Lock className="h-3.5 w-3.5 text-rose-500" />
          ) : (
            <Unlock className="h-3.5 w-3.5 text-emerald-500" />
          )}
          <span>Can&apos;t Touch This</span>
          <Toggle checked={locked} onChange={handleToggleLock} aria-label="Lock map gestures" />
        </label>

        <button
          type="button"
          onClick={resetView}
          aria-label="Reset map view"
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/15 bg-white/90 dark:bg-zinc-900/90 px-3 py-1.5 font-mono text-xs font-semibold shadow-sm backdrop-blur-md cursor-pointer"
        >
          <Compass
            className="h-4 w-4 text-rose-500"
            style={{transform: `rotate(${transform.rotation}deg)`}}
          />
          {transform.scale.toFixed(1)}× · {Math.round(transform.rotation)}°
        </button>
      </div>

      {/* Floating Zoom Buttons */}
      <div data-map-hud className="absolute right-3 bottom-4 z-10 flex flex-col gap-1.5">
        <Button
          rounded
          small
          tonal
          onClick={() => zoomCenter(1.35)}
          aria-label="Zoom in"
          className="!w-9 !h-9 !p-0 shadow-md"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          rounded
          small
          tonal
          onClick={() => zoomCenter(1 / 1.35)}
          aria-label="Zoom out"
          className="!w-9 !h-9 !p-0 shadow-md"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          rounded
          small
          tonal
          onClick={resetView}
          aria-label="Reset view"
          className="!w-9 !h-9 !p-0 shadow-md"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected Landmark Callout */}
      {selected && (
        <div data-map-hud className="absolute right-14 bottom-4 left-3 z-10">
          <Card margin="m-0" contentWrapPadding="p-3" className="shadow-lg">
            <div className="text-sm font-bold">{selected.name}</div>
            <div className="text-xs opacity-70">{selected.note}</div>
          </Card>
        </div>
      )}
    </div>
  );
}
