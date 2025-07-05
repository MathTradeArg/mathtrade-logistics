"use client";

import { Switch } from "@/components/common/ui/Switch";

interface PreferenceToggleProps {
  isHighContrast: boolean;
  onToggle: () => void;
}

export const PreferenceToggle: React.FC<PreferenceToggleProps> = ({ isHighContrast, onToggle }) => (
  <div className="border-t border-b border-gray-200 dark:border-gray-700 my-4 py-4">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Modo de Alto Contraste</span>
      <Switch checked={isHighContrast} onCheckedChange={onToggle} aria-label="Activar modo de alto contraste" />
    </div>
  </div>
);

