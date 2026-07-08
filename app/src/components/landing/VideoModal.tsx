import { Modal } from '../ui/Modal';
import { DEMO_VIDEO_IS_FILE, DEMO_VIDEO_URL } from '../../lib/landing';

// The demo player. The <video>/<iframe> only mounts when this is open, so the
// landing page pays nothing for it on first paint. Shows a placeholder until a
// hosted URL is set in lib/landing.ts.
export function VideoModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} widthClassName="max-w-4xl" labelledBy="demo-video-title">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 id="demo-video-title" className="text-sm font-bold tracking-tight">
          blur — a two-minute tour
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs uppercase tracking-[0.18em] text-muted hover:text-fg"
        >
          Close
        </button>
      </div>

      <div className="aspect-video w-full bg-black">
        {DEMO_VIDEO_URL ? (
          DEMO_VIDEO_IS_FILE ? (
            <video src={DEMO_VIDEO_URL} controls autoPlay playsInline className="h-full w-full" />
          ) : (
            <iframe
              src={DEMO_VIDEO_URL}
              title="blur demo"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              className="h-full w-full border-0"
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xs uppercase tracking-[0.18em] text-white/60">Demo video coming soon</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
