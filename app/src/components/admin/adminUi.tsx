import { Database } from 'lucide-react';

export function formatDate(value?: string | null): string {
  if (!value) return 'None';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatBytes(value?: number): string {
  if (!value) return 'Unknown';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 102.4) / 10} KB`;
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

export function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Database;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} strokeWidth={1.5} />
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function SmallStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border border-line p-3">
      <div className="label mb-2">{label}</div>
      <div className="truncate text-sm font-bold tracking-tight">{value}</div>
      <div className="mt-1 truncate text-xs text-muted">{detail}</div>
    </div>
  );
}
