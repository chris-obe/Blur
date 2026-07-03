import { useEffect, useRef, useState } from 'react';
import type { Variants } from 'framer-motion';
import type { AlbumDefaultMode } from './albumModel';

export const ALBUM_MODE_EASE = [0.22, 1, 0.36, 1] as const;

export function albumModeVariants(direction: 1 | -1): Variants {
  return {
    enter: {
      opacity: 0,
      x: direction * 18,
    },
    center: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.24, ease: ALBUM_MODE_EASE },
    },
    exit: {
      opacity: 0,
      x: direction * -14,
      transition: { duration: 0.18, ease: ALBUM_MODE_EASE },
    },
  };
}

export const staggerContainerVariants: Variants = {
  enter: {},
  center: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const staggerItemVariants: Variants = {
  enter: { opacity: 0, y: 10 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: ALBUM_MODE_EASE },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.14, ease: ALBUM_MODE_EASE },
  },
};

export function useAlbumModeDirection(mode: AlbumDefaultMode): 1 | -1 {
  const previous = useRef(mode);
  const [direction, setDirection] = useState<1 | -1>(mode === 'edit' ? 1 : -1);

  useEffect(() => {
    if (previous.current === mode) return;
    setDirection(mode === 'edit' ? 1 : -1);
    previous.current = mode;
  }, [mode]);

  return direction;
}
