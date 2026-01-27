'use client';

import { useState, useEffect, useRef } from 'react';
import ReactCrop, { type PercentCrop, type PixelCrop } from 'react-image-crop';
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
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [isAiProcessed, setIsAiProcessed] = useState(false);
  const [crop, setCrop] = useState<PercentCrop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isCropped, setIsCropped] = useState(false);
  const [aiProcessedFile, setAiProcessedFile] = useState<File | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const currentStep = !signatureFile ? 1 : !isAiProcessed ? 2 : !isCropped ? 3 : 4;
  const showSteps = isEditingSignature || !signaturePreview;

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
    } else {
      setCurrentUser(user);
      setIsEditingSignature(false);
      if (user.signature_url) {
        setSignatureUrl(user.signature_url);
        // İmzayı göster
        const { data } = supabase.storage.from('official-documents').getPublicUrl(user.signature_url);
        setSignaturePreview(data.publicUrl);
      }
    }
  }, [router]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

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

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setSignatureFile(file);
    setIsEditingSignature(true);
    setIsAiProcessed(false);
    setCrop(undefined);
    setCompletedCrop(null);
    setIsCropped(false);
    setAiProcessedFile(null);
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

        // URL'den Blob'a çevirip signatureFile state'ini güncelle
        // Bu gerekli çünkü Save işlemi file state'ini kullanıyor
        const res = await fetch(newUrl);
        const blob = await res.blob();
        const processedFile = new File([blob], 'signature_transparent.png', { type: 'image/png' });

        if (previewObjectUrlRef.current) {
          URL.revokeObjectURL(previewObjectUrlRef.current);
        }
        const objectUrl = URL.createObjectURL(processedFile);
        previewObjectUrlRef.current = objectUrl;

        setSignaturePreview(objectUrl);
        setSignatureFile(processedFile);
        setAiProcessedFile(processedFile);
        setIsAiProcessed(true);
        setCrop(undefined);
        setCompletedCrop(null);
        setIsCropped(false);

        setMessage({ type: 'success', text: 'Arka plan başarıyla temizlendi. Şimdi imzayı kırpabilirsiniz.' });
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

  const handleCropImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (!isAiProcessed || crop || isCropped) return;
    const img = event.currentTarget;
    if (!img.width || !img.height) return;
    const initialCrop: PercentCrop = { unit: '%', x: 10, y: 10, width: 80, height: 80 };
    setCrop(initialCrop);
    setCompletedCrop({
      unit: 'px',
      x: Math.round((initialCrop.x / 100) * img.width),
      y: Math.round((initialCrop.y / 100) * img.height),
      width: Math.round((initialCrop.width / 100) * img.width),
      height: Math.round((initialCrop.height / 100) * img.height),
    });
  };

  const applyCrop = async () => {
    if (!completedCrop || !signaturePreview || !cropImageRef.current) {
      setMessage({ type: 'error', text: 'Lütfen önce kırpma alanı seçin.' });
      return;
    }

    if (completedCrop.width < 8 || completedCrop.height < 8) {
      setMessage({ type: 'error', text: 'Kırpma alanı çok küçük. Lütfen daha geniş bir alan seçin.' });
      return;
    }

    const img = cropImageRef.current;
    const displayWidth = img.clientWidth;
    const displayHeight = img.clientHeight;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    if (!displayWidth || !displayHeight || !naturalWidth || !naturalHeight) {
      setMessage({ type: 'error', text: 'Kırpma için görsel henüz hazır değil. Lütfen tekrar deneyin.' });
      return;
    }

    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;

    const sx = completedCrop.x * scaleX;
    const sy = completedCrop.y * scaleY;
    const sw = completedCrop.width * scaleX;
    const sh = completedCrop.height * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(sw));
    canvas.height = Math.max(1, Math.floor(sh));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setMessage({ type: 'error', text: 'Kırpma işlemi başlatılamadı.' });
      return;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/png');
    });

    if (!blob) {
      setMessage({ type: 'error', text: 'Kırpma işlemi başarısız oldu.' });
      return;
    }

    const croppedFile = new File([blob], 'signature_cropped.png', { type: 'image/png' });

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(croppedFile);
    previewObjectUrlRef.current = objectUrl;

    setSignatureFile(croppedFile);
    setSignaturePreview(objectUrl);
    setIsCropped(true);
    setCrop(undefined);
    setCompletedCrop(null);
    setMessage({ type: 'success', text: 'Kırpma uygulandı. Kaydet butonu ile yükleyebilirsiniz.' });
  };

  const resetCrop = () => {
    if (!aiProcessedFile) {
      setCrop(undefined);
      setCompletedCrop(null);
      setIsCropped(false);
      return;
    }

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(aiProcessedFile);
    previewObjectUrlRef.current = objectUrl;

    setSignatureFile(aiProcessedFile);
    setSignaturePreview(objectUrl);
    setCrop(undefined);
    setCompletedCrop(null);
    setIsCropped(false);
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
      setIsEditingSignature(false);
      setIsAiProcessed(false);
      setCrop(undefined);
      setCompletedCrop(null);
      setIsCropped(false);
      setSignatureFile(null);

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
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setSignaturePreview(null);
    setIsEditingSignature(false);
    setIsAiProcessed(false);
    setCrop(undefined);
    setCompletedCrop(null);
    setIsCropped(false);
    setAiProcessedFile(null);
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
                    <div className="h-48 flex items-center justify-center bg-transparent pattern-grid-lg rounded-lg border border-slate-100 overflow-hidden">
                      {isAiProcessed ? (
                        <ReactCrop
                          crop={crop}
                          onChange={(_crop, percentCrop) => setCrop(percentCrop)}
                          onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
                          keepSelection
                          className="max-h-48 max-w-full"
                        >
                          <img
                            ref={cropImageRef}
                            src={signaturePreview}
                            alt="İmza Önizleme"
                            onLoad={handleCropImageLoad}
                            className="block max-h-48 max-w-full object-contain"
                            draggable={false}
                          />
                        </ReactCrop>
                      ) : (
                        <img
                          src={signaturePreview}
                          alt="İmza Önizleme"
                          className="block max-h-48 max-w-full object-contain"
                          draggable={false}
                        />
                      )}
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
                  className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${!showSteps || isAiProcessed ? 'pointer-events-none' : ''}`}
                  disabled={isProcessingSignature}
                />
              </div>

              {showSteps && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                    {[
                      { id: 1, title: 'İmza Yükle', detail: 'PNG/JPG seçin' },
                      { id: 2, title: 'AI Temizle', detail: 'Arka planı sil' },
                      { id: 3, title: 'Kırp', detail: 'Boşlukları kaldır' },
                      { id: 4, title: 'Kaydet', detail: 'İmzanı kaydet' },
                    ].map((step) => {
                      const isActive = step.id === currentStep;
                      const isDone = step.id < currentStep;
                      return (
                        <div
                          key={step.id}
                          className={`rounded-lg border px-3 py-2 ${isActive
                            ? 'border-blue-300 bg-blue-50 text-blue-800'
                            : isDone
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                            }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                            <span>Adım {step.id}</span>
                            {isDone && <span>✔</span>}
                          </div>
                          <div className="mt-1 text-sm font-semibold">{step.title}</div>
                          <div className="text-[11px] text-slate-500">{step.detail}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!showSteps && signaturePreview && !signatureFile && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                  <span>Kayıtlı imzanız var. Değiştirmek isterseniz adımları başlatın.</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingSignature(true)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                  >
                    İmzayı Değiştir
                  </button>
                </div>
              )}

              {showSteps && currentStep === 1 && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span>
                    {signaturePreview ? 'Kayıtlı imzanız var. Yeni bir imza yüklemek için değiştirin.' : 'Devam etmek için imza görseli yükleyin.'}
                  </span>
                  <label
                    className={`relative inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 ${isProcessingSignature ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
                  >
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={handleSignatureSelect}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isProcessingSignature}
                    />
                    {signaturePreview ? 'İmzayı Değiştir' : 'Dosya Seç'}
                  </label>
                </div>
              )}

              {showSteps && currentStep === 2 && (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span>İmzanın arka planını yapay zeka ile temizleyin.</span>
                  <button
                    onClick={removeBackground}
                    disabled={isProcessingSignature}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                  >
                    <Eraser className="w-4 h-4" />
                    <span>Arka Planı Temizle (AI)</span>
                  </button>
                </div>
              )}

              {showSteps && currentStep === 3 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-800">Adım 3: Kırpma</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        İmzanın etrafındaki boşlukları kırpın. Çizgilere dokunmayın.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={applyCrop}
                        disabled={!completedCrop || isProcessingSignature}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${!completedCrop
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        Kırpmayı Uygula
                      </button>
                      <button
                        onClick={resetCrop}
                        disabled={isProcessingSignature}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      >
                        Sıfırla
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    İmza üzerinde sürükleyerek bir alan seçin, sonra &quot;Kırpmayı Uygula&quot;ya basın.
                  </p>
                </div>
              )}

              {showSteps && currentStep === 4 && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <span>Kırpma tamam. İmzanızı kaydedebilirsiniz.</span>
                  <button
                    onClick={saveSignature}
                    disabled={isProcessingSignature}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm hover:shadow-md"
                  >
                    {isProcessingSignature ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Kaydet</span>
                  </button>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 border border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-2">İpuçları:</h4>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Beyaz, temiz bir kağıda atılmış imza fotoğrafı en iyi sonucu verir.</li>
                  <li>Fotoğrafın aydınlık ve gölgesiz olmasına dikkat edin.</li>
                  <li>"Arka Planı Temizle" özelliği yapay zeka ile imzanızı şeffaf hale getirir.</li>
                  <li>Temizleme sonrası imza etrafındaki boşlukları kırparak daha iyi sonuç alırsınız.</li>
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
