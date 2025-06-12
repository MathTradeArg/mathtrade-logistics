
import type { Metadata } from "next";
import { Nunito } from 'next/font/google';
import "./globals.css";

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito', 
});

export const metadata: Metadata = {
  title: "Math Trade Argentina - Logística"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${nunito.variable} antialiased`}> 
      <body className="bg-neutral-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        {children}
      </body>
    </html>
  );
};