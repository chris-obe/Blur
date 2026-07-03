import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  Check,
  Code2,
  EllipsisVertical,
  Eye,
  Grid3X3,
  Lock,
  Plus,
  RefreshCw,
  Rows3,
  Send,
  Square,
} from 'lucide-react';

export function AlbumActionBar({
  surface,
  selectedCount,
  selectedEmbeddableCount,
  selectedSecondaryCount,
  visibleCount,
  busy,
  embedReady,
  allVisibleSelected,
  hasSelectablePhotos,
  inAlbum = false,
  onSurface,
  onReload,
  onNew,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onEmbedSelected,
  onSelectAll,
}: {
  surface: 'albums' | 'all';
  selectedCount: number;
  selectedEmbeddableCount: number;
  selectedSecondaryCount: number;
  visibleCount: number;
  busy: boolean;
  embedReady: boolean;
  allVisibleSelected: boolean;
  hasSelectablePhotos: boolean;
  inAlbum?: boolean;
  onSurface: (surface: 'albums' | 'all') => void;
  onReload: () => void;
  onNew: () => void;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onEmbedSelected: () => void;
  onSelectAll: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const embedSelectedLabel = selectedCount > 0 && selectedEmbeddableCount === 0
    ? inAlbum
      ? 'Only visible photos in a public album can be embedded'
      : 'Only approved gallery photos can be embedded'
    : 'Embed selected';

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-line px-3 py-2.5">
      <div className="text-xs text-muted">
        {selectedCount > 0 ? `${selectedCount} selected` : `${visibleCount} visible`}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {!inAlbum && (
          <div className="mr-1 flex border border-line">
            <ActionIconButton label="Album grid" active={surface === 'albums'} onClick={() => onSurface('albums')}>
              <Grid3X3 size={14} strokeWidth={1.5} />
            </ActionIconButton>
            <ActionIconButton label="All images" active={surface === 'all'} onClick={() => onSurface('all')}>
              <Rows3 size={14} strokeWidth={1.5} />
            </ActionIconButton>
          </div>
        )}
        {hasSelectablePhotos && (
          <ActionTextButton
            label={allVisibleSelected ? 'Clear visible selection' : 'Select all visible'}
            active={allVisibleSelected}
            onClick={onSelectAll}
          >
            {allVisibleSelected ? <Check size={13} strokeWidth={1.7} /> : <Square size={13} strokeWidth={1.6} />}
            Select all
          </ActionTextButton>
        )}
        <ActionIconButton label="Reload" onClick={onReload} disabled={busy}>
          <RefreshCw size={14} strokeWidth={1.5} />
        </ActionIconButton>
        <ActionIconButton label="New album" onClick={onNew}>
          <Plus size={14} strokeWidth={1.5} />
        </ActionIconButton>
        <ActionIconButton
          label={embedSelectedLabel}
          onClick={onEmbedSelected}
          disabled={!embedReady || selectedEmbeddableCount === 0}
          active={selectedEmbeddableCount > 0}
        >
          <Code2 size={14} strokeWidth={1.5} />
        </ActionIconButton>
        {hasSelectablePhotos && (
          <div ref={menuRef} className="relative">
            <ActionIconButton
              label="Selection actions"
              onClick={() => setMenuOpen((current) => !current)}
              active={menuOpen}
              disabled={busy || selectedCount === 0}
            >
              <EllipsisVertical size={14} strokeWidth={1.5} />
            </ActionIconButton>
            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.45rem)] z-40 flex min-w-48 flex-col border border-line bg-surface p-1 shadow-[0_12px_40px_rgba(0,0,0,0.24)]">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onPrimaryAction();
                  }}
                  disabled={busy || selectedCount === 0}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-fg transition-colors hover:bg-faint disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{primaryActionLabel}</span>
                  {inAlbum ? <Eye size={13} strokeWidth={1.5} /> : <Send size={13} strokeWidth={1.5} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSecondaryAction();
                  }}
                  disabled={busy || selectedCount === 0 || selectedSecondaryCount === 0}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-fg transition-colors hover:bg-faint disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{secondaryActionLabel}</span>
                  <Lock size={13} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ActionIconButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'group relative flex h-9 w-9 items-center justify-center border-line text-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40',
        active ? 'bg-fg text-bg hover:text-bg' : 'bg-transparent',
      ].join(' ')}
    >
      {children}
      <span className="pointer-events-none absolute right-0 top-[calc(100%+0.35rem)] z-40 border border-line bg-surface px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-fg opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}

export function ActionTextButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={[
        'inline-flex h-9 items-center gap-2 border px-3 text-[11px] uppercase tracking-[0.18em] transition-colors',
        active ? 'border-fg bg-fg text-bg' : 'border-line text-fg hover:border-line-strong',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function SelectionPill({
  selected,
  label,
  onClick,
  className = '',
}: {
  selected: boolean;
  label: string;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={[
        'inline-flex h-8 min-w-8 items-center justify-center border px-2 text-[10px] uppercase tracking-[0.18em] backdrop-blur-sm transition-colors',
        selected ? 'border-fg bg-fg text-bg' : 'border-line bg-surface/90 text-fg hover:border-line-strong',
        className,
      ].join(' ')}
    >
      {selected ? <Check size={12} strokeWidth={1.9} /> : <Square size={12} strokeWidth={1.6} />}
    </button>
  );
}
