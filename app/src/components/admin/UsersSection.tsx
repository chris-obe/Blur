import { AlertTriangle, RefreshCw, UserCog } from 'lucide-react';
import { Button } from '../ui/Button';
import type { AdminUsersResponse } from '../../lib/adminApi';
import { formatDate, Panel, SmallStat } from './adminUi';

export function UsersSection({
  response,
  query,
  loading,
  error,
  onQueryChange,
  onReload,
}: {
  response: AdminUsersResponse | null;
  query: string;
  loading: boolean;
  error?: string | null;
  onQueryChange: (query: string) => void;
  onReload: () => void;
}) {
  const stats = response?.stats;
  const providerRows = stats ? Object.entries(stats.providerCounts).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div className="space-y-5">
      <Panel title="Users and sign-ins" icon={UserCog}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="block min-w-0 flex-1">
            <span className="label mb-2 block">Search Auth0 users</span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onReload();
              }}
              placeholder="email, name, provider, or Auth0 query"
              className="h-9 w-full border border-line bg-transparent px-3 text-sm outline-none focus:border-line-strong"
            />
          </label>
          <Button onClick={onReload} disabled={loading} className="h-9 shrink-0">
            <RefreshCw size={14} strokeWidth={1.5} />
            {loading ? 'Loading' : 'Reload users'}
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

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SmallStat label="Registered" value={String(response?.total ?? 'Unknown')} detail={`${response?.returned ?? 0} visible`} />
          <SmallStat label="Active" value={String(stats?.activeLast30Days ?? 0)} detail="Last 30 days" />
          <SmallStat label="New" value={String(stats?.createdLast7Days ?? 0)} detail="Last 7 days" />
          <SmallStat label="Verified" value={String(stats?.verifiedEmail ?? 0)} detail={`${stats?.unverifiedEmail ?? 0} unverified`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="overflow-x-auto border border-line">
            <table className="w-full min-w-[48rem] text-left text-xs">
              <thead className="border-b border-line bg-faint text-muted">
                <tr>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">User</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Provider</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Logins</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Last login</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">Created</th>
                  <th className="px-3 py-2 font-normal uppercase tracking-wide">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {(response?.users ?? []).map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {user.picture ? (
                          <img src={user.picture} alt="" className="h-8 w-8 border border-line object-cover" />
                        ) : (
                          <div className="h-8 w-8 border border-line bg-faint" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-bold">{user.name ?? user.email ?? user.id}</div>
                          <div className="truncate text-muted">{user.email ?? user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(user.providers.length ? user.providers : ['unknown']).map((provider) => (
                          <span key={provider} className="border border-line px-1.5 py-0.5 uppercase tracking-wide">
                            {provider}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">{user.loginsCount}</td>
                    <td className="px-3 py-3">{formatDate(user.lastLogin)}</td>
                    <td className="px-3 py-3">{formatDate(user.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className={user.emailVerified ? 'border border-fg px-1.5 py-0.5' : 'border border-line px-1.5 py-0.5 text-muted'}>
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                        {user.blocked && <span className="border border-line-strong px-1.5 py-0.5">Blocked</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {response && response.users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted">
                      No users match this search.
                    </td>
                  </tr>
                )}
                {!response && !loading && !error && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted">
                      No user data loaded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="border border-line p-3">
              <div className="label mb-3">Providers</div>
              <div className="divide-y divide-line border border-line">
                {providerRows.map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <span>{provider}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
                {providerRows.length === 0 && <div className="px-3 py-2 text-xs text-muted">No provider data</div>}
              </div>
            </div>

            <div className="border border-line p-3">
              <div className="label mb-3">Access model</div>
              <div className="space-y-2 text-xs text-muted">
                <p>Auth0 is the identity source for this portfolio.</p>
                <p>App-local profiles and entitlements should still be created lazily when a product needs them.</p>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
