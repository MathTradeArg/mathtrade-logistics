"use client";

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface UserDetails {
  id: number | string;
  first_name: string;
  last_name?: string;
  math_admin: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean | null;
  userName: string | null;
  userId: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isDarkMode: boolean;
  login: (token: string, userDetails: UserDetails) => void;
  logout: () => void;
  toggleDarkMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setisAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
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
      setisAdmin(storedIsAdmin === 'true');
    } else {
      setIsAuthenticated(false);
      setUserName(null);
      setUserId(null);
      setisAdmin(false);
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

    setIsAuthenticated(true);
    setUserName(name);
    setisAdmin(userIsAdmin);
    setUserId(idStr);
    router.push('/');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    setIsAuthenticated(false);
    setUserName(null);
    setUserId(null);
    setisAdmin(false);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userName,
        userId,
        isAdmin,
        isLoading,
        isDarkMode,
        login,
        logout,
        toggleDarkMode,
      }}
    >
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