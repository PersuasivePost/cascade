import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-line">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="w-2 h-2 rounded-full bg-crit shadow-[0_0_0_3px_rgba(239,68,68,0.18)]" />
          <span className="font-display font-bold text-lg tracking-tight text-ink">Cascade</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-mono">
          <Link href="/" className="text-muted hover:text-ink transition-colors">
            services
          </Link>
          <Link href="/dependencies" className="text-muted hover:text-ink transition-colors">
            critical dependencies
          </Link>
          <Link href="/workflows" className="text-muted hover:text-ink transition-colors">
            workflows
          </Link>
        </nav>
      </div>
    </header>
  );
}
