'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Save, MapPin, Phone, Mail, User, Building, Loader2, Search, Check } from 'lucide-react'
import { cityOptions, findCityByName } from '@/lib/cities'
import { Logger } from '@/lib/logger'
import { AdminAuth } from '@/lib/auth'
import { AdminUser, Member, Region } from '@/lib/types'

interface BranchFormData {
  city: string
  city_code: string
  branch_name: string
  president_name: string
  president_phone: string
  president_email: string
  address: string
  coordinates_lat: string
  coordinates_lng: string
  is_active: boolean
  region_id: string
  responsible_id: string
}

export default function NewBranchPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<BranchFormData>({
    city: '',
    city_code: '',
    branch_name: '',
    president_name: '',
    president_phone: '',
    president_email: '',
    address: '',
    coordinates_lat: '',
    coordinates_lng: '',
    is_active: true,
    region_id: '',
    responsible_id: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [regions, setRegions] = useState<Region[]>([])

  // Member Search
  const [members, setMembers] = useState<Member[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    const user = AdminAuth.getCurrentUser()
    setCurrentUser(user)
    fetchAuxData()
  }, [])

  const fetchAuxData = async () => {
    try {
      // Fetch available regions
      const { data: regionData } = await supabase.from('regions').select('*').order('name')
      setRegions(regionData || [])
    } catch (err) {
      console.error(err)
    }
  }

  // Search members
  useEffect(() => {
    const searchMembers = async () => {
      if (memberSearch.length < 2) return;
      setLoadingMembers(true);
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('is_active', true)
          .or(`first_name.ilike.%${memberSearch}%,last_name.ilike.%${memberSearch}%,tc_identity.ilike.%${memberSearch}%`)
          .limit(20);

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoadingMembers(false);
      }
    };

    const timeoutId = setTimeout(searchMembers, 500);
    return () => clearTimeout(timeoutId);
  }, [memberSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Koordinatları sayıya çevir
      const coordinates_lat = formData.coordinates_lat ? parseFloat(formData.coordinates_lat) : null
      const coordinates_lng = formData.coordinates_lng ? parseFloat(formData.coordinates_lng) : null

      const payload = {
        ...formData,
        coordinates_lat,
        coordinates_lng,
        city_code: formData.city_code || findCityByName(formData.city)?.code || '',
        region_id: formData.region_id || null,
        responsible_id: formData.responsible_id || null
      }

      if (!payload.city) {
        throw new Error('Lütfen bir şehir seçiniz.')
      }

      const { error } = await supabase
        .from('branches')
        .insert([payload])

      if (error) throw error

      alert('Şube başarıyla eklendi!')

      const currentUser = AdminAuth.getCurrentUser();
      await Logger.log({
        action: 'CREATE',
        entityType: 'SETTINGS',
        entityId: payload.city_code || 'new_branch',
        details: { branch: payload },
        userId: currentUser?.id
      });

      router.push('/admin/branches')
    } catch (error: any) {
      setError('Şube eklenirken hata oluştu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleCitySelect = (value: string) => {
    if (!value) {
      setFormData(prev => ({
        ...prev,
        city: '',
        city_code: ''
      }))
      return
    }
    const selectedCity = findCityByName(value)

    setFormData(prev => ({
      ...prev,
      city: value,
      city_code: selectedCity?.code ?? ''
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Geri
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Yeni Şube Ekle</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Yeni bir sendika şubesi ekleyin
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 shadow-lg rounded-lg border border-gray-200 dark:border-gray-800">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Şehir Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
                  Şehir Bilgileri
                </h3>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şehir *
                  </label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={(e) => handleCitySelect(e.target.value)}
                    required
                    disabled={currentUser?.role_type === 'branch_manager'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Şehir seçiniz</option>
                    {cityOptions.map((city) => (
                      <option key={city.code} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="city_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plaka Kodu *
                  </label>
                  <input
                    type="text"
                    id="city_code"
                    name="city_code"
                    value={formData.city_code}
                    readOnly
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
                    placeholder="34"
                  />
                </div>

                <div>
                  <label htmlFor="region_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bölge
                  </label>
                  <select
                    id="region_id"
                    name="region_id"
                    value={formData.region_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Bölge seçiniz</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Şube Sorumlusu (Member) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şube Sorumlusu (Sistem Kullanıcısı - Üye Ara)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Sorumlu aramak için Ad, Soyad veya TC girin..."
                      className="pl-10 w-full rounded-lg border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors py-2.5"
                    />
                    {loadingMembers && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Results */}
                  {memberSearch.length >= 2 && members.length > 0 && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-lg">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => {
                            setFormData({ ...formData, responsible_id: member.id });
                            setMemberSearch(`${member.first_name} ${member.last_name}`);
                            setMembers([]); // Close list
                          }}
                          className={`px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 flex justify-between items-center ${formData.responsible_id === member.id ? 'bg-blue-50 dark:bg-slate-700' : ''}`}
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              TC: {member.tc_identity} - {member.city}
                            </div>
                          </div>
                          {formData.responsible_id === member.id && <Check className="w-4 h-4 text-blue-600" />}
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.responsible_id && (
                    <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center">
                      <Check className="w-4 h-4 mr-1" />
                      Seçilen: {memberSearch}
                      <button type="button" onClick={() => { setFormData({ ...formData, responsible_id: '' }); setMemberSearch('') }} className="ml-2 text-red-500 hover:text-red-700 text-xs">Kaldır</button>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Bu şubeden sorumlu olacak kişiyi seçin. (İsteğe bağlı)
                  </p>
                </div>

                <div>
                  <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şube Adı *
                  </label>
                  <input
                    type="text"
                    id="branch_name"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="İstanbul Şubesi"
                  />
                </div>
              </div>

              {/* Başkan Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
                  Şube Başkanı (İletişim)
                </h3>

                <div>
                  <label htmlFor="president_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Başkan Adı *
                  </label>
                  <input
                    type="text"
                    id="president_name"
                    name="president_name"
                    value={formData.president_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="Ahmet Yılmaz"
                  />
                </div>

                <div>
                  <label htmlFor="president_phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    id="president_phone"
                    name="president_phone"
                    value={formData.president_phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="0212 555 0123"
                  />
                </div>

                <div>
                  <label htmlFor="president_email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    id="president_email"
                    name="president_email"
                    value={formData.president_email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    placeholder="ahmet@sendika.org.tr"
                  />
                </div>
              </div>
            </div>

            {/* Adres */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adres
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                placeholder="Fatih Mahallesi, Atatürk Caddesi No:45, Fatih/İstanbul"
              />
            </div>

            {/* Koordinatlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="coordinates_lat" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Enlem (Latitude)
                </label>
                <input
                  type="number"
                  step="any"
                  id="coordinates_lat"
                  name="coordinates_lat"
                  value={formData.coordinates_lat}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="41.0082"
                />
              </div>

              <div>
                <label htmlFor="coordinates_lng" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Boylam (Longitude)
                </label>
                <input
                  type="number"
                  step="any"
                  id="coordinates_lng"
                  name="coordinates_lng"
                  value={formData.coordinates_lng}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  placeholder="28.9784"
                />
              </div>
            </div>

            {/* Durum */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Şube aktif</span>
              </label>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-800">
              <a
                href="/admin/branches"
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                İptal
              </a>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>

        {/* Yardım Metni */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">💡 İpucu</h4>
          <p className="text-sm text-blue-700 dark:text-blue-200">
            Koordinatları bulmak için Google Maps'te şube konumuna sağ tıklayıp koordinatları kopyalayabilirsiniz.
            Koordinatlar harita üzerinde şube konumunu göstermek için kullanılır.
          </p>
        </div>
      </div>
    </div>
  )
}
