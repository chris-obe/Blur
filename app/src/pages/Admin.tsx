import { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { isDevAdminBypass } from '../auth/adminAccess';
import { useAdminAccess } from '../auth/AdminAccessProvider';
import { adminAuthorizationParams, adminTokenParams } from '../auth/config';
import {
  AdminApiError,
  getAdminIdentity,
  getAdminUsers,
  getCatalogAdminStatus,
  getCatalogLatestExport,
  triggerCatalogRefresh,
  updateCatalogAdminSettings,
  type AdminIdentity,
  type AdminUsersResponse,
  type CatalogAdminStatus,
  type CatalogLatestExport,
} from '../lib/adminApi';
import {
  createAdminGalleryTag,
  getAdminGalleryReactionStats,
  listAdminGalleryPhotos,
  listAdminGalleryTags,
  type AdminGalleryReactionStats,
  type AdminGalleryPhoto,
  type GalleryTag,
} from '../lib/galleryApi';
import {
  getAdminFeatureFlags,
  updateAdminFeatureFlags,
  type FeatureFlagMap,
  type FeatureFlagRecord,
} from '../lib/featureFlags';
import { useCatalog } from '../store/CatalogProvider';
import { useFeatureFlags } from '../store/FeatureFlagsProvider';
import { formatBytes, formatDate } from '../components/admin/adminUi';
import { OverviewSection } from '../components/admin/OverviewSection';
import { CatalogSection } from '../components/admin/catalog/CatalogSection';
import { GalleryModerationSection } from '../components/admin/GalleryModerationSection';
import { ReactionsSection } from '../components/admin/ReactionsSection';
import { UsersSection } from '../components/admin/UsersSection';
import { FeatureFlagsSection } from '../components/admin/FeatureFlagsSection';
import { StorageSection } from '../components/admin/StorageSection';

type AdminSection = 'overview' | 'catalog' | 'gallery' | 'reactions' | 'users' | 'flags' | 'storage';

interface AdminGateProps {
  children: React.ReactNode;
}

const SECTIONS: Array<{ id: AdminSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'reactions', label: 'Reactions' },
  { id: 'users', label: 'Users' },
  { id: 'flags', label: 'Feature Flags' },
  { id: 'storage', label: 'Storage' },
];

function AdminGate({ children }: AdminGateProps) {
  const { loginWithRedirect } = useAuth0();
  const { status, error } = useAdminAccess();

  if (status === 'loading' || status === 'checking') {
    return <AdminNotice title="Checking access" detail="Verifying your Auth0 admin permissions." />;
  }

  if (status === 'anonymous') {
    return (
      <AdminNotice
        title="Admin sign in required"
        detail="Use the account with the Auth0 admin role to continue."
        action={
          <Button
            variant="solid"
            onClick={() =>
              loginWithRedirect({
                appState: { returnTo: '/admin' },
                authorizationParams: adminAuthorizationParams,
              })
            }
          >
            Sign in
          </Button>
        }
      />
    );
  }

  if (status === 'denied') {
    return <AdminNotice title="Not authorized" detail={error ?? 'Your account lacks the admin role.'} />;
  }

  return <>{children}</>;
}

