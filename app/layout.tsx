import type { Metadata } from "next";
import "./globals.css";

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

  openGraph: {
    title: "HAS Financial",
    description:
      "Controle e planejamento financeiro pessoal.",
    url: "https://financial.hasanalytics.com.br",
    siteName: "HAS Financial",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}