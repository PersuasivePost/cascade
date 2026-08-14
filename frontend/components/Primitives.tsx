const CRITICALITY_COLOR: Record<string, string> = {
  critical: "text-crit border-crit/40 bg-crit/10",
  high: "text-warn border-warn/40 bg-warn/10",
  medium: "text-signal border-signal/40 bg-signal/10",
  low: "text-muted border-line bg-surface2",
};

export function CriticalityPill({ level }: { level: string }) {
  const cls = CRITICALITY_COLOR[level] || CRITICALITY_COLOR.low;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-mono uppercase tracking-wide ${cls}`}>
      {level}
    </span>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-muted font-mono text-sm py-16 justify-center">
      <span className="w-3 h-3 rounded-full border-2 border-signal border-t-transparent animate-spin" />
      {label}...
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="border border-dashed border-line rounded-lg py-16 text-center">
      <p className="font-display text-ink text-lg">{title}</p>
      {hint && <p className="text-muted text-sm mt-2 max-w-sm mx-auto">{hint}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="border border-crit/30 bg-crit/5 rounded-lg py-10 px-6 text-center">
      <p className="font-mono text-crit text-sm mb-1">Connection error</p>
      <p className="text-muted text-sm max-w-md mx-auto">{message}</p>
    </div>
  );
}
