export type DemoId = 'inbox' | 'map' | 'cards' | 'reorder' | 'sheets';

export interface TelemetryEntry {
  readonly gesture: string;
  readonly detail: string;
  readonly pointerType?: string;
  readonly touchAction?: string;
}

export interface DemoProps {
  readonly onEmit: (entry: TelemetryEntry) => void;
}

export interface DemoMeta {
  readonly id: DemoId;
  readonly label: string;
  readonly title: string;
  readonly subtitle: string;
  readonly badges: readonly string[];
  readonly hint: string;
  readonly code: string;
}
