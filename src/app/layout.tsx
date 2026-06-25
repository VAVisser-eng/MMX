import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MMX B.V. | Tweedehands Tesla specialist",
  description:
    "MMX B.V. helpt je een jonge tweedehands Tesla Model 3 of Model Y te vinden, samen te stellen en zorgeloos te rijden.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black">{children}</body>
    </html>
  );
}
