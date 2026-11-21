import {
  App as KonstaApp,
  Button,
  Chip,
  Navbar,
  Page,
  Popup,
  Segmented,
  SegmentedButton,
  Tabbar,
  TabbarLink,
  ToolbarPane,
} from 'konsta/react';
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Layers,
  ListOrdered,
  Mail,
  Map as MapIcon,
  Moon,
  PanelBottom,
  Sun,
} from 'lucide-react';
import {useCallback, useEffect, useState, type ReactNode} from 'react';
import {CardsDemo, cardsMeta} from './demos/CardsDemo';
import {InboxDemo, inboxMeta} from './demos/InboxDemo';
import {MapDemo, mapMeta} from './demos/MapDemo';
import {ReorderDemo, reorderMeta} from './demos/ReorderDemo';
import {SheetsDemo, sheetsMeta} from './demos/SheetsDemo';
import type {DemoId, DemoMeta, TelemetryEntry} from './types';

interface DemoEntry {
  readonly meta: DemoMeta;
  readonly icon: ReactNode;
  readonly render: (onEmit: (entry: TelemetryEntry) => void) => ReactNode;
}

const DEMOS: readonly DemoEntry[] = [
  {
    meta: inboxMeta,
    icon: <Mail className="h-5 w-5" />,
    render: onEmit => <InboxDemo onEmit={onEmit} />,
  },
  {
    meta: mapMeta,
    icon: <MapIcon className="h-5 w-5" />,
    render: onEmit => <MapDemo onEmit={onEmit} />,
  },
  {
    meta: cardsMeta,
    icon: <Layers className="h-5 w-5" />,
    render: onEmit => <CardsDemo onEmit={onEmit} />,
  },
  {
    meta: reorderMeta,
    icon: <ListOrdered className="h-5 w-5" />,
    render: onEmit => <ReorderDemo onEmit={onEmit} />,
  },
  {
    meta: sheetsMeta,
    icon: <PanelBottom className="h-5 w-5" />,
    render: onEmit => <SheetsDemo onEmit={onEmit} />,
  },
];

const DEMO_IDS = new Set<string>(DEMOS.map(d => d.meta.id));

