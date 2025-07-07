"use client";

import { useAuth } from "@/hooks/useAuth"; 
import { useEffect } from "react";

export default function ThemeManager() {
  const { isDarkMode } = useAuth();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return null; 
}
