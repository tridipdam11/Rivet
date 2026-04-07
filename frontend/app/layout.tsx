import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rivet AI Agent Studio",
  description: "Visual AI agent workflow automation app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
