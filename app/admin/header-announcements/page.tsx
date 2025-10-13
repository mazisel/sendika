'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'

interface HeaderAnnouncement {
  id: string
  title: string
  content: string
  type: 'urgent' | 'info' | 'warning' | 'general'
  is_active: boolean
  start_date: string
  end_date: string | null
  created_at: string
  created_by: string
}

export default function HeaderAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<HeaderAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

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
      await loadAnnouncements()
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/admin/login')
    }
  }

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('type', 'urgent')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (error) {
      console.error('Error loading announcements:', error)
      setError('Header duyuruları yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      
      setAnnouncements(announcements.map(announcement => 
        announcement.id === id 
          ? { ...announcement, is_active: !currentStatus }
          : announcement
      ))
    } catch (error) {
      console.error('Error updating status:', error)
      setError('Durum güncellenirken hata oluştu')
    }
  }

  const deleteAnnouncement = async (id: string) => {
    if (!confirm('Bu header duyurusunu silmek istediğinizden emin misiniz?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setAnnouncements(announcements.filter(announcement => announcement.id !== id))
    } catch (error) {
      console.error('Error deleting announcement:', error)
      setError('Duyuru silinirken hata oluştu')
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'info': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'urgent': return 'Acil'
      case 'warning': return 'Uyarı'
      case 'info': return 'Bilgi'
      default: return 'Genel'
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Header Duyuruları</h1>
              <p className="mt-2 text-gray-600">
                Ana sayfada header kısmında gösterilen acil duyuruları yönetin
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/header-announcements/new')}
              className="btn-primary flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yeni Header Duyurusu
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

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
            <span className="text-gray-900 font-medium">Header Duyuruları</span>
          </nav>
        </div>

        {/* Announcements List */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📢</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Henüz header duyurusu yok
              </h3>
              <p className="text-gray-500 mb-6">
                İlk header duyurunuzu oluşturmak için aşağıdaki butona tıklayın.
              </p>
              <button
                onClick={() => router.push('/admin/header-announcements/new')}
                className="btn-primary"
              >
                İlk Header Duyurusunu Oluştur
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlık
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Başlangıç Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bitiş Tarihi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {announcements.map((announcement) => (
                    <tr key={announcement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {announcement.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {announcement.content}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(announcement.type)}`}>
                          {getTypeText(announcement.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleStatus(announcement.id, announcement.is_active)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            announcement.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {announcement.is_active ? (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(announcement.start_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {announcement.end_date 
                          ? new Date(announcement.end_date).toLocaleDateString('tr-TR')
                          : 'Belirsiz'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/admin/header-announcements/edit/${announcement.id}`)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteAnnouncement(announcement.id)}
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
