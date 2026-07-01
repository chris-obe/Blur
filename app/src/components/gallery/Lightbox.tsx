import type { ViewEntry } from '../../lib/types';
import { PhotoLightbox } from '../lightbox/PhotoLightbox';
import { LightboxInfo } from './LightboxInfo';

interface Props {
  list: ViewEntry[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  enableReactions?: boolean;
  getAnchorRect: (id: string) => DOMRect | null;
}

export function Lightbox({ list, index, onIndex, onClose, enableReactions = true, getAnchorRect }: Props) {
  return (
    <PhotoLightbox
      entries={list}
      index={index}
      onIndex={onIndex}
      onClose={onClose}
      getAnchorRect={getAnchorRect}
      renderInfo={(entry) => <LightboxInfo entry={entry} enableReactions={enableReactions} />}
    />
  );
}
