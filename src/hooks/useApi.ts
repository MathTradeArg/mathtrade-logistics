"use client";

import { useState, useCallback, useMemo } from 'react';

interface UseApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  isPublic?: boolean; 
}

interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  execute: (body?: any, pathParams?: string) => Promise<T | undefined>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
  clearError: () => void;
}

export const useApi = <T>(endpoint: string, options: UseApiOptions = { method: 'GET' }): UseApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const { method = 'GET', headers, isPublic } = options;

  const execute = useCallback(async (body?: any, pathParams: string = ''): Promise<T | undefined> => {
    setIsLoading(true);
    setError(null);

    const MT_API_HOST = process.env.NEXT_PUBLIC_MT_API_HOST;
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    if (!token && !isPublic) {
      const authError = "No se encontró el token de autenticación.";
      setError(authError);
      setIsLoading(false);
      throw new Error(authError);
    }

    try {
      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
      if (token) {
        requestHeaders['Authorization'] = `token ${token}`;
      }

      const response = await fetch(`${MT_API_HOST}${endpoint}${pathParams}`, {
        method: method,
        headers: requestHeaders, 
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || `Error: ${response.statusText}`);
      }

      if (response.status === 204) { setData(null); return undefined; }
      const result: T = await response.json();
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, method, headers, isPublic]);

  return { data, isLoading, error, execute, clearError, setData };
};
