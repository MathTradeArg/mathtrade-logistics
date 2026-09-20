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

  let rowClasses = 'bg-white text-gray-900';
  let idBoxClasses = 'bg-gray-200 text-gray-800';
  let titleClasses = 'text-gray-900';
  let actionContent = null;

  if (showCheckbox) {
    if (disabled) {
      rowClasses = 'bg-muted text-gray-400 opacity-60';
      idBoxClasses = 'bg-gray-300 text-gray-500';
    } else if (isSelected) {
      rowClasses = 'border-l-4 border-primary bg-primary/10 text-gray-900';
      idBoxClasses = 'bg-primary text-white';
    } else {
      rowClasses = 'bg-white text-gray-900';
      idBoxClasses = 'bg-gray-200 text-gray-800';
    }
  } else {
    switch (variant) {
      case 'actionable':
        if (isSelected) {
          rowClasses = 'border-l-4 border-primary bg-primary/10 text-gray-900';
          idBoxClasses = 'bg-primary text-white';
          titleClasses = 'text-gray-900';
        } else {
          rowClasses = 'bg-white text-gray-500';
          idBoxClasses = 'bg-gray-200 text-gray-500';
          titleClasses = 'text-gray-500';
        }
        if (isRowSelectable) rowClasses += ' cursor-pointer';
        break;
      case 'box-item':
        rowClasses = 'bg-white text-gray-900';
        idBoxClasses = 'bg-primary text-white';
        titleClasses = 'text-gray-900';
        actionContent = hasRemoveButton ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onRemoveItem?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-danger"
            title="Quitar de la caja"
          >
            <Trash size={16} className="text-white" />
          </button>
        ) : null;
        break;
      case 'add-to-box':
        rowClasses = 'bg-white text-gray-900';
        idBoxClasses = 'bg-want text-white';
        titleClasses = 'text-gray-900';
        actionContent = hasAddButton ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              triggerHaptic();
              onAddItem?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary"
            title="Agregar a la caja"
          >
            <Plus size={16} className="text-white" />
          </button>
        ) : null;
        break;
      case 'delivered':
        rowClasses = 'bg-want/10 text-gray-500';
        idBoxClasses = 'bg-want text-white';
        titleClasses = 'text-gray-500 line-through';
        actionContent = (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-want">
            <Check size={16} className="text-white" />
          </div>
        );
        break;
      case 'pendingOther':
        rowClasses = 'bg-muted text-gray-500';
        idBoxClasses = 'bg-gray-300 text-gray-600';
        titleClasses = 'text-gray-500 line-through';
        actionContent = (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger">
            <X size={16} className="text-white" />
          </div>
        );
        break;
      case 'default':
      default:
        rowClasses = 'bg-white text-gray-900';
        idBoxClasses = 'bg-gray-200 text-gray-800';
        titleClasses = 'text-gray-900';
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
    <li
      className={clsx(
        'flex min-h-14 items-stretch overflow-hidden rounded-lg border border-gray-200 shadow-sm',
        rowClasses,
      )}
      onClick={handleInternalRowClick}
    >
      <div className={clsx('flex w-14 shrink-0 items-center justify-center sm:w-16', idBoxClasses)}>
        <span
          className={clsx(
            'w-full select-all px-1 text-center text-xl font-extrabold leading-tight sm:text-2xl',
            finalIsVisuallyInactive && !idBoxClasses.includes('text-white') ? 'opacity-70' : '',
          )}
          style={{ wordBreak: 'break-all' }}
          title={typeof id === 'string' && id.length > 8 ? String(id) : undefined}
        >
          {id}
        </span>
      </div>
      <div
        className={clsx('flex min-w-0 flex-1 flex-col justify-center p-3', {
          'cursor-pointer': isCheckboxInteractive || (isRowSelectable && !showCheckbox),
        })}
      >
        <TextContainerTag htmlFor={isCheckboxInteractive ? `checkbox-item-${id}` : undefined} className={isCheckboxInteractive ? 'cursor-pointer' : ''}>
          <span className={clsx('block w-full text-base font-medium leading-tight', titleClasses)} title={title}>
            {title}
          </span>
          {ownerName && (
            <span className="mt-0.5 block text-sm text-gray-500" title={`De: ${ownerName}`}>
              De: {ownerName}
            </span>
          )}
        </TextContainerTag>
      </div>
      {(actionContent || isCheckboxInteractive) && (
        <div className="flex w-12 shrink-0 items-center justify-center p-2 sm:w-16">
          {actionContent ? actionContent : (
            isCheckboxInteractive && (
              <input
                type="checkbox"
                id={`checkbox-item-${id}`}
                disabled={disabled}
                className="h-5 w-5 rounded border-stroke text-primary"
                checked={isSelected}
                onChange={() => { triggerHaptic(); onCheckboxChange?.(); }}
                onClick={(e) => { e.stopPropagation(); triggerHaptic(); }}
              />
            )
          )}
        </div>
      )}
    </li>
  );
};

export default React.memo(GameRowItem);
