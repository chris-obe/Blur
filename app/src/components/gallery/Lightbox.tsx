import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ViewEntry } from '../../lib/types';
import { LightboxInfo } from './LightboxInfo';

interface Props {
  list: ViewEntry[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}

const FRAME_SPRING = { type: 'spring', stiffness: 300, damping: 32 } as const;

const slide = {
  enter: (d: number) => ({ x: d >= 0 ? 36 : -36, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d >= 0 ? -36 : 36, opacity: 0 }),
};

export function Lightbox({ list, index, onIndex, onClose }: Props) {
  const [dir, setDir] = useState(0);
  const current = list[index];
  const many = list.length > 1;

  const go = useCallback(
    (delta: number) => {
      setDir(delta);
      onIndex((index + delta + list.length) % list.length);
    },
    [index, list.length, onIndex],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && many) go(1);
      else if (e.key === 'ArrowLeft' && many) go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, many, onClose]);

  if (!current) return null;

  // Morph from the clicked grid thumbnail (shared layoutId), or just fade+scale
  // for uploads that have no thumbnail to morph from.
  const frameProps = current.morph
    ? { layoutId: `photo-${current.id}` }
    : {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.96 },
      };

  return (
    <>
      {/* backdrop — clicking it (or any empty area) closes */}
      <motion.div
        className="fixed inset-0 z-40 bg-bg/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* container is click-through; only the frame, buttons and panel catch clicks */}
      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col md:flex-row">
        <div className="relative flex min-h-0 flex-1 p-4 md:p-10">
          {many && (
            <NavButton side="left" onClick={() => go(-1)}>
              <ChevronLeft size={22} strokeWidth={1.5} />
            </NavButton>
          )}

          <motion.div
            {...frameProps}
            transition={FRAME_SPRING}
            className="pointer-events-auto relative mx-auto h-full w-full max-w-[1100px] border border-line-strong bg-surface"
          >
            <AnimatePresence custom={dir} initial={false}>
              <motion.img
                key={current.id}
                src={current.src}
                alt={current.title}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.26, ease: 'easeInOut' }}
                className="absolute inset-0 h-full w-full object-contain p-2"
              />
            </AnimatePresence>
          </motion.div>

          {many && (
            <NavButton side="right" onClick={() => go(1)}>
              <ChevronRight size={22} strokeWidth={1.5} />
            </NavButton>
          )}
        </div>

        {/* info panel */}
        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-auto flex max-h-[46vh] w-full shrink-0 flex-col border-t border-line bg-surface md:max-h-none md:w-[360px] md:border-l md:border-t-0"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
            <span className="label tabular-nums">
              {index + 1} / {list.length}
            </span>
            <button type="button" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <LightboxInfo entry={current} />
          </div>
        </motion.aside>
      </div>
    </>
  );
}

function NavButton({
  side,
  onClick,
  children,
}: {
  side: 'left' | 'right';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      className={[
        'pointer-events-auto absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center border border-line bg-surface transition-colors hover:border-line-strong',
        side === 'left' ? 'left-2 md:left-4' : 'right-2 md:right-4',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
