"use client";

import { useAuth } from "../hooks/useAuth"; 
import { useEffect } from "react";

export default function HighContrastManager() {
  const { isHighContrast } = useAuth();

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  return null; 
}
