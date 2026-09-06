import type { Metadata } from "next";

import "./globals.css";

import "./styles/dashboard.css";
import "./styles/profile-menu.css";
import "./styles/access.css";
import "./styles/admin-access.css";
import "./styles/cards.css";
import "./styles/accounts.css";
import "./styles/planning.css";
import "./styles/goals.css";
import "./styles/annual-report.css";

export const metadata: Metadata = {
  title: {
    default: "HAS Financial",
    template: "%s | HAS Financial",
  },

  description:
    "Plataforma de controle e planejamento financeiro pessoal.",

  applicationName: "HAS Financial",

  authors: [
    {
      name: "Haward Antunny",
      url: "https://hasanalytics.com.br",
    },
  ],

  creator: "Haward Antunny",

  metadataBase: new URL(
    "https://financial.hasanalytics.com.br"
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}