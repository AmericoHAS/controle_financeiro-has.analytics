import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAS Finanças — Inteligência Financeira",
  description: "Planejamento financeiro pessoal orientado por dados.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
