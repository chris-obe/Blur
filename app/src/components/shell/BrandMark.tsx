import { Link } from 'react-router-dom';

// The "blur" wordmark: links home (Gallery) and racks focus (optical blur) on hover.
export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="blur — home"
      className={['brand-rack text-lg font-bold tracking-tight text-fg', className].join(' ')}
    >
      blur
    </Link>
  );
}
