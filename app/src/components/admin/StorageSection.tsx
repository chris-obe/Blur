import { HardDrive } from 'lucide-react';
import type { CatalogAdminStatus } from '../../lib/adminApi';
import { formatBytes, formatDate, Panel } from './adminUi';

export function StorageSection({ exportStatus }: { exportStatus: CatalogAdminStatus['export'] }) {
  const storageRows = [
    { id: 'catalog', label: 'Catalog export', value: exportStatus?.size ? formatBytes(exportStatus.size) : 'Unavailable', detail: exportStatus?.key ?? 'Worker export object' },
    { id: 'etag', label: 'Export etag', value: exportStatus?.etag ?? 'Unavailable', detail: 'R2 object metadata' },
    { id: 'uploaded', label: 'Uploaded', value: formatDate(exportStatus?.uploaded), detail: 'Latest catalog object timestamp' },
    { id: 'media', label: 'Media objects', value: 'API needed', detail: 'Gallery originals and generated variants' },
  ];

  return (
    <Panel title="Storage" icon={HardDrive}>
      <div className="grid gap-3 md:grid-cols-2">
        {storageRows.map((row) => (
          <div key={row.id} className="border border-line p-3">
            <div className="label mb-2">{row.label}</div>
            <div className="break-words text-sm font-bold tracking-tight">{row.value}</div>
            <div className="mt-2 text-xs text-muted">{row.detail}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
