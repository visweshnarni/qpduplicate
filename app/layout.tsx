// app/layout.tsx
import type { Metadata, Viewport } from "next"; // 1. Import Viewport
import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";
import { Francois_One, Inter, Poppins } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const francois = Francois_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-francois",
});
const inter = Inter({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-inter",
});
const poppins = Poppins({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "HITAM Quickpass",
  description: "official HITAM website for generating automated outpasses",
};

// 2. ADD THIS: Force the browser to render at a desktop width (1200px)
export const viewport: Viewport = {
  width: 1200, 
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 3. REMOVED the <div className="pt-0"> that was wrapping <html>
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${francois.variable} ${inter.variable} ${poppins.variable}`}
    >
      {/* 4. ADDED min-w-[1200px] and overflow-x-auto to force desktop width and allow scrolling if needed */}
      <body className="font-poppins antialiased text-gray-900 bg-white min-w-[1200px] overflow-x-auto pt-0">
        {children}
      </body>
    </html>
  );
}