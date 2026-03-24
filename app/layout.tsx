import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Entre Ciclos — Sistema Financeiro",
  description: "Controle financeiro da Lavanderia Entre Ciclos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen`} style={{ backgroundColor: '#F4F3FF' }}>
        <div className="flex min-h-screen">
          <Sidebar />
          {/* Offset da sidebar no desktop + padding bottom no mobile para o bottom nav */}
          <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
