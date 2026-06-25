import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "High Bar",
  description: "Earn money answering questions AI agents cannot solve"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
