import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Bebas_Neue } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

export const metadata: Metadata = {
  title: "UGC Scripts — Studio",
  description: "Génère des scripts UGC naturels et engageants en quelques secondes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${bebas.variable} font-sans antialiased min-h-screen bg-cream text-olive`}
      >
        <Sidebar />
        <div className="ml-[220px] min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
