import {longPress, pan, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';
import {Button, Searchbar, Toast} from 'konsta/react';
import {Archive, RotateCcw, Star} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import type {DemoMeta, DemoProps} from '../types';

interface MailItem {
  readonly id: string;
  readonly sender: string;
  readonly subject: string;
  readonly preview: string;
  readonly time: string;
  readonly avatar: string;
  readonly color: string;
  readonly starred: boolean;
  readonly archived: boolean;
  readonly expanded: boolean;
}

const INITIAL_MAIL: readonly MailItem[] = [
  {
    id: 'm1',
    sender: 'MC Hammer',
    subject: 'Stop! Hammer Time (touch-action)',
    preview:
      'Turns out U CAN touch this: horizontal row swipe works without blocking vertical list scroll.',
    time: '1990',
    avatar: 'MC',
    color: 'bg-amber-500',
    starred: true,
    archived: false,
    expanded: false,
  },
  {
    id: 'm2',
    sender: 'Stanley Burrell',
    subject: '2 Legit 2 Quit (longPress)',
    preview:
      'Press and hold any row for 420ms to drop quick actions — no accidental text selection callouts.',
    time: '14m',
    avatar: 'SB',
    color: 'bg-emerald-600',
    starred: false,
    archived: false,
    expanded: false,
  },
  {
    id: 'm3',
    sender: 'Parachute Pants Co.',
    subject: 'Break it down! Velocity flicks',
    preview:
      'My, my, my, my physics hits so hard — fast flicks commit via onSwipe, slow drags snap back.',
    time: '1h',
    avatar: 'PP',
    color: 'bg-violet-600',
    starred: false,
    archived: false,
    expanded: false,
  },
  {
    id: 'm4',
    sender: 'Oakland Studio',
    subject: "Please Hammer, Don't Hurt 'Em",
    preview:
      'Try typing in the search bar above: native inputs stay completely untouched by gestures.',
    time: '3h',
    avatar: 'OS',
    color: 'bg-sky-600',
    starred: false,
    archived: false,
    expanded: false,
  },
  {
    id: 'm5',
    sender: 'Bust It Records',
    subject: "Can't Touch Ghost Clicks",
    preview:
      'After swiping a row, trailing synthetic clicks are swallowed automatically so nothing misfires.',
    time: '5h',
    avatar: 'BR',
    color: 'bg-rose-600',
    starred: false,
    archived: false,
    expanded: false,
  },
  {
    id: 'm6',
    sender: 'Oaktown 357',
    subject: 'Fresh new kicks & tree-shaking',
    preview: 'Import only tap, pan, and longPress — unused recognizers stay out of your bundle.',
    time: 'Yesterday',
    avatar: 'O3',
    color: 'bg-teal-600',
    starred: false,
    archived: false,
    expanded: false,
  },
];

export const inboxMeta: DemoMeta = {
  id: 'inbox',
  label: 'Inbox',
  title: 'Hammer Mail',
  subtitle: 'Swipeable tour inbox inside a vertically scrolling list',
  badges: ['pan (horizontal)', 'onSwipe', 'longPress', 'tap'],
  hint: 'Break it down: scroll vertically, swipe right to star, swipe left to archive, tap to expand, or press-and-hold (420ms) for quick actions.',
  code: `import {longPress, pan, tap} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';

function MailRow({item, onStar, onArchive, onExpand, onLongPress}) {
  const [offsetX, setOffsetX] = useState(0);

  // Horizontal pan computes CSS \`touch-action: pan-y pinch-zoom\`
  // automatically so vertical list scrolling stays 100% native.
  const ref = useGestures([
    pan({
      direction: 'horizontal',
      slop: 10,
      onPan: ev => setOffsetX(Math.max(-140, Math.min(140, ev.deltaX))),
      onSwipe: ev => {
        if (ev.direction === 'left') onArchive(item.id);
        if (ev.direction === 'right') onStar(item.id);
      },
      onPanEnd: ev => {
        if (ev.deltaX <= -85) onArchive(item.id);
        else if (ev.deltaX >= 85) onStar(item.id);
        setOffsetX(0);
      },
      onPanCancel: () => setOffsetX(0),
    }),
    longPress({duration: 420, onLongPress: () => onLongPress(item.id)}),
    tap({onTap: () => onExpand(item.id)}),
  ]);

  return (
    <div ref={ref} style={{transform: \`translate3d(\${offsetX}px, 0, 0)\`}}>
      {item.subject}
    </div>
  );
}`,
};

interface MailRowProps {
  readonly item: MailItem;
  readonly menuOpen: boolean;
  readonly onStar: (id: string, source: string, pointerType?: string, ta?: string) => void;
  readonly onArchive: (id: string, source: string, pointerType?: string, ta?: string) => void;
  readonly onToggleExpand: (id: string, pointerType?: string, ta?: string) => void;
  readonly onToggleMenu: (id: string, pointerType?: string, ta?: string) => void;
  readonly onEmit: DemoProps['onEmit'];
}

function MailRow({
  item,
  menuOpen,
  onStar,
  onArchive,
  onToggleExpand,
  onToggleMenu,
  onEmit,
}: MailRowProps) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const committedRef = useRef(false);
  const elRef = useRef<HTMLDivElement | null>(null);

  const gestureRef = useGestures<HTMLDivElement>([
    pan({
      direction: 'horizontal',
      slop: 10,
      minSwipeVelocity: 280,
      minSwipeDistance: 36,
      onPanStart: () => {
        committedRef.current = false;
        setAnimating(false);
      },
      onPan: ev => {
        const clamped = Math.max(-140, Math.min(140, ev.deltaX));
        setDx(clamped);
        onEmit({
          gesture: 'pan (horizontal)',
          detail: `dx=${Math.round(clamped)}px`,
          pointerType: ev.pointerType,
          touchAction: elRef.current?.style.touchAction,
        });
      },
      onSwipe: ev => {
        const ta = elRef.current?.style.touchAction;
        if (ev.direction === 'left') {
          committedRef.current = true;
          onArchive(item.id, 'swipe left', ev.pointerType, ta);
        } else if (ev.direction === 'right') {
          committedRef.current = true;
          setAnimating(true);
          setDx(0);
          onStar(item.id, 'swipe right', ev.pointerType, ta);
        }
      },
      onPanEnd: ev => {
        if (committedRef.current) return;
        const ta = elRef.current?.style.touchAction;
        setAnimating(true);
        if (ev.deltaX <= -85) {
          onArchive(item.id, 'panEnd (archive)', ev.pointerType, ta);
        } else if (ev.deltaX >= 85) {
          setDx(0);
          onStar(item.id, 'panEnd (star)', ev.pointerType, ta);
        } else {
          setDx(0);
        }
      },
      onPanCancel: () => {
        setAnimating(true);
        setDx(0);
      },
    }),
    longPress({
      duration: 420,
      onLongPress: ev => {
        onToggleMenu(item.id, ev.pointerType, elRef.current?.style.touchAction);
      },
    }),
    tap({
      onTap: ev => {
        onToggleExpand(item.id, ev.pointerType, elRef.current?.style.touchAction);
      },
    }),
  ]);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      elRef.current = node;
      gestureRef(node);
    },
    [gestureRef]
  );

  const starOpacity = dx > 0 ? Math.min(1, dx / 70) : 0;
  const archiveOpacity = dx < 0 ? Math.min(1, -dx / 70) : 0;

  return (
    <div
      role="listitem"
      className="relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xs"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-start bg-amber-500 px-4 text-xs font-bold text-white"
        style={{opacity: starOpacity}}
      >
        <Star className="mr-1.5 h-4 w-4 fill-current" />
        {item.starred ? 'Unstar' : 'Star'}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-end bg-rose-600 px-4 text-xs font-bold text-white"
        style={{opacity: archiveOpacity}}
      >
        Archive
        <Archive className="ml-1.5 h-4 w-4" />
      </div>

      <div
        ref={setRefs}
        className={`ks-anim relative z-10 flex select-none items-start gap-3 p-3 cursor-grab active:cursor-grabbing ${
          menuOpen ? 'bg-sky-50 dark:bg-sky-950/60' : 'bg-white dark:bg-zinc-900'
        } ${animating ? 'transition-transform duration-200 ease-out' : ''}`}
        style={{transform: `translate3d(${dx}px, 0, 0)`}}
      >
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${item.color}`}
        >
          {item.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{item.sender}</span>
            <span className="flex shrink-0 items-center gap-1 text-[11px] opacity-60">
              {item.starred && (
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-label="Starred" />
              )}
              {item.time}
            </span>
          </div>
          <div className="truncate text-[13px] font-medium">{item.subject}</div>
          <p
            className={`mt-0.5 text-xs opacity-65 leading-snug ${
              item.expanded ? '' : 'line-clamp-2'
            }`}
          >
            {item.preview}
          </p>
        </div>
      </div>

      {menuOpen && (
        <div
          role="toolbar"
          aria-label="Message quick actions"
          className="relative z-20 flex items-center gap-2 border-t border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/80 px-3 py-2"
        >
          <Button small tonal inline onClick={() => onStar(item.id, 'quickAction')}>
            {item.starred ? 'Unstar' : 'Star'}
          </Button>
          <Button small tonal inline onClick={() => onArchive(item.id, 'quickAction')}>
            Archive
          </Button>
          <Button small clear inline onClick={() => onToggleMenu(item.id)}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

export function InboxDemo({onEmit}: DemoProps) {
  const [items, setItems] = useState<readonly MailItem[]>(INITIAL_MAIL);
  const [query, setQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [lastArchived, setLastArchived] = useState<MailItem | null>(null);

  const archivedCount = items.filter(m => m.archived).length;
  const q = query.trim().toLowerCase();
  const visible = items.filter(
    m =>
      !m.archived &&
      (!q ||
        m.sender.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q))
  );

  const handleStar = (id: string, source: string, pointerType?: string, touchAction?: string) => {
    const target = items.find(m => m.id === id);
    if (!target) return;
    setItems(prev => prev.map(m => (m.id === id ? {...m, starred: !m.starred} : m)));
    setActiveMenuId(null);
    onEmit({
      gesture: source,
      detail: `${!target.starred ? 'Starred' : 'Unstarred'} "${target.sender}"`,
      pointerType,
      touchAction,
    });
  };

  const handleArchive = (
    id: string,
    source: string,
    pointerType?: string,
    touchAction?: string
  ) => {
    const target = items.find(m => m.id === id);
    if (!target) return;
    setItems(prev => prev.map(m => (m.id === id ? {...m, archived: true} : m)));
    setActiveMenuId(prev => (prev === id ? null : prev));
    setLastArchived(target);
    onEmit({
      gesture: source,
      detail: `Archived "${target.sender}"`,
      pointerType,
      touchAction,
    });
  };

  const handleExpand = (id: string, pointerType?: string, touchAction?: string) => {
    if (activeMenuId === id) {
      setActiveMenuId(null);
      return;
    }
    const target = items.find(m => m.id === id);
    if (!target) return;
    setItems(prev => prev.map(m => (m.id === id ? {...m, expanded: !m.expanded} : m)));
    onEmit({
      gesture: 'tap',
      detail: `${!target.expanded ? 'Expanded' : 'Collapsed'} "${target.sender}"`,
      pointerType,
      touchAction,
    });
  };

  const handleToggleMenu = (id: string, pointerType?: string, touchAction?: string) => {
    const target = items.find(m => m.id === id);
    setActiveMenuId(prev => (prev === id ? null : id));
    if (target) {
      onEmit({
        gesture: 'longPress',
        detail: `Quick actions for "${target.sender}"`,
        pointerType,
        touchAction,
      });
    }
  };

  const handleRestoreAll = () => {
    setItems(prev => prev.map(m => ({...m, archived: false})));
    setLastArchived(null);
    onEmit({gesture: 'restore', detail: 'Restored all archived rows'});
  };

  const handleUndo = () => {
    if (!lastArchived) return;
    const undoId = lastArchived.id;
    setItems(prev => prev.map(m => (m.id === undoId ? {...m, archived: false} : m)));
    onEmit({gesture: 'undo', detail: `Restored "${lastArchived.sender}"`});
    setLastArchived(null);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-black/10 dark:border-white/10 px-3 py-2">
        <div className="min-w-0 flex-1">
          <Searchbar
            placeholder="U Can Search This..."
            value={query}
            onInput={e => setQuery((e.target as HTMLInputElement).value)}
            onClear={() => setQuery('')}
          />
        </div>
        {archivedCount > 0 && (
          <Button small tonal inline onClick={handleRestoreAll}>
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Restore ({archivedCount})
          </Button>
        )}
      </div>

      <div
        role="list"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3 pb-16"
      >
        {visible.length === 0 ? (
          <div className="py-12 text-center text-sm opacity-60">
            {archivedCount > 0
              ? 'Inbox zero — 2 Legit 2 Quit! Tap Restore above.'
              : "Can't find that message."}
          </div>
        ) : (
          visible.map(item => (
            <MailRow
              key={item.id}
              item={item}
              menuOpen={activeMenuId === item.id}
              onStar={handleStar}
              onArchive={handleArchive}
              onToggleExpand={handleExpand}
              onToggleMenu={handleToggleMenu}
              onEmit={onEmit}
            />
          ))
        )}
      </div>

      <Toast
        position="center"
        opened={Boolean(lastArchived)}
        button={
          <Button clear small inline onClick={handleUndo}>
            Undo
          </Button>
        }
      >
        <div className="truncate text-xs">Archived {lastArchived?.sender}</div>
      </Toast>
    </div>
  );
}
