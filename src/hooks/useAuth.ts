"use client";

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface AuthData {
  isAuthenticated: boolean | null;
  userName: string | null;
  userId: string | null;
  userRole: string | null;
  logout: () => void;
  isLoading: boolean;
}

export function useAuth(): AuthData {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUserName = localStorage.getItem('userName');
    const storedUserId = localStorage.getItem('userId');
    const storedUserRole = localStorage.getItem('userRole');

    if (token && storedUserName && storedUserId) {
      setIsAuthenticated(true);
      setUserName(storedUserName);
      setUserId(storedUserId);
      // TODO: descomentar y borrar mock
      // setUserRole(storedUserRole || 'USER');
      setUserRole('ADMIN')
    } else {
      setIsAuthenticated(false);
      router.push('/login');
    }
    setIsLoading(false);
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setUserName(null);
    setUserId(null);
    setUserRole(null);
    router.push('/login');
  }, [router]);

  return { isAuthenticated, userName, userId, userRole, logout, isLoading };
}