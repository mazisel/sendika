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
  Shield,
  PenTool,
  Upload,
  Eraser,
  X
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'signature'>('profile');
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

  // İmza state
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [isProcessingSignature, setIsProcessingSignature] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
    } else {
      setCurrentUser(user);
      if (user.signature_url) {
        setSignatureUrl(user.signature_url);
        // İmzayı göster
        const { data } = supabase.storage.from('official-documents').getPublicUrl(user.signature_url);
        setSignaturePreview(data.publicUrl);
      }
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

  // İmza İşlemleri
  const handleSignatureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Lütfen geçerli bir resim dosyası seçin (PNG, JPG)' });
      return;
    }

    setSignatureFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSignaturePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeBackground = async () => {
    if (!signatureFile) return;

    setIsProcessingSignature(true);
    setMessage({ type: 'success', text: 'Arka plan temizleniyor (Yapay Zeka)...' });

    try {
      const formData = new FormData();
      formData.append('image', signatureFile);

      const response = await fetch('/api/ai/remove-background', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'İşlem başarısız oldu');
      }

      if (data.image && data.image.url) {
        const newUrl = data.image.url;
        setSignaturePreview(newUrl);

        // URL'den Blob'a çevirip signatureFile state'ini güncelle
        // Bu gerekli çünkü Save işlemi file state'ini kullanıyor
        const res = await fetch(newUrl);
        const blob = await res.blob();
        const processedFile = new File([blob], "signature_transparent.png", { type: "image/png" });
        setSignatureFile(processedFile);

        setMessage({ type: 'success', text: 'Arka plan başarıyla temizlendi (AI)' });
      } else {
        throw new Error('API geçerli bir sonuç döndürmedi');
      }

    } catch (err: any) {
      console.error('Background removal error:', err);
      setMessage({ type: 'error', text: 'Arka plan temizleme hatası: ' + err.message });
    } finally {
      setIsProcessingSignature(false);
    }
  };

  const saveSignature = async () => {
    if (!signatureFile || !currentUser) return;

    setIsProcessingSignature(true);
    try {
      // Resmi küçült (Resize) - 413 hatasını önlemek için
      // Maksimum genişlik 600px olsun
      const resizeImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const scaleSize = MAX_WIDTH / img.width;
            const width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
            const height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context failed'));
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to Blob failed'));
            }, 'image/png');
          };
          img.onerror = reject;
        });
      };

      const resizedBlob = await resizeImage(signatureFile);
      const resizedFile = new File([resizedBlob], signatureFile.name, { type: 'image/png' });

      // 1. Storage'a yükle (Resized file kullanarak)
      const fileExt = 'png';
      const fileName = `signatures/${currentUser.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('official-documents')
        .upload(fileName, resizedFile, {
          upsert: true,
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      // 2. DB'yi güncelle
      const { error: dbError } = await supabase
        .from('admin_users')
        .update({ signature_url: fileName })
        .eq('id', currentUser.id);

      if (dbError) throw dbError;

      setSignatureUrl(fileName);
      setMessage({ type: 'success', text: 'İmza başarıyla kaydedildi' });

      // Session storage güncelle
      const updatedUser = { ...currentUser, signature_url: fileName };
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_user', JSON.stringify(updatedUser));
      }

    } catch (err: any) {
      console.error('Signature save error:', err);
      setMessage({ type: 'error', text: 'İmza kaydedilirken hata oluştu: ' + err.message });
    } finally {
      setIsProcessingSignature(false);
    }
  };

  const clearSignature = () => {
    setSignatureFile(null);
    setSignaturePreview(null);
    if (currentUser?.signature_url) {
      // Eğer kayıtlı imza varsa onu geri yükle
      const { data } = supabase.storage.from('official-documents').getPublicUrl(currentUser.signature_url);
      setSignaturePreview(data.publicUrl);
      // File null kalır çünkü yeni yükleme yok
    }
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

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'profile'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
        >
          <Shield className="w-4 h-4" />
          <span>Profil Bilgileri</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'security'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
        >
          <Lock className="w-4 h-4" />
          <span>Güvenlik & Şifre</span>
        </button>
        <button
          onClick={() => setActiveTab('signature')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'signature'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
        >
          <PenTool className="w-4 h-4" />
          <span>İmza Ayarları</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">

        {/* Profil Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">
                {currentUser.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{currentUser.full_name}</h3>
                <p className="text-slate-500">{currentUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Rol</label>
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
              <div className="p-4 bg-slate-50 rounded-lg">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Hesap Durumu</label>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">Aktif</span>
                </div>
              </div>
              {currentUser.city && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Şehir</label>
                  <p className="text-slate-900 font-medium">{currentUser.city}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Güvenlik Tab */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-blue-600" />
                Şifre Güncelleme
              </h2>
              <p className="text-slate-500 text-sm mt-1">Hesap güvenliğiniz için güçlü bir şifre belirleyin.</p>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${message.type === 'success'
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

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          </div>
        )}

        {/* İmza Tab */}
        {activeTab === 'signature' && (
          <div className="max-w-xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                <PenTool className="w-5 h-5 mr-2 text-blue-600" />
                İmza Yönetimi
              </h2>
              <p className="text-slate-500 text-sm mt-1">Belgelerinizde kullanılacak imza görselini buradan yükleyebilirsiniz.</p>
            </div>

            {message && activeTab === 'signature' && (
              <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${message.type === 'success'
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

            <div className="space-y-6">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative cursor-pointer">
                {signaturePreview ? (
                  <div className="relative group">
                    <div className="h-48 flex items-center justify-center bg-transparent pattern-grid-lg rounded-lg border border-slate-100">
                      <img
                        src={signaturePreview}
                        alt="İmza Önizleme"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    {signatureFile && (
                      <button
                        onClick={clearSignature}
                        className="absolute top-2 right-2 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 shadow-sm"
                        title="Seçimi İptal Et"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                      <Upload className="w-10 h-10 text-blue-500 opacity-80" />
                    </div>
                    <span className="text-lg font-medium text-slate-700">İmza Görseli Yükle</span>
                    <span className="text-sm text-slate-500 mt-1">PNG veya JPG formatında</span>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleSignatureSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessingSignature}
                />
              </div>

              {signaturePreview && signatureFile && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={removeBackground}
                    disabled={isProcessingSignature}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    <Eraser className="w-5 h-5" />
                    <span>Arka Planı Temizle (AI)</span>
                  </button>

                  <button
                    onClick={saveSignature}
                    disabled={isProcessingSignature}
                    className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md"
                  >
                    {isProcessingSignature ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    <span>Değişiklikleri Kaydet</span>
                  </button>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-2">İpuçları:</h4>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Beyaz, temiz bir kağıda atılmış imza fotoğrafı en iyi sonucu verir.</li>
                  <li>Fotoğrafın aydınlık ve gölgesiz olmasına dikkat edin.</li>
                  <li>"Arka Planı Temizle" özelliği yapay zeka ile imzanızı şeffaf hale getirir.</li>
                  <li>İmza belgelerinizin altına otomatik olarak eklenecektir.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
