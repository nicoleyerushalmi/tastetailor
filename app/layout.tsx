import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, Syne } from "next/font/google";
import { MotionConfig } from "motion/react";
import "./globals.css";

const display = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const logo = Playfair_Display({
  variable: "--font-logo",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "TasteTailor",
  description:
    "Adapt any recipe — or start from a dish name — to match how you eat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${logo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-body)]">
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
