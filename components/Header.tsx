'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [headerAnnouncements, setHeaderAnnouncements] = useState<any[]>([])
  const pathname = usePathname()

  useEffect(() => {
    loadHeaderAnnouncements()
  }, [])

  const loadHeaderAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'urgent')
        .order('created_at', { ascending: false })
        .limit(3)

      if (!error && data) {
        setHeaderAnnouncements(data)
      }
    } catch (error) {
      console.error('Header duyuruları yüklenirken hata:', error)
    }
  }

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true
    if (path !== '/' && pathname.startsWith(path)) return true
    return false
  }

  return (
    <>
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-28">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Link href="/" className="flex items-center space-x-2">
                  <img src="/logo.png" alt="Kamu Ulaşım Sen" className="h-24 w-auto" />
                  <span className="text-2xl font-bold text-primary-600">Kamu Ulaşım Sen</span>
                </Link>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  href="/" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Ana Sayfa
                </Link>
                <Link 
                  href="/hakkimizda" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/hakkimizda') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Hakkımızda
                </Link>
                <Link 
                  href="/yonetim" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/yonetim') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Yönetim
                </Link>
                <Link 
                  href="/subelerimiz" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/subelerimiz') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Şubelerimiz
                </Link>
                <Link 
                  href="/haberler" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/haberler') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Haberler
                </Link>
                <Link 
                  href="/duyurular" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/duyurular') 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-gray-700 hover:text-primary-600'
                  }`}
                >
                  Duyurular
                </Link>
                <Link 
                  href="/#iletisim" 
                  className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  İletişim
                </Link>
                <Link 
                  href="/uyelik" 
                  className={`btn-primary ${
                    isActive('/uyelik') ? 'bg-primary-700' : ''
                  }`}
                >
                  Üye Ol
                </Link>
              </div>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-gray-200 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                {isMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link 
                href="/" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Ana Sayfa
              </Link>
              <Link 
                href="/hakkimizda" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/hakkimizda') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Hakkımızda
              </Link>
              <Link 
                href="/yonetim" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/yonetim') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Yönetim
              </Link>
              <Link 
                href="/subelerimiz" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/subelerimiz') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Şubelerimiz
              </Link>
              <Link 
                href="/haberler" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/haberler') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Haberler
              </Link>
              <Link 
                href="/duyurular" 
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive('/duyurular') 
                    ? 'text-primary-600 bg-primary-50' 
                    : 'text-gray-700 hover:text-primary-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Duyurular
              </Link>
              <Link 
                href="/#iletisim" 
                className="text-gray-700 hover:text-primary-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                İletişim
              </Link>
              <div className="px-3 py-2">
                <Link 
                  href="/uyelik" 
                  className={`btn-primary w-full block text-center ${
                    isActive('/uyelik') ? 'bg-primary-700' : ''
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Üye Ol
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Header Announcements Slider */}
      {headerAnnouncements.length > 0 && (
        <section className="bg-primary-700 text-white py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 w-full">
                <span className="bg-white text-primary-700 px-3 py-1 rounded text-sm font-semibold flex-shrink-0">
                  DUYURULAR
                </span>
                <div className="overflow-hidden flex-1">
                  <div className="animate-marquee whitespace-nowrap">
                    <span className="text-sm">
                      {headerAnnouncements.map((announcement, index) => (
                        <span key={announcement.id} className="inline-block">
                          🔴 {announcement.title}
                          {index < headerAnnouncements.length - 1 ? ' • ' : ''}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
