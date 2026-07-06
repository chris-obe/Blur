import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, PanelLeft, PanelRight } from 'lucide-react';

export function AlbumDetailRail({
  side,
  label,
  open,
  onToggle,
  children,
}: {
  side: 'left' | 'right';
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const Icon = side === 'left' ? PanelLeft : PanelRight;
  const Arrow = side === 'left'
    ? open ? ChevronLeft : ChevronRight
    : open ? ChevronRight : ChevronLeft;

  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border border-line bg-bg/70">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={[
          'flex h-11 w-full shrink-0 items-center justify-center gap-2 border-b border-line px-2 text-[11px] uppercase tracking-[0.18em] transition-colors hover:border-line-strong',
          open ? 'bg-fg text-bg' : 'bg-transparent text-muted hover:text-fg',
        ].join(' ')}
      >
        <Icon size={14} strokeWidth={1.5} />
        {open && <span className="min-w-0 truncate">{label}</span>}
        <Arrow size={13} strokeWidth={1.5} />
      </button>

      <div
        aria-hidden={!open}
        className={open ? 'min-h-0 flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]' : 'hidden'}
      >
        {children}
      </div>

      <div
        aria-hidden={open}
        className={open ? 'hidden' : 'flex min-h-0 flex-1 items-start justify-center px-1 py-4'}
      >
        <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] uppercase tracking-[0.22em] text-muted">
          {label}
        </span>
      </div>
    </aside>
  );
}
