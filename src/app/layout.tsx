import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import SettingsPanel from "@/components/features/SettingsPanel";
import { Toaster } from "sonner";

// "Holographic HUD" typography: Outfit for headings/UI, Geist Mono for all stats.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Faceit Stats Pro - CS2 Oyuncu İstatistikleri",
  description: "Counter-Strike 2 oyuncularının detaylı Faceit istatistiklerini, maç geçmişini görüntüle ve oyuncuları karşılaştır.",
  keywords: ["faceit", "cs2", "counter-strike", "istatistik", "elo", "oyuncu istatistikleri"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* Design system is dark-only ("Holographic HUD") */}
        <ThemeProvider attribute="class" forcedTheme="dark">
          <QueryProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <SettingsPanel />
              <Toaster
                theme="dark"
                position="bottom-right"
                richColors
                toastOptions={{
                  style: {
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
