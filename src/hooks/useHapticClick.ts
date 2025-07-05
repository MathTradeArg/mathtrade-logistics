import { useCallback } from 'react';
import { triggerHaptic } from '@/utils/haptics';

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';

interface UseHapticClickOptions {
  hapticType?: HapticType;
  disabled?: boolean;
}

const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  selection: 15,
  impact: [10, 10, 10],
  notification: [20, 10, 20]
};

/**
 * Hook para agregar haptics automáticos a elementos clickeables
 * @param callback - Función a ejecutar después del haptic
 * @param options - Opciones para el haptic (tipo, deshabilitado)
 * @returns Función de click con haptic integrado
 */
export function useHapticClick<T extends unknown[]>(
  callback: (...args: T) => void | Promise<void>,
  options: UseHapticClickOptions = {}
) {
  const { hapticType = 'selection', disabled = false } = options;

  return useCallback(
    async (...args: T) => {
      if (!disabled) {
        triggerHaptic(HAPTIC_PATTERNS[hapticType]);
      }
      await callback(...args);
    },
    [callback, hapticType, disabled]
  );
}

/**
 * Hook para elementos que solo necesitan haptic sin callback
 * @param options - Opciones para el haptic
 * @returns Función de click con haptic
 */
export function useHapticOnly(options: UseHapticClickOptions = {}) {
  const { hapticType = 'selection', disabled = false } = options;

  return useCallback(() => {
    if (!disabled) {
      triggerHaptic(HAPTIC_PATTERNS[hapticType]);
    }
  }, [hapticType, disabled]);
}

/**
 * Hook para manejar múltiples tipos de haptics según el contexto
 */
export function useHapticHandlers() {
  const createHapticHandler = useCallback(
    (callback: () => void | Promise<void>, hapticType: HapticType = 'selection') => {
      return async () => {
        triggerHaptic(HAPTIC_PATTERNS[hapticType]);
        await callback();
      };
    },
    []
  );

  const button = useCallback((callback: () => void | Promise<void>) => 
    createHapticHandler(callback, 'light'), [createHapticHandler]);

  const primaryAction = useCallback((callback: () => void | Promise<void>) => 
    createHapticHandler(callback, 'medium'), [createHapticHandler]);

  const destructiveAction = useCallback((callback: () => void | Promise<void>) => 
    createHapticHandler(callback, 'heavy'), [createHapticHandler]);

  const selection = useCallback((callback: () => void | Promise<void>) => 
    createHapticHandler(callback, 'selection'), [createHapticHandler]);

  const toggle = useCallback((callback: () => void | Promise<void>) => 
    createHapticHandler(callback, 'impact'), [createHapticHandler]);

  const notification = useCallback((callback: () => void | Promise<void>) => 
    createHapticHandler(callback, 'notification'), [createHapticHandler]);

  return {
    button,
    primaryAction,
    destructiveAction,
    selection,
    toggle,
    notification,
    custom: createHapticHandler
  };
}
