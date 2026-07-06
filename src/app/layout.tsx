import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import NavigationProgress from "@/components/NavigationProgress";
import Providers from "./providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Company Dashboard",
  description: "Sales & Operations Analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Providers>
          <NavigationProgress />
          <NavBar />
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
