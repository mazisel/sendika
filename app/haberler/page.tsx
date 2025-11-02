'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, Mail, MapPin, Calendar, User, Search, Filter, ChevronRight, FileText } from 'lucide-react'
import Link from 'next/link'

interface News {
  id: string
  title: string
  content: string
  excerpt?: string
  image_url?: string
  published_at: string
  created_at: string
  is_published: boolean
  author?: string
  category?: {
    id: string
    name: string
    slug: string
    color: string
  }
}

export default function NewsPage() {
  const [news, setNews] = useState<News[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const newsPerPage = 6

  useEffect(() => {
    loadNews()
  }, [])

  const loadNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select(`
          *,
          category:categories(
            id,
            name,
            slug,
            color
          )
        `)
        .eq('is_published', true)
        .order('published_at', { ascending: false })

      if (!error && data) {
        setNews(data)
      }
    } catch (error) {
      console.error('Haberler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtreleme ve arama
  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || 
                           (item.category && item.category.id === selectedCategory)
    return matchesSearch && matchesCategory
  })

  // Sayfalama
  const totalPages = Math.ceil(filteredNews.length / newsPerPage)
  const startIndex = (currentPage - 1) * newsPerPage
  const paginatedNews = filteredNews.slice(startIndex, startIndex + newsPerPage)

  // Kategorileri al
  const categories = Array.from(
    new Map(
      news
        .map(item => item.category)
        .filter((category): category is NonNullable<News['category']> => Boolean(category))
        .map((category) => [category.id, category])
    ).values()
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <>
      {/* Hero Section */}
      <section className="header-gradient text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">
            Haberler
          </h1>
          <p className="text-base md:text-lg text-blue-100 max-w-3xl mx-auto">
            Sendikamızdan son haberler, duyurular ve gelişmeler
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
                placeholder="Haberlerde ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : paginatedNews.length > 0 ? (
            <>
              {/* News Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {paginatedNews.map((newsItem) => (
                  <article key={newsItem.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    {/* Image */}
                    <div className="aspect-w-16 aspect-h-9">
                      {newsItem.image_url ? (
                        <img
                          src={newsItem.image_url}
                          alt={newsItem.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                          <FileText className="w-16 h-16 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Category & Date */}
                      <div className="flex items-center justify-between mb-3">
                        {newsItem.category && (
                          <span 
                            className="inline-block text-xs px-2 py-1 rounded-full font-medium"
                            style={{ 
                              backgroundColor: newsItem.category.color + '20',
                              color: newsItem.category.color 
                            }}
                          >
                            {newsItem.category.name}
                          </span>
                        )}
                        <div className="flex items-center text-gray-500 text-sm">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDate(newsItem.published_at || newsItem.created_at)}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                        {newsItem.title}
                      </h3>

                      {/* Excerpt */}
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {newsItem.excerpt || newsItem.content.substring(0, 150) + '...'}
                      </p>

                      {/* Author */}
                      {newsItem.author && (
                        <div className="flex items-center text-gray-500 text-sm mb-4">
                          <User className="w-4 h-4 mr-1" />
                          {newsItem.author}
                        </div>
                      )}

                      {/* Read More */}
                      <Link
                        href={`/haberler/${newsItem.id}`}
                        className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700 transition-colors"
                      >
                        Devamını Oku
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
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
                {searchTerm || selectedCategory !== 'all' ? 'Arama Sonucu Bulunamadı' : 'Henüz Haber Yok'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Arama kriterlerinizi değiştirerek tekrar deneyin.'
                  : 'Şu anda görüntülenecek haber bulunmamaktadır.'
                }
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Kamu Ulaşım Sen</h3>
              <p className="text-gray-300">
                İşçi haklarını korumak ve geliştirmek için 1985'ten beri mücadele ediyoruz.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Hızlı Linkler</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-300 hover:text-white">Ana Sayfa</Link></li>
                <li><Link href="/#hakkimizda" className="text-gray-300 hover:text-white">Hakkımızda</Link></li>
                <li><Link href="/yonetim" className="text-gray-300 hover:text-white">Yönetim</Link></li>
                <li><Link href="/haberler" className="text-gray-300 hover:text-white">Haberler</Link></li>
                <li><Link href="/#iletisim" className="text-gray-300 hover:text-white">İletişim</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">İletişim</h4>
              <div className="space-y-2 text-gray-300">
                <p>Merkez Mahallesi, Atatürk Caddesi No:123</p>
                <p>İstanbul, Türkiye</p>
                <p>Tel: +90 212 555 0123</p>
                <p>E-posta: info@sendika.org.tr</p>
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
