'use client'

import { useState, useEffect } from 'react'
import { MapPin, Users, Building, Phone, Mail, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import TurkeyMap from '@/components/TurkeyMap'

interface Branch {
  id: string
  city: string
  city_code: string
  region?: number
  branch_name: string
  president_name: string
  president_phone?: string
  president_email?: string
  address?: string
  coordinates_lat?: number
  coordinates_lng?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

  useEffect(() => {
    loadBranches()
  }, [])

  const getRegionLabel = (region?: number | null) => {
    if (!region) return null
    return `${region}. Bölge`
  }

  const loadBranches = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('city', { ascending: true })

      if (error) throw error
      setBranches(data || [])
    } catch (error: any) {
      console.error('Şubeler yüklenirken hata oluştu:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBranchClick = (branch: Branch) => {
    setSelectedBranch(branch)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Şubeler yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Sayfa Başlığı */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Şubelerimiz</h1>
              <p className="text-gray-600 mt-2">Türkiye genelindeki şube ağımız</p>
            </div>

            {/* Desktop: Görünüm Değiştirme */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Harita
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Building className="w-4 h-4 inline mr-2" />
                  Liste
                </button>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ana İçerik */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Toplam Şube</p>
                <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Aktif Şube Başkanı</p>
                <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Kapsanan İl</p>
                <p className="text-2xl font-bold text-gray-900">{new Set(branches.map(b => b.city)).size}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Harita veya Liste Görünümü */}
        {viewMode === 'map' ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Şube Haritası
              </h2>
              <p className="text-gray-600">
                Harita üzerindeki noktaları tıklayarak şube detaylarını görüntüleyebilirsiniz.
              </p>
            </div>
            
            <TurkeyMap 
              branches={branches} 
              onBranchClick={handleBranchClick}
            />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Şube Listesi
              </h2>
              <p className="text-gray-600 mt-1">
                Tüm aktif şubelerimizin detaylı listesi
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {branches.map((branch) => (
                <div key={branch.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-blue-600 font-bold text-sm">
                            {branch.city_code}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {branch.branch_name}
                          </h3>
                          <div className="flex items-center space-x-2 text-gray-600">
                            <span>{branch.city}</span>
                            {branch.region && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                                {getRegionLabel(branch.region)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-blue-600" />
                            Şube Başkanı
                          </h4>
                          <p className="text-gray-700 font-medium">{branch.president_name}</p>
                          
                          <div className="mt-2 space-y-1">
                            {branch.president_phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="w-3 h-3 mr-2" />
                                <a 
                                  href={`tel:${branch.president_phone}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {branch.president_phone}
                                </a>
                              </div>
                            )}
                            
                            {branch.president_email && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="w-3 h-3 mr-2" />
                                <a 
                                  href={`mailto:${branch.president_email}`}
                                  className="hover:text-blue-600 transition-colors"
                                >
                                  {branch.president_email}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {branch.address && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                              Adres
                            </h4>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {branch.address}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {branches.length === 0 && (
              <div className="text-center py-12">
                <Building className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Şube bulunamadı</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Henüz aktif şube bulunmuyor.
                </p>
              </div>
            )}
          </div>
        )}

        {/* İletişim Bilgisi */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-900">
                Şube Kurmak İstiyor musunuz?
              </h3>
              <p className="mt-2 text-blue-700">
                Bölgenizde henüz şubemiz yoksa ve şube kurmak istiyorsanız, 
                merkez ofisimizle iletişime geçebilirsiniz.
              </p>
              <div className="mt-4">
                <a
                  href="tel:+902125550123"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Merkez Ofisi Ara
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Kamu Ulaşım Sen</h3>
              <p className="text-gray-300">
                İşçi haklarını korumak ve geliştirmek için 1985'ten beri mücadele ediyoruz.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Hızlı Linkler</h4>
              <ul className="space-y-2">
                <li><a href="/#hakkimizda" className="text-gray-300 hover:text-white">Hakkımızda</a></li>
                <li><a href="/yonetim" className="text-gray-300 hover:text-white">Yönetim</a></li>
                <li><a href="/subelerimiz" className="text-gray-300 hover:text-white">Şubelerimiz</a></li>
                <li><a href="/haberler" className="text-gray-300 hover:text-white">Haberler</a></li>
                <li><a href="/#iletisim" className="text-gray-300 hover:text-white">İletişim</a></li>
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
