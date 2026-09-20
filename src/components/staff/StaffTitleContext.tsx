"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type StaffTitleContextValue = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const StaffTitleContext = createContext<StaffTitleContextValue | undefined>(undefined);

export function StaffTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<string | null>(null);
  const setTitle = useCallback((next: string | null) => {
    setTitleState(next);
  }, []);
  const value = useMemo(() => ({ title, setTitle }), [title, setTitle]);
  return <StaffTitleContext.Provider value={value}>{children}</StaffTitleContext.Provider>;
}

export function useStaffTitleValue(): string | null {
  return useContext(StaffTitleContext)?.title ?? null;
}

export function useStaffTitle(title: string | null): void {
  const setTitle = useContext(StaffTitleContext)?.setTitle;
  useEffect(() => {
    if (!setTitle) return;
    setTitle(title);
    return () => setTitle(null);
  }, [setTitle, title]);
}
