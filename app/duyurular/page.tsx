'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, Mail, MapPin, Calendar, User, Search, Filter, ChevronRight, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'urgent' | 'general' | 'info'
  is_active: boolean
  created_at: string
  updated_at: string
  author?: string
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const announcementsPerPage = 6

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setAnnouncements(data)
      }
    } catch (error) {
      console.error('Duyurular yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtreleme ve arama
  const filteredAnnouncements = announcements.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedType === 'all' || item.type === selectedType
    return matchesSearch && matchesType
  })

  // Sayfalama
  const totalPages = Math.ceil(filteredAnnouncements.length / announcementsPerPage)
  const startIndex = (currentPage - 1) * announcementsPerPage
  const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, startIndex + announcementsPerPage)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'general':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'info':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4" />
      case 'general':
        return <FileText className="w-4 h-4" />
      case 'info':
        return <FileText className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'Acil'
      case 'general':
        return 'Genel'
      case 'info':
        return 'Bilgi'
      default:
        return 'Duyuru'
    }
  }

  return (
    <>
      {/* Hero Section */}
      <section className="header-gradient text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">
            Duyurular
          </h1>
          <p className="text-base md:text-lg text-blue-100 max-w-3xl mx-auto">
            Sendikamızdan önemli duyuru ve bilgilendirmeler
          </p>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Duyurularda ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tüm Duyurular</option>
                <option value="urgent">Acil Duyurular</option>
                <option value="general">Genel Duyurular</option>
                <option value="info">Bilgilendirmeler</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : paginatedAnnouncements.length > 0 ? (
            <>
              {/* Announcements Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {paginatedAnnouncements.map((announcement) => (
                  <article key={announcement.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    {/* Content */}
                    <div className="p-6">
                      {/* Type & Date */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium border ${getTypeColor(announcement.type)}`}>
                          {getTypeIcon(announcement.type)}
                          {getTypeName(announcement.type)}
                        </span>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(announcement.created_at)}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                        {announcement.title}
                      </h3>

                      {/* Content */}
                      <p className="text-gray-600 mb-4 line-clamp-4">
                        {announcement.content.substring(0, 200) + '...'}
                      </p>

                      {/* Author */}
                      {announcement.author && (
                        <div className="flex items-center text-gray-500 text-sm mb-4">
                          <User className="w-4 h-4 mr-1" />
                          {announcement.author}
                        </div>
                      )}

                      {/* Read More */}
                      <button className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700 transition-colors">
                        Devamını Oku
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Önceki
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === page
                          ? 'bg-primary-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Sonraki
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <FileText className="mx-auto h-24 w-24 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchTerm || selectedType !== 'all' ? 'Arama Sonucu Bulunamadı' : 'Henüz Duyuru Yok'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || selectedType !== 'all' 
                  ? 'Arama kriterlerinizi değiştirerek tekrar deneyin.'
                  : 'Şu anda görüntülenecek duyuru bulunmamaktadır.'
                }
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Kamu Ulaşım Sen</h3>
              <p className="text-gray-300">
                Ulaştırma sektöründeki kamu çalışanlarının haklarını korumak ve geliştirmek için Aralık 2024'te kurulduk.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Hızlı Linkler</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-300 hover:text-white">Ana Sayfa</Link></li>
                <li><Link href="/#hakkimizda" className="text-gray-300 hover:text-white">Hakkımızda</Link></li>
                <li><Link href="/yonetim" className="text-gray-300 hover:text-white">Yönetim</Link></li>
                <li><Link href="/subelerimiz" className="text-gray-300 hover:text-white">Şubelerimiz</Link></li>
                <li><Link href="/haberler" className="text-gray-300 hover:text-white">Haberler</Link></li>
                <li><Link href="/duyurular" className="text-gray-300 hover:text-white">Duyurular</Link></li>
                <li><Link href="/#iletisim" className="text-gray-300 hover:text-white">İletişim</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">İletişim</h4>
              <div className="space-y-2 text-gray-300">
                <p>Fidanlık Mahallesi Adakale Sokak No:25/24</p>
                <p>Çankaya/Ankara, Türkiye</p>
                <p>Tel: 0850 840 0674</p>
                <p>E-posta: bilgi@kamuulasimsen.org</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-300">
              © 2024 Kamu Ulaşım Sen. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
