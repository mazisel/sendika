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

      if (!payload.responsible_id) {
        throw new Error('Lütfen şube sorumlusunu (Başkanı) seçiniz.')
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

      router.push('/admin/branches?tab=branches')
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
              onClick={() => router.push('/admin/branches?tab=branches')}
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
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Şehir *
                </label>
                <select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={(e) => handleCitySelect(e.target.value)}
                  required
                  disabled={currentUser?.role_type === 'branch_manager'}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                <label htmlFor="city_code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Plaka Kodu *
                </label>
                <input
                  type="text"
                  id="city_code"
                  name="city_code"
                  value={formData.city_code}
                  readOnly
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  placeholder="34"
                />
              </div>

              <div>
                <label htmlFor="region_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bölge
                </label>
                <select
                  id="region_id"
                  name="region_id"
                  value={formData.region_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Şube Sorumlusu (Başkan) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Ad, Soyad veya TC ile ara..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none pl-10"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                  {loadingMembers && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>

                {!formData.responsible_id ? (
                  <p className="mt-1 text-xs text-slate-500">Şube başkanı olarak atanacak üyeyi seçiniz.</p>
                ) : (
                  <div className="mt-2 p-3 border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400 font-bold mr-3">
                        {formData.president_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {formData.president_name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col">
                          <span>{formData.president_phone}</span>
                          <span>{formData.president_email}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          responsible_id: '',
                          president_name: '',
                          president_email: '',
                          president_phone: ''
                        });
                        setMemberSearch('');
                      }}
                      className="text-red-500 hover:text-red-700 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded text-sm transition-colors"
                    >
                      Değiştir
                    </button>
                  </div>
                )}

                {/* Results */}
                {memberSearch.length >= 2 && members.length > 0 && !formData.responsible_id && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-lg z-10">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            responsible_id: member.id,
                            president_name: `${member.first_name} ${member.last_name}`,
                            president_email: member.email || '',
                            president_phone: member.phone || ''
                          });
                          setMemberSearch('');
                          setMembers([]);
                        }}
                        className="px-4 py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-white">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              TC: {member.tc_identity} - {member.city}/{member.district}
                            </div>
                          </div>
                          <Check className="w-4 h-4 text-slate-300 hover:text-blue-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="branch_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Şube Adı *
                </label>
                <input
                  type="text"
                  id="branch_name"
                  name="branch_name"
                  value={formData.branch_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  placeholder="İstanbul Şubesi"
                />
              </div>
            </div>

            {/* Adres */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Adres
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                placeholder="Fatih Mahallesi, Atatürk Caddesi No:45, Fatih/İstanbul"
              />
            </div>

            {/* Koordinatlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="coordinates_lat" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enlem (Latitude)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="any"
                    id="coordinates_lat"
                    name="coordinates_lat"
                    value={formData.coordinates_lat}
                    onChange={handleChange}
                    className="no-spinner w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="41.0082"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="coordinates_lng" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Boylam (Longitude)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="any"
                    id="coordinates_lng"
                    name="coordinates_lng"
                    value={formData.coordinates_lng}
                    onChange={handleChange}
                    className="no-spinner w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="28.9784"
                  />
                </div>
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
                  className="rounded border-slate-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">Şube aktif</span>
              </label>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => router.push('/admin/branches?tab=branches')}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Kaydet
                  </>
                )}
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
