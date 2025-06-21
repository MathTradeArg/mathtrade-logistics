"use client";

import Link from 'next/link';
import React from 'react';

interface LandingPageLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  titleClassName?: string;
  disabled?: boolean;
  disabledText?: string;
}

const LandingPageLink: React.FC<LandingPageLinkProps> = ({ href, icon, title, description, titleClassName, disabled = false, disabledText = '' }) => {
  const linkClasses = `
    flex items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl transition-all duration-200 ease-in-out h-full 
    md:flex-col md:justify-center md:items-center md:p-6
    ${disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : 'hover:shadow-2xl active:scale-95 active:shadow-lg cursor-pointer'
    }
  `;

  return (
    <Link
      href={disabled ? '#' : href}
      passHref
      className="block h-full"
      onClick={(e) => disabled && e.preventDefault()}
    >
      <div className={linkClasses}>
        <div className="flex-shrink-0 mr-4 w-10 h-10 flex items-center justify-center md:mr-0 md:w-auto md:h-auto md:mb-4">
          <div className="w-full h-full flex items-center justify-center [&_svg]:w-auto [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:max-h-full">
            {icon}
          </div>
        </div>
        <div className="flex-grow flex flex-col justify-center min-w-0 md:flex-grow-0 md:items-center"> 
          <h2 className={`text-lg font-semibold ${titleClassName || 'text-secondary-blue dark:text-sky-400'} mb-1 truncate md:text-xl md:text-center md:truncate-none md:whitespace-normal`}>
            {title}
          </h2>
          {disabled ? (
            <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold line-clamp-2 md:text-center md:line-clamp-none md:min-h-[2.5rem]">
              {disabledText}
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 md:text-center md:line-clamp-none md:min-h-[2.5rem]">
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default LandingPageLink;