import React, { forwardRef, ReactElement, cloneElement } from 'react';
import { useHapticClick, useHapticOnly } from '@/hooks/useHapticClick';

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'impact' | 'notification';

interface HapticWrapperProps {
  children: ReactElement;
  hapticType?: HapticType;
  disabled?: boolean;
  preserveOriginalClick?: boolean;
}

/**
 * Componente wrapper que automáticamente agrega haptics a elementos clickeables
 * @param children - Elemento hijo que será clickeable
 * @param hapticType - Tipo de haptic a usar
 * @param disabled - Si está deshabilitado, no ejecuta haptics
 * @param preserveOriginalClick - Si debe preservar el onClick original además del haptic
 */
export const HapticWrapper = forwardRef<HTMLElement, HapticWrapperProps>(
  ({ children, hapticType = 'selection', disabled = false, preserveOriginalClick = true }, ref) => {
    const originalOnClick = children.props.onClick;
    const hapticOnly = useHapticOnly({ hapticType, disabled });
    const hapticWithCallback = useHapticClick(originalOnClick || (() => {}), { hapticType, disabled });

    const handleClick = preserveOriginalClick && originalOnClick ? hapticWithCallback : hapticOnly;

    return cloneElement(children, {
      ...children.props,
      onClick: handleClick,
      ref
    });
  }
);

HapticWrapper.displayName = 'HapticWrapper';

export function withHaptics<T extends { onClick?: () => void }>(
  Component: React.ComponentType<T>,
  defaultHapticType: HapticType = 'selection'
) {
  const HapticComponent = forwardRef<HTMLElement, T & { hapticType?: HapticType; disableHaptics?: boolean }>(
    ({ hapticType = defaultHapticType, disableHaptics = false, onClick, ...props }, ref) => {
      const hapticClick = useHapticClick(onClick || (() => {}), { 
        hapticType, 
        disabled: disableHaptics 
      });

      return (
        <Component
          {...(props as unknown as T)}
          onClick={hapticClick}
          ref={ref}
        />
      );
    }
  );

  HapticComponent.displayName = `withHaptics(${Component.displayName || Component.name || 'Component'})`;
  return HapticComponent;
}

export const HapticButton = withHaptics('button' as any, 'light');
export const HapticDiv = withHaptics('div' as any, 'selection');

export function useHapticElement(
  hapticType: HapticType = 'selection',
  disabled: boolean = false
) {
  const hapticClick = useHapticOnly({ hapticType, disabled });

  return {
    onClick: hapticClick,
    style: { cursor: 'pointer' }
  };
}
