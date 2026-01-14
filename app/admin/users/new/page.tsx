'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import Link from 'next/link';
import { cityOptions, regionOptions } from '@/lib/cities';
import { logAuditAction } from '@/lib/audit-logger';

type Role = 'admin' | 'super_admin' | 'branch_manager';
type RoleType = 'general_manager' | 'regional_manager' | 'branch_manager';
type AccessLevel = 'super_admin' | 'general_manager' | 'regional_manager' | 'branch_manager';

export default function NewUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('admin');
  const [roleType, setRoleType] = useState<RoleType>('general_manager');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('general_manager');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const currentUser = AdminAuth.getCurrentUser();
    if (!currentUser) {
      router.push('/admin/login');
      return;
    }

    // Sadece super_admin kullanıcıları yeni kullanıcı oluşturabilir
    if (currentUser.role !== 'super_admin' && currentUser.role_type !== 'general_manager') {
      setError('Bu işlem için yetkiniz bulunmuyor');
      setLoading(false);
      return;
    }

    // Form validasyonu
    if (accessLevel === 'branch_manager' && !city) {
      setError('Şube yöneticisi için il seçimi zorunludur');
      setLoading(false);
      return;
    }

    if (accessLevel === 'regional_manager' && !region) {
      setError('Bölge sorumlusu için bölge seçimi zorunludur');
      setLoading(false);
      return;
    }

    try {
      const resolvedRole: Role =
        accessLevel === 'super_admin'
          ? 'super_admin'
          : accessLevel === 'branch_manager'
            ? 'branch_manager'
            : 'admin';

      const resolvedRoleType: RoleType =
        accessLevel === 'branch_manager'
          ? 'branch_manager'
          : accessLevel === 'regional_manager'
            ? 'regional_manager'
            : 'general_manager';

      const result = await AdminAuth.createUser({
        email,
        password,
        full_name: fullName,
        role: resolvedRole,
        role_type: resolvedRoleType,
        city: accessLevel === 'branch_manager' ? city : undefined,
        region: accessLevel === 'regional_manager' ? Number(region) : undefined
      });

      if (result.success) {
        await logAuditAction({
          action: 'CREATE',
          entityType: 'USER',
          entityId: 'new_user', // Ideally we'd get the ID from result.data if available
          details: {
            email,
            full_name: fullName,
            role: resolvedRole,
            role_type: resolvedRoleType
          }
        });
        router.push('/admin/users');
      } else {
        setError(result.error || 'Kullanıcı oluşturulurken hata oluştu');
      }
    } catch (error) {
      setError('Kullanıcı oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/admin/users" className="text-blue-600 hover:text-blue-800">
                ← Kullanıcılar
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Yeni Kullanıcı Ekle</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Kullanıcının ad ve soyadını girin"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-posta *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="kullanici@sendika.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Şifre *
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="En az 6 karakter"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Şifre en az 6 karakter olmalıdır
                </p>
              </div>

              <div>
                <label htmlFor="roleType" className="block text-sm font-medium text-gray-700">
                  Yetki Seviyesi *
                </label>
                <select
                  id="roleType"
                  value={accessLevel}
                  onChange={(e) => {
                    const value = e.target.value as AccessLevel;
                    setAccessLevel(value);
                    setError('');
                    setCity('');
                    setRegion('');

                    if (value === 'super_admin') {
                      setRole('super_admin');
                      setRoleType('general_manager');
                    } else if (value === 'branch_manager') {
                      setRole('branch_manager');
                      setRoleType('branch_manager');
                    } else if (value === 'regional_manager') {
                      setRole('admin');
                      setRoleType('regional_manager');
                    } else {
                      setRole('admin');
                      setRoleType('general_manager');
                    }
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="super_admin">Süper Admin</option>
                  <option value="general_manager">Genel Merkez Yöneticisi</option>
                  <option value="regional_manager">Bölge Sorumlusu</option>
                  <option value="branch_manager">Şube Yöneticisi</option>
                </select>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div><strong>Süper Admin:</strong> Sistem genelinde sınırsız yetki.</div>
                  <div><strong>Genel Merkez Yöneticisi:</strong> Tüm modüllere erişir, kritik alanlarda sınırlı değişiklik.</div>
                  <div><strong>Bölge Sorumlusu:</strong> Yalnızca bağlı olduğu bölgedeki şube ve üyeleri yönetir.</div>
                  <div><strong>Şube Yöneticisi:</strong> Sadece kendi ilindeki üyeleri yönetir.</div>
                </div>
              </div>

              {accessLevel === 'regional_manager' && (
                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700">
                    Bölge *
                  </label>
                  <select
                    id="region"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    required={accessLevel === 'regional_manager'}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">Bölge seçiniz</option>
                    {regionOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {accessLevel === 'branch_manager' && (
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    İl *
                  </label>
                  <select
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required={accessLevel === 'branch_manager'}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">İl seçiniz</option>
                    {cityOptions.map(option => (
                      <option key={option.code} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Link
                  href="/admin/users"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                >
                  İptal
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {loading ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
