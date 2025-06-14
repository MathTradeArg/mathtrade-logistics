
import type { Metadata } from "next";
import { Nunito } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth"; 
import HighContrastManager from "@/components/HighContrastManager";

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito', 
});

export const metadata: Metadata = {
  title: "Math Trade Argentina - Logística"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <HighContrastManager />
      <html lang="es" className={`${nunito.variable} antialiased h-full`}>
        <body className="bg-neutral-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 h-full">
          {children}
        </body>
      </html>
    </AuthProvider>
  );
};