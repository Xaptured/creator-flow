import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreatorFlow - Schedule smarter. Create faster. Grow bigger.",
  description:
    "CreatorFlow is the AI-powered content studio for creators. Schedule, publish, and analyze across YouTube, Instagram, and Twitter/X - all in one place.",
  openGraph: {
    title: "CreatorFlow - AI-Powered Content Studio",
    description:
      "Stop switching tools. CreatorFlow lets you schedule, publish, and analyze content across all platforms with the power of AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ background: "#000000", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
