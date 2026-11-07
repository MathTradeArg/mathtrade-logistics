import Link from 'next/link';
import type { Icon } from 'phosphor-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: Icon;
  message: ReactNode;
  ctaText?: string;
  ctaHref?: string;
}

export function EmptyState({ icon: IconComponent, message, ctaText, ctaHref }: EmptyStateProps) {
  const hasCta = Boolean(ctaText && ctaHref);
  if (!IconComponent && !hasCta) {
    return <p className="py-8 text-center text-body text-gray-500">{message}</p>;
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-6 py-10 text-center">
      {IconComponent && (
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
          <IconComponent size={24} />
        </span>
      )}
      <p className="text-body text-gray-500">{message}</p>
      {hasCta && (
        <Link href={ctaHref as string} className="staff-btn staff-btn-primary mx-auto mt-4 max-w-sm">
          {ctaText}
        </Link>
      )}
    </div>
  );
}
