"use client";

import Link from 'next/link';
import React from 'react';

interface LandingPageLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  titleClassName?: string;
}

const LandingPageLink: React.FC<LandingPageLinkProps> = ({ href, icon, title, description, titleClassName }) => {
  return (
    <Link href={href} passHref className="block h-full">
      <div className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 ease-in-out cursor-pointer h-full active:scale-95 active:shadow-lg md:flex-col md:justify-center md:items-center md:p-6">
        <div className="flex-shrink-0 mr-4 w-10 h-10 flex items-center justify-center md:mr-0 md:w-auto md:h-auto md:mb-4">
          <div className="w-full h-full flex items-center justify-center [&_svg]:w-auto [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:max-h-full">
            {icon}
          </div>
        </div>
        <div className="flex-grow flex flex-col justify-center min-w-0 md:flex-grow-0 md:items-center"> 
          <h2 className={`text-lg font-semibold ${titleClassName || 'text-secondary-blue dark:text-sky-400'} mb-1 truncate md:text-xl md:text-center md:truncate-none md:whitespace-normal`}>
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 md:text-center md:line-clamp-none md:min-h-[2.5rem]">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default LandingPageLink;