import type { Metadata, Viewport } from "next";
import { Lato } from "next/font/google";
import Script from "next/script";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

// PWA + metadata wiring (slice 5 · pwa). Manifest, icons, and the apple/standalone
// hints live here; the manifest + icons + service worker are static files in public/.
export const metadata: Metadata = {
  title: "notes",
  description: "a private daily routine + journal",
  applicationName: "notes",
  manifest: "/manifest.webmanifest",
  // favicon.ico (file convention) covers the browser tab; declare the apple-touch-icon.
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "notes",
    statusBarStyle: "default",
  },
  // Next 16 emits the modern `mobile-web-app-capable`; add the legacy Apple tag too so
  // iOS reliably launches the home-screen app in standalone mode (no Safari chrome).
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

// theme-color tracks the app background (calm, no chrome) per light/dark (#063).
// The manifest's theme_color is the accent blue, which tints the installed app UI.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lato.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeScript />
        {children}
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', function () {
              navigator.serviceWorker.register('/sw.js').catch(function () {});
            });
          }`}
        </Script>
      </body>
    </html>
  );
}
