import type { Metadata } from "next";
import { IBM_Plex_Mono, Press_Start_2P } from "next/font/google";
import "./globals.css";

const retroDisplay = Press_Start_2P({
  variable: "--font-retro-display",
  subsets: ["latin"],
  weight: "400",
});

const retroMono = IBM_Plex_Mono({
  variable: "--font-retro-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

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
      <body
        className={`${retroDisplay.variable} ${retroMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
