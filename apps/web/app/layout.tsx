import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://highbar.dev"),
  title: "Skill Doctor - Claude Code skill converter",
  description:
    "A client-first browser app that diagnoses Claude Code skills and converts them into portable Claude skills with directory, file, and diff previews.",
  openGraph: {
    title: "Skill Doctor - Claude Code skill converter",
    description:
      "Diagnose Claude Code skill problems, preview before and after files, and convert into a cleaner portable Claude skill.",
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
