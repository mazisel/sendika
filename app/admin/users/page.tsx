'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { AdminUser, Role } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { cityOptions, regionOptions } from '@/lib/cities';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  User
} from 'lucide-react';
import { logAuditAction } from '@/lib/audit-logger';

type AccessLevel = 'super_admin' | 'general_manager' | 'regional_manager' | 'branch_manager';

const accessLevelOptions: { value: AccessLevel; label: string }[] = [
  { value: 'super_admin', label: 'Süper Admin' },
  { value: 'general_manager', label: 'Genel Merkez Yöneticisi' },
  { value: 'regional_manager', label: 'Bölge Sorumlusu' },
  { value: 'branch_manager', label: 'Şube Yöneticisi' }
];

const getAccessLevelForUser = (user: AdminUser): AccessLevel => {
  if (user.role === 'super_admin') {
    return 'super_admin';
  }
  if (user.role === 'branch_manager' || user.role_type === 'branch_manager') {
    return 'branch_manager';
  }
  if (user.role_type === 'regional_manager') {
    return 'regional_manager';
  }
  return 'general_manager';
};

interface AccessPayload {
  role: 'admin' | 'super_admin' | 'branch_manager';
  role_type: 'general_manager' | 'regional_manager' | 'branch_manager';
  role_id?: string | null;
  city: string | null;
  region: string | null;
}

