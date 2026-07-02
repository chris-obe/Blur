// Grid cells ask the image routes for the ~512px variant; the server falls
// back to the full object for legacy rows without a stored thumb. Non-API
// sources (seed assets, blob URLs) pass through untouched.
export function thumbSrc(src: string): string {
  if (!src.startsWith('/api/')) return src;
  return src.includes('?') ? `${src}&size=thumb` : `${src}?size=thumb`;
}
