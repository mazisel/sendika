'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { Management } from '@/lib/types'
import { Logger } from '@/lib/logger'
import { Plus, Edit, Trash2, User, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function ManagementPage() {
  const [management, setManagement] = useState<Management[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AdminAuth.requireAuth()
    loadManagement()
  }, [])

  const loadManagement = async () => {
    try {
      const { data, error } = await supabase
        .from('management')
        .select('*')
        .order('position_order', { ascending: true })

      if (!error && data) {
        setManagement(data)
      }
    } catch (error) {
      console.error('Yönetim verileri yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('management')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (!error) {
        loadManagement()

        const currentUser = AdminAuth.getCurrentUser();
        await Logger.log({
          action: 'UPDATE',
          entityType: 'SETTINGS',
          entityId: id,
          details: {
            change: 'status_toggle',
            new_status: !currentStatus,
            manager_name: management.find(m => m.id === id)?.full_name
          },
          userId: currentUser?.id
        });
      }
    } catch (error) {
      console.error('Durum güncellenirken hata:', error)
    }
  }

  const deleteManagement = async (id: string) => {
    if (confirm('Bu yönetici kaydını silmek istediğinizden emin misiniz?')) {
      try {
        const { error } = await supabase
          .from('management')
          .delete()
          .eq('id', id)

        if (!error) {
          loadManagement()

          const currentUser = AdminAuth.getCurrentUser();
          await Logger.log({
            action: 'DELETE',
            entityType: 'SETTINGS',
            entityId: id,
            details: {
              manager_name: management.find(m => m.id === id)?.full_name
            },
            userId: currentUser?.id
          });
        }
      } catch (error) {
        console.error('Silme işleminde hata:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Yönetim</h1>
              <p className="mt-2 text-gray-600">Sendika yöneticilerini yönetin</p>
            </div>
            <Link
              href="/admin/management/new"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Yeni Yönetici
            </Link>
          </div>
        </div>

        <div className="space-y-8">
          {/* Genel Başkan (position_order = 0) */}
          {management.filter(member => member.position_order === 0).length > 0 && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Genel Başkan</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yönetici
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ünvan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Oluşturulma
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {management.filter(member => member.position_order === 0).map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              {member.image_url ? (
                                <img
                                  className="h-12 w-12 rounded-full object-cover"
                                  src={member.image_url}
                                  alt={member.full_name}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                                  <User className="h-6 w-6 text-gray-600" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.full_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleStatus(member.id, member.is_active)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {member.is_active ? (
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
                          {new Date(member.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/management/edit/${member.id}`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => deleteManagement(member.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
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
            </div>
          )}

          {/* Diğer Yöneticiler (position_order > 0) */}
          {management.filter(member => member.position_order > 0).length > 0 && (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">Yönetim Kurulu</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yönetici
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ünvan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sıra
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Oluşturulma
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {management.filter(member => member.position_order > 0).map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              {member.image_url ? (
                                <img
                                  className="h-12 w-12 rounded-full object-cover"
                                  src={member.image_url}
                                  alt={member.full_name}
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                                  <User className="h-6 w-6 text-gray-600" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.full_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.position_order}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleStatus(member.id, member.is_active)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}
                          >
                            {member.is_active ? (
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
                          {new Date(member.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/management/edit/${member.id}`}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => deleteManagement(member.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
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
            </div>
          )}

          {/* Hiç yönetici yoksa */}
          {management.length === 0 && (
            <div className="bg-white shadow-sm rounded-lg">
              <div className="px-6 py-12 text-center">
                <div className="text-gray-500">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Yönetici bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    İlk yöneticiyi ekleyerek başlayın.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/admin/management/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Yeni Yönetici
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
