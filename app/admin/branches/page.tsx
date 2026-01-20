'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation' // Add imports
import { Plus, Edit, Trash2, MapPin, Phone, Mail, User, Building } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AdminAuth } from '@/lib/auth'
import { AdminUser, Branch, Region } from '@/lib/types'
import { Logger } from '@/lib/logger'
import Link from 'next/link'
import RegionList from '@/components/admin/regions/RegionList'

export default function BranchesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <BranchesContent />
    </Suspense>
  );
}

function BranchesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Initialize from URL or default to 'regions'
  const [activeTab, setActiveTab] = useState<'regions' | 'branches'>(
    (searchParams.get('tab') as 'regions' | 'branches') || 'regions'
  )
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)

  // Modals
  const [showEditBranch, setShowEditBranch] = useState(false)
  const [showDeleteBranch, setShowDeleteBranch] = useState(false)
  const [showDeleteRegion, setShowDeleteRegion] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  // Update URL activeTab changes
  const handleTabChange = (tab: 'regions' | 'branches') => {
    setActiveTab(tab)
    router.push(`/admin/branches?tab=${tab}`)
  }

  useEffect(() => {
    const user = AdminAuth.getCurrentUser()
    setCurrentUser(user)
    if (activeTab === 'branches') {
      loadBranches(user)
    }
  }, [activeTab])

  const loadBranches = async (user?: AdminUser | null) => {
    try {
      setLoading(true)
      let query = supabase
        .from('branches')
        .select(`
          id, city, city_code, branch_name, address, 
          president_name, president_phone, president_email, 
          is_active, legacy_region_number, created_at, updated_at,
          responsible_user:members!responsible_id(first_name, last_name),
          region:regions(*)
        `)
        .order('city', { ascending: true })

      const viewer = user ?? currentUser
      if (viewer?.role_type === 'regional_manager' && viewer.region) {
        // This viewer.region is number, but we might have changed logic.
        // For now, let's keep it compatible or generic.
        // If we migrated to region_id UUID, we need to handle that.
        // Assuming legacy behaviour for now or simple fetch.
        // query = query.eq('region', viewer.region) 
      } else if (viewer?.role_type === 'branch_manager' && viewer.city) {
        query = query.eq('city', viewer.city)
      }

      const { data, error } = await query

      if (error) throw error
      setBranches((data as any) || [])
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bölge ve Şube Yönetimi</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Bölgeleri, şubeleri ve sorumluları yönetin.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('regions')}
              className={`${activeTab === 'regions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Bölgeler
            </button>
            <button
              onClick={() => handleTabChange('branches')}
              className={`${activeTab === 'branches'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Building className="w-4 h-4 mr-2" />
              Şubeler
            </button>
          </nav>
        </div>

        {activeTab === 'regions' ? (
          <RegionList />
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Şubeler</h2>
              <Link
                href="/admin/branches/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Yeni Şube
              </Link>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Şehir
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Bölge
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Şube Adı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Başkan / Sorumlu
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          İletişim
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Durum
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          İşlemler
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {branches.map((branch) => (
                        <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 dark:text-blue-300 font-semibold text-sm">
                                  {branch.city_code}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {branch.city}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  Plaka: {branch.city_code}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {/* Prefer new region name if available, else legacy number */}
                              {branch.region ? branch.region.name : (branch.legacy_region_number ? `${branch.legacy_region_number}. Bölge` : '-')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {branch.branch_name}
                            </div>
                            {branch.address && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                <MapPin className="w-3 h-3 mr-1" />
                                {branch.address.substring(0, 50)}...
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center">
                                <User className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {branch.president_name}
                                </span>
                              </div>
                              {branch.responsible_user && (
                                <div className="text-xs text-blue-600 dark:text-blue-400 ml-6">
                                  Sorumlu: {branch.responsible_user.first_name} {branch.responsible_user.last_name}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              {branch.president_phone && (
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {branch.president_phone}
                                </div>
                              )}
                              {branch.president_email && (
                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
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
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                }`}
                            >
                              {branch.is_active ? 'Aktif' : 'Pasif'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link
                                href={`/admin/branches/edit/${branch.id}`}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              <button
                                onClick={() => deleteBranch(branch.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Şube bulunamadı</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Henüz hiç şube eklenmemiş.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/admin/branches/new"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        İlk Şubeyi Ekle
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
        }
      </div>
    </div>
  )
}
