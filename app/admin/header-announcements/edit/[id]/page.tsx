'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { ArrowLeft, Save } from 'lucide-react'

export default function EditHeaderAnnouncementPage() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'urgent' as 'urgent' | 'info' | 'warning' | 'general',
    is_active: true,
    start_date: '',
    end_date: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const isAuthenticated = AdminAuth.isAuthenticated()
      if (!isAuthenticated) {
        router.push('/admin/login')
        return
      }
      await loadAnnouncement()
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/admin/login')
    }
  }

  const loadAnnouncement = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (!data) {
        setError('Header duyurusu bulunamadı')
        return
      }

      setFormData({
        title: data.title,
        content: data.content,
        type: data.type,
        is_active: data.is_active,
        start_date: new Date(data.start_date).toISOString().slice(0, 16),
        end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : ''
      })
    } catch (error) {
      console.error('Error loading announcement:', error)
      setError('Header duyurusu yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!AdminAuth.isAuthenticated()) {
      router.push('/admin/login')
      return
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Başlık ve içerik alanları zorunludur')
      return
    }

    try {
      setSaving(true)
      setError('')

      const announcementData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        is_active: formData.is_active,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('announcements')
        .update(announcementData)
        .eq('id', id)

      if (error) throw error

      router.push('/admin/header-announcements')
    } catch (error) {
      console.error('Error updating announcement:', error)
      setError('Header duyurusu güncellenirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => router.push('/admin/header-announcements')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Header Duyurusu Düzenle</h1>
              <p className="mt-2 text-gray-600">
                Ana sayfada header kısmında gösterilen acil duyuruyu düzenleyin
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-gray-500 hover:text-gray-700"
            >
              Dashboard
            </button>
            <span className="text-gray-300">/</span>
            <button
              onClick={() => router.push('/admin/header-announcements')}
              className="text-gray-500 hover:text-gray-700"
            >
              Header Duyuruları
            </button>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 font-medium">Düzenle</span>
          </nav>
        </div>

        {/* Form */}
        <div className="bg-white shadow-sm rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Başlık *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Header duyurusu başlığını girin"
                required
              />
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                İçerik *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Header duyurusu içeriğini girin"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Tip
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="urgent">Acil</option>
                <option value="warning">Uyarı</option>
                <option value="info">Bilgi</option>
                <option value="general">Genel</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Header duyuruları için genellikle "Acil" tipi kullanılır
              </p>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi *
                </label>
                <input
                  type="datetime-local"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi
                </label>
                <input
                  type="datetime-local"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Boş bırakılırsa süresiz olarak gösterilir
                </p>
              </div>
            </div>

            {/* Status */}
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Aktif durumda tut
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Aktif olmayan duyurular header'da gösterilmez
              </p>
            </div>

            {/* Preview */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Önizleme</h3>
              <div className="bg-primary-700 text-white py-2 px-4 rounded-md">
                <div className="flex items-center space-x-4">
                  <span className="bg-white text-primary-700 px-3 py-1 rounded text-sm font-semibold">
                    DUYURULAR
                  </span>
                  <div>
                    <span className="text-sm">
                      🔴 {formData.title || 'Duyuru başlığı buraya gelecek'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.push('/admin/header-announcements')}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Güncelleniyor...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Header Duyurusu Güncelle
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
