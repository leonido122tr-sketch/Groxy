import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StatusBarInit } from "./components/StatusBarInit";
import { GlobalPdfViewerHost } from "./components/GlobalPdfViewerHost";
import { SupabaseNetworkErrorHandler } from "./components/SupabaseNetworkErrorHandler";
import { AuthDeepLinkHandler } from "./components/AuthDeepLinkHandler";
import { NativeLaunchGate } from "./components/NativeLaunchGate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Groxy",
  description: "Groxy Application",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('unhandledrejection',function(e){var r=e.reason;var m=r&&r.message!==undefined?r.message:String(r);var authErr=r&&(r.name==='AuthRetryableFetchError'||(r.constructor&&r.constructor.name==='AuthRetryableFetchError'));var isFetchErr=m==='Failed to fetch'||(typeof m==='string'&&m.indexOf('fetch')!==-1);if(isFetchErr||authErr){e.preventDefault();e.stopImmediatePropagation();console.warn('Сеть недоступна (Supabase Auth). Проверьте интернет или настройки Supabase.');}},true);`,
          }}
        />
        <StatusBarInit />
        <SupabaseNetworkErrorHandler />
        <NativeLaunchGate>
          <AuthDeepLinkHandler />
          <GlobalPdfViewerHost />
          <div className="app-shell">
            <div className="app-scroll">{children}</div>
          </div>
        </NativeLaunchGate>
      </body>
    </html>
  );
}
