import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Maps Lead Hunter — Prospecção B2B Inteligente",
  description:
    "Rastreie empresas locais, identifique falhas de presença digital e gere abordagens comerciais de alta conversão automaticamente.",
  keywords: ["prospecção", "leads", "google maps", "marketing digital", "B2B"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
