import { CityViewProvider } from '@/contexts/CityViewContext';
import type { ReactNode } from 'react';

export default function CityLayout({ children }: { children: ReactNode }) {
  return <CityViewProvider>{children}</CityViewProvider>;
}
