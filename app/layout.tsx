import type { Metadata } from "next";
import "./globals.css";
import { UnderwaterProvider } from "@/contexts/UnderwaterContext";

export const metadata: Metadata = {
  title: "Next.js Three.js Portfolio",
  description: "A 3D portfolio built with Next.js and Three.js",
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
          {children}
        </UnderwaterProvider>
      </body>
    </html>
  );
}
