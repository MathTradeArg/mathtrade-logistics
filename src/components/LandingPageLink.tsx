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
    <Link href={href} passHref>
      <div className="flex flex-col items-center justify-start p-8 bg-white dark:bg-gray-800 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 ease-in-out cursor-pointer h-full active:scale-95 active:shadow-lg">
        {icon}
        <h2 className={`text-2xl font-semibold ${titleClassName || 'text-secondary-blue dark:text-sky-400'} mb-2`}>{title}</h2>
        <p className="text-center text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
    </Link>
  );
};

export default LandingPageLink;