
import type { Metadata } from "next";
import { Nunito } from 'next/font/google';
import "./globals.css";

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito', 
});

export const metadata: Metadata = {
  title: "Game Tracker",
  description: "App para trackear la entrega de juegos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${nunito.variable}`}> {/* Aplica la variable al html o body */}
      <body>{children}</body>
    </html>
  );
};