import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Notes",
  description: "Text + image notes with auto-save (local files or GitHub)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
