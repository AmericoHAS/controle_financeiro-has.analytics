import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAS Finanças — Inteligência Financeira",
  description: "Planejamento financeiro pessoal orientado por dados.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
