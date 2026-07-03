import { AlertTriangle, RefreshCw, ThumbsUp } from 'lucide-react';
import { Button } from '../ui/Button';
import type { AdminGalleryReactionStats } from '../../lib/galleryApi';
import { formatDate, Panel, SmallStat } from './adminUi';

export function ReactionsSection({
  stats,
  loading,
  error,
  onReload,
}: {
  stats: AdminGalleryReactionStats | null;
  loading: boolean;
  error?: string | null;
  onReload: () => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <Panel title="Gallery reactions" icon={ThumbsUp}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="label mb-1">Taste signals</div>
            <div className="text-sm text-muted">Signed-in user reactions are scoped by Auth0 user ID and aggregated per photo.</div>
          </div>
          <Button onClick={onReload} disabled={loading}>
            <RefreshCw size={14} strokeWidth={1.5} />
            {loading ? 'Loading' : 'Reload'}
          </Button>
        </div>

        {error && (
          <div className="mb-4 border border-line bg-faint p-3 text-xs">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={14} strokeWidth={1.5} />
              {error}
            </span>
          </div>
        )}

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SmallStat label="Total" value={String(stats?.totals.total ?? 0)} detail="All stored reactions" />
          <SmallStat label="Users" value={String(stats?.totals.reactingUsers ?? 0)} detail="Distinct Auth0 users" />
          <SmallStat label="Not for me" value={String(stats?.totals.dislike ?? 0)} detail="Dislikes" />
          <SmallStat label="Likes" value={String(stats?.totals.like ?? 0)} detail="Liked photos" />
          <SmallStat label="Loves" value={String(stats?.totals.love ?? 0)} detail="Strongest taste signal" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[46rem] text-left text-xs">
              <thead className="border-b border-line bg-faint text-muted">
                <tr>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Photo</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">State</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Users</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Not for me</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Like</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Love</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(stats?.byPhoto ?? []).map((row) => (
                  <tr key={row.photoId}>
                    <td className="px-3 py-2">
                      <div className="font-bold">{row.title}</div>
                      <div className="text-muted">{row.photoId}</div>
                    </td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.reactingUsers}</td>
                    <td className="px-3 py-2">{row.dislike}</td>
                    <td className="px-3 py-2">{row.like}</td>
                    <td className="px-3 py-2">{row.love}</td>
                    <td className="px-3 py-2 font-bold">{row.total}</td>
                  </tr>
                ))}
                {!stats && !loading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted">
                      No reaction data loaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border border-line">
            <div className="border-b border-line bg-faint px-3 py-2 text-xs uppercase tracking-wide text-muted">
              Recent user reactions
            </div>
            <div className="max-h-[32rem] divide-y divide-line overflow-auto">
              {(stats?.recent ?? []).map((row) => (
                <div key={`${row.photoId}-${row.userSub}-${row.updatedAt}`} className="p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="font-bold">{row.reaction}</span>
                    <span className="text-muted">{formatDate(row.updatedAt)}</span>
                  </div>
                  <div className="truncate">{row.title}</div>
                  <div className="truncate text-muted">{row.userName ?? row.userEmail ?? row.userSub}</div>
                </div>
              ))}
              {stats && stats.recent.length === 0 && (
                <div className="p-3 text-xs text-muted">No reactions stored yet.</div>
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
