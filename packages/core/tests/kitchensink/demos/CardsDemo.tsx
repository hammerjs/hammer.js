import {pan, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';
import {Button} from 'konsta/react';
import {Heart, Info, RotateCcw, X} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {DemoMeta, DemoProps} from '../types';

interface DeckCard {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly details: string;
  readonly gradient: string;
}

const DECK: readonly DeckCard[] = [
  {
    id: 'c1',
    title: 'Kyoto Bamboo Trail',
    subtitle: 'Arashiyama · 4.2 km',
    details:
      'Early morning mist walk through towering groves. Velocity fling projects the card smoothly off-screen.',
    gradient: 'from-emerald-800 via-emerald-700 to-teal-700',
  },
  {
    id: 'c2',
    title: 'Amalfi Cliff Walk',
    subtitle: 'Positano · 6.8 km',
    details:
      'Lemon terraces overlooking the Tyrrhenian Sea. Tap anywhere on the card to flip details without dragging.',
    gradient: 'from-sky-800 via-sky-600 to-cyan-600',
  },
  {
    id: 'c3',
    title: 'Dolomites Ridge',
    subtitle: 'Seceda · 9.1 km',
    details:
      'Dramatic alpine spires at 2,500m. In-card buttons stay clickable natively via lazy pointer capture.',
    gradient: 'from-indigo-900 via-indigo-700 to-violet-700',
  },
  {
    id: 'c4',
    title: 'Reynisfjara Coast',
    subtitle: 'Vík · 3.5 km',
    details:
      'Basalt columns and Atlantic surf. Trailing ghost clicks are suppressed automatically after dragging.',
    gradient: 'from-slate-800 via-slate-700 to-zinc-600',
  },
  {
    id: 'c5',
    title: 'Big Sur Overlook',
    subtitle: 'Highway 1 · 5.4 km',
    details: 'Redwood canyons meeting coastal cliffs. Release early to feel the spring snap-back.',
    gradient: 'from-orange-800 via-orange-600 to-amber-600',
  },
];

export const cardsMeta: DemoMeta = {
  id: 'cards',
  label: 'Cards',
  title: 'Card Deck',
  subtitle: '2D velocity-projected swipeable stack with tap-to-flip & in-card buttons',
  badges: ['pan (both)', 'velocityX/Y', 'onSwipe', 'tap', 'lazy capture'],
  hint: 'Drag or flick left/right to pass or like, tap a card (or its button) to reveal details, or use the action buttons below.',
  code: `import {pan, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';

function SwipeCard({card, onVerdict}) {
  const [drag, setDrag] = useState({x: 0, y: 0});
  const [flipped, setFlipped] = useState(false);

  // Lazy pointer capture only activates once pan starts,
  // so buttons inside the card remain natively clickable!
  const cardRef = useGestures([
    pan({
      slop: 6,
      minSwipeVelocity: 320,
      onPan: ev => setDrag({x: ev.deltaX, y: ev.deltaY * 0.65}),
      onSwipe: ev => {
        if (ev.direction === 'right') onVerdict('like', ev.velocityX, ev.velocityY);
        if (ev.direction === 'left') onVerdict('nope', ev.velocityX, ev.velocityY);
      },
      onPanEnd: ev => {
        if (Math.abs(ev.deltaX) > 105) {
          onVerdict(ev.deltaX > 0 ? 'like' : 'nope', ev.velocityX, ev.velocityY);
        } else {
          setDrag({x: 0, y: 0});
        }
      },
    }),
    tap({onTap: () => setFlipped(f => !f)}),
  ]);

  return <article ref={cardRef}>{card.title}</article>;
}`,
};

export function CardsDemo({onEmit}: DemoProps) {
  const [index, setIndex] = useState(0);
  const [likes, setLikes] = useState(0);
  const [passes, setPasses] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState({x: 0, y: 0, rot: 0, opacity: 1});
  const [animating, setAnimating] = useState(false);

  const topCardElRef = useRef<HTMLDivElement | null>(null);
  const flungRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const flingTop = useCallback(
    (verdict: 'like' | 'nope', vx: number, vy: number, source: string, pointerType?: string) => {
      if (index >= DECK.length) return;
      const card = DECK[index];
      const dir = verdict === 'like' ? 1 : -1;
      const throwX = dir * Math.max(420, Math.abs(vx) * 0.25);
      const throwY = Math.max(-200, Math.min(200, vy * 0.15));

      setAnimating(true);
      setDrag({x: throwX, y: throwY, rot: dir * 24, opacity: 0});
      if (verdict === 'like') setLikes(n => n + 1);
      else setPasses(n => n + 1);

      onEmit({
        gesture: source,
        detail: `${verdict.toUpperCase()} "${card.title}" (${Math.round(Math.hypot(vx, vy))} px/s)`,
        pointerType,
        touchAction: topCardElRef.current?.style.touchAction,
      });

      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setAnimating(false);
        setDrag({x: 0, y: 0, rot: 0, opacity: 1});
        setFlipped(false);
        setIndex(i => i + 1);
      }, 210);
    },
    [index, onEmit]
  );

  const topGestureRef = useGestures<HTMLDivElement>([
    pan({
      slop: 6,
      minSwipeVelocity: 320,
      minSwipeDistance: 35,
      onPanStart: () => {
        flungRef.current = false;
        setAnimating(false);
      },
      onPan: ev => {
        setDrag({
          x: ev.deltaX,
          y: ev.deltaY * 0.65,
          rot: ev.deltaX * 0.05,
          opacity: 1,
        });
        onEmit({
          gesture: 'pan',
          detail: `dx=${Math.round(ev.deltaX)}, dy=${Math.round(ev.deltaY)}`,
          pointerType: ev.pointerType,
          touchAction: topCardElRef.current?.style.touchAction,
        });
      },
      onSwipe: ev => {
        if (ev.direction === 'right') {
          flungRef.current = true;
          flingTop('like', ev.velocityX, ev.velocityY, 'swipe right', ev.pointerType);
        } else if (ev.direction === 'left') {
          flungRef.current = true;
          flingTop('nope', ev.velocityX, ev.velocityY, 'swipe left', ev.pointerType);
        }
      },
      onPanEnd: ev => {
        if (flungRef.current) return;
        if (ev.deltaX > 105) {
          flingTop('like', ev.velocityX, ev.velocityY, 'panEnd (like)', ev.pointerType);
        } else if (ev.deltaX < -105) {
          flingTop('nope', ev.velocityX, ev.velocityY, 'panEnd (nope)', ev.pointerType);
        } else {
          setAnimating(true);
          setDrag({x: 0, y: 0, rot: 0, opacity: 1});
        }
      },
      onPanCancel: () => {
        setAnimating(true);
        setDrag({x: 0, y: 0, rot: 0, opacity: 1});
      },
    }),
    tap({
      onTap: ev => {
        if (ev.target instanceof Element && ev.target.closest('[data-inline-flip]')) return;
        const card = DECK[index];
        setFlipped(prev => {
          const next = !prev;
          if (card) {
            onEmit({
              gesture: 'tap',
              detail: `${next ? 'Expanded' : 'Collapsed'} "${card.title}"`,
              pointerType: ev.pointerType,
              touchAction: topCardElRef.current?.style.touchAction,
            });
          }
          return next;
        });
      },
    }),
  ]);

  const setTopRefs = useCallback(
    (node: HTMLDivElement | null) => {
      topCardElRef.current = node;
      topGestureRef(node);
    },
    [topGestureRef]
  );

  const visibleSlice = DECK.slice(index, index + 3);
  const likeOpacity = drag.x > 15 ? Math.min(1, drag.x / 95) : 0;
  const nopeOpacity = drag.x < -15 ? Math.min(1, -drag.x / 95) : 0;

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-between gap-3 p-4 overflow-hidden">
      <div className="flex w-full items-center justify-between text-xs font-medium opacity-70">
        <span>
          Passed: <strong className="text-rose-500">{passes}</strong>
        </span>
        <span>
          Liked: <strong className="text-emerald-500">{likes}</strong>
        </span>
      </div>

      <div className="relative flex min-h-[260px] w-full flex-1 items-center justify-center">
        {index >= DECK.length ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm opacity-70">You reviewed all {DECK.length} cards.</p>
            <Button
              rounded
              inline
              onClick={() => {
                setIndex(0);
                setLikes(0);
                setPasses(0);
                setFlipped(false);
                setDrag({x: 0, y: 0, rot: 0, opacity: 1});
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Shuffle again
            </Button>
          </div>
        ) : (
          visibleSlice
            .map((card, offset) => ({card, offset}))
            .reverse()
            .map(({card, offset}) => {
              const isTop = offset === 0;
              return (
                <div
                  key={card.id}
                  ref={isTop ? setTopRefs : undefined}
                  className={`ks-anim absolute inset-1 flex flex-col justify-end overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-xl select-none ${
                    card.gradient
                  } ${isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'} ${
                    isTop && animating ? 'transition-all duration-200 ease-out' : ''
                  }`}
                  style={{
                    zIndex: 10 - offset,
                    opacity: isTop ? drag.opacity : 1,
                    transform: isTop
                      ? `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${drag.rot}deg)`
                      : `translate3d(0, ${offset * 10}px, 0) scale(${1 - offset * 0.045})`,
                  }}
                >
                  {isTop && (
                    <>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-5 left-4 -rotate-12 rounded-lg border-4 border-emerald-400 px-2.5 py-0.5 text-lg font-black tracking-wider text-emerald-400"
                        style={{opacity: likeOpacity}}
                      >
                        LIKE
                      </span>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-5 right-4 rotate-12 rounded-lg border-4 border-rose-400 px-2.5 py-0.5 text-lg font-black tracking-wider text-rose-400"
                        style={{opacity: nopeOpacity}}
                      >
                        NOPE
                      </span>
                    </>
                  )}

                  <span className="mb-2 self-start rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold">
                    {index + offset + 1} / {DECK.length}
                  </span>
                  <h3 className="text-xl font-bold leading-tight">{card.title}</h3>
                  <p className="text-sm text-white/85">{card.subtitle}</p>
                  {isTop && flipped && (
                    <p className="mt-2 text-xs leading-relaxed text-white/95">{card.details}</p>
                  )}
                  {isTop && (
                    <button
                      type="button"
                      data-inline-flip
                      onClick={e => {
                        e.stopPropagation();
                        setFlipped(f => !f);
                        onEmit({
                          gesture: 'button click',
                          detail: 'In-card button clicked natively (lazy capture)',
                        });
                      }}
                      className="mt-3 self-start rounded-full border border-white/40 bg-black/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xs cursor-pointer"
                    >
                      {flipped ? 'Hide details' : 'Tap card or button to flip'}
                    </button>
                  )}
                </div>
              );
            })
        )}
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          aria-label="Pass card"
          onClick={() => flingTop('nope', -900, -40, 'button nope')}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 text-rose-500 shadow-md cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Flip card details"
          onClick={() => setFlipped(f => !f)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 text-sky-500 shadow-md cursor-pointer"
        >
          <Info className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Like card"
          onClick={() => flingTop('like', 900, -40, 'button like')}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-zinc-900 text-emerald-500 shadow-md cursor-pointer"
        >
          <Heart className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
