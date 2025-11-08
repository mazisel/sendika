'use client'

import { useState, useEffect, useMemo } from 'react'
import { ArrowLeft, Save, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cityOptions, regionOptions, findCityByName } from '@/lib/cities'

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
  region: string
}

export default function EditBranchPage({ params }: { params: { id: string } }) {
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
    region: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cityOptionsWithFallback = useMemo(() => {
    if (!formData.city) {
      return cityOptions
    }
    const exists = cityOptions.some(option => option.name === formData.city)
    if (exists) {
      return cityOptions
    }
    return [
      { name: formData.city, code: formData.city_code || '00' },
      ...cityOptions
    ]
  }, [formData.city, formData.city_code])

  useEffect(() => {
    loadBranch()
  }, [])

  const loadBranch = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          city: data.city || '',
          city_code: data.city_code || '',
          branch_name: data.branch_name || '',
          president_name: data.president_name || '',
          president_phone: data.president_phone || '',
          president_email: data.president_email || '',
          address: data.address || '',
          coordinates_lat: data.coordinates_lat ? data.coordinates_lat.toString() : '',
          coordinates_lng: data.coordinates_lng ? data.coordinates_lng.toString() : '',
          is_active: data.is_active,
          region: data.region ? data.region.toString() : ''
        })
      }
    } catch (error: any) {
      setError('Şube yüklenirken hata oluştu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // Koordinatları sayıya çevir
      const coordinates_lat = formData.coordinates_lat ? parseFloat(formData.coordinates_lat) : null
      const coordinates_lng = formData.coordinates_lng ? parseFloat(formData.coordinates_lng) : null

      const regionValue = formData.region ? parseInt(formData.region, 10) : null

      if (!regionValue || regionValue < 1 || regionValue > 8) {
        throw new Error('Lütfen geçerli bir bölge seçiniz.')
      }

      const payload = {
        ...formData,
        coordinates_lat,
        coordinates_lng,
        city_code: formData.city_code || findCityByName(formData.city)?.code || '',
        region: regionValue
      }

      if (!payload.city) {
        throw new Error('Lütfen bir şehir seçiniz.')
      }

      if (!payload.city_code) {
        throw new Error('Seçilen şehir için plaka kodu bulunamadı.')
      }

      const { error } = await supabase
        .from('branches')
        .update(payload)
        .eq('id', params.id)

      if (error) throw error

      alert('Şube başarıyla güncellendi!')
      window.location.href = '/admin/branches'
    } catch (error: any) {
      setError('Şube güncellenirken hata oluştu: ' + error.message)
    } finally {
      setSaving(false)
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

  const handleRegionSelect = (value: string) => {
    setFormData(prev => ({
      ...prev,
      region: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Şube yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <a
              href="/admin/branches"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Geri
            </a>
            <h1 className="text-3xl font-bold text-gray-900">Şube Düzenle</h1>
          </div>
          <p className="text-gray-600">
            Şube bilgilerini güncelleyin
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Şehir Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Şehir Bilgileri
                </h3>
                
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    Şehir *
                  </label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={(e) => handleCitySelect(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Şehir seçiniz</option>
                    {cityOptionsWithFallback.map((city) => (
                      <option key={city.code} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="city_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Plaka Kodu *
                  </label>
                  <input
                    type="text"
                    id="city_code"
                    name="city_code"
                    value={formData.city_code}
                    readOnly
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                    placeholder="34"
                  />
                  <p className="text-xs text-gray-500 mt-1">Plaka kodu seçilen şehre göre otomatik güncellenir.</p>
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                    Bölge *
                  </label>
                  <select
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={(e) => handleRegionSelect(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Bölge seçiniz</option>
                    {regionOptions.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Şube Adı *
                  </label>
                  <input
                    type="text"
                    id="branch_name"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="İstanbul Şubesi"
                  />
                </div>
              </div>

              {/* Başkan Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Başkan Bilgileri
                </h3>
                
                <div>
                  <label htmlFor="president_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Başkan Adı *
                  </label>
                  <input
                    type="text"
                    id="president_name"
                    name="president_name"
                    value={formData.president_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ahmet Yılmaz"
                  />
                </div>

                <div>
                  <label htmlFor="president_phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    id="president_phone"
                    name="president_phone"
                    value={formData.president_phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0212 555 0123"
                  />
                </div>

                <div>
                  <label htmlFor="president_email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    id="president_email"
                    name="president_email"
                    value={formData.president_email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ahmet@sendika.org.tr"
                  />
                </div>
              </div>
            </div>

            {/* Adres */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Fatih Mahallesi, Atatürk Caddesi No:45, Fatih/İstanbul"
              />
            </div>

            {/* Koordinatlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="coordinates_lat" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="41.0082"
                />
              </div>

              <div>
                <label htmlFor="coordinates_lng" className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <span className="ml-2 text-sm text-gray-700">Şube aktif</span>
              </label>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <a
                href="/admin/branches"
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                İptal
              </a>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </form>
        </div>

        {/* Yardım Metni */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 İpucu</h4>
          <p className="text-sm text-blue-700">
            Koordinatları bulmak için Google Maps'te şube konumuna sağ tıklayıp koordinatları kopyalayabilirsiniz.
            Koordinatlar harita üzerinde şube konumunu göstermek için kullanılır.
          </p>
        </div>
      </div>
    </div>
  )
}
