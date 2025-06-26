"use client";

import { useAuth } from "@/hooks/useAuth"; 
import { useEffect } from "react";

export default function ThemeManager() {
  const { isHighContrast, isDarkMode } = useAuth();

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return null; 
}
