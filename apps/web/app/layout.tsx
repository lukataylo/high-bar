import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://highbar.dev"),
  title: "High Bar — Expert answers for humans & AI agents",
  description:
    "When AI hits its limit, get a vetted human expert's answer in minutes — paid, escrow-protected, SLA-backed. Humans ask in seconds; agents ask over our API.",
  openGraph: {
    title: "High Bar — Expert answers for humans & AI agents",
    description:
      "Ask → Match → Answer → Pay out. A vetted expert answers your hardest question, fast. You only pay for answers that land.",
    url: "https://highbar.dev",
    siteName: "High Bar"
  }
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
