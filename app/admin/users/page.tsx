'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import { AdminUser } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Shield, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  User
} from 'lucide-react';

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const user = AdminAuth.getCurrentUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }
      
      // Kullanıcı yönetimi yetkisi kontrolü
      if (!user || (user.role !== 'super_admin' && user.role_type !== 'general_manager')) {
        router.push('/admin/dashboard');
        return;
      }
      
      setCurrentUser(user);
      await loadUsers();
    };
    
    checkAuthAndLoad();
  }, [router]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError('Kullanıcılar yüklenirken hata oluştu');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      setError('Kullanıcılar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    // Kendi hesabını silmeye izin verme
    if (currentUser?.id === id) {
      setError('Kendi hesabınızı silemezsiniz');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', id);

      if (error) {
        setError('Kullanıcı silinirken hata oluştu');
        return;
      }

      setUsers(users.filter(user => user.id !== id));
    } catch (error) {
      setError('Kullanıcı silinirken hata oluştu');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    // Kendi hesabını pasif yapmaya izin verme
    if (currentUser?.id === id && currentStatus) {
      setError('Kendi hesabınızı pasif yapamazsınız');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) {
        setError('Kullanıcı durumu güncellenirken hata oluştu');
        return;
      }

      setUsers(users.map(user => 
        user.id === id 
          ? { ...user, is_active: !currentStatus }
          : user
      ));
    } catch (error) {
      setError('Kullanıcı durumu güncellenirken hata oluştu');
    }
  };

  const changeRole = async (id: string, newRole: 'admin' | 'super_admin' | 'branch_manager') => {
    // Kendi rolünü değiştirmeye izin verme
    if (currentUser?.id === id) {
      setError('Kendi rolünüzü değiştiremezsiniz');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ role: newRole })
        .eq('id', id);

      if (error) {
        setError('Kullanıcı rolü güncellenirken hata oluştu');
        return;
      }

      setUsers(users.map(user => 
        user.id === id 
          ? { ...user, role: newRole }
          : user
      ));
    } catch (error) {
      setError('Kullanıcı rolü güncellenirken hata oluştu');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'branch_manager':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Süper Admin';
      case 'admin':
        return 'Admin';
      case 'branch_manager':
        return 'Şube Yöneticisi';
      default:
        return 'Bilinmeyen';
    }
  };

  const handleLogout = () => {
    AdminAuth.logout();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

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
          <Link
            href="/admin/users/new"
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Kullanıcı Ekle</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg flex items-center space-x-3 bg-red-50 border border-red-200 text-red-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Role Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-blue-900 mb-2 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Rol Açıklamaları
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div><strong>Süper Admin:</strong> Tüm yetkilere sahip, kullanıcı yönetimi yapabilir</div>
            <div><strong>Admin:</strong> Haber ve duyuru yönetimi yapabilir, kullanıcı yönetimi yapamaz</div>
            <div><strong>Şube Yöneticisi:</strong> Kendi şubesindeki üye başvurularını yönetebilir</div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">Henüz kullanıcı bulunmuyor.</p>
                <Link
                  href="/admin/users/new"
                  className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>İlk Kullanıcıyı Ekle</span>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-200">
                {users.map((user) => (
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleText(user.role)}
                          </span>
                          {user.role === 'branch_manager' && user.city && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {user.city} Şubesi
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active 
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
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-slate-500">
                              Oluşturulma: {new Date(user.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Role Change */}
                        {currentUser.id !== user.id && (
                          <select
                            value={user.role}
                            onChange={(e) => changeRole(user.id, e.target.value as 'admin' | 'super_admin' | 'branch_manager')}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="admin">Admin</option>
                            <option value="super_admin">Süper Admin</option>
                            <option value="branch_manager">Şube Yöneticisi</option>
                          </select>
                        )}
                        
                        {/* Toggle Active */}
                        <button
                          onClick={() => toggleActive(user.id, user.is_active)}
                          disabled={currentUser.id === user.id && user.is_active}
                          className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            user.is_active
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {user.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          <span>{user.is_active ? 'Pasif Yap' : 'Aktif Yap'}</span>
                        </button>
                        
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={currentUser.id === user.id}
                          className="flex items-center space-x-1 bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
      </div>
    </div>
  );
}
