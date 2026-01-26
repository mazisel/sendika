'use client'

import { useState, useEffect } from 'react'
import { Users, FileText, Calendar, Phone, Mail, MapPin, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import HeroSlider from '@/components/HeroSlider'
import Link from 'next/link'

export default function HomePage() {
  const [news, setNews] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [discounts, setDiscounts] = useState<any[]>([])

  useEffect(() => {
    loadNews()
    loadAnnouncements()
    loadDiscounts()
  }, [])

  const loadNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(3)

      if (!error && data) {
        setNews(data)
      }
    } catch (error) {
      console.error('Haberler yüklenirken hata:', error)
    }
  }

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .neq('type', 'urgent')
        .order('created_at', { ascending: false })
        .limit(5)

      if (!error && data) {
        setAnnouncements(data)
      }
    } catch (error) {
      console.error('Duyurular yüklenirken hata:', error)
    }
  }

  const loadDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('is_active', true)
        .limit(8)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setDiscounts(data)
      }
    } catch (error) {
      console.error('İndirimler yüklenirken hata:', error)
    }
  }

  return (
    <>
      {/* Hero Slider */}
      <HeroSlider />

      {/* Discounts Section */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Anlaşmalı Kurumlar
              </h2>
              <p className="text-gray-600">
                Üyelerimize özel ayrıcalıklı indirimler
              </p>
            </div>
            <Link
              href="/indirimler"
              className="hidden sm:flex items-center text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              Tümünü Gör
              <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {discounts.map((discount) => (
              <div key={discount.id} className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-xl hover:border-primary-200 transition-all duration-300">
                <div className="aspect-square relative mb-4 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center">
                  {discount.image_url ? (
                    <img
                      src={discount.image_url}
                      alt={discount.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-4xl font-bold text-primary-200">
                      {discount.title.charAt(0)}
                    </div>
                  )}
                  <div className="absolute top-0 right-0 bg-red-600 text-white text-xl font-bold px-3 py-2 rounded-bl-xl shadow-lg">
                    {discount.discount_amount}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-primary-600 transition-colors">
                    {discount.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2 h-10 leading-snug">
                    {discount.description}
                  </p>
                  <div className="flex items-center text-xs text-gray-500 mb-3">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">{discount.city || 'Tüm Türkiye'}</span>
                  </div>
                  <Link
                    href="/indirimler"
                    className="block w-full text-center py-2 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium group-hover:bg-primary-50 group-hover:text-primary-700 transition-colors"
                  >
                    Detayları Gör
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/indirimler"
              className="inline-flex items-center text-primary-600 font-medium"
            >
              Tüm İndirimleri Gör
              <ChevronRight className="w-5 h-5 ml-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Nasıl Yardımcı Olabiliriz Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Decorative wave pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 200C240 280 480 120 720 200C960 280 1200 120 1440 200V400H0V200Z" fill="currentColor" className="text-primary-600" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-600 mb-4">
              NASIL YARDIMCI OLABİLİRİZ?
            </h2>
            {/* Decorative line with icon */}
            <div className="flex items-center justify-center gap-2">
              <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-primary-500 to-primary-500"></div>
              <div className="text-primary-500 text-lg">✦</div>
              <div className="h-0.5 w-32 bg-gradient-to-l from-transparent via-primary-500 to-primary-500"></div>
            </div>
          </div>

          {/* Service Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {/* Card 1 - Temsilciliklerimiz */}
            <Link href="/subelerimiz" className="group">
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center h-full border border-gray-100 hover:border-primary-200 group-hover:-translate-y-1">
                <div className="w-16 h-16 mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-base font-semibold text-primary-600">Temsilciliklerimiz</h3>
              </div>
            </Link>

            {/* Card 2 - Üyelik Başvuru Formu */}
            <Link href="/uyelik" className="group">
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center h-full border border-gray-100 hover:border-primary-200 group-hover:-translate-y-1">
                <div className="w-16 h-16 mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-base font-semibold text-primary-600">Üyelik Başvuru Formu</h3>
              </div>
            </Link>

            {/* Card 3 - Nasıl Üye Olurum */}
            <Link href="/uyelik#nasil-uye-olurum" className="group">
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center h-full border border-gray-100 hover:border-primary-200 group-hover:-translate-y-1">
                <div className="w-16 h-16 mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-base font-semibold text-primary-600">Nasıl Üye Olurum</h3>
              </div>
            </Link>

            {/* Card 4 - EK-1 Üyelik Formu */}
            <a href="/ek1-uyelik-formu.pdf" target="_blank" rel="noopener noreferrer" className="group">
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center h-full border border-gray-100 hover:border-primary-200 group-hover:-translate-y-1">
                <div className="w-16 h-16 mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17h6" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-base font-semibold text-primary-600">EK-1 Üyelik Formu</h3>
              </div>
            </a>

            {/* Card 5 - Kazanımlarımız */}
            <Link href="/hakkimizda#kazanimlarimiz" className="group">
              <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex flex-col items-center text-center h-full border border-gray-100 hover:border-primary-200 group-hover:-translate-y-1">
                <div className="w-16 h-16 mb-4 flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm md:text-base font-semibold text-primary-600">Kazanımlarımız</h3>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* News and Announcements Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

            {/* Left Side - News */}
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Son Haberler
                </h2>
                <p className="text-lg text-gray-600">
                  Güncel gelişmeler ve sendika haberleri
                </p>
              </div>

              <div className="space-y-6">
                {news.length > 0 ? (
                  news.map((newsItem) => (
                    <article key={newsItem.id} className="flex items-start gap-4 pb-4 border-b border-gray-200">
                      <div className="flex-shrink-0">
                        {newsItem.image_url ? (
                          <img
                            src={newsItem.image_url}
                            alt={newsItem.title}
                            className="w-20 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <FileText className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500 mb-1">
                          {new Date(newsItem.published_at || newsItem.created_at).toLocaleDateString('tr-TR')}
                        </div>
                        <h3 className="text-lg font-semibold mb-2 leading-tight text-gray-900">
                          {newsItem.title}
                        </h3>
                        <p className="text-gray-600 mb-3 text-sm leading-relaxed">
                          {newsItem.excerpt || newsItem.content.substring(0, 150) + '...'}
                        </p>
                        <Link href={`/haberler/${newsItem.id}`} className="text-primary-600 font-medium hover:text-primary-700 text-sm">
                          Devamını Oku →
                        </Link>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Henüz haber bulunmuyor.</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Link href="/haberler" className="btn-secondary">
                  Tüm Haberleri Görüntüle
                </Link>
              </div>
            </div>

            {/* Right Side - Announcements */}
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Duyurular
                </h2>
                <p className="text-lg text-gray-600">
                  Önemli duyuru ve bilgilendirmeler
                </p>
              </div>

              <div className="space-y-6">
                {announcements.length > 0 ? (
                  announcements.map((announcement) => {
                    const getTypeColor = (type: string) => {
                      switch (type) {
                        case 'urgent':
                          return 'bg-red-50 border-l-4 border-red-500'
                        case 'general':
                          return 'bg-blue-50 border border-blue-200'
                        case 'info':
                          return 'bg-green-50 border border-green-200'
                        default:
                          return 'bg-yellow-50 border border-yellow-200'
                      }
                    }

                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case 'urgent':
                          return (
                            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-lg text-white mr-4 flex-shrink-0">
                              ❗
                            </div>
                          )
                        case 'general':
                          return (
                            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-base mr-4 flex-shrink-0">
                              📢
                            </div>
                          )
                        case 'info':
                          return (
                            <div className="w-9 h-9 bg-green-500 rounded-full flex items-center justify-center text-base mr-4 flex-shrink-0">
                              ✅
                            </div>
                          )
                        default:
                          return (
                            <div className="w-9 h-9 bg-yellow-500 rounded-full flex items-center justify-center text-base mr-4 flex-shrink-0">
                              ⚠️
                            </div>
                          )
                      }
                    }

                    const getTextColors = (type: string) => {
                      switch (type) {
                        case 'urgent':
                          return {
                            title: 'text-red-800',
                            content: 'text-red-700'
                          }
                        case 'general':
                          return {
                            title: 'text-blue-800',
                            content: 'text-blue-700'
                          }
                        case 'info':
                          return {
                            title: 'text-green-800',
                            content: 'text-green-700'
                          }
                        default:
                          return {
                            title: 'text-yellow-800',
                            content: 'text-yellow-700'
                          }
                      }
                    }

                    const colors = getTextColors(announcement.type)
                    const isUrgent = announcement.type === 'urgent'

                    return (
                      <Link
                        key={announcement.id}
                        href={`/duyurular/${announcement.id}`}
                        className={`${getTypeColor(announcement.type)} ${isUrgent ? 'p-6' : 'p-4'} rounded-lg block hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-start">
                          {getTypeIcon(announcement.type)}
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold ${colors.title} mb-2 ${isUrgent ? 'text-lg' : ''}`}>
                              {announcement.title}
                            </h4>
                            <p className={`${colors.content} text-sm md:text-base whitespace-pre-wrap break-words break-all ${isUrgent ? 'mb-3' : ''}`}>
                              {announcement.content}
                            </p>
                            <div className="flex items-center justify-between mt-3 text-xs md:text-sm text-gray-500">
                              <span>
                                {new Date(announcement.created_at).toLocaleDateString('tr-TR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="inline-flex items-center text-primary-600 font-medium hover:text-primary-700">
                                Devamını Gör <ChevronRight className="w-4 h-4 ml-1" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Henüz duyuru bulunmuyor.</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <Link href="/duyurular" className="btn-primary">
                  Tüm Duyuruları Görüntüle
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* About Section */}
      <section id="hakkimizda" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Hakkımızda
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Ulaştırma Kamu Çalışanları Sendikası (Kamu Ulaşım Sen) olarak, Aralık 2024'te, ulaştırma hizmet kolunda görev yapan kamu çalışanlarının haklarını korumak ve geliştirmek amacıyla kurulduk.
              </p>
              <p className="text-lg text-gray-600 mb-6">
                Temel amacımız, üyelerimizin özlük haklarını iyileştirmek, mesleki gelişimlerini destekleyici eğitimler düzenlemek ve kurumlarımızdaki kronikleşmiş sorunlarla etkin bir şekilde mücadele etmektir.
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Şeffaflık, katılımcılık ve adaleti ilke edinerek, tüm üyelerimizin sesi olmayı ve çalışma koşullarını daha iyi bir seviyeye taşımayı hedefliyoruz. Kamu Ulaşım Sen, ulaştırma sektöründeki kamu çalışanlarının hak ettiği saygın ve adil çalışma ortamını oluşturmak için var gücüyle çalışacaktır.
              </p>
              <Link href="/hakkimizda" className="flex items-center text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                <span>Daha fazla bilgi</span>
                <ChevronRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
            <div className="bg-white rounded-lg p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Sosyal Medyada Bizi Takip Edin</h3>
              <div className="space-y-6">
                <p className="text-gray-600 text-center mb-6">
                  Güncel haberler, duyurular ve etkinlikler için sosyal medya hesaplarımızı takip edin.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Facebook */}
                  <a
                    href="#"
                    className="flex items-center justify-center p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors group"
                  >
                    <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span className="font-semibold">Facebook</span>
                  </a>

                  {/* Twitter */}
                  <a
                    href="#"
                    className="flex items-center justify-center p-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors group"
                  >
                    <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span className="font-semibold">X (Twitter)</span>
                  </a>

                  {/* Instagram */}
                  <a
                    href="#"
                    className="flex items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all group"
                  >
                    <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                    <span className="font-semibold">Instagram</span>
                  </a>

                  {/* LinkedIn */}
                  <a
                    href="#"
                    className="flex items-center justify-center p-4 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors group"
                  >
                    <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <span className="font-semibold">LinkedIn</span>
                  </a>
                </div>

                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    📱 Mobil uygulamalarımızı da indirebilirsiniz
                  </p>
                  <div className="flex justify-center space-x-4 mt-3">
                    <a href="#" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      App Store
                    </a>
                    <a href="#" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Google Play
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Contact Section */}
      <section id="iletisim" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              İletişim
            </h2>
            <p className="text-lg text-gray-600">
              Bizimle iletişime geçin
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-900">İletişim Bilgileri</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-primary-600 mr-3" />
                  <span className="text-gray-900">Fidanlık Mahallesi Adakale Sokak No:25/24 Çankaya/Ankara</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-primary-600 mr-3" />
                  <span className="text-gray-900">0850 840 0674</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-primary-600 mr-3" />
                  <span className="text-gray-900">bilgi@kamuulasimsen.org</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-6 text-gray-900">Bize Yazın</h3>
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Mesaj
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  ></textarea>
                </div>
                <button type="submit" className="btn-primary w-full">
                  Mesaj Gönder
                </button>
              </form>
            </div>
          </div>
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
                <li><a href="#hakkimizda" className="text-gray-300 hover:text-white">Hakkımızda</a></li>
                <li><a href="/yonetim" className="text-gray-300 hover:text-white">Yönetim</a></li>
                <li><a href="/subelerimiz" className="text-gray-300 hover:text-white">Şubelerimiz</a></li>
                <li><a href="/haberler" className="text-gray-300 hover:text-white">Haberler</a></li>
                <li><a href="#iletisim" className="text-gray-300 hover:text-white">İletişim</a></li>
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
