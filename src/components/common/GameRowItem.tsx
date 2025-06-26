"use client";

import { triggerHaptic } from '@/utils/haptics';
import clsx from 'clsx';
import { Check, Plus, Trash, X } from 'phosphor-react';
import React from 'react';

interface GameRowItemProps {
  id: number | string;
  title: string;
  ownerName?: string;
  statusDisplay?: string;
  variant?: 'default' | 'delivered' | 'pendingOther' | 'actionable' | 'box-item' | 'add-to-box';
  isSelected?: boolean;
  onRowClick?: () => void;
  onCheckboxChange?: () => void;
  showCheckbox?: boolean;
  boxId?: number;
  itemId?: number;
  onItemToggle?: (boxId: number, itemId: number) => void;
  onRemoveItem?: () => void;
  onAddItem?: () => void;
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
  onRemoveItem,
  onAddItem,
  disabled = false,
}) => {
  const baseLiClasses = "flex nm-list-item overflow-hidden transition-all duration-150 ease-in-out items-stretch";
  const baseIdBoxClasses = "nm-idbox flex-shrink-0 flex items-center justify-center min-w-[54px] max-w-[54px] sm:min-w-[64px] sm:max-w-[64px] overflow-x-auto";
  const baseTitleTextClasses = "text-sm sm:text-base font-medium leading-tight truncate";
  const baseActionAreaClasses = "flex-shrink-0 w-12 sm:w-16 flex items-center justify-center p-2 sm:p-3 rounded-r-lg";

  const isInactiveByVariant = variant === 'delivered' || variant === 'pendingOther';
  const isBoxItemVariant = variant === 'box-item';
  const isAddToBoxVariant = variant === 'add-to-box';

  const calculateIsVisuallyInactive = (): boolean => {
    if (isInactiveByVariant) return true;
    if (showCheckbox && disabled) return true;
    if (variant === 'actionable' && !isSelected && !showCheckbox) return true;
    return false;
  };
  const finalIsVisuallyInactive = calculateIsVisuallyInactive();

  const isCheckboxInteractive = showCheckbox && !disabled && !!onCheckboxChange;
  const isRowSelectable = variant === 'actionable' && !!onRowClick && !disabled;
  const hasRemoveButton = isBoxItemVariant && !!onRemoveItem;
  const hasAddButton = isAddToBoxVariant && !!onAddItem;

  const TextContainerTag = isCheckboxInteractive ? 'label' : 'div';

  let variantLiClasses = "";
  let variantIdBoxClasses = "";
  let variantTitleTextClasses = "";
  let actionContent = null;

  if (showCheckbox) {
    if (disabled) {
      variantLiClasses = 'bg-gray-200/50 dark:bg-gray-800/50 opacity-60';
      variantIdBoxClasses = 'bg-gray-300 dark:bg-gray-700';
    } else if (isSelected) {
      variantLiClasses = 'bg-gray-50 dark:bg-gray-700/50 active:scale-[0.98] nm-list-item-selected';
      variantIdBoxClasses = 'bg-sky-300 dark:bg-sky-500';
    } else {
      variantLiClasses = 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/30 active:scale-[0.98]';
      variantIdBoxClasses = 'bg-gray-300 dark:bg-gray-700';
    }
    variantTitleTextClasses = 'text-secondary-blue dark:text-sky-400';
  } else {
    switch (variant) {
      case 'actionable':
        if (isSelected) {
          variantLiClasses = 'nm-list-item-selected hover:opacity-95 active:scale-[0.98]';
          variantIdBoxClasses = 'bg-sky-300 dark:bg-sky-500';
          variantTitleTextClasses = 'text-secondary-blue dark:text-sky-700';
        } else {
          variantLiClasses = 'bg-gray-100 dark:bg-gray-800/70 opacity-60 hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700/80 active:scale-[0.98]';
          variantIdBoxClasses = 'bg-gray-300 dark:bg-gray-700';
          variantTitleTextClasses = 'text-gray-500 dark:text-gray-400';
        }
        if (isRowSelectable) variantLiClasses += ' cursor-pointer';
        break;
      case 'box-item':
        variantLiClasses = 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/30';
        variantIdBoxClasses = 'bg-blue-400 dark:bg-blue-600';
        variantTitleTextClasses = 'text-secondary-blue dark:text-sky-400';
        actionContent = hasRemoveButton ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onRemoveItem?.();
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 transition-colors"
            title="Quitar de la caja"
          >
            <Trash size={14} className="text-white" />
          </button>
        ) : null;
        break;
      case 'add-to-box':
        variantLiClasses = 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600/30';
        variantIdBoxClasses = 'bg-green-400 dark:bg-green-600';
        variantTitleTextClasses = 'text-secondary-blue dark:text-sky-400';
        actionContent = hasAddButton ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onAddItem?.();
            }}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition-colors"
            title="Agregar a la caja"
          >
            <Plus size={14} className="text-white" />
          </button>
        ) : null;
        break;
      case 'delivered':
        variantLiClasses = 'bg-accent-green/30 dark:bg-accent-green/20 opacity-70';
        variantIdBoxClasses = 'bg-green-400 dark:bg-green-600';
        variantTitleTextClasses = 'text-gray-500 dark:text-gray-400 line-through';
        actionContent = (
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-500">
            <Check size={16} className="text-white" />
          </div>
        );
        break;
      case 'pendingOther':
        variantLiClasses = 'bg-gray-100 dark:bg-gray-800 opacity-80';
        variantIdBoxClasses = 'bg-gray-300 dark:bg-gray-700';
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
        variantIdBoxClasses = 'bg-gray-300 dark:bg-gray-700';
        variantTitleTextClasses = 'text-secondary-blue dark:text-sky-400';
        break;
    }
  }

  const handleInternalRowClick = () => {
    triggerHaptic();
    if (isRowSelectable && onItemToggle && boxId !== undefined && itemId !== undefined) {
      onItemToggle(boxId, itemId);
    } else if (onRowClick) {
      onRowClick();
    }
  };

  return (
    <li className={`${baseLiClasses} ${variantLiClasses}`} onClick={handleInternalRowClick}>
      <div className={clsx(baseIdBoxClasses, variantIdBoxClasses, { 'nm-idbox-selected': isSelected })}>
        <span
          className={`text-xl sm:text-2xl font-extrabold text-center w-full select-all ${finalIsVisuallyInactive ? 'text-white/70' : 'text-white'}`}
          style={{ wordBreak: 'break-all', lineHeight: 1.1, paddingLeft: 2, paddingRight: 2, maxWidth: '100%' }}
          title={typeof id === 'string' && id.length > 8 ? String(id) : undefined}
        >
          {id}
        </span>
      </div>
      <div className={clsx(
        `flex-grow min-w-0 p-2 sm:p-3 flex flex-col justify-center`,
        {
          'rounded-r-lg': !actionContent && !isCheckboxInteractive,
          'cursor-pointer': isCheckboxInteractive || (isRowSelectable && !showCheckbox),
          'cursor-default': !isCheckboxInteractive && !(isRowSelectable && !showCheckbox)
        })
      }>
        <TextContainerTag htmlFor={isCheckboxInteractive ? `checkbox-item-${id}` : undefined} className={isCheckboxInteractive ? 'cursor-pointer' : ''}>
          <span className={`${baseTitleTextClasses} ${variantTitleTextClasses} block w-full truncate`} title={title}>{title}</span>
          {ownerName && (
            <span className="block text-xs text-gray-500 dark:text-gray-400 truncate" title={`De: ${ownerName}`}>
              De: {ownerName}
            </span>
          )}
        </TextContainerTag>
      </div>
      {(actionContent || isCheckboxInteractive) && (
        <div className={`${baseActionAreaClasses} ${hasRemoveButton || hasAddButton ? 'w-10' : ''}`}>
          {actionContent ? actionContent : (
            isCheckboxInteractive && (
              <input
                type="checkbox"
                id={`checkbox-item-${id}`}
                disabled={disabled}
                className="nm-checkbox"
                checked={isSelected}
                onChange={() => { triggerHaptic(); onCheckboxChange?.(); }}
                onClick={e => { e.stopPropagation(); triggerHaptic(); }}
              />
            )
          )}
        </div>
      )}
    </li>
  );
};

export default React.memo(GameRowItem);