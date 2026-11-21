import {longPress, pan} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';
import {Button, Checkbox, Chip} from 'konsta/react';
import {GripVertical, RotateCcw} from 'lucide-react';
import {useCallback, useRef, useState} from 'react';
import type {DemoMeta, DemoProps} from '../types';

interface QueueItem {
  readonly id: string;
  readonly title: string;
  readonly tag: string;
  readonly done: boolean;
}

const INITIAL_QUEUE: readonly QueueItem[] = [
  {id: 'q1', title: 'Pointer capture on active drag', tag: 'Core', done: true},
  {id: 'q2', title: 'Automatic touch-action policy', tag: 'CSS', done: false},
  {id: 'q3', title: 'LongPress + drag scroll coexistence', tag: 'UX', done: false},
  {id: 'q4', title: 'Velocity LSQ2 smoothing', tag: 'Math', done: false},
  {id: 'q5', title: 'Nested surface auto-cancel', tag: 'Arena', done: false},
  {id: 'q6', title: 'Tree-shakeable ESM descriptors', tag: 'Bundle', done: false},
];

export const reorderMeta: DemoMeta = {
  id: 'reorder',
  label: 'Reorder',
  title: 'Drag to Reorder',
  subtitle: 'Instant handle drag + press-and-hold reorder with native checkboxes',
  badges: ['pan (vertical)', 'longPress', 'onLongPressMove', 'ignoreTarget: true'],
  hint: 'Drag the grip handle immediately, or press-and-hold anywhere on a row (360ms) to pick it up without breaking vertical scroll.',
  code: `import {longPress, pan} from '@hammerjs/core';
import {useGestures} from '@hammerjs/react';

function ReorderRow({item, onBegin, onMove, onCommit, onCancel}) {
  // Pattern A: Instant vertical drag on a dedicated grip handle
  const handleRef = useGestures([
    pan({
      direction: 'vertical',
      slop: 4,
      onPanStart: () => onBegin(item.id),
      onPan: ev => onMove(ev.deltaY),
      onPanEnd: () => onCommit(),
      onPanCancel: () => onCancel(),
    }),
  ]);

  // Pattern B: Press-and-hold anywhere on the row (preserves list scroll!).
  // \`ignoreTarget: true\` keeps <input type="checkbox"> and handle <button> native.
  const rowRef = useGestures(
    [
      longPress({
        duration: 360,
        onLongPress: () => onBegin(item.id),
        onLongPressMove: ev => onMove(ev.deltaY),
        onLongPressUp: () => onCommit(),
        onLongPressCancel: () => onCancel(),
      }),
    ],
    {ignoreTarget: true}
  );

  return (
    <div ref={rowRef}>
      <Checkbox checked={item.done} onChange={toggleDone} />
      <span>{item.title}</span>
      <button ref={handleRef} aria-label="Drag handle">≡</button>
    </div>
  );
}`,
};

interface DragState {
  readonly activeId: string;
  readonly startIndex: number;
  readonly targetIndex: number;
  readonly deltaY: number;
  readonly pitch: number;
}

interface ReorderRowProps {
  readonly item: QueueItem;
  readonly index: number;
  readonly drag: DragState | null;
  readonly onToggleDone: (id: string) => void;
  readonly onBegin: (
    id: string,
    index: number,
    pitch: number,
    source: string,
    pointerType?: string,
    touchAction?: string
  ) => void;
  readonly onMove: (
    deltaY: number,
    source: string,
    pointerType?: string,
    touchAction?: string
  ) => void;
  readonly onFinish: (commit: boolean, source: string, pointerType?: string) => void;
}

