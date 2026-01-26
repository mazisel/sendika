'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { Logger } from '@/lib/logger'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { uploadFile, StorageService } from '@/lib/storage'

interface Slider {
  id: string
  title: string
  description: string
  image_url: string
  link_url: string
  button_text: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export default function EditSliderPage() {
  const router = useRouter()
  const params = useParams()
  const sliderId = params.id as string

  const [loading, setLoading] = useState(false)
  const [loadingSlider, setLoadingSlider] = useState(true)
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

  useEffect(() => {
    AdminAuth.requireAuth()
    loadSlider()

    // Admin kullanıcısının Supabase auth durumunu kontrol et
    const checkAuthStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Supabase auth kullanıcısı:', user)

      if (!user) {
        console.log('Supabase auth kullanıcısı bulunamadı, yeniden giriş gerekiyor')
        setError('Lütfen çıkış yapıp tekrar giriş yapın')
      }
    }

    checkAuthStatus()
  }, [sliderId])

  const loadSlider = async () => {
    try {
      setLoadingSlider(true)
      const { data, error } = await supabase
        .from('sliders')
        .select('*')
        .eq('id', sliderId)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          image_url: data.image_url || '',
          link_url: data.link_url || '',
          button_text: data.button_text || '',
          is_active: data.is_active,
          sort_order: data.sort_order
        })
      }
    } catch (error: any) {
      setError('Slider yüklenirken hata oluştu: ' + error.message)
    } finally {
      setLoadingSlider(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Dosya validasyonu
      const validation = StorageService.validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Geçersiz dosya')
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setError('') // Hata mesajını temizle
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

    // Form validasyonu
    if (!formData.title.trim()) {
      setError('Başlık alanı zorunludur')
      return
    }

    setLoading(true)
    setError('')

    try {
      let imageUrl = formData.image_url

      // Yeni resim yükleme
      if (imageFile) {
        console.log('Yeni resim yükleniyor...', imageFile.name)
        const uploadResult = await uploadFile(imageFile, 'images')
        console.log('Resim yükleme sonucu:', uploadResult)
        if (!uploadResult.success || uploadResult.error) {
          throw new Error(uploadResult.error || 'Dosya yükleme hatası')
        }
        imageUrl = uploadResult.url || ''
        console.log('Yeni resim URL:', imageUrl)
      }

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        image_url: imageUrl,
        link_url: formData.link_url.trim(),
        button_text: formData.button_text.trim(),
        is_active: formData.is_active,
        sort_order: formData.sort_order
      }

      console.log('Güncelleme verisi:', updateData)
      console.log('Slider ID:', sliderId)

      // Normal client ile güncelleme yapıyoruz
      const { data, error: updateError } = await supabase
        .from('sliders')
        .update(updateData)
        .eq('id', sliderId)
        .select()

      console.log('Supabase güncelleme sonucu:', { data, error: updateError })

      if (updateError) {
        console.error('Supabase güncelleme hatası:', updateError)
        throw updateError
      }

      if (!data || data.length === 0) {
        throw new Error('Slider bulunamadı veya güncelleme başarısız')
      }

      console.log('Güncellenen slider:', data[0])
      router.push('/admin/sliders')

      const currentUser = AdminAuth.getCurrentUser();
      await Logger.log({
        action: 'UPDATE',
        entityType: 'System' as any,
        entityId: sliderId,
        details: { slider: updateData },
        userId: currentUser?.id
      });
    } catch (error: any) {
      console.error('Slider güncelleme hatası:', error)
      setError('Slider güncellenirken hata oluştu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loadingSlider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Slider yükleniyor...</p>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">Slider Düzenle</h1>
          <p className="mt-2 text-gray-600">Slider bilgilerini güncelleyin</p>
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
                      PNG, JPG, GIF, WebP dosyaları desteklenir (Max 5MB)
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

            {/* Sıralama */}
            <div>
              <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-2">
                Sıralama
              </label>
              <input
                type="number"
                id="sort_order"
                min="1"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 1 })}
                onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="1"
              />
              <p className="mt-1 text-sm text-gray-500">
                Slider'ın görüntülenme sırası (küçük sayılar önce görünür)
              </p>
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
                {loading ? 'Güncelleniyor...' : 'Slider Güncelle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
