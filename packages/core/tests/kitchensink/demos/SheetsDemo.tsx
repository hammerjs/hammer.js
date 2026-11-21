import {pan, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';
import {Button, Chip, Segmented, SegmentedButton, Toggle} from 'konsta/react';
import {Menu, Music, X} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import type {DemoMeta, DemoProps} from '../types';

type SheetDetent = 'peek' | 'half' | 'full';

const DETENT_PCT: Record<SheetDetent, number> = {
  peek: 68,
  half: 36,
  full: 8,
};

const DETENT_ORDER: readonly SheetDetent[] = ['peek', 'half', 'full'];

const TRACKS = [
  {title: "U Can't Touch This", artist: "MC Hammer · Please Hammer, Don't Hurt 'Em", duration: 257},
  {title: '2 Legit 2 Quit', artist: 'MC Hammer · Too Legit to Quit', duration: 335},
  {title: 'Pray', artist: "MC Hammer · Please Hammer, Don't Hurt 'Em", duration: 313},
] as const;

export const sheetsMeta: DemoMeta = {
  id: 'sheets',
  label: 'Sheets',
  title: 'Hammer Player',
  subtitle: 'Multi-detent bottom sheet, nested scrubber & left-edge swipe drawer',
  badges: ['nested surfaces', 'propagate', 'ignoreTarget(t, ev)', 'pan', 'onSwipe'],
  hint: 'Drag the bottom sheet between peek/half/full, scrub "U Can\'t Touch This" inside it (try toggling propagate), or swipe right from the left 28px edge for the drawer.',
  code: `import {pan, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';

function PlayerSheet({propagate}) {
  // 1. Multi-detent bottom sheet
  const sheetRef = useGestures([
    pan({
      direction: 'vertical',
      onPan: ev => dragSheet(ev.deltaY),
      onSwipe: ev => stepDetent(ev.direction === 'up' ? 1 : -1),
      onPanEnd: ev => snapToNearestDetent(ev.deltaY),
    }),
  ]);

  // 2. Nested scrubber inside the sheet:
  // With \`propagate: false\` (default), claiming this pan automatically
  // cancels the parent sheet drag. Toggle \`propagate: true\` to compare!
  const scrubberRef = useGestures(
    [pan({direction: 'horizontal', slop: 4, onPan: ev => seek(ev.deltaX)})],
    {propagate}
  );

  // 3. Left-edge swipe drawer using \`ignoreTarget(target, event)\`
  const stageRef = useGestures(
    [pan({direction: 'horizontal', onSwipe: ev => ev.direction === 'right' && openDrawer()})],
    {
      ignoreTarget: (_target, ev) =>
        (ev as PointerEvent).clientX - stageEl.getBoundingClientRect().left > 28,
    }
  );

  return (
    <div ref={stageRef}>
      <section ref={sheetRef}>
        <div ref={scrubberRef} role="slider" />
      </section>
    </div>
  );
}`,
};

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SheetsDemo({onEmit}: DemoProps) {
  const [detent, setDetent] = useState<SheetDetent>('half');
  const [sheetPct, setSheetPct] = useState(DETENT_PCT.half);
  const [sheetAnim, setSheetAnim] = useState(false);

  const [propagate, setPropagate] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [progress, setProgress] = useState(0.35);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOffsetPx, setDrawerOffsetPx] = useState<number | null>(null);
  const [drawerAnim, setDrawerAnim] = useState(false);

  const stageElRef = useRef<HTMLDivElement | null>(null);
  const sheetElRef = useRef<HTMLElement | null>(null);
  const scrubberElRef = useRef<HTMLDivElement | null>(null);
  const drawerElRef = useRef<HTMLElement | null>(null);

  const detentRef = useRef<SheetDetent>(detent);
  detentRef.current = detent;
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const dragStartProgressRef = useRef(progress);
  const sheetSwipedRef = useRef(false);
  const edgeSwipedRef = useRef(false);
  const drawerSwipedRef = useRef(false);

  const getStageHeight = () => {
    const h = stageElRef.current?.getBoundingClientRect().height ?? 0;
    return h > 0 ? h : 500;
  };

  const getDrawerWidth = () => {
    const w = drawerElRef.current?.getBoundingClientRect().width ?? 0;
    return w > 0 ? w : 250;
  };

  const snapSheet = (next: SheetDetent) => {
    detentRef.current = next;
    setDetent(next);
    setSheetAnim(true);
    setSheetPct(DETENT_PCT[next]);
  };

  const setDrawer = (open: boolean) => {
    setDrawerOpen(open);
    setDrawerOffsetPx(null);
    setDrawerAnim(true);
  };

  // 1. Multi-detent Bottom Sheet
  const sheetGestureRef = useGestures<HTMLElement>(
    [
      pan({
        direction: 'vertical',
        slop: 6,
        minSwipeVelocity: 260,
        minSwipeDistance: 28,
        onPanStart: () => {
          sheetSwipedRef.current = false;
          setSheetAnim(false);
        },
        onPan: ev => {
          const h = getStageHeight();
          const basePx = (DETENT_PCT[detentRef.current] / 100) * h;
          const minPx = (DETENT_PCT.full / 100) * h;
          const maxPx = (DETENT_PCT.peek / 100) * h;
          const clamped = Math.max(minPx, Math.min(maxPx, basePx + ev.deltaY));
          setSheetPct((clamped / h) * 100);
          onEmit({
            gesture: 'sheet pan',
            detail: `dy=${Math.round(ev.deltaY)}px (${detentRef.current})`,
            pointerType: ev.pointerType,
            touchAction: sheetElRef.current?.style.touchAction,
          });
        },
        onSwipe: ev => {
          const idx = DETENT_ORDER.indexOf(detentRef.current);
          if (ev.direction === 'up' && idx < DETENT_ORDER.length - 1) {
            sheetSwipedRef.current = true;
            const next = DETENT_ORDER[idx + 1];
            snapSheet(next);
            onEmit({
              gesture: 'sheet swipe up',
              detail: `Snapped to ${next}`,
              pointerType: ev.pointerType,
              touchAction: sheetElRef.current?.style.touchAction,
            });
          } else if (ev.direction === 'down' && idx > 0) {
            sheetSwipedRef.current = true;
            const next = DETENT_ORDER[idx - 1];
            snapSheet(next);
            onEmit({
              gesture: 'sheet swipe down',
              detail: `Snapped to ${next}`,
              pointerType: ev.pointerType,
              touchAction: sheetElRef.current?.style.touchAction,
            });
          }
        },
        onPanEnd: ev => {
          if (sheetSwipedRef.current) return;
          const h = getStageHeight();
          const currentPct = DETENT_PCT[detentRef.current] + (ev.deltaY / h) * 100;
          let closest: SheetDetent = detentRef.current;
          let minDist = Infinity;
          for (const d of DETENT_ORDER) {
            const dist = Math.abs(DETENT_PCT[d] - currentPct);
            if (dist < minDist) {
              minDist = dist;
              closest = d;
            }
          }
          snapSheet(closest);
          onEmit({
            gesture: 'sheet snap',
            detail: `Detent → ${closest}`,
            pointerType: ev.pointerType,
            touchAction: sheetElRef.current?.style.touchAction,
          });
        },
        onPanCancel: () => snapSheet(detentRef.current),
      }),
    ],
    {
      ignoreTarget: target =>
        target instanceof Element && Boolean(target.closest('input, button, label')),
    }
  );

  // 2. Nested horizontal scrubber inside the sheet
  const scrubberGestureRef = useGestures<HTMLDivElement>(
    [
      pan({
        direction: 'horizontal',
        slop: 4,
        onPanStart: () => {
          dragStartProgressRef.current = progressRef.current;
        },
        onPan: ev => {
          const width = scrubberElRef.current?.getBoundingClientRect().width || 240;
          const next = Math.max(0, Math.min(1, dragStartProgressRef.current + ev.deltaX / width));
          setProgress(next);
          onEmit({
            gesture: propagate ? 'scrub (propagate)' : 'scrub (isolated)',
            detail: `${Math.round(next * 100)}%`,
            pointerType: ev.pointerType,
            touchAction: scrubberElRef.current?.style.touchAction,
          });
        },
      }),
      tap({
        onTap: ev => {
          const rect = scrubberElRef.current?.getBoundingClientRect();
          if (rect && rect.width > 0) {
            const next = Math.max(0, Math.min(1, (ev.center.x - rect.left) / rect.width));
            setProgress(next);
            onEmit({
              gesture: 'scrub tap',
              detail: `Seek → ${Math.round(next * 100)}%`,
              pointerType: ev.pointerType,
              touchAction: scrubberElRef.current?.style.touchAction,
            });
          }
        },
      }),
    ],
    {propagate}
  );

  // 3. Left-edge 28px swipe drawer using ignoreTarget(target, event)
  const edgeGestureRef = useGestures<HTMLDivElement>(
    [
      pan({
        direction: 'horizontal',
        slop: 6,
        minSwipeVelocity: 260,
        onPanStart: () => {
          edgeSwipedRef.current = false;
          setDrawerAnim(false);
        },
        onPan: ev => {
          const w = getDrawerWidth();
          const openPx = Math.max(0, Math.min(w, ev.deltaX));
          setDrawerOffsetPx(openPx - w);
          onEmit({
            gesture: 'edge pan',
            detail: `drawer ${Math.round((openPx / w) * 100)}%`,
            pointerType: ev.pointerType,
            touchAction: stageElRef.current?.style.touchAction,
          });
        },
        onSwipe: ev => {
          if (ev.direction === 'right') {
            edgeSwipedRef.current = true;
            setDrawer(true);
            onEmit({gesture: 'edge swipe', detail: 'Opened drawer', pointerType: ev.pointerType});
          }
        },
        onPanEnd: ev => {
          if (edgeSwipedRef.current) return;
          const shouldOpen = ev.deltaX > 72;
          setDrawer(shouldOpen);
          onEmit({
            gesture: 'edge panEnd',
            detail: shouldOpen ? 'Opened drawer' : 'Dismissed drawer',
            pointerType: ev.pointerType,
          });
        },
        onPanCancel: () => setDrawer(false),
      }),
    ],
    {
      ignoreTarget: (_target, ev) => {
        if (drawerOpen) return true;
        const rect = stageElRef.current?.getBoundingClientRect();
        if (!rect) return true;
        return (ev as PointerEvent).clientX - rect.left > 28;
      },
    }
  );

  // Swipe left on open drawer to close
  const drawerGestureRef = useGestures<HTMLElement>(
    [
      pan({
        direction: 'horizontal',
        slop: 6,
        minSwipeVelocity: 240,
        onPanStart: () => {
          drawerSwipedRef.current = false;
          setDrawerAnim(false);
        },
        onPan: ev => {
          const w = getDrawerWidth();
          setDrawerOffsetPx(Math.max(-w, Math.min(0, ev.deltaX)));
        },
        onSwipe: ev => {
          if (ev.direction === 'left') {
            drawerSwipedRef.current = true;
            setDrawer(false);
            onEmit({gesture: 'drawer swipe', detail: 'Closed drawer', pointerType: ev.pointerType});
          }
        },
        onPanEnd: ev => {
          if (drawerSwipedRef.current) return;
          setDrawer(ev.deltaX > -72);
        },
        onPanCancel: () => setDrawer(true),
      }),
    ],
    {ignoreTarget: true}
  );

  const setStageRefs = useCallback(
    (node: HTMLDivElement | null) => {
      stageElRef.current = node;
      edgeGestureRef(node);
    },
    [edgeGestureRef]
  );

  const setSheetRefs = useCallback(
    (node: HTMLElement | null) => {
      sheetElRef.current = node;
      sheetGestureRef(node);
    },
    [sheetGestureRef]
  );

  const setScrubberRefs = useCallback(
    (node: HTMLDivElement | null) => {
      scrubberElRef.current = node;
      scrubberGestureRef(node);
    },
    [scrubberGestureRef]
  );

  const setDrawerRefs = useCallback(
    (node: HTMLElement | null) => {
      drawerElRef.current = node;
      drawerGestureRef(node);
    },
    [drawerGestureRef]
  );

  const track = TRACKS[trackIndex];
  const drawerVisible = drawerOpen || drawerOffsetPx !== null;
  const drawerTransform =
    drawerOffsetPx !== null
      ? `translate3d(${drawerOffsetPx}px, 0, 0)`
      : drawerOpen
        ? 'translate3d(0, 0, 0)'
        : 'translate3d(-105%, 0, 0)';

  return (
    <div
      ref={setStageRefs}
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden select-none bg-gradient-to-br from-sky-500/15 via-indigo-500/10 to-purple-500/15"
    >
      {/* Left 28px edge swipe visual hint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-1.5 bg-gradient-to-b from-transparent via-sky-500/60 to-transparent"
      />

      {/* Backdrop Player */}
      <div className="flex flex-col gap-3 p-3.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Open navigation drawer"
            onClick={() => {
              setDrawer(true);
              onEmit({gesture: 'drawer', detail: 'Opened via menu button'});
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 dark:border-white/15 bg-white/80 dark:bg-zinc-900/80 cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold">Now Playing</span>
          <span className="rounded-full bg-sky-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
            {detent}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 pt-1 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg">
            <Music className="h-7 w-7" />
          </div>
          <div className="mt-1 text-sm font-bold">{track.title}</div>
          <div className="text-xs opacity-65">{track.artist}</div>
          <div className="mt-2 w-56">
            <Segmented strong rounded>
              {DETENT_ORDER.map(d => (
                <SegmentedButton
                  key={d}
                  active={detent === d}
                  onClick={() => {
                    snapSheet(d);
                    onEmit({gesture: 'detent', detail: `Jumped to ${d}`});
                  }}
                >
                  {d[0].toUpperCase() + d.slice(1)}
                </SegmentedButton>
              ))}
            </Segmented>
          </div>
        </div>
      </div>

      {/* Multi-Detent Draggable Bottom Sheet */}
      <section
        ref={setSheetRefs}
        aria-label="Draggable bottom sheet"
        className={`ks-anim absolute inset-0 z-20 flex flex-col gap-3 rounded-t-3xl border-t border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 px-4 pt-2.5 pb-6 shadow-2xl cursor-grab active:cursor-grabbing will-change-transform ${
          sheetAnim ? 'transition-transform duration-200 ease-out' : ''
        }`}
        style={{transform: `translate3d(0, ${sheetPct}%, 0)`}}
      >
        <div
          aria-hidden="true"
          className="mx-auto h-1 w-10 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700"
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold">Break It Down</span>
          <label className="flex items-center gap-2 text-xs font-medium">
            <code className="text-[11px]">propagate</code>
            <Toggle
              checked={propagate}
              aria-label="Toggle gesture propagation"
              onChange={() => {
                const next = !propagate;
                setPropagate(next);
                onEmit({
                  gesture: 'propagate',
                  detail: next
                    ? 'propagate: true (parent sheet also receives drag)'
                    : 'propagate: false (nested scrubber cancels parent)',
                });
              }}
            />
          </label>
        </div>

        <p className="text-xs opacity-65 leading-relaxed">
          Scrub horizontally below. When <code>propagate</code> is off (default), Hammer cancels the
          parent sheet drag automatically.
        </p>

        {/* Nested Horizontal Scrubber */}
        <div
          ref={setScrubberRefs}
          role="slider"
          tabIndex={0}
          aria-label="Track progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="rounded-xl border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/80 p-3 cursor-ew-resize"
        >
          <div className="relative mb-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-sky-500"
              style={{width: `${progress * 100}%`}}
            />
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-white shadow-sm"
              style={{left: `${progress * 100}%`}}
            />
          </div>
          <div className="flex justify-between font-mono text-[11px] opacity-65">
            <span>{formatSeconds(progress * track.duration)}</span>
            <span>{formatSeconds(track.duration)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TRACKS.map((t, idx) => (
            <Chip
              key={t.title}
              outline={idx !== trackIndex}
              onClick={() => {
                setTrackIndex(idx);
                setProgress(0.25);
                onEmit({gesture: 'track', detail: `Selected "${t.title}"`});
              }}
              className="cursor-pointer"
            >
              {t.title}
            </Chip>
          ))}
        </div>
      </section>

      {/* Edge Drawer Backdrop Scrim */}
      {drawerVisible && (
        <div
          onClick={() => setDrawer(false)}
          className="absolute inset-0 z-30 bg-black/45 transition-opacity"
        />
      )}

      {/* Left-Edge Swipe Navigation Drawer */}
      <aside
        ref={setDrawerRefs}
        aria-label="Edge swipe drawer"
        aria-hidden={!drawerOpen}
        className={`ks-anim absolute top-0 bottom-0 left-0 z-40 flex w-[78%] max-w-[260px] flex-col gap-3 border-r border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 p-4 shadow-2xl will-change-transform ${
          drawerAnim ? 'transition-transform duration-200 ease-out' : ''
        }`}
        style={{transform: drawerTransform}}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Hammer Time Drawer</span>
          <Button small clear inline onClick={() => setDrawer(false)} aria-label="Close drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs opacity-65 leading-relaxed">
          Opened via <code>ignoreTarget(target, ev)</code> limited to the left 28px edge zone. Swipe
          left here to close.
        </p>
        <div className="flex flex-col gap-1.5">
          {DETENT_ORDER.map(d => (
            <Button
              key={d}
              small
              tonal={detent === d}
              outline={detent !== d}
              onClick={() => {
                setDrawer(false);
                snapSheet(d);
                onEmit({gesture: 'drawer action', detail: `Sheet → ${d}`});
              }}
            >
              Sheet → {d[0].toUpperCase() + d.slice(1)}
            </Button>
          ))}
        </div>
      </aside>
    </div>
  );
}
