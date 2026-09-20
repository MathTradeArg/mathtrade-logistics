
import { GlobalControlPanel } from "@/components/control-panel/GlobalControlPanel";
import { ControlPanelProvider } from "@/contexts/ControlPanelContext";
import { EventPhaseProvider } from "@/contexts/EventPhaseContext";
import { ActionStatusProvider } from "@/contexts/ActionStatusContext";
import { AuthProvider } from "@/hooks/useAuth";
import ToastContainer from "@/components/common/ToastContainer";
import StaffChrome from "@/components/staff/StaffChrome";
import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";

const mainFont = localFont({
  src: [
    { path: "./fonts/sfprodisplay-regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/sfprodisplay-semibolditalic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/sfprodisplay-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: '--font-main',
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
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
          <ActionStatusProvider>
            <html lang="es" className={`${mainFont.variable} ${mainFont.className} antialiased h-full`}>
              <body className="h-full bg-page text-gray-900">
                <StaffChrome>
                  {children}
                </StaffChrome>
                <GlobalControlPanel />
                <ToastContainer />
              </body>
            </html>
          </ActionStatusProvider>
        </ControlPanelProvider>
      </EventPhaseProvider>
    </AuthProvider>
  );
};