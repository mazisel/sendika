'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import Link from 'next/link';

export default function NewUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'super_admin' | 'branch_manager'>('admin');
  const [roleType, setRoleType] = useState<'general_manager' | 'branch_manager'>('general_manager');
  const [city, setCity] = useState('');
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
    if (currentUser.role !== 'super_admin') {
      setError('Bu işlem için yetkiniz bulunmuyor');
      setLoading(false);
      return;
    }

    // Form validasyonu
    if (roleType === 'branch_manager' && !city) {
      setError('Şube yöneticisi için il seçimi zorunludur');
      setLoading(false);
      return;
    }

    try {
      const result = await AdminAuth.createUser({
        email,
        password,
        full_name: fullName,
        role,
        role_type: roleType,
        city: roleType === 'branch_manager' ? city : undefined
      });

      if (result.success) {
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
                  value={roleType}
                  onChange={(e) => {
                    const newRoleType = e.target.value as 'general_manager' | 'branch_manager';
                    setRoleType(newRoleType);
                    if (newRoleType === 'general_manager') {
                      setRole('super_admin');
                      setCity('');
                    } else {
                      setRole('branch_manager');
                    }
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="general_manager">Genel Merkez Yöneticisi</option>
                  <option value="branch_manager">Şube Yöneticisi</option>
                </select>
                <div className="mt-2 text-sm text-gray-600">
                  <div><strong>Genel Merkez Yöneticisi:</strong> Tüm modüllere erişim, sistem genelinde tam yetki</div>
                  <div><strong>Şube Yöneticisi:</strong> Sadece kendi ilindeki üye yönetimi</div>
                </div>
              </div>

              {roleType === 'branch_manager' && (
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    İl *
                  </label>
                  <select
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required={roleType === 'branch_manager'}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="">İl seçiniz</option>
                    <option value="Adana">Adana</option>
                    <option value="Adıyaman">Adıyaman</option>
                    <option value="Afyonkarahisar">Afyonkarahisar</option>
                    <option value="Ağrı">Ağrı</option>
                    <option value="Amasya">Amasya</option>
                    <option value="Ankara">Ankara</option>
                    <option value="Antalya">Antalya</option>
                    <option value="Artvin">Artvin</option>
                    <option value="Aydın">Aydın</option>
                    <option value="Balıkesir">Balıkesir</option>
                    <option value="Bilecik">Bilecik</option>
                    <option value="Bingöl">Bingöl</option>
                    <option value="Bitlis">Bitlis</option>
                    <option value="Bolu">Bolu</option>
                    <option value="Burdur">Burdur</option>
                    <option value="Bursa">Bursa</option>
                    <option value="Çanakkale">Çanakkale</option>
                    <option value="Çankırı">Çankırı</option>
                    <option value="Çorum">Çorum</option>
                    <option value="Denizli">Denizli</option>
                    <option value="Diyarbakır">Diyarbakır</option>
                    <option value="Edirne">Edirne</option>
                    <option value="Elazığ">Elazığ</option>
                    <option value="Erzincan">Erzincan</option>
                    <option value="Erzurum">Erzurum</option>
                    <option value="Eskişehir">Eskişehir</option>
                    <option value="Gaziantep">Gaziantep</option>
                    <option value="Giresun">Giresun</option>
                    <option value="Gümüşhane">Gümüşhane</option>
                    <option value="Hakkâri">Hakkâri</option>
                    <option value="Hatay">Hatay</option>
                    <option value="Isparta">Isparta</option>
                    <option value="Mersin">Mersin</option>
                    <option value="İstanbul">İstanbul</option>
                    <option value="İzmir">İzmir</option>
                    <option value="Kars">Kars</option>
                    <option value="Kastamonu">Kastamonu</option>
                    <option value="Kayseri">Kayseri</option>
                    <option value="Kırklareli">Kırklareli</option>
                    <option value="Kırşehir">Kırşehir</option>
                    <option value="Kocaeli">Kocaeli</option>
                    <option value="Konya">Konya</option>
                    <option value="Kütahya">Kütahya</option>
                    <option value="Malatya">Malatya</option>
                    <option value="Manisa">Manisa</option>
                    <option value="Kahramanmaraş">Kahramanmaraş</option>
                    <option value="Mardin">Mardin</option>
                    <option value="Muğla">Muğla</option>
                    <option value="Muş">Muş</option>
                    <option value="Nevşehir">Nevşehir</option>
                    <option value="Niğde">Niğde</option>
                    <option value="Ordu">Ordu</option>
                    <option value="Rize">Rize</option>
                    <option value="Sakarya">Sakarya</option>
                    <option value="Samsun">Samsun</option>
                    <option value="Siirt">Siirt</option>
                    <option value="Sinop">Sinop</option>
                    <option value="Sivas">Sivas</option>
                    <option value="Tekirdağ">Tekirdağ</option>
                    <option value="Tokat">Tokat</option>
                    <option value="Trabzon">Trabzon</option>
                    <option value="Tunceli">Tunceli</option>
                    <option value="Şanlıurfa">Şanlıurfa</option>
                    <option value="Uşak">Uşak</option>
                    <option value="Van">Van</option>
                    <option value="Yozgat">Yozgat</option>
                    <option value="Zonguldak">Zonguldak</option>
                    <option value="Aksaray">Aksaray</option>
                    <option value="Bayburt">Bayburt</option>
                    <option value="Karaman">Karaman</option>
                    <option value="Kırıkkale">Kırıkkale</option>
                    <option value="Batman">Batman</option>
                    <option value="Şırnak">Şırnak</option>
                    <option value="Bartın">Bartın</option>
                    <option value="Ardahan">Ardahan</option>
                    <option value="Iğdır">Iğdır</option>
                    <option value="Yalova">Yalova</option>
                    <option value="Karabük">Karabük</option>
                    <option value="Kilis">Kilis</option>
                    <option value="Osmaniye">Osmaniye</option>
                    <option value="Düzce">Düzce</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Şube yöneticisi sadece seçilen ildeki üyeleri yönetebilir
                  </p>
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
