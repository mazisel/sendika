'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { uploadFile } from '@/lib/storage'
import { Management } from '@/lib/types'
import { ArrowLeft, Upload, User } from 'lucide-react'
import Link from 'next/link'

export default function EditManagementPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    title: '',
    position_order: 0,
    bio: '',
    is_active: true
  })

  useEffect(() => {
    AdminAuth.requireAuth()
    loadManagement()
  }, [])

  const loadManagement = async () => {
    try {
      const { data, error } = await supabase
        .from('management')
        .select('*')
        .eq('id', params.id)
        .single()

      if (!error && data) {
        setFormData({
          full_name: data.full_name,
          title: data.title,
          position_order: data.position_order,
          bio: data.bio || '',
          is_active: data.is_active
        })
        setImagePreview(data.image_url)
      }
    } catch (error) {
      console.error('Yönetici verileri yüklenirken hata:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let imageUrl = imagePreview

      // Yeni resim yükleme
      if (imageFile) {
        const uploadResult = await uploadFile(imageFile, 'management')
        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url
        }
      }

      // Yönetici güncelleme
      const { error } = await supabase
        .from('management')
        .update({
          ...formData,
          image_url: imageUrl || null
        })
        .eq('id', params.id)

      if (error) {
        throw error
      }

      router.push('/admin/management')
    } catch (error) {
      console.error('Yönetici güncellenirken hata:', error)
      alert('Yönetici güncellenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/management"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Yönetim Listesi
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Yönetici Düzenle</h1>
          <p className="mt-2 text-gray-600">Yönetici bilgilerini güncelleyin</p>
        </div>

        <div className="bg-white shadow-sm rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Fotoğraf Yükleme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fotoğraf
              </label>
              <div className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                  {imagePreview ? (
                    <img
                      className="h-24 w-24 rounded-full object-cover"
                      src={imagePreview}
                      alt="Önizleme"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-300 flex items-center justify-center">
                      <User className="h-12 w-12 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Fotoğraf Değiştir
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    PNG, JPG, GIF formatlarında maksimum 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* Ad Soyad */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad *
              </label>
              <input
                type="text"
                id="full_name"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            {/* Ünvan */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Ünvan *
              </label>
              <input
                type="text"
                id="title"
                required
                placeholder="Örn: Başkan, Genel Sekreter, Yönetim Kurulu Üyesi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Sıra */}
            <div>
              <label htmlFor="position_order" className="block text-sm font-medium text-gray-700 mb-2">
                Sıra
              </label>
              <input
                type="number"
                id="position_order"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.position_order}
                onChange={(e) => setFormData({ ...formData, position_order: parseInt(e.target.value) || 0 })}
              />
              <p className="mt-1 text-sm text-gray-500">
                Yöneticilerin sıralanma düzeni (0 = en üst)
              </p>
            </div>

            {/* Biyografi */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Biyografi
              </label>
              <textarea
                id="bio"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Yönetici hakkında kısa bilgi..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            {/* Durum */}
            <div className="flex items-center">
              <input
                id="is_active"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                Aktif
              </label>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Link
                href="/admin/management"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
