
import HighContrastManager from "@/components/ThemeManager";
import { AuthProvider } from "@/hooks/useAuth";
import { EventPhaseProvider } from "@/contexts/EventPhaseContext";
import { ControlPanelProvider } from "@/contexts/ControlPanelContext";
import { GlobalControlPanel } from "@/components/control-panel/GlobalControlPanel";
import type { Metadata } from "next";
import { Nunito } from 'next/font/google';
import "./globals.css";

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: "Math Trade Argentina - Logística",
  icons: {
    icon: [
      {
        type: "image/png",
        sizes: "192x192",
        url: "/favicon/android-icon-192x192.png",
      },
      { type: "image/png", sizes: "32x32", url: "/favicon/favicon-32x32.png" },
      { type: "image/png", sizes: "96x96", url: "/favicon/favicon-96x96.png" },
      { type: "image/png", sizes: "16x16", url: "/favicon/favicon-16x16.png" },
      { type: "image/x-icon", url: "/favicon/favicon.ico" },
    ],
    apple: [
      {
        type: "image/png",
        sizes: "57x57",
        url: "/favicon/apple-icon-57x57.png",
      },
      {
        type: "image/png",
        sizes: "60x60",
        url: "/favicon/apple-icon-60x60.png",
      },
      {
        type: "image/png",
        sizes: "72x72",
        url: "/favicon/apple-icon-72x72.png",
      },
      {
        type: "image/png",
        sizes: "76x76",
        url: "/favicon/apple-icon-76x76.png",
      },
      {
        type: "image/png",
        sizes: "114x114",
        url: "/favicon/apple-icon-114x114.png",
      },
      {
        type: "image/png",
        sizes: "120x120",
        url: "/favicon/apple-icon-120x120.png",
      },
      {
        type: "image/png",
        sizes: "144x144",
        url: "/favicon/apple-icon-144x144.png",
      },
      {
        type: "image/png",
        sizes: "152x152",
        url: "/favicon/apple-icon-152x152.png",
      },
      {
        type: "image/png",
        sizes: "180x180",
        url: "/favicon/apple-icon-180x180.png",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <EventPhaseProvider>
        <ControlPanelProvider>
          <HighContrastManager />
          <html lang="es" className={`${nunito.variable} antialiased h-full`}>
            <body className="bg-neutral-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 h-full">
              {children}
              <GlobalControlPanel />
            </body>
          </html>
        </ControlPanelProvider>
      </EventPhaseProvider>
    </AuthProvider>
  );
};