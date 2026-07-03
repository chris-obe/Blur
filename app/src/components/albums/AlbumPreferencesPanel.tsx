import type { Dispatch, SetStateAction } from 'react';
import { Settings2 } from 'lucide-react';
import { Select } from '../ui/Select';
import type { AlbumDefaultMode, AlbumDisplayPreferences, AlbumSubtitleField } from './albumModel';

export function AlbumPreferencesPanel({
  preferences,
  onChange,
}: {
  preferences: AlbumDisplayPreferences;
  onChange: Dispatch<SetStateAction<AlbumDisplayPreferences>>;
}) {
  return (
    <section className="border border-line p-4">
      <div className="mb-4 flex items-center gap-2">
        <Settings2 size={15} strokeWidth={1.5} />
        <div className="text-sm font-bold">Album display</div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Card subtitle"
          value={preferences.albumSubtitle}
          onValueChange={(value) => onChange((current) => ({ ...current, albumSubtitle: value as AlbumSubtitleField }))}
          options={[
            { value: 'updated', label: 'Updated date' },
            { value: 'created', label: 'Created date' },
            { value: 'published', label: 'Published date' },
            { value: 'photo-count', label: 'Photo count' },
            { value: 'status', label: 'Status' },
            { value: 'description', label: 'Description' },
          ]}
        />
        <Select
          label="Opening mode"
          value={preferences.defaultAlbumMode}
          onValueChange={(value) => onChange((current) => ({ ...current, defaultAlbumMode: value as AlbumDefaultMode }))}
          options={[
            { value: 'view', label: 'View' },
            { value: 'edit', label: 'Edit' },
          ]}
        />
        <label className="flex items-end gap-2 pb-2 text-xs">
          <input
            type="checkbox"
            checked={preferences.showPhotoTitles}
            onChange={(event) => onChange((current) => ({ ...current, showPhotoTitles: event.target.checked }))}
          />
          Show titles in album view
        </label>
      </div>
    </section>
  );
}
