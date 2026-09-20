"use client";

import AppHeader from '@/components/common/AppHeader';
import BottomNav from '@/components/staff/BottomNav';
import { StaffTitleProvider, useStaffTitleValue } from '@/components/staff/StaffTitleContext';
import { getPageTitle, isBarePath, shouldShowBack } from '@/config/nav';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

function StaffChromeInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, userName } = useAuth();
  const overrideTitle = useStaffTitleValue();
  const bare = isBarePath(pathname);
  const showChrome = !bare && Boolean(isAuthenticated && userName);
  const pageTitle = overrideTitle || getPageTitle(pathname ?? '');

  if (!showChrome) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-dvh bg-page text-gray-900">
      <AppHeader
        pageTitle={pageTitle}
        showBackButton={shouldShowBack(pathname ?? '')}
      />
      <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom))]">{children}</div>
      <BottomNav />
    </div>
  );
}

export default function StaffChrome({ children }: { children: ReactNode }) {
  return (
    <StaffTitleProvider>
      <StaffChromeInner>{children}</StaffChromeInner>
    </StaffTitleProvider>
  );
}
