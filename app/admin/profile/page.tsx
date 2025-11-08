'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import { AdminUser } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { 
  User, 
  Lock, 
  Save, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  Shield
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Şifre güncelleme form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
    } else {
      setCurrentUser(user);
    }
  }, [router]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Form validasyonu
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Yeni şifre alanlarını doldurunuz' });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor' });
      setLoading(false);
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalıdır' });
      setLoading(false);
      return;
    }

    try {
      // Supabase Auth ile şifre güncelle
      const result = await AdminAuth.updatePassword(passwordForm.newPassword);

      if (!result.success) {
        setMessage({ type: 'error', text: result.error || 'Şifre güncellenirken bir hata oluştu' });
        setLoading(false);
        return;
      }

      setMessage({ type: 'success', text: 'Şifreniz başarıyla güncellendi' });
      
      // Formu temizle
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // 2 saniye sonra logout yap ve login sayfasına yönlendir
      setTimeout(() => {
        AdminAuth.logout();
        router.push('/admin/login');
      }, 2000);

    } catch (error) {
      console.error('Şifre güncelleme hatası:', error);
      setMessage({ type: 'error', text: 'Şifre güncellenirken bir hata oluştu' });
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Sayfa Başlığı */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profil Ayarları</h1>
            <p className="text-slate-600">Hesap bilgilerinizi ve şifrenizi yönetin</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kullanıcı Bilgileri */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Hesap Bilgileri
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Ad Soyad</label>
                <p className="text-slate-900 font-medium">{currentUser.full_name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">E-posta</label>
                <p className="text-slate-900 font-medium">{currentUser.email}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">Rol</label>
                <p className="text-slate-900 font-medium">
                  {currentUser.role_type === 'branch_manager' && currentUser.city
                    ? `${currentUser.city} Şube Yöneticisi`
                    : currentUser.role_type === 'regional_manager' && currentUser.region
                    ? `${currentUser.region}. Bölge Sorumlusu`
                    : currentUser.role_type === 'general_manager'
                    ? 'Genel Merkez Yöneticisi'
                    : currentUser.role === 'super_admin'
                    ? 'Süper Admin'
                    : 'Yönetici'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700">Hesap Durumu</label>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">Aktif</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Şifre Güncelleme */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-blue-600" />
              Şifre Güncelleme
            </h2>

            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-800' 
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-6">

              {/* Yeni Şifre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Yeni Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                    placeholder="Yeni şifrenizi girin"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-1">En az 6 karakter olmalıdır</p>
              </div>

              {/* Yeni Şifre Tekrar */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Yeni Şifre (Tekrar)
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                    placeholder="Yeni şifrenizi tekrar girin"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Güncelle Butonu */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>{loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}</span>
                </button>
              </div>
            </form>

            {/* Güvenlik Notları */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Güvenlik Önerileri</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Şifreniz en az 6 karakter uzunluğunda olmalıdır</li>
                <li>• Büyük harf, küçük harf ve rakam kullanın</li>
                <li>• Şifrenizi düzenli olarak güncelleyin</li>
                <li>• Şifrenizi başkalarıyla paylaşmayın</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
