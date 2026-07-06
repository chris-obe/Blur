import { useEffect } from 'react';

const PRODUCT_TITLE = 'blur';

export function formatDocumentTitle(parts: Array<string | null | undefined | false>) {
  const clean = parts
    .map((part) => typeof part === 'string' ? part.trim() : '')
    .filter(Boolean);
  return clean.length > 0 ? [PRODUCT_TITLE, ...clean].join(' | ') : PRODUCT_TITLE;
}

export function useDocumentTitle(parts: Array<string | null | undefined | false>) {
  const title = formatDocumentTitle(parts);

  useEffect(() => {
    document.title = title;
  }, [title]);
}
