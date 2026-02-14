import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AwalBot - Chat with your AI Agents",
  description: "Connect and chat with your OpenClaw AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
