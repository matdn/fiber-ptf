import type { Metadata } from "next";
import "./globals.css";
import { UnderwaterProvider } from "@/contexts/UnderwaterContext";
import FloatingSoundToggle from "@/components/FloatingSoundToggle";
import PreventHorizontalNavigation from '@/components/PreventHorizontalNavigation';
import GifFaviconPlayer from "@/components/GifFaviconPlayer";

export const metadata: Metadata = {
  title: "Next.js Three.js Portfolio",
  description: "A 3D portfolio built with Next.js and Three.js",
  icons: {
    icon: [{ url: "/turningM.gif", type: "image/gif" }],
    shortcut: [{ url: "/turningM.gif", type: "image/gif" }],
    apple: [{ url: "/turningM.gif", type: "image/gif" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <UnderwaterProvider>
          <GifFaviconPlayer />
          <PreventHorizontalNavigation />
          <FloatingSoundToggle />
          {children}
        </UnderwaterProvider>
      </body>
    </html>
  );
}
