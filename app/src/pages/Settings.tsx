import { useState } from 'react';
import { Palette, Shield } from 'lucide-react';
import { useAdminAccess } from '../auth/AdminAccessProvider';
import { useTheme } from '../store/ThemeProvider';
import { GalleryTagsManager } from '../components/settings/GalleryTagsManager';

type SettingsSection = 'tags' | 'appearance';

const SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: 'tags', label: 'Tags' },
  { id: 'appearance', label: 'Appearance' },
];

export function Settings() {
  const [section, setSection] = useState<SettingsSection>('tags');

  return (
    <div className="min-h-full">
      <div className="border-b border-line px-6 py-4">
        <div className="label mb-2">Preferences</div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      </div>

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
          {section === 'tags' && <TagsSection />}
          {section === 'appearance' && <AppearanceSection />}
        </section>
      </div>
    </div>
  );
}

// Tag management is an admin capability (it edits global gallery tags).
function TagsSection() {
  const { isAdmin, status } = useAdminAccess();
  if (!isAdmin) {
    return (
      <div className="w-full max-w-md border border-line p-5">
        <div className="flex items-center gap-3">
          <Shield size={18} strokeWidth={1.5} />
          <div>
            <div className="text-sm font-bold tracking-tight">Admins only</div>
            <div className="mt-1 text-xs text-muted">
              {status === 'anonymous'
                ? 'Sign in with an admin account to manage gallery tags.'
                : 'Your account does not have permission to manage gallery tags.'}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return <GalleryTagsManager />;
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="max-w-md">
      <div className="mb-3 flex items-center gap-2">
        <Palette size={16} strokeWidth={1.5} />
        <h3 className="text-sm font-bold tracking-tight">Appearance</h3>
      </div>
      <div className="border border-line p-4">
        <div className="label mb-3">Theme</div>
        <div className="inline-flex border border-line">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={[
                'px-4 py-1.5 text-xs uppercase tracking-wide transition-colors',
                theme === t ? 'bg-fg text-bg' : 'text-muted hover:text-fg',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
