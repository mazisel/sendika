'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { Logger } from '@/lib/logger'
import Link from 'next/link'
import { Edit, Trash2, Plus, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react'

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

export default function SlidersPage() {
  const [sliders, setSliders] = useState<Slider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    AdminAuth.requireAuth()
    loadSliders()
  }, [])

  const loadSliders = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sliders')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setSliders(data || [])
    } catch (error: any) {
      setError('Slider\'lar yüklenirken hata oluştu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sliders')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      setSliders(sliders.map(slider =>
        slider.id === id ? { ...slider, is_active: !currentStatus } : slider
      ))

      const currentUser = AdminAuth.getCurrentUser();
      await Logger.log({
        action: 'UPDATE',
        entityType: 'System' as any,
        entityId: id,
        details: {
          change: 'status_toggle',
          new_status: !currentStatus,
          slider_title: sliders.find(s => s.id === id)?.title
        },
        userId: currentUser?.id
      });
    } catch (error: any) {
      setError('Durum güncellenirken hata oluştu: ' + error.message)
    }
  }

  const updateSortOrder = async (id: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('sliders')
        .update({ sort_order: newOrder })
        .eq('id', id)

      if (error) throw error
      loadSliders() // Yeniden yükle
    } catch (error: any) {
      setError('Sıralama güncellenirken hata oluştu: ' + error.message)
    }
  }

  const moveUp = (slider: Slider) => {
    const currentIndex = sliders.findIndex(s => s.id === slider.id)
    if (currentIndex > 0) {
      const prevSlider = sliders[currentIndex - 1]
      updateSortOrder(slider.id, prevSlider.sort_order)
      updateSortOrder(prevSlider.id, slider.sort_order)
    }
  }

  const moveDown = (slider: Slider) => {
    const currentIndex = sliders.findIndex(s => s.id === slider.id)
    if (currentIndex < sliders.length - 1) {
      const nextSlider = sliders[currentIndex + 1]
      updateSortOrder(slider.id, nextSlider.sort_order)
      updateSortOrder(nextSlider.id, slider.sort_order)
    }
  }

  const deleteSlider = async (id: string) => {
    if (!confirm('Bu slider\'ı silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('sliders')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSliders(sliders.filter(slider => slider.id !== id))

      const currentUser = AdminAuth.getCurrentUser();
      await Logger.log({
        action: 'DELETE',
        entityType: 'System' as any,
        entityId: id,
        details: { slider_title: sliders.find(s => s.id === id)?.title },
        userId: currentUser?.id
      });
    } catch (error: any) {
      setError('Slider silinirken hata oluştu: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Slider'lar yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Slider Yönetimi</h1>
              <p className="mt-2 text-gray-600">Anasayfa slider'larını yönetin</p>
            </div>
            <Link
              href="/admin/sliders/new"
              className="btn-primary flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yeni Slider
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {sliders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Henüz slider bulunmuyor.</p>
              <Link
                href="/admin/sliders/new"
                className="btn-primary mt-4 inline-flex items-center"
              >
                <Plus className="w-5 h-5 mr-2" />
                İlk Slider'ı Oluştur
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Görsel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlık
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Açıklama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sıralama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sliders.map((slider, index) => (
                    <tr key={slider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {slider.image_url ? (
                          <img
                            src={slider.image_url}
                            alt={slider.title}
                            className="h-16 w-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="h-16 w-24 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs">Görsel Yok</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {slider.title}
                        </div>
                        {slider.button_text && (
                          <div className="text-sm text-gray-500">
                            Buton: {slider.button_text}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {slider.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleActive(slider.id, slider.is_active)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${slider.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {slider.is_active ? (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Pasif
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">{slider.sort_order}</span>
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveUp(slider)}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveDown(slider)}
                              disabled={index === sliders.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/admin/sliders/edit/${slider.id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => deleteSlider(slider.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