function AdminNotice({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <div className="w-full max-w-md border border-line p-5">
        <div className="mb-4 flex items-center gap-3">
          <Shield size={18} strokeWidth={1.5} />
          <div>
            <div className="text-sm font-bold tracking-tight">{title}</div>
            <div className="mt-1 text-xs text-muted">{detail}</div>
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}

export function Admin() {
  return (
    <AdminGate>
      <AdminConsole />
    </AdminGate>
  );
}

function AdminConsole() {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const catalog = useCatalog();
  const runtimeFeatureFlags = useFeatureFlags();
  const [section, setSection] = useState<AdminSection>('overview');
  const activeSection = SECTIONS.find((item) => item.id === section);
  useDocumentTitle(['Admin', activeSection?.label]);
  const [adminIdentity, setAdminIdentity] = useState<AdminIdentity | null>(null);
  const [adminToken, setAdminToken] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<CatalogAdminStatus | null>(null);
  const [cloudCatalogExport, setCloudCatalogExport] = useState<CatalogLatestExport | null>(null);
  const [cloudCatalogLoading, setCloudCatalogLoading] = useState(false);
  const [cloudCatalogError, setCloudCatalogError] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<AdminGalleryPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryTags, setGalleryTags] = useState<GalleryTag[]>([]);
  const [reactionStats, setReactionStats] = useState<AdminGalleryReactionStats | null>(null);
  const [reactionStatsLoading, setReactionStatsLoading] = useState(false);
  const [reactionStatsError, setReactionStatsError] = useState<string | null>(null);
  const [usersResponse, setUsersResponse] = useState<AdminUsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersQuery, setUsersQuery] = useState('');
  const [usersError, setUsersError] = useState<string | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagRecord[]>([]);
  const [featureFlagsLoading, setFeatureFlagsLoading] = useState(false);
  const [featureFlagsSaving, setFeatureFlagsSaving] = useState(false);
  const [featureFlagsError, setFeatureFlagsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const devBypass = isDevAdminBypass();
  // Human-readable, low-maintenance: prefer a real name/email from the admin
  // identity or the Auth0 ID-token claims; never surface the raw `auth0|…` sub.
  const accessLabel = devBypass
    ? 'Development bypass'
    : adminIdentity?.name ??
      adminIdentity?.email ??
      user?.name ??
      user?.email ??
      user?.nickname ??
      'Admin user';

  const getToken = async () => {
    if (!isAuthenticated) return undefined;
    const token = await getAccessTokenSilently({ authorizationParams: adminTokenParams });
    setAdminToken(token);
    return token;
  };

  const loadIdentity = async () => {
    if (devBypass) {
      setAdminIdentity({ sub: 'dev-admin-bypass', permissions: ['admin:access', 'catalog:manage'] });
      return;
    }
    const token = await getToken();
    if (!token) return;
    const result = await getAdminIdentity(token);
    setAdminIdentity(result.identity);
  };

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      setStatus(await getCatalogAdminStatus(token));
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadCloudCatalogExport = async () => {
    setCloudCatalogLoading(true);
    setCloudCatalogError(null);
    try {
      const token = await getToken();
      setCloudCatalogExport(await getCatalogLatestExport(token));
    } catch (err) {
      const message = describeAdminError(err);
      setCloudCatalogError(message);
      setError(message);
    } finally {
      setCloudCatalogLoading(false);
    }
  };

  const loadGallery = async () => {
    setGalleryLoading(true);
    setGalleryError(null);
    try {
      const token = await getToken();
      setGalleryPhotos(await listAdminGalleryPhotos(token));
      setGalleryLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gallery API failed';
      setGalleryError(message);
      setError(message);
    }
    finally {
      setGalleryLoading(false);
    }
  };

  const loadGalleryTags = async () => {
    try {
      const token = await getToken();
      setGalleryTags(await listAdminGalleryTags(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gallery tags API failed');
    }
  };

  const createGalleryTag = async (label: string) => {
    const token = await getToken();
    const tag = await createAdminGalleryTag(label, token);
    await loadGalleryTags();
    return tag;
  };

  const loadReactionStats = async () => {
    setReactionStatsLoading(true);
    setReactionStatsError(null);
    try {
      const token = await getToken();
      setReactionStats(await getAdminGalleryReactionStats(token));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reaction analytics API failed';
      setReactionStatsError(message);
      setError(message);
    } finally {
      setReactionStatsLoading(false);
    }
  };

  const loadUsers = async (query = usersQuery) => {
    if (devBypass && !isAuthenticated) {
      setUsersError('Sign in with Auth0 to inspect registered users.');
      return;
    }

    setUsersLoading(true);
    setUsersError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Auth0 access token is unavailable.');
      setUsersResponse(await getAdminUsers(token, { q: query, perPage: 50 }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Users API failed';
      setUsersError(message);
      setError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadFeatureFlags = async () => {
    setFeatureFlagsLoading(true);
    setFeatureFlagsError(null);
    try {
      const token = await getToken();
      setFeatureFlags(await getAdminFeatureFlags(token));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Feature flags API failed';
      setFeatureFlagsError(message);
      setError(message);
    } finally {
      setFeatureFlagsLoading(false);
    }
  };

  const saveFeatureFlags = async (updates: Partial<FeatureFlagMap>) => {
    setFeatureFlagsSaving(true);
    setFeatureFlagsError(null);
    setError(null);
    try {
      const token = await getToken();
      setFeatureFlags(await updateAdminFeatureFlags(updates, token));
      await runtimeFeatureFlags.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Feature flags save failed';
      setFeatureFlagsError(message);
      setError(message);
    } finally {
      setFeatureFlagsSaving(false);
    }
  };

  useEffect(() => {
    void loadIdentity();
    void loadStatus();
    void loadGallery();
    void loadGalleryTags();
    void loadReactionStats();
    void loadFeatureFlags();
    if (isAuthenticated) void loadUsers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const summary = useMemo(
    () => [
      {
        label: 'Catalog',
        value: status?.lastRun?.status ?? catalog.status,
        detail: status?.lastSuccess ? `Last success ${formatDate(status.lastSuccess.finished_at)}` : catalog.source,
      },
      {
        label: 'Users',
        value: usersResponse ? `${usersResponse.total} registered` : usersLoading ? 'Loading' : 'Unavailable',
        detail: usersError ?? `${usersResponse?.stats.activeLast30Days ?? 0} active in 30 days`,
      },
      {
        label: 'Gallery',
        value: galleryLoaded ? `${galleryPhotos.length} photos` : 'Loading',
        detail: galleryError ?? (
          galleryPhotos.some((photo) => photo.galleryStatusNeedsReview)
            ? `${galleryPhotos.filter((photo) => photo.galleryStatusNeedsReview).length} need review`
            : `${galleryPhotos.filter((photo) => photo.galleryStatus === 'pending').length} pending approval`
        ),
      },
      {
        label: 'Reactions',
        value: reactionStats ? `${reactionStats.totals.total} total` : reactionStatsLoading ? 'Loading' : 'Unavailable',
        detail: reactionStatsError ?? `${reactionStats?.totals.reactingUsers ?? 0} reacting users`,
      },
      {
        label: 'Storage',
        value: status?.export?.size ? formatBytes(status.export.size) : 'Unavailable',
        detail: status?.export?.key ?? 'R2 media and catalog objects',
      },
    ],
    [catalog.source, catalog.status, galleryError, galleryLoaded, galleryPhotos, reactionStats, reactionStatsError, reactionStatsLoading, status, usersError, usersLoading, usersResponse],
  );

  // Master refresh: reload every section's data at once.
  const refreshAll = async () => {
    await Promise.allSettled([
      loadIdentity(),
      loadStatus(),
      loadGallery(),
      loadGalleryTags(),
      loadReactionStats(),
      loadFeatureFlags(),
      isAuthenticated ? loadUsers(usersQuery) : Promise.resolve(),
      cloudCatalogExport ? loadCloudCatalogExport() : Promise.resolve(),
    ]);
  };

  const refreshNow = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      await triggerCatalogRefresh(token);
      await loadStatus();
      await catalog.refresh();
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleAutoRefresh = async () => {
    if (!status) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await updateCatalogAdminSettings(
        { autoRefreshEnabled: !status.settings.autoRefreshEnabled },
        token,
      );
      setStatus((current) => (current ? { ...current, settings: result.settings } : current));
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setSaving(false);
    }
  };

  const updateInterval = async (days: number) => {
    if (!status) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await updateCatalogAdminSettings({ refreshIntervalDays: days }, token);
      setStatus((current) => (current ? { ...current, settings: result.settings } : current));
    } catch (err) {
      setError(describeAdminError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="border-b border-line px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="label mb-2">Admin surface</div>
            <h2 className="text-2xl font-bold tracking-tight">Operations</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 border border-line px-2.5 py-1.5 text-xs">
              <Shield size={14} strokeWidth={1.5} />
              {accessLabel}
            </span>
            {devBypass && <Chip active>Dev open</Chip>}
            <Button
              onClick={refreshAll}
              disabled={loading || saving || galleryLoading || usersLoading}
              title="Reload catalog status, gallery and users"
            >
              <RefreshCw size={14} strokeWidth={1.5} />
              Refresh all
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="border-b border-line bg-faint px-6 py-3 text-xs">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={1.5} />
            {error}
          </span>
        </div>
      )}

      <div className="grid min-h-[calc(100vh-9.5rem)] grid-cols-1 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav className="border-b border-line p-3 lg:border-b-0 lg:border-r">
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {SECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={[
                  'shrink-0 border px-3 py-2 text-left text-xs uppercase tracking-wide transition-colors',
                  section === item.id
                    ? 'border-fg bg-fg text-bg'
                    : 'border-line text-muted hover:border-line-strong hover:text-fg',
                ].join(' ')}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <section className="min-w-0 p-6">
          {section === 'overview' && <OverviewSection summary={summary} status={status} galleryLoaded={galleryLoaded} />}
          {section === 'catalog' && (
            <CatalogSection
              appCatalogStatus={catalog.status}
              appCatalogSource={catalog.source}
              appCatalogRaw={catalog.raw as CatalogLatestExport | null}
              generatedAt={catalog.generatedAt}
              cloudCatalogExport={cloudCatalogExport}
              cloudCatalogLoading={cloudCatalogLoading}
              cloudCatalogError={cloudCatalogError}
              loading={loading}
              saving={saving}
              status={status}
              onLoadCloudCatalog={loadCloudCatalogExport}
              onRefreshNow={refreshNow}
              onToggleAutoRefresh={toggleAutoRefresh}
              onUpdateInterval={updateInterval}
            />
          )}
          {section === 'gallery' && (
            <GalleryModerationSection
              accessToken={adminToken}
              photos={galleryPhotos}
              tags={galleryTags}
              loading={galleryLoading}
              loaded={galleryLoaded}
              error={galleryError}
              onReload={loadGallery}
              onCreateTag={createGalleryTag}
              onError={setError}
            />
          )}
          {section === 'reactions' && (
            <ReactionsSection
              stats={reactionStats}
              loading={reactionStatsLoading}
              error={reactionStatsError}
              onReload={loadReactionStats}
            />
          )}
          {section === 'users' && (
            <UsersSection
              response={usersResponse}
              query={usersQuery}
              loading={usersLoading}
              error={usersError}
              onQueryChange={setUsersQuery}
              onReload={() => loadUsers(usersQuery)}
            />
          )}
          {section === 'flags' && (
            <FeatureFlagsSection
              flags={featureFlags}
              loading={featureFlagsLoading}
              saving={featureFlagsSaving}
              error={featureFlagsError}
              onReload={loadFeatureFlags}
              onSave={saveFeatureFlags}
            />
          )}
          {section === 'storage' && <StorageSection exportStatus={status?.export ?? null} />}
        </section>
      </div>
    </div>
  );
}

function describeAdminError(error: unknown): string {
  if (error instanceof AdminApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Admin API denied the request. Check the Pages Function secret or Auth0/Cloudflare Access policy.';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Admin API request failed.';
}
