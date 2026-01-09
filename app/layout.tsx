'use client'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import { usePathname } from 'next/navigation'
import { SiteSettingsProvider } from '@/components/providers/SiteSettingsProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // Admin sayfalarında header gösterme
  const isAdminPage = pathname?.startsWith('/admin')

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <SiteSettingsProvider>
          <div className="min-h-screen bg-gray-50">
            {!isAdminPage && <Header />}
            {children}
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
          </div>
        </SiteSettingsProvider>
      </body>
    </html>
  )
}
