"use client";

import clsx from 'clsx';
import { Check, CheckCircle2, X, XCircle } from 'lucide-react';
import React from 'react';

interface GameRowItemProps {
  id: number | string;
  title: string;
  ownerName?: string;
  statusDisplay?: string;
  variant?: 'default' | 'delivered' | 'pendingOther' | 'actionable';
  isSelected?: boolean;
  onRowClick?: () => void;
  onCheckboxChange?: () => void;
  showCheckbox?: boolean;
  boxId?: number;
  itemId?: number;
  onItemToggle?: (boxId: number, itemId: number) => void;
  disabled?: boolean;
}

const GameRowItem: React.FC<GameRowItemProps> = ({
  id,
  title,
  ownerName,
  statusDisplay,
  variant = 'default',
  isSelected,
  onRowClick,
  onCheckboxChange,
  showCheckbox = false,
  boxId,
  itemId,
  onItemToggle,
  disabled = false,

}) => {
  const baseLiClasses = "flex rounded-lg shadow-md overflow-hidden transition-all duration-150 ease-in-out";
  const baseIdBoxClasses = "flex-shrink-0 w-12 sm:w-16 flex items-center justify-center p-2 sm:p-3 rounded-l-lg";
  const baseTitleTextClasses = "text-sm sm:text-base font-medium leading-tight";
  const baseActionAreaClasses = "flex-shrink-0 w-12 sm:w-16 flex items-center justify-center p-2 sm:p-3 rounded-r-lg";

  const isInactiveByVariant = variant === 'delivered' || variant === 'pendingOther';

  const calculateIsVisuallyInactive = (): boolean => {
    if (isInactiveByVariant) return true;
    if (showCheckbox && disabled) return true;
    if (variant === 'actionable' && !isSelected && !showCheckbox) return true;
    return false;
  };
  const finalIsVisuallyInactive = calculateIsVisuallyInactive();

  const isCheckboxInteractive = showCheckbox && !disabled && !!onCheckboxChange;
  const isRowSelectable = variant === 'actionable' && !!onRowClick && !disabled;

  const TextContainerTag = isCheckboxInteractive ? 'label' : 'div';

  let variantLiClasses = "";
  let variantIdBoxClasses = "";
  let variantTitleTextClasses = "";
  let actionContent = null;

  if (showCheckbox) {
    if (disabled) {
      variantLiClasses = 'bg-gray-200/50 dark:bg-gray-800/50 opacity-60';
    } else {
      variantLiClasses = 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/30 active:scale-[0.98]';
    } if (isSelected) variantLiClasses += ' ring-2 ring-secondary-blue dark:ring-sky-500 ring-offset-1 dark:ring-offset-gray-800';
    variantIdBoxClasses = 'bg-secondary-blue dark:bg-sky-600';
    variantTitleTextClasses = 'text-secondary-blue dark:text-sky-400';
  } else {
    switch (variant) {
      case 'actionable':
        if (isSelected) {
          variantLiClasses = 'bg-secondary-blue/20 dark:bg-sky-700/50 hover:bg-secondary-blue/30 dark:hover:bg-sky-700/60 active:scale-[0.98]';
          variantIdBoxClasses = 'bg-secondary-blue dark:bg-sky-600';
          variantTitleTextClasses = 'text-secondary-blue dark:text-sky-700';
        } else {
          variantLiClasses = 'bg-gray-100 dark:bg-gray-800/70 opacity-60 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700/80 active:scale-[0.98]';
          variantIdBoxClasses = 'bg-gray-400 dark:bg-gray-500';
          variantTitleTextClasses = 'text-gray-500 dark:text-gray-400';
        }
        if (isRowSelectable) variantLiClasses += ' cursor-pointer';
        break;
      case 'delivered':
        variantLiClasses = 'bg-accent-green/30 dark:bg-accent-green/20 opacity-70';
        variantIdBoxClasses = 'bg-secondary-blue/50 dark:bg-secondary-blue/50';
        variantTitleTextClasses = 'text-gray-500 dark:text-gray-400 line-through';
        actionContent = (
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500">
            <Check size={16} className="text-white" />
          </div>
        );
        break;
      case 'pendingOther':
        variantLiClasses = 'bg-gray-100 dark:bg-gray-800 opacity-80';
        variantIdBoxClasses = 'bg-gray-400 dark:bg-gray-600';
        variantTitleTextClasses = 'text-gray-500 dark:text-gray-400 line-through';
        actionContent = (
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-red-500">
            <X size={16} className="text-white" />
          </div>
        );
        break;
      case 'default':
      default:
        variantLiClasses = 'bg-gray-50 dark:bg-gray-700/50';
        variantIdBoxClasses = 'bg-secondary-blue dark:bg-sky-600';
        variantTitleTextClasses = 'text-secondary-blue dark:text-sky-400';
        break;
    }
  }

  const handleInternalRowClick = () => {
    if (isRowSelectable && onItemToggle && boxId !== undefined && itemId !== undefined) {
      onItemToggle(boxId, itemId);
    } else if (onRowClick) {
      onRowClick();
    }
  };

  return (
    <li className={`${baseLiClasses} ${variantLiClasses}`} onClick={handleInternalRowClick}>
      <div className={`${baseIdBoxClasses} ${variantIdBoxClasses}`}>
        <span className={`text-xl sm:text-2xl font-extrabold ${finalIsVisuallyInactive ? 'text-white/70' : 'text-white'}`}>{id}</span>
      </div>
      <div className={clsx(
        `flex-grow p-2 sm:p-3`,
        {
          'rounded-r-lg': !actionContent && !isCheckboxInteractive,
          'cursor-pointer': isCheckboxInteractive || (isRowSelectable && !showCheckbox),
          'cursor-default': !isCheckboxInteractive && !(isRowSelectable && !showCheckbox)
        })
      }>
        <TextContainerTag htmlFor={isCheckboxInteractive ? `checkbox-item-${id}` : undefined} className={isCheckboxInteractive ? 'cursor-pointer' : ''}>
          <span className={`${baseTitleTextClasses} ${variantTitleTextClasses}`}>{title}</span>
          {ownerName && (
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate" title={`De: ${ownerName}`}>
              De: {ownerName}
            </span>
          )}
        </TextContainerTag>
      </div>
      {(actionContent || isCheckboxInteractive) && (
        <div className={baseActionAreaClasses}>
          {actionContent ? actionContent : (
            isCheckboxInteractive && (
              <>
                <input
                  type="checkbox"
                  id={`checkbox-item-${id}`}
                  disabled={disabled}
                  className="sr-only peer"
                  checked={isSelected}
                  onChange={onCheckboxChange}
                />
                <label
                  htmlFor={`checkbox-item-${id}`}
                  className={clsx('w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-150 ease-in-out peer-focus:ring-2 peer-focus:ring-offset-1 dark:peer-focus:ring-offset-gray-800', {
                    'bg-secondary-blue border-secondary-blue dark:bg-sky-500 dark:border-sky-500 peer-focus:ring-secondary-blue dark:peer-focus:ring-sky-500': isSelected,
                    'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 peer-focus:ring-gray-400': !isSelected,
                    'cursor-pointer active:scale-90': !disabled,
                    'cursor-not-allowed': disabled,
                  })}                >
                  {isSelected && <Check size={16} className="text-white" />}
                </label>
              </>
            )
          )}
        </div>
      )}
    </li>
  );
};

export default React.memo(GameRowItem);