function ReorderRow({item, index, drag, onToggleDone, onBegin, onMove, onFinish}: ReorderRowProps) {
  const rowElRef = useRef<HTMLDivElement | null>(null);
  const handleElRef = useRef<HTMLButtonElement | null>(null);

  const measurePitch = () => {
    const h = rowElRef.current?.getBoundingClientRect().height ?? 0;
    return h > 0 ? h + 8 : 58;
  };

  const handleGestureRef = useGestures<HTMLButtonElement>([
    pan({
      direction: 'vertical',
      slop: 4,
      onPanStart: ev =>
        onBegin(
          item.id,
          index,
          measurePitch(),
          'handle panStart',
          ev.pointerType,
          handleElRef.current?.style.touchAction
        ),
      onPan: ev =>
        onMove(ev.deltaY, 'handle pan', ev.pointerType, handleElRef.current?.style.touchAction),
      onPanEnd: ev => onFinish(true, 'handle panEnd', ev.pointerType),
      onPanCancel: () => onFinish(false, 'handle panCancel'),
    }),
  ]);

  const rowGestureRef = useGestures<HTMLDivElement>(
    [
      longPress({
        duration: 360,
        onLongPress: ev =>
          onBegin(
            item.id,
            index,
            measurePitch(),
            'longPress',
            ev.pointerType,
            rowElRef.current?.style.touchAction
          ),
        onLongPressMove: ev =>
          onMove(ev.deltaY, 'longPressMove', ev.pointerType, rowElRef.current?.style.touchAction),
        onLongPressUp: ev => onFinish(true, 'longPressUp', ev.pointerType),
        onLongPressCancel: () => onFinish(false, 'longPressCancel'),
      }),
    ],
    {ignoreTarget: true}
  );

  const setRowRefs = useCallback(
    (node: HTMLDivElement | null) => {
      rowElRef.current = node;
      rowGestureRef(node);
    },
    [rowGestureRef]
  );

  const setHandleRefs = useCallback(
    (node: HTMLButtonElement | null) => {
      handleElRef.current = node;
      handleGestureRef(node);
    },
    [handleGestureRef]
  );

  const isDragging = drag?.activeId === item.id;
  let shiftY = 0;
  if (drag && !isDragging) {
    if (
      drag.targetIndex > drag.startIndex &&
      index > drag.startIndex &&
      index <= drag.targetIndex
    ) {
      shiftY = -drag.pitch;
    } else if (
      drag.targetIndex < drag.startIndex &&
      index >= drag.targetIndex &&
      index < drag.startIndex
    ) {
      shiftY = drag.pitch;
    }
  }

  return (
    <div
      ref={setRowRefs}
      role="listitem"
      className={`ks-anim relative flex select-none items-center gap-3 rounded-2xl border px-3 py-2.5 bg-white dark:bg-zinc-900 ${
        isDragging
          ? 'z-20 border-sky-500 shadow-xl'
          : 'border-black/10 dark:border-white/10 shadow-xs transition-transform duration-150 ease-out'
      }`}
      style={{
        transform: isDragging
          ? `translate3d(0, ${drag.deltaY}px, 0) scale(1.02)`
          : shiftY
            ? `translate3d(0, ${shiftY}px, 0)`
            : undefined,
      }}
    >
      <Checkbox
        checked={item.done}
        onChange={() => onToggleDone(item.id)}
        aria-label={`Mark ${item.title} done`}
      />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-sm font-medium ${item.done ? 'line-through opacity-55' : ''}`}
        >
          {item.title}
        </div>
        <div className="mt-0.5">
          <Chip outline className="!h-5 !px-2 !text-[10px]">
            {item.tag}
          </Chip>
        </div>
      </div>
      <button
        ref={setHandleRefs}
        type="button"
        aria-label={`Drag to reorder ${item.title}`}
        title="Drag immediately"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800 opacity-75 hover:opacity-100 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ReorderDemo({onEmit}: DemoProps) {
  const [items, setItems] = useState<readonly QueueItem[]>(INITIAL_QUEUE);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const itemsRef = useRef<readonly QueueItem[]>(items);
  itemsRef.current = items;

  const completed = items.filter(i => i.done).length;

  const handleToggleDone = (id: string) => {
    const target = itemsRef.current.find(i => i.id === id);
    if (!target) return;
    setItems(prev => prev.map(i => (i.id === id ? {...i, done: !i.done} : i)));
    onEmit({
      gesture: 'checkbox',
      detail: `${!target.done ? 'Checked' : 'Unchecked'} "${target.title}" (ignoreTarget: true)`,
    });
  };

  const handleBegin = (
    id: string,
    index: number,
    pitch: number,
    source: string,
    pointerType?: string,
    touchAction?: string
  ) => {
    const item = itemsRef.current[index];
    const next: DragState = {activeId: id, startIndex: index, targetIndex: index, deltaY: 0, pitch};
    dragRef.current = next;
    setDrag(next);
    if (item) {
      onEmit({
        gesture: source,
        detail: `Picked up "${item.title}" (#${index + 1})`,
        pointerType,
        touchAction,
      });
    }
  };

  const handleMove = (
    deltaY: number,
    source: string,
    pointerType?: string,
    touchAction?: string
  ) => {
    const cur = dragRef.current;
    if (!cur) return;
    const maxIdx = itemsRef.current.length - 1;
    const targetIndex = Math.max(
      0,
      Math.min(maxIdx, cur.startIndex + Math.round(deltaY / cur.pitch))
    );
    const next: DragState = {...cur, deltaY, targetIndex};
    dragRef.current = next;
    setDrag(next);
    onEmit({
      gesture: source,
      detail: `dy=${Math.round(deltaY)}px → slot #${targetIndex + 1}`,
      pointerType,
      touchAction,
    });
  };

  const handleFinish = (commit: boolean, source: string, pointerType?: string) => {
    const cur = dragRef.current;
    if (!cur) return;
    dragRef.current = null;
    setDrag(null);

    const movedItem = itemsRef.current[cur.startIndex];
    if (commit && cur.targetIndex !== cur.startIndex) {
      setItems(prev => {
        const copy = [...prev];
        const [moved] = copy.splice(cur.startIndex, 1);
        copy.splice(cur.targetIndex, 0, moved);
        return copy;
      });
      if (movedItem) {
        onEmit({
          gesture: source,
          detail: `Moved "${movedItem.title}" to #${cur.targetIndex + 1}`,
          pointerType,
        });
      }
    } else if (movedItem) {
      onEmit({
        gesture: source,
        detail: commit
          ? `Kept "${movedItem.title}" at #${cur.startIndex + 1}`
          : 'Reorder cancelled',
        pointerType,
      });
    }
  };

  const handleReset = () => {
    setItems(INITIAL_QUEUE);
    setDrag(null);
    dragRef.current = null;
    onEmit({gesture: 'reset', detail: 'Restored original queue order'});
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-black/10 dark:border-white/10 px-3 py-2 text-xs">
        <span className="font-medium opacity-70">
          {completed} of {items.length} done
        </span>
        <Button small tonal inline onClick={handleReset}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset order
        </Button>
      </div>

      <div
        role="list"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-3 pb-16"
      >
        {items.map((item, idx) => (
          <ReorderRow
            key={item.id}
            item={item}
            index={idx}
            drag={drag}
            onToggleDone={handleToggleDone}
            onBegin={handleBegin}
            onMove={handleMove}
            onFinish={handleFinish}
          />
        ))}
      </div>
    </div>
  );
}
