import { useState, type DragEvent } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import type { ImageProcessingProgress } from '../../lib/imageProcessing';
import { Button } from '../ui/Button';

export function AlbumDropZone({
  empty,
  busy,
  onChoose,
  onFiles,
}: {
  empty: boolean;
  busy: boolean;
  onChoose: () => void;
  onFiles: (files: FileList | File[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    onFiles(event.dataTransfer.files);
  };

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={[
        'border border-dashed transition-colors',
        dragging ? 'border-fg bg-faint' : 'border-line',
        empty ? 'flex min-h-[18rem] flex-col items-center justify-center p-8 text-center' : 'flex items-center justify-between gap-3 p-4',
      ].join(' ')}
    >
      <div className={empty ? '' : 'min-w-0'}>
        <ImagePlus size={empty ? 30 : 18} strokeWidth={1.4} className={empty ? 'mx-auto mb-4' : 'mb-2'} />
        <div className="text-sm font-bold">{empty ? 'Drop photos into this album' : 'Add more photos'}</div>
        <div className="mt-1 text-xs text-muted">
          Bulk upload is attached to this album. Images are compressed before Cloudflare storage.
        </div>
      </div>
      <Button onClick={onChoose} disabled={busy} className={empty ? 'mt-5' : 'shrink-0'}>
        <Upload size={14} strokeWidth={1.5} />
        Choose images
      </Button>
    </div>
  );
}

export function UploadProgress({ progress }: { progress: ImageProcessingProgress }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{progress.label}</span>
        <span>{progress.percent}%</span>
      </div>
      <div className="h-1.5 bg-line">
        <div className="h-full bg-fg" style={{ width: `${progress.percent}%` }} />
      </div>
    </div>
  );
}
