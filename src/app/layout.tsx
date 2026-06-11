import type { Metadata } from "next";
import { Lato } from "next/font/google";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
});

export const metadata: Metadata = {
  title: "notes",
  description: "a private daily routine + journal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeScript />
        {children}
      </body>
    </html>
  );
}
