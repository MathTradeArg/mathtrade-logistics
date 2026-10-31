"use client";

import AppHeader from '@/components/common/AppHeader';
import BottomNav from '@/components/staff/BottomNav';
import { StaffTitleProvider, useStaffTitleValue } from '@/components/staff/StaffTitleContext';
import { getPageTitle, isBarePath, shouldShowBack } from '@/config/nav';
import { homeFor, isPathAllowed } from '@/config/roles';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

/** Keeps a volunteer inside their role's screens (design decision 7) and
 *  shows the toast when a refresh finds that an admin changed the role.
 *  Admins are never redirected. */
function useRoleGuard() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const {
    isAuthenticated, isLoading, isAdmin, role, roleKnown, roleNotice, clearRoleNotice, cityAccess,
  } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { setSuccess } = useActionStatus();

  useEffect(() => {
    if (roleNotice) {
      setSuccess(roleNotice);
      clearRoleNotice();
    }
  }, [roleNotice, setSuccess, clearRoleNotice]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || isAdmin || isLoadingEventPhase || isBarePath(pathname)) return;
    // A session from before roles existed: wait for refreshMe (runs on mount) to say.
    if (!roleKnown) return;
    // A city user without an event role lives in /city and Más; never /select-role.
    if (role === null && cityAccess) {
      if (pathname === '/' || !isPathAllowed(pathname, null, false, cityAccess)) router.replace('/city');
      return;
    }
    if (role === null) {
      if (pathname !== '/select-role') router.replace('/select-role');
      return;
    }
    if (pathname === '/select-role' || !isPathAllowed(pathname, role, false, cityAccess)) {
      router.replace(homeFor(role, eventPhase, cityAccess));
    }
  }, [
    pathname, role, roleKnown, isAdmin, isAuthenticated, isLoading, eventPhase, isLoadingEventPhase,
    cityAccess, router,
  ]);
}

function StaffChromeInner({ children }: { children: ReactNode }) {
  useRoleGuard();
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
