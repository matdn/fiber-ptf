import type { Metadata } from "next";
import "./globals.css";
import { UnderwaterProvider } from "@/contexts/UnderwaterContext";
import { TransitionProvider } from "@/contexts/TransitionContext";
import FloatingSoundToggle from "@/components/FloatingSoundToggle";
import PreventHorizontalNavigation from '@/components/PreventHorizontalNavigation';

export const metadata: Metadata = {
  title: "mat4folio",
  description: "A 3D portfolio built with Next.js and Three.js",
  icons: {
    icon: [{ url: "/ico.png", type: "image/png" }],
    shortcut: [{ url: "/ico.png", type: "image/png" }],
    apple: [{ url: "/ico.png", type: "image/png" }],
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
          <TransitionProvider>
          <PreventHorizontalNavigation />
          <FloatingSoundToggle />
          {children}
          <span style={{
            position: 'fixed',
            bottom: '14px',
            left: '18px',
            fontSize: '10px',
            letterSpacing: '0.08em',
            color: '#ffffff',
            mixBlendMode: 'difference',
            pointerEvents: 'none',
            zIndex: 100,
            fontFamily: 'Mabry Pro, sans-serif',
            textTransform: 'uppercase',
          }}>
            matis dene portfolio
          </span>
          </TransitionProvider>
        </UnderwaterProvider>
      </body>
    </html>
  );
}
