'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, MapPin, Phone, Mail, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { AdminUser } from '@/lib/types'
import { Logger } from '@/lib/logger'

interface Branch {
  id: string
  city: string
  city_code: string
  region: number
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
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)

  useEffect(() => {
    const user = AdminAuth.getCurrentUser()
    setCurrentUser(user)
    loadBranches(user)
  }, [])

  const loadBranches = async (user?: AdminUser | null) => {
    try {
      setLoading(true)
      let query = supabase
        .from('branches')
        .select('*')
        .order('city', { ascending: true })

      const viewer = user ?? currentUser
      if (viewer?.role_type === 'regional_manager' && viewer.region) {
        query = query.eq('region', viewer.region)
      } else if (viewer?.role_type === 'branch_manager' && viewer.city) {
        query = query.eq('city', viewer.city)
      }

      const { data, error } = await query

      if (error) throw error
      setBranches(data || [])
    } catch (error: any) {
      setError('Şubeler yüklenirken hata oluştu: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteBranch = async (id: string) => {
    if (!confirm('Bu şubeyi silmek istediğinizden emin misiniz?')) return

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id)

      if (error) throw error

      setBranches(branches.filter(branch => branch.id !== id))

      await Logger.log({
        action: 'DELETE',
        entityType: 'SETTINGS',
        entityId: id,
        details: {
          branch_name: branches.find(b => b.id === id)?.branch_name,
          city: branches.find(b => b.id === id)?.city
        },
        userId: currentUser?.id
      });
      alert('Şube başarıyla silindi!')
    } catch (error: any) {
      alert('Şube silinirken hata oluştu: ' + error.message)
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      setBranches(branches.map(branch =>
        branch.id === id ? { ...branch, is_active: !currentStatus } : branch
      ))

      await Logger.log({
        action: 'UPDATE',
        entityType: 'SETTINGS',
        entityId: id,
        details: {
          change: 'status_toggle',
          new_status: !currentStatus,
          branch_name: branches.find(b => b.id === id)?.branch_name
        },
        userId: currentUser?.id
      });
    } catch (error: any) {
      alert('Durum güncellenirken hata oluştu: ' + error.message)
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Şubeler</h1>
              <p className="mt-2 text-gray-600">
                Sendika şubelerini yönetin
              </p>
            </div>
            <a
              href="/admin/branches/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Yeni Şube
            </a>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şehir
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bölge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Şube Adı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Başkan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İletişim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {branches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {branch.city_code}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {branch.city}
                          </div>
                          <div className="text-sm text-gray-500">
                            Plaka: {branch.city_code}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {branch.region ? `${branch.region}. Bölge` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {branch.branch_name}
                      </div>
                      {branch.address && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {branch.address.substring(0, 50)}...
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {branch.president_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {branch.president_phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="w-3 h-3 mr-1" />
                            {branch.president_phone}
                          </div>
                        )}
                        {branch.president_email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="w-3 h-3 mr-1" />
                            {branch.president_email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(branch.id, branch.is_active)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${branch.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {branch.is_active ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <a
                          href={`/admin/branches/edit/${branch.id}`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => deleteBranch(branch.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
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

          {branches.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Şube bulunamadı</h3>
              <p className="mt-1 text-sm text-gray-500">
                Henüz hiç şube eklenmemiş.
              </p>
              <div className="mt-6">
                <a
                  href="/admin/branches/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  İlk Şubeyi Ekle
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
