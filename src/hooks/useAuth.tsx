"use client";

import * as Sentry from "@sentry/nextjs";
import { ROLES } from '@/config/roles';
import { useApi } from '@/hooks/useApi';
import type { VolunteerRole } from '@/types/volunteer';
import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface UserDetails {
  id: number | string;
  username?: string;
  first_name: string;
  last_name?: string;
  math_admin: boolean;
  is_volunteer?: boolean;
  role?: VolunteerRole | null;
}

/** GET/PATCH logistics/me/ */
export interface MeResponse {
  id: number;
  first_name: string;
  last_name: string;
  math_admin: boolean;
  is_volunteer: boolean;
  role: VolunteerRole | null;
}

// localStorage key for the volunteer's role; '' means "not chosen yet". A
// missing key (a session from before roles existed) means "not known yet".
const ROLE_KEY = 'logisticsRole';
const REFRESH_ON_NAV_MS = 10_000;
const REFRESH_INTERVAL_MS = 30_000;

function readStoredRole(): VolunteerRole | null {
  const stored = localStorage.getItem(ROLE_KEY);
  return stored && stored in ROLES ? (stored as VolunteerRole) : null;
}

interface AuthContextType {
  isAuthenticated: boolean | null;
  userName: string | null;
  userId: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isDarkMode: boolean;
  /** The volunteer's role in the active edition (null: not chosen yet, or admin). */
  role: VolunteerRole | null;
  /** False while `role` is only a guess: nothing stored yet and /me hasn't answered. */
  roleKnown: boolean;
  /** Set when a refresh finds that someone else changed the role. */
  roleNotice: string | null;
  login: (token: string, userDetails: UserDetails) => void;
  logout: () => void;
  toggleDarkMode: () => void;
  clearRoleNotice: () => void;
  /** The user picked a role themselves: store it without a notice. */
  applyRole: (role: VolunteerRole | null) => void;
  /** Re-read logistics/me/ (role, admin flag); 401/403 logs out. */
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setisAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<VolunteerRole | null>(null);
  const [roleKnown, setRoleKnown] = useState(false);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  const roleRef = useRef<VolunteerRole | null>(null);
  const lastRefresh = useRef(0);
  const refreshInFlight = useRef(false);
  const { execute: fetchMe } = useApi<MeResponse>('logistics/me/');
  const router = useRouter();
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      if (isDarkMode) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDarkMode(localStorage.getItem('darkModeEnabled') === 'true');
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      if (isDarkMode) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUserName = localStorage.getItem('userName');
    const storedUserId = localStorage.getItem('userId');
    const storedIsAdmin = localStorage.getItem('isAdmin');

    if (token && storedUserName && storedUserId) {
      setIsAuthenticated(true);
      setUserName(storedUserName);
      setUserId(storedUserId);
      Sentry.setUser({ id: storedUserId, username: localStorage.getItem('userUsername') || undefined });
      setisAdmin(storedIsAdmin === 'true');
      const storedRole = readStoredRole();
      roleRef.current = storedRole;
      setRole(storedRole);
      setRoleKnown(localStorage.getItem(ROLE_KEY) !== null);
    } else {
      setIsAuthenticated(false);
      setUserName(null);
      setUserId(null);
      setisAdmin(false);
      roleRef.current = null;
      setRole(null);
      setRoleKnown(false);
      if (pathname !== '/login') {
        router.push('/login');
      }
    }
    setIsLoading(false);
  }, [router, pathname]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newState = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('darkModeEnabled', String(newState));
      }
      return newState;
    });
  }, []);

  const login = useCallback((token: string, userDetails: UserDetails) => {
    const name = `${userDetails.first_name} ${userDetails.last_name || ''}`.trim();
    const userIsAdmin = userDetails.math_admin || false;
    const idStr = userDetails.id?.toString() || null;

    localStorage.setItem('authToken', token);
    localStorage.setItem('userName', name);
    if (idStr) {
      localStorage.setItem('userId', idStr);
    } else {
      localStorage.removeItem('userId');
    }
    localStorage.setItem('isAdmin', userIsAdmin.toString());
    const userRole = userDetails.role ?? null;
    localStorage.setItem(ROLE_KEY, userRole ?? '');
    if (userDetails.username) {
      localStorage.setItem('userUsername', userDetails.username);
    }
    // Who an error happened to: id and username, never the email.
    Sentry.setUser({ id: idStr || undefined, username: userDetails.username });

    setIsAuthenticated(true);
    setUserName(name);
    setisAdmin(userIsAdmin);
    setUserId(idStr);
    roleRef.current = userRole;
    setRole(userRole);
    setRoleKnown(true);
    setRoleNotice(null);
    // The login response already carries the role: no need to ask /me right away.
    lastRefresh.current = Date.now();
    router.push('/');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userUsername');
    localStorage.removeItem(ROLE_KEY);
    Sentry.setUser(null);
    setIsAuthenticated(false);
    setUserName(null);
    setUserId(null);
    setisAdmin(false);
    roleRef.current = null;
    setRole(null);
    setRoleKnown(false);
    setRoleNotice(null);
    router.push('/login');
  }, [router]);

  const clearRoleNotice = useCallback(() => setRoleNotice(null), []);

  const applyRole = useCallback((next: VolunteerRole | null) => {
    roleRef.current = next;
    setRole(next);
    setRoleKnown(true);
    localStorage.setItem(ROLE_KEY, next ?? '');
  }, []);

  const refreshMe = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token || refreshInFlight.current) return;
    refreshInFlight.current = true;
    lastRefresh.current = Date.now();
    try {
      const me = await fetchMe();
      // Logged out (or in as someone else) while the request was in flight.
      if (!me || localStorage.getItem('authToken') !== token) return;
      setisAdmin(me.math_admin);
      localStorage.setItem('isAdmin', String(me.math_admin));
      const next = me.role ?? null;
      if (next !== roleRef.current) {
        if (roleRef.current !== null && next !== null) {
          setRoleNotice(`Un admin cambió tu rol a ${ROLES[next].label}.`);
        }
        roleRef.current = next;
        setRole(next);
      }
      localStorage.setItem(ROLE_KEY, next ?? '');
      setRoleKnown(true);
    } catch (err) {
      // Only an auth answer logs out; network errors and 5xx keep the session.
      const status = (err as { status?: number } | null)?.status;
      if ((status === 401 || status === 403) && localStorage.getItem('authToken') === token) {
        logout();
      }
    } finally {
      refreshInFlight.current = false;
    }
  }, [fetchMe, logout]);

  // On mount and on navigation, at most once every 10s.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (Date.now() - lastRefresh.current > REFRESH_ON_NAV_MS) {
      refreshMe();
    }
  }, [pathname, isAuthenticated, refreshMe]);

  // Every 30s and whenever the tab comes back, while logged in.
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(refreshMe, REFRESH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshMe();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, refreshMe]);

  // Memoized so useApi's own loading state in refreshMe doesn't re-render every consumer.
  const value = useMemo(() => ({
    isAuthenticated,
    userName,
    userId,
    isAdmin,
    isLoading,
    isDarkMode,
    role,
    roleKnown,
    roleNotice,
    login,
    logout,
    toggleDarkMode,
    clearRoleNotice,
    applyRole,
    refreshMe,
  }), [
    isAuthenticated, userName, userId, isAdmin, isLoading, isDarkMode, role, roleKnown, roleNotice,
    login, logout, toggleDarkMode, clearRoleNotice, applyRole, refreshMe,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};