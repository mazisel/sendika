'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import Link from 'next/link';
import { cityOptions, regionOptions } from '@/lib/cities';
import { logAuditAction } from '@/lib/audit-logger';
import { supabase } from '@/lib/supabase';
import { Role } from '@/lib/types';
import { PermissionManager } from '@/lib/permissions';

export default function NewUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);

  // Default hidden values
  // We keep these logic internally but hide from user.
  // Unless we have specific dynamic roles that map to these, we default to standard admin.
  // We will assume 'admin' role and 'general_manager' type for now, relying on permissions.
  // Exception: If needed, we can add a checkbox for specific "Scope" later, but request was to remove options.

  const [branches, setBranches] = useState<{ id: string; city: string; branch_name: string }[]>([]);
  const [roleType, setRoleType] = useState('general_manager');
  const [selectedBranchCity, setSelectedBranchCity] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadRoles();
    loadBranches();
  }, []);

  const loadRoles = async () => {
    const { data } = await supabase.from('roles').select('*').order('name');
    if (data) setAvailableRoles(data);
  };

  const loadBranches = async () => {
    const { data } = await supabase
      .from('branches')
      .select('id, city, branch_name')
      .eq('is_active', true)
      .order('city');
    if (data) setBranches(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const currentUser = AdminAuth.getCurrentUser();
    if (!currentUser) {
      router.push('/admin/login');
      return;
    }

    // Role management permission check
    if (!PermissionManager.canManageUsers(currentUser) && !PermissionManager.isSuperAdmin(currentUser)) {
      setError('Bu işlem için yetkiniz bulunmuyor');
      setLoading(false);
      return;
    }

    if (!selectedRoleId) {
      setError('Lütfen bir rol seçiniz');
      setLoading(false);
      return;
    }

    // Role type specific validation
    if (roleType === 'branch_manager' && !selectedBranchCity) {
      setError('Şube yöneticisi için şube seçimi zorunludur');
      setLoading(false);
      return;
    }

    if (roleType === 'regional_manager' && !selectedRegion) {
      setError('Bölge yöneticisi için bölge seçimi zorunludur');
      setLoading(false);
      return;
    }

    try {
      // Varsayılan olarak 'admin' rolünü atıyoruz (role sütunu için)
      // Ancak detaylı yetkilendirme role_id ile (RBAC) ve role_type ile (Scope) yapılacak.
      const result = await AdminAuth.createUser({
        email,
        password,
        full_name: fullName,
        phone,
        role: 'admin',
        role_type: roleType as any,
        role_id: selectedRoleId,
        city: roleType === 'branch_manager' ? selectedBranchCity : undefined,
        region: roleType === 'regional_manager' ? Number(selectedRegion) : undefined
      });

      if (result.success) {
        await logAuditAction({
          action: 'CREATE',
          entityType: 'USER',
          entityId: 'new_user',
          details: {
            email,
            full_name: fullName,
            phone,
            role_id: selectedRoleId
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

              {/* Temel Bilgiler */}
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
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="05xxxxxxxxx"
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

              {/* Rol Seçimi */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-200">
                <h3 className="font-medium text-gray-900">Yetkilendirme</h3>

                <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-700">
                  <p>Kullanıcının yetki kapsamı seçilen rolden otomatik olarak belirlenir.</p>
                </div>

                <div>
                  <label htmlFor="customRole" className="block text-sm font-medium text-gray-700">
                    Kullanıcı Rolü *
                  </label>
                  <select
                    id="customRole"
                    value={selectedRoleId}
                    onChange={(e) => {
                      const rId = e.target.value;
                      setSelectedRoleId(rId);
                      const role = availableRoles.find(r => r.id === rId);
                      // Update roleType based on selected role definition
                      if (role) {
                        setRoleType(role.role_type || 'general_manager');
                      } else {
                        setRoleType('general_manager');
                      }
                      // Reset selections when role changes
                      setSelectedBranchCity('');
                      setSelectedRegion('');
                    }}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">-- Rol Seçiniz --</option>
                    {availableRoles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.is_system_role ? ' (Sistem)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {roleType === 'branch_manager' && (
                  <div>
                    <label htmlFor="branchCity" className="block text-sm font-medium text-gray-700">
                      Şube (İl) Seçimi *
                    </label>
                    <select
                      id="branchCity"
                      value={selectedBranchCity}
                      onChange={(e) => setSelectedBranchCity(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                      <option value="">-- Şube Seçiniz --</option>
                      {branches.map(b => (
                        <option key={b.id} value={b.city}>
                          {b.city} - {b.branch_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {roleType === 'regional_manager' && (
                  <div>
                    <label htmlFor="regionSelect" className="block text-sm font-medium text-gray-700">
                      Bölge Seçimi *
                    </label>
                    <select
                      id="regionSelect"
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    >
                      <option value="">-- Bölge Seçiniz --</option>
                      {regionOptions.map(r => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}


              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Link
                  href="/admin/users"
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                >
                  İptal
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
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
