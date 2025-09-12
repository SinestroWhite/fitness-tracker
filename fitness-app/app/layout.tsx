import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { AuthProvider } from "@/contexts/auth-context"
import "./globals.css"
import { Suspense } from "react"
import RequireAuth from "@/components/requireAuth"

export const metadata: Metadata = {
  title: "Фитнес Трекър",
  description: "Приложение за проследяване на фитнес прогрес",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="bg">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <Suspense>

        <AuthProvider>
          <RequireAuth>{children}</RequireAuth></AuthProvider>

        </Suspense>
      </body>
    </html>
  )
}
