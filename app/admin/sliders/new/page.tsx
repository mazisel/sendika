'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { uploadFile } from '@/lib/storage'

export default function NewSliderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    button_text: '',
    is_active: true,
    sort_order: 1
  })

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

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData({ ...formData, image_url: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!AdminAuth.isAuthenticated()) {
      router.push('/admin/login')
      return
    }

    setLoading(true)
    setError('')

    try {
      let imageUrl = formData.image_url

      // Resim yükleme
      if (imageFile) {
        const uploadResult = await uploadFile(imageFile, 'images')
        if (!uploadResult.success || uploadResult.error) {
          throw new Error(uploadResult.error || 'Dosya yükleme hatası')
        }
        imageUrl = uploadResult.url || ''
      }

      // En yüksek sort_order'ı bul
      const { data: existingSliders } = await supabase
        .from('sliders')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextSortOrder = existingSliders && existingSliders.length > 0 
        ? existingSliders[0].sort_order + 1 
        : 1

      const { error: insertError } = await supabase
        .from('sliders')
        .insert([
          {
            ...formData,
            image_url: imageUrl,
            sort_order: nextSortOrder
          }
        ])

      if (insertError) throw insertError

      router.push('/admin/sliders')
    } catch (error: any) {
      setError('Slider oluşturulurken hata oluştu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/admin/sliders"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Slider Listesine Dön
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Yeni Slider Oluştur</h1>
          <p className="mt-2 text-gray-600">Anasayfa için yeni bir slider ekleyin</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Başlık */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Başlık *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Slider başlığını girin"
              />
            </div>

            {/* Açıklama */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Slider açıklamasını girin"
              />
            </div>

            {/* Görsel Yükleme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slider Görseli
              </label>
              
              {!imagePreview && !formData.image_url ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Görsel yüklemek için tıklayın
                        </span>
                        <input
                          id="image-upload"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPG, GIF dosyaları desteklenir
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview || formData.image_url}
                    alt="Slider görseli"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Manuel URL girişi */}
              <div className="mt-4">
                <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-2">
                  Veya Görsel URL'si Girin
                </label>
                <input
                  type="url"
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Link URL */}
            <div>
              <label htmlFor="link_url" className="block text-sm font-medium text-gray-700 mb-2">
                Link URL
              </label>
              <input
                type="url"
                id="link_url"
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://example.com"
              />
              <p className="mt-1 text-sm text-gray-500">
                Slider'a tıklandığında yönlendirilecek sayfa
              </p>
            </div>

            {/* Buton Metni */}
            <div>
              <label htmlFor="button_text" className="block text-sm font-medium text-gray-700 mb-2">
                Buton Metni
              </label>
              <input
                type="text"
                id="button_text"
                value={formData.button_text}
                onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Daha Fazla Bilgi"
              />
            </div>

            {/* Durum */}
            <div>
              <div className="flex items-center">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Slider aktif olsun
                </label>
              </div>
            </div>

            {/* Form Butonları */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Link
                href="/admin/sliders"
                className="btn-secondary"
              >
                İptal
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Oluşturuluyor...' : 'Slider Oluştur'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
