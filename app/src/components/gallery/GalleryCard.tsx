import { motion } from 'framer-motion';
import type { GalleryItem } from '../../lib/types';
import { formatLabel } from '../../lib/categories';

interface Props {
  item: GalleryItem;
  onSelect: (item: GalleryItem) => void;
  hidden?: boolean; // active in the lightbox — hide the thumbnail so the morph isn't doubled
}

export function GalleryCard({ item, onSelect, hidden }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="group flex flex-col border border-line text-left transition-colors hover:border-line-strong"
    >
      {/* layoutId here is the shared element that morphs into the lightbox frame */}
      <motion.div
        layoutId={`photo-${item.id}`}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="aspect-square w-full overflow-hidden bg-faint"
        style={{ opacity: hidden ? 0 : 1 }}
      >
        <img
          src={item.src}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover grayscale transition-[filter,transform] duration-300 group-hover:grayscale-0 group-hover:scale-[1.02]"
        />
      </motion.div>
      <div className="flex flex-col gap-1 border-t border-line px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-bold">{item.title}</span>
          <span className="label shrink-0">ƒ/{item.aperture}</span>
        </div>
        <div className="label truncate">
          {item.camera} · {item.focal}mm
        </div>
        <div className="label truncate opacity-70">{formatLabel(item.formatId)}</div>
      </div>
    </button>
  );
}
