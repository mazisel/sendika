'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Management } from '@/lib/types'
import { Phone, Mail, MapPin, User } from 'lucide-react'
import Link from 'next/link'

export default function ManagementPublicPage() {
  const [management, setManagement] = useState<Management[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadManagement()
  }, [])

  const loadManagement = async () => {
    try {
      const { data, error } = await supabase
        .from('management')
        .select('*')
        .eq('is_active', true)
        .order('position_order', { ascending: true })

      if (!error && data) {
        setManagement(data)
      }
    } catch (error) {
      console.error('Yönetim verileri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Hero Section */}
      <section className="header-gradient text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-xl md:text-2xl font-bold mb-4">
            Yönetim Kadromuz
          </h1>
          <p className="text-base md:text-lg text-blue-100 max-w-3xl mx-auto">
            Sendikamızı yöneten deneyimli ve kararlı yönetim kadromuzla tanışın
          </p>
        </div>
      </section>

      {/* Management Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
            </div>
          ) : management.length > 0 ? (
            <div className="space-y-12">
              {/* Genel Başkan (position_order = 0) */}
              {management.filter(member => member.position_order === 0).length > 0 && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Genel Başkan</h2>
                    <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
                  </div>
                  <div className="flex justify-center">
                    {management.filter(member => member.position_order === 0).map((member) => (
                      <div key={member.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow w-96">
                        <div className="aspect-w-3 aspect-h-4">
                          {member.image_url ? (
                            <img
                              src={member.image_url}
                              alt={member.full_name}
                              className="w-48 h-48 object-cover rounded-full mx-auto"
                            />
                          ) : (
                            <div className="w-48 h-48 bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center rounded-full mx-auto">
                              <User className="w-16 h-16 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-6 text-center">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {member.full_name}
                          </h3>
                          <p className="text-primary-600 font-semibold mb-4">
                            {member.title}
                          </p>
                          {member.bio && (
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {member.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diğer Yöneticiler (position_order > 0) */}
              {management.filter(member => member.position_order > 0).length > 0 && (
                <div>
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Yönetim Kurulu</h2>
                    <div className="w-24 h-1 bg-primary-600 mx-auto"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {management.filter(member => member.position_order > 0).map((member) => (
                      <div key={member.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                        <div className="aspect-w-3 aspect-h-4">
                          {member.image_url ? (
                            <img
                              src={member.image_url}
                              alt={member.full_name}
                              className="w-48 h-48 object-cover rounded-full mx-auto"
                            />
                          ) : (
                            <div className="w-48 h-48 bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center rounded-full mx-auto">
                              <User className="w-16 h-16 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="p-6 text-center">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {member.full_name}
                          </h3>
                          <p className="text-primary-600 font-semibold mb-4">
                            {member.title}
                          </p>
                          {member.bio && (
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {member.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <User className="mx-auto h-24 w-24 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Yönetim Bilgisi Bulunamadı
              </h3>
              <p className="text-gray-500">
                Şu anda görüntülenecek yönetim bilgisi bulunmamaktadır.
              </p>
            </div>
          )}
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
                  <span className="text-gray-900">Merkez Mahallesi, Atatürk Caddesi No:123, İstanbul</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-5 h-5 text-primary-600 mr-3" />
                  <span className="text-gray-900">+90 212 555 0123</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-primary-600 mr-3" />
                  <span className="text-gray-900">info@sendika.org.tr</span>
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
                <li><Link href="#iletisim" className="text-gray-300 hover:text-white">İletişim</Link></li>
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
