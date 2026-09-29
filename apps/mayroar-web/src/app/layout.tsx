import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// next/font downloads the font at build time, so there is no flash of the wrong font
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "MayRoar",
  description:
    "An AI strength coach that learns how your body trains, recovers and changes over time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU" className={geist.variable}>
      <body>{children}</body>
    </html>
  );
}