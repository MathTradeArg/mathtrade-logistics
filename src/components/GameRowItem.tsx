"use client";

import { Check, CheckCircle2, XCircle } from 'lucide-react';
import React from 'react';

interface GameRowItemProps {
  id: number | string;
  title: string;
  statusDisplay?: string;
  variant?: 'default' | 'delivered' | 'pendingOther' | 'actionable';
  isSelected?: boolean;
  onRowClick?: () => void;
  onCheckboxChange?: () => void;
  showCheckbox?: boolean;
}

const GameRowItem: React.FC<GameRowItemProps> = ({
  id,
  title,
  statusDisplay,
  variant = 'default',
  isSelected,
  onRowClick,
  onCheckboxChange,
  showCheckbox = false,
}) => {
  const baseLiClasses = "flex rounded-xl shadow-md overflow-hidden transition-all duration-150 ease-in-out";
  const baseIdBoxClasses = "flex-shrink-0 w-16 sm:w-20 flex items-center justify-center p-3 sm:p-4 rounded-l-xl";
  const baseTitleTextClasses = "text-base sm:text-lg font-semibold leading-tight";
  const baseActionAreaClasses = "flex-shrink-0 w-16 sm:w-20 flex items-center justify-center p-3 sm:p-4 rounded-r-xl";

  const isGameListItemInactive = statusDisplay && ['Delivered', 'In Event'].includes(statusDisplay);
  const isGameListItemActionable = showCheckbox && !isGameListItemInactive;

  let variantLiClasses = "";
  let variantIdBoxClasses = "";
  let variantTitleTextClasses = "";
  let actionContent = null;

  if (showCheckbox) { 
    if (isGameListItemActionable) {
      variantLiClasses = `bg-gray-50 dark:bg-gray-700/50 hover:shadow-lg active:scale-[0.98] active:shadow-md`;
      variantIdBoxClasses = `bg-secondary-blue cursor-pointer`;
      variantTitleTextClasses = `text-secondary-blue dark:text-sky-400 cursor-pointer`;
    } else { 
      variantLiClasses = `bg-accent-green/30 dark:bg-accent-green/20 opacity-70`;
      variantIdBoxClasses = `bg-secondary-blue/50`;
      variantTitleTextClasses = `text-gray-500 dark:text-gray-400 line-through`;
      actionContent = <div className="w-8 h-8 sm:w-15 sm:h-10 rounded-full flex items-center justify-center border-2 bg-accent-green border-accent-green"><Check size={18} className="text-black" /></div>;
    }
  } else { 
    switch (variant) {
      case 'delivered':
        variantLiClasses = `bg-accent-green/30 dark:bg-accent-green/20 opacity-70`;
        variantIdBoxClasses = `bg-secondary-blue/50 dark:bg-secondary-blue/50`;
        variantTitleTextClasses = `text-gray-500 dark:text-gray-400 line-through`;
        actionContent = <CheckCircle2 size={24} className="text-green-500" />;
        break;
      case 'pendingOther':
        variantLiClasses = `bg-gray-100 dark:bg-gray-800 opacity-80`;
        variantIdBoxClasses = `bg-gray-400 dark:bg-gray-600`;
        variantTitleTextClasses = `text-gray-500 dark:text-gray-400 line-through`;
        actionContent = <XCircle size={24} className="text-red-500" />;
        break;
      case 'default':
      default:
        variantLiClasses = `bg-gray-50 dark:bg-gray-700/50`;
        variantIdBoxClasses = `bg-secondary-blue`;
        variantTitleTextClasses = `text-secondary-blue dark:text-sky-400`;
        break;
    }
  }

  return (
    <li className={`${baseLiClasses} ${variantLiClasses} ${isSelected && isGameListItemActionable ? 'ring-2 ring-secondary-blue ring-offset-1 dark:ring-offset-gray-800' : ''}`} onClick={onRowClick}>
      <div className={`${baseIdBoxClasses} ${variantIdBoxClasses}`}>
        <span className={`text-2xl sm:text-3xl font-bold ${showCheckbox && isGameListItemInactive ? 'text-white/70' : 'text-white'}`}>{id}</span>
      </div>
      <div className={`flex-grow p-3 sm:p-4 ${variant === 'default' && !showCheckbox ? 'rounded-r-xl' : ''} ${isGameListItemActionable ? 'cursor-pointer' : 'cursor-default'}`}>
        <label htmlFor={isGameListItemActionable ? `checkbox-item-${id}` : undefined} className={isGameListItemActionable ? 'cursor-pointer' : 'cursor-default'}>
          <span className={`${baseTitleTextClasses} ${variantTitleTextClasses}`}>{title}</span>
        </label>
      </div>
      {(actionContent || isGameListItemActionable) && (
        <div className={baseActionAreaClasses}>
          {actionContent ? actionContent : ( 
            isGameListItemActionable && (
            <>
              <input
                type="checkbox"
                id={`checkbox-item-${id}`}
                className="sr-only peer"
                checked={isSelected}
                onChange={onCheckboxChange}
              />
              <label
                htmlFor={`checkbox-item-${id}`}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 cursor-pointer transition-all duration-150 ease-in-out active:scale-90 peer-focus:ring-2 peer-focus:ring-offset-1 dark:peer-focus:ring-offset-gray-800 ${isSelected ? 'bg-secondary-blue border-secondary-blue peer-focus:ring-secondary-blue' : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 peer-focus:ring-gray-400'}`}
              >
                {isSelected && <Check size={18} className="text-white" />}
              </label>
            </>
            )
          )}
        </div>
      )}
    </li>
  );
};

export default GameRowItem;