function readHashDemo(): DemoId {
  const hash = window.location.hash.replace(/^#/, '');
  return DEMO_IDS.has(hash) ? (hash as DemoId) : 'inbox';
}

function detectInitialDark(): boolean {
  try {
    const saved = window.localStorage.getItem('hammer-ks-dark');
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function KitchensinkApp() {
  const [activeId, setActiveId] = useState<DemoId>(readHashDemo);
  const [platform, setPlatform] = useState<'ios' | 'material'>('ios');
  const [isDark, setIsDark] = useState<boolean>(detectInitialDark);
  const [codePopupOpen, setCodePopupOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [events, setEvents] = useState<readonly TelemetryEntry[]>([]);

  const activeEntry = DEMOS.find(d => d.meta.id === activeId) ?? DEMOS[0];
  const activeMeta = activeEntry.meta;
  const activeCode = activeMeta.code;
  const latestEvent = events[0];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      window.localStorage.setItem('hammer-ks-dark', String(isDark));
    } catch {
      // ignore
    }
  }, [isDark]);

  useEffect(() => {
    const onHash = () => {
      const next = readHashDemo();
      setActiveId(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectDemo = (id: DemoId) => {
    setActiveId(id);
    if (window.location.hash !== `#${id}`) {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const handleEmit = useCallback((entry: TelemetryEntry) => {
    setEvents(prev => {
      if (prev[0]?.gesture === entry.gesture) {
        return [entry, ...prev.slice(1)];
      }
      return [entry, ...prev].slice(0, 5);
    });
  }, []);

  const handleCopy = () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(activeCode).then(done, done);
    } else {
      done();
    }
  };

  return (
    <KonstaApp theme={platform} dark={isDark} safeAreas={false}>
      <div className="flex h-dvh w-full flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 lg:mx-auto lg:grid lg:max-w-[1200px] lg:grid-cols-[396px_minmax(0,1fr)] lg:items-center lg:gap-6 lg:p-6">
        {/* Interactive Mobile App Frame */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-black lg:h-[min(780px,calc(100dvh-3rem))] lg:w-[396px] lg:rounded-[34px] lg:border lg:border-black/15 lg:dark:border-white/15 lg:shadow-2xl">
          <Page className="!flex !flex-col !overflow-hidden">
            <Navbar
              title={activeMeta.title}
              subtitle="Hammer.js v3"
              className="shrink-0"
              right={
                <div className="flex items-center gap-1 lg:hidden">
                  <Button
                    small
                    clear
                    inline
                    aria-label="Inspect demo code"
                    onClick={() => setCodePopupOpen(true)}
                  >
                    <Code2 className="h-4 w-4" />
                  </Button>
                  <Button
                    small
                    clear
                    inline
                    aria-label="Toggle color theme"
                    onClick={() => setIsDark(d => !d)}
                  >
                    {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                  <a
                    href="./playground/"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400"
                    title="Open low-level Gesture Sandbox"
                  >
                    Debug
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              }
            />

            {/* Compact Live Gesture Telemetry Strip */}
            <div
              aria-live="off"
              className="flex shrink-0 items-center gap-2 border-b border-black/10 dark:border-white/10 bg-zinc-50/90 dark:bg-zinc-900/90 px-3 py-1.5 font-mono text-[11px]"
            >
              <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 font-bold text-sky-600 dark:text-sky-400">
                {latestEvent ? latestEvent.gesture : activeMeta.id}
              </span>
              <span className="truncate opacity-70">
                {latestEvent
                  ? `${latestEvent.detail}${latestEvent.pointerType ? ` (${latestEvent.pointerType})` : ''}`
                  : activeMeta.hint}
              </span>
            </div>

            {/* Active Demo Viewport */}
            <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              {activeEntry.render(handleEmit)}
            </main>

            {/* Konsta Native Bottom Tabbar */}
            <Tabbar labels icons className="shrink-0" innerClassName="w-full!">
              <ToolbarPane className="w-full!">
                {DEMOS.map(d => (
                  <TabbarLink
                    key={d.meta.id}
                    active={activeId === d.meta.id}
                    onClick={() => selectDemo(d.meta.id)}
                    icon={d.icon}
                    label={d.meta.label}
                    className="min-w-0! px-1! flex-1"
                  />
                ))}
              </ToolbarPane>
            </Tabbar>
          </Page>
        </div>

        {/* Desktop Side Inspector */}
        <aside
          aria-label="Demo details and code"
          className="hidden lg:flex lg:h-[min(780px,calc(100dvh-3rem))] lg:min-w-0 lg:flex-col lg:gap-3.5"
        >
          {/* Top Controls: Brand, iOS/Material switcher, Light/Dark, Debug Playground link */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold tracking-tight">Hammer.js</h1>
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                v3 Kitchensink
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-36">
                <Segmented strong rounded>
                  <SegmentedButton active={platform === 'ios'} onClick={() => setPlatform('ios')}>
                    iOS
                  </SegmentedButton>
                  <SegmentedButton
                    active={platform === 'material'}
                    onClick={() => setPlatform('material')}
                  >
                    Material
                  </SegmentedButton>
                </Segmented>
              </div>

              <Button
                small
                tonal
                inline
                rounded
                aria-label="Toggle dark mode"
                onClick={() => setIsDark(d => !d)}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <a
                href="./playground/"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold hover:border-sky-500 transition-colors"
              >
                Debug Playground
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Active Demo Card */}
          <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <h2 className="text-base font-bold">{activeMeta.title}</h2>
            <p className="mt-0.5 text-sm opacity-70">{activeMeta.subtitle}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {activeMeta.badges.map(b => (
                <Chip key={b} outline className="!h-6 !px-2.5 font-mono !text-[11px]">
                  {b}
                </Chip>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-900 dark:text-sky-200">
              {activeMeta.hint}
            </p>
          </section>

          {/* Live Telemetry Card */}
          <section className="rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">
                Live Gesture Telemetry
              </h3>
              <Button small clear inline onClick={() => setEvents([])}>
                Clear
              </Button>
            </div>
            <ul className="flex flex-col gap-1 font-mono text-[11px]">
              {events.length === 0 ? (
                <li className="rounded-lg bg-zinc-100 dark:bg-zinc-800/70 px-2.5 py-1.5 opacity-60">
                  Interact with the phone preview to inspect live gesture events.
                </li>
              ) : (
                events.map((ev, idx) => (
                  <li
                    key={`${ev.gesture}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 px-2.5 py-1"
                  >
                    <span className="truncate">
                      <strong className="text-sky-600 dark:text-sky-400">{ev.gesture}</strong>:{' '}
                      {ev.detail}
                    </span>
                    <span className="shrink-0 opacity-60">
                      {[ev.pointerType, ev.touchAction ? `ta:${ev.touchAction}` : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </section>

          {/* Code Example Card */}
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="font-mono text-xs font-bold opacity-75">@hammerjs/react</h3>
              <Button small tonal inline rounded onClick={handleCopy}>
                {copied ? (
                  <Check className="mr-1 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1 h-3.5 w-3.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl bg-zinc-950 p-3.5 font-mono text-xs leading-relaxed text-zinc-100">
              <code>{activeCode}</code>
            </pre>
          </section>
        </aside>
      </div>

      {/* Mobile Code Sheet Popup */}
      <Popup opened={codePopupOpen} onBackdropClick={() => setCodePopupOpen(false)}>
        <Page className="!flex !flex-col !overflow-hidden">
          <Navbar
            title={`${activeMeta.title} — Code`}
            right={
              <Button small clear inline onClick={() => setCodePopupOpen(false)}>
                Done
              </Button>
            }
          />
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold opacity-75">@hammerjs/react</span>
              <div className="flex items-center gap-2">
                <Button
                  small
                  tonal
                  inline
                  onClick={() => setPlatform(p => (p === 'ios' ? 'material' : 'ios'))}
                >
                  {platform === 'ios' ? 'iOS' : 'Material'}
                </Button>
                <Button small tonal inline onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeMeta.badges.map(b => (
                <Chip key={b} outline className="!h-6 !px-2.5 font-mono !text-[11px]">
                  {b}
                </Chip>
              ))}
            </div>
            <p className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs leading-relaxed">
              {activeMeta.hint}
            </p>
            <pre className="min-h-0 flex-1 overflow-auto rounded-xl bg-zinc-950 p-3.5 font-mono text-xs leading-relaxed text-zinc-100">
              <code>{activeCode}</code>
            </pre>
          </div>
        </Page>
      </Popup>
    </KonstaApp>
  );
}
