import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Along — get around Abuja by bus, cab, keke and okada",
  description:
    "Plan trips across Abuja with the buses, shared cabs, keke and okada people actually use — with 2026 fare estimates and no long walks.",
  applicationName: "Along",
}

export const viewport: Viewport = {
  themeColor: "#12140f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-NG" suppressHydrationWarning className={`${inter.variable} font-sans antialiased`}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