const buildAccessPayload = (
  level: AccessLevel,
  cityValue?: string,
  regionValue?: number | null,
  roleId?: string
): AccessPayload => {
  const base = {
    role_id: roleId || null,
  }
  switch (level) {
    case 'super_admin':
      return {
        ...base,
        role: 'super_admin',
        role_type: 'general_manager',
        city: null,
        region: null
      };
    case 'regional_manager':
      return {
        ...base,
        role: 'admin',
        role_type: 'regional_manager',
        city: null,
        region: regionValue ? String(regionValue) : null
      };
    case 'branch_manager':
      return {
        ...base,
        role: 'branch_manager',
        role_type: 'branch_manager',
        city: cityValue || null,
        region: null
      };
    case 'general_manager':
    default:
      return {
        ...base,
        role: 'admin',
        role_type: 'general_manager',
        city: null,
        region: null
      };
  }
};

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit States
  const [roleSelections, setRoleSelections] = useState<Record<string, string>>({});
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const user = AdminAuth.getCurrentUser();

      if (!user) {
        router.push('/admin/login');
        return;
      }

      // Granular permission check
      if (!PermissionManager.canViewUsers(user)) {
        router.push('/admin/dashboard');
        return;
      }

      setCurrentUser(user);
      await Promise.all([loadUsers(), loadRoles()]);
      setLoading(false);
    };

    checkAuthAndLoad();
  }, [router]);

  useEffect(() => {
    const roleMap: Record<string, string> = {};
    users.forEach((user) => {
      if (user.role_id) {
        roleMap[user.id] = user.role_id;
      }
    });

    setRoleSelections(roleMap);
  }, [users]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select(`
          *,
          role_details:roles (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Users load error:', error);
      setError('Kullanıcılar yüklenirken hata oluştu');
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Roles load error:', error);
    }
  };

  const handleDelete = async (targetUser: AdminUser) => {
    if (!currentUser) return;

    if (!PermissionManager.canManageUsers(currentUser, targetUser)) {
      setError('Bu kullanıcıyı silme yetkiniz yok');
      return;
    }

    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    if (currentUser.id === targetUser.id) {
      setError('Kendi hesabınızı silemezsiniz');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', targetUser.id);

      if (error) throw error;

      setUsers(users.filter(user => user.id !== targetUser.id));
      await logAuditAction({
        action: 'DELETE',
        entityType: 'USER',
        entityId: targetUser.id,
        details: { deleted_id: targetUser.id }
      });
    } catch (error) {
      setError('Kullanıcı silinirken hata oluştu');
    }
  };

  const toggleActive = async (targetUser: AdminUser) => {
    if (!currentUser) return;

    if (!PermissionManager.canManageUsers(currentUser, targetUser)) {
      setError('Bu kullanıcının durumunu değiştirme yetkiniz yok');
      return;
    }

    if (currentUser.id === targetUser.id && targetUser.is_active) {
      setError('Kendi hesabınızı pasif yapamazsınız');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !targetUser.is_active })
        .eq('id', targetUser.id);

      if (error) throw error;

      setUsers(users.map(user =>
        user.id === targetUser.id
          ? { ...user, is_active: !targetUser.is_active }
          : user
      ));

      await logAuditAction({
        action: 'UPDATE',
        entityType: 'USER',
        entityId: targetUser.id,
        details: {
          change: 'status_toggle',
          new_status: !targetUser.is_active
        }
      });
    } catch (error) {
      setError('Kullanıcı durumu güncellenirken hata oluştu');
    }
  };

  const updateUserAccess = async (targetUser: AdminUser) => {
    if (!currentUser) return;

    if (!PermissionManager.canManageUsers(currentUser, targetUser)) {
      setError('Bu kullanıcının yetkilerini değiştirme yetkiniz yok');
      return;
    }

    if (currentUser.id === targetUser.id) {
      setError('Kendi yetki seviyenizi değiştiremezsiniz');
      return;
    }

    setError('');

    const selectedRoleId = roleSelections[targetUser.id] || null;

    // Sadece role_id güncelliyoruz, diğer alanları varsayılan bırakıyoruz veya mevcut haliyle koruyoruz.
    // Ancak user request üzerine statik rolleri kaldırdık, bu yüzden 'admin' gönderiyoruz.
    const payload: AccessPayload = {
      role: 'admin', // Herkes temel admin
      role_type: 'general_manager', // Varsayılan
      role_id: selectedRoleId || null,
      // Eski scope verilerini sıfırla veya koru? Temizlemek daha iyi.
      city: null,
      region: null
    };

    setUpdatingUserId(targetUser.id);

    try {
      const { error: updateError } = await supabase
        .from('admin_users')
        .update(payload)
        .eq('id', targetUser.id);

      if (updateError) throw updateError;

      // Update local state, including role_details for display
      const updatedRoleDetails = selectedRoleId ? roles.find(r => r.id === selectedRoleId) : undefined;

      setUsers(users.map((item) => (item.id === targetUser.id ? {
        ...item,
        ...payload,
        role_details: updatedRoleDetails
      } : item)));

      setError('');

      await logAuditAction({
        action: 'UPDATE',
        entityType: 'USER',
        entityId: targetUser.id,
        details: {
          change: 'access_level_update',
          new_access: payload
        }
      });
    } catch (error) {
      console.error('Update error:', error);
      setError('Yetki seviyesi güncellenirken hata oluştu');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleColor = (user: AdminUser) => {
    const level = getAccessLevelForUser(user);
    switch (level) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'general_manager':
        return 'bg-blue-100 text-blue-800';
      case 'regional_manager':
        return 'bg-amber-100 text-amber-800';
      case 'branch_manager':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (user: AdminUser) => {
    const level = getAccessLevelForUser(user);
    switch (level) {
      case 'super_admin':
        return 'Süper Admin';
      case 'regional_manager':
        return 'Bölge Sorumlusu';
      case 'branch_manager':
        return 'Şube Yöneticisi';
      case 'general_manager':
      default:
        return 'Genel Merkez Yöneticisi';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  // Filter users based on view permission
  const visibleUsers = users.filter(u => PermissionManager.canViewUsers(currentUser, u));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Sayfa Başlığı */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Kullanıcı Yönetimi</h1>
            <p className="text-slate-600">Admin kullanıcılarını yönetin</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-900">Admin Kullanıcıları</h2>
          {PermissionManager.canManageUsers(currentUser) && (
            <Link
              href="/admin/users/new"
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Yeni Kullanıcı Ekle</span>
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg flex items-center space-x-3 bg-red-50 border border-red-200 text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Erişim ve Roller
          </h3>
          <div>
            <h4 className="font-bold mb-1">Rol ve Yetki Sistemi</h4>
            <div>Tüm kullanıcı yetkileri artık <strong>Roller</strong> üzerinden yönetilmektedir. Kullanıcılara "Muhasebe", "İnsan Kaynakları" veya "Süper Admin" gibi roller atayarak menü ve işlem yetkilerini belirleyebilirsiniz.</div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {visibleUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">Görüntüleyebileceğiniz kullanıcı bulunmuyor.</p>
              {PermissionManager.canManageUsers(currentUser) && (
                <Link
                  href="/admin/users/new"
                  className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>İlk Kullanıcıyı Ekle</span>
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {visibleUsers.map((user) => {
                const canManageThisUser = PermissionManager.canManageUsers(currentUser, user);

                return (
                  <li key={user.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-slate-900">
                              {user.full_name}
                            </h3>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                          {!user.role_details && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user)}`}>
                              {getRoleText(user)}
                            </span>
                          )}

                          {/* Scope Badges */}
                          {user.role === 'branch_manager' && user.city && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {user.city} Şubesi
                            </span>
                          )}
                          {user.role_type === 'regional_manager' && user.region && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              {user.region}. Bölge
                            </span>
                          )}

                          {/* Custom Role Badge */}
                          {user.role_details && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                              {user.role_details.name}
                            </span>
                          )}

                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                            }`}>
                            {user.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                          {currentUser.id === user.id && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Siz
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2 min-w-[240px]">
                        {/* Role Change */}
                        {(currentUser.id !== user.id && canManageThisUser) ? (
                          <div className="flex flex-col space-y-2 w-full">
                            <div className="flex space-x-2">
                              {/* Custom Role Selector ONLY */}
                              <select
                                value={roleSelections[user.id] ?? user.role_id ?? ''}
                                onChange={(e) => setRoleSelections(prev => ({ ...prev, [user.id]: e.target.value }))}
                                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
                              >
                                <option value="">Rol Seç</option>
                                {roles.map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                              </select>

                              <button
                                onClick={() => updateUserAccess(user)}
                                disabled={updatingUserId === user.id}
                                className="flex items-center justify-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                <span>{updatingUserId === user.id ? '...' : 'Güncelle'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          currentUser.id !== user.id ? (
                            <span className="text-xs text-slate-400 italic">Bu kullanıcıyı yönetemezsiniz</span>
                          ) : (
                            <span className="text-xs text-slate-500">Kendi yetkinizi değiştiremezsiniz</span>
                          )
                        )}

                        <div className="flex items-center space-x-2">
                          {/* Toggle Active */}
                          {canManageThisUser && (
                            <button
                              onClick={() => toggleActive(user)}
                              disabled={currentUser.id === user.id && user.is_active}
                              className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${user.is_active
                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {user.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              <span>{user.is_active ? 'Pasif Yap' : 'Aktif Yap'}</span>
                            </button>
                          )}

                          {/* Delete */}
                          {canManageThisUser && (
                            <button
                              onClick={() => handleDelete(user)}
                              disabled={currentUser.id === user.id}
                              className="flex items-center space-x-1 bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Sil</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>

  );
}
