"use client";

import { CheckCircle, WarningCircle, X } from 'phosphor-react';
import { useEffect, useState } from 'react';
import { useHapticClick } from '@/hooks/useHapticClick';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  const handleClose = useHapticClick(() => {
    setIsVisible(false);
    setTimeout(() => {
      setShouldRender(false);
      onClose();
    }, 300);
  });

  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    const removeTimer = setTimeout(() => {
      setShouldRender(false);
      onClose();
    }, duration + 300);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [duration, onClose]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-[10000] transition-all duration-300 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className={`nm-surface rounded-lg p-4 shadow-lg sm:min-w-[300px] sm:max-w-[90vw] flex items-center gap-3 ${
        type === 'success' ? 'text-green-700' : 'text-red-700'
      }`}>
        {type === 'success' ? (
          <CheckCircle size={20} className="flex-shrink-0" />
        ) : (
          <WarningCircle size={20} className="flex-shrink-0" />
        )}
        
        <span className="flex-grow text-sm nm-font nm-text-shadow">
          {message}
        </span>
        
        <button
          onClick={handleClose}
          className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors"
          aria-label="Cerrar notificación"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
