'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { AdminUser } from '@/lib/types';
import { ArrowLeft, Save, User, MapPin, Phone, Mail, Briefcase, Heart, GraduationCap, Baby, AlertTriangle, Key } from 'lucide-react';

interface FormData {
  first_name: string;
  last_name: string;
  tc_identity: string;
  birth_date: string;
  gender: string;
  city: string;
  district: string;
  phone: string;
  email: string;
  address: string;
  workplace: string;
  position: string;
  start_date: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  education_level: string;
  marital_status: string;
  children_count: number;
  notes: string;
}

const initialFormData: FormData = {
  first_name: '',
  last_name: '',
  tc_identity: '',
  birth_date: '',
  gender: '',
  city: '',
  district: '',
  phone: '',
  email: '',
  address: '',
  workplace: '',
  position: '',
  start_date: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  education_level: '',
  marital_status: '',
  children_count: 0,
  notes: ''
};

export default function NewMemberPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Kullanıcı bilgilerini al
    const user = AdminAuth.getCurrentUser();
    setCurrentUser(user);

    // Şube yöneticisi ise şehrini otomatik doldur
    if (user && user.role_type === 'branch_manager' && user.city) {
      setFormData(prev => ({
        ...prev,
        city: user.city || ''
      }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'children_count' ? parseInt(value) || 0 : value
    }));

    // Hata mesajını temizle
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setErrors(prev => ({
      ...prev,
      password: '',
      confirmPassword: ''
    }));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    setErrors(prev => ({
      ...prev,
      confirmPassword: ''
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Zorunlu alanlar
    if (!formData.first_name.trim()) newErrors.first_name = 'Ad zorunludur';
    if (!formData.last_name.trim()) newErrors.last_name = 'Soyad zorunludur';
    if (!formData.tc_identity.trim()) newErrors.tc_identity = 'TC Kimlik No zorunludur';
    if (!formData.birth_date) newErrors.birth_date = 'Doğum tarihi zorunludur';
    if (!formData.gender) newErrors.gender = 'Cinsiyet zorunludur';
    if (!formData.city.trim()) newErrors.city = 'İl zorunludur';
    if (!formData.district.trim()) newErrors.district = 'İlçe zorunludur';
    if (!formData.phone.trim()) newErrors.phone = 'Telefon zorunludur';
    if (!formData.email.trim()) newErrors.email = 'E-posta zorunludur';

    // TC Kimlik No kontrolü
    if (formData.tc_identity && formData.tc_identity.length !== 11) {
      newErrors.tc_identity = 'TC Kimlik No 11 haneli olmalıdır';
    }

    // E-posta formatı kontrolü
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    // Telefon formatı kontrolü
    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    // Şube yöneticisi şehir kontrolü
    if (currentUser?.role_type === 'branch_manager' && currentUser.city && formData.city !== currentUser.city) {
      newErrors.city = `Sadece ${currentUser.city} iline üye ekleyebilirsiniz`;
    }

    if (password) {
      if (password.length < 6) {
        newErrors.password = 'Şifre en az 6 karakter olmalıdır';
      }

      if (confirmPassword !== password) {
        newErrors.confirmPassword = 'Şifreler eşleşmiyor';
      }
    }

    if (!password && confirmPassword) {
      newErrors.password = 'Lütfen bir şifre giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Üye numarası veritabanı trigger'ı tarafından otomatik oluşturulacak
      const memberData = {
        ...formData,
        membership_status: 'active', // Admin tarafından eklenen üyeler direkt aktif
        is_active: true
      };

      const { data, error } = await supabase
        .from('members')
        .insert([memberData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          if (error.message.includes('tc_identity')) {
            setErrors({ tc_identity: 'Bu TC Kimlik No ile kayıtlı bir üye zaten mevcut' });
          } else if (error.message.includes('email')) {
            setErrors({ email: 'Bu e-posta adresi ile kayıtlı bir üye zaten mevcut' });
          } else {
            throw error;
          }
          return;
        }
        throw error;
      }

      if (password) {
        const response = await fetch(`/api/members/${data.id}/password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password })
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.message || 'Şifre oluşturulurken bir hata oluştu.');
        }

        setPassword('');
        setConfirmPassword('');
      }

      alert(`Üye başarıyla eklendi! Üye numarası: ${data.membership_number}`);
      router.push('/admin/members');
    } catch (error) {
      console.error('Üye eklenirken hata:', error);
      const message = error instanceof Error
        ? error.message
        : 'Üye eklenirken bir hata oluştu. Lütfen tekrar deneyin.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const turkishCities = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
    'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa',
    'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan',
    'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Isparta',
    'Mersin', 'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir',
    'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla',
    'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt',
    'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak',
    'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman',
    'Şırnak', 'Bartın', 'Ardahan', 'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Geri Dön</span>
          </button>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900">Yeni Üye Ekle</h1>
        <p className="text-slate-600 mt-2">
          {currentUser?.role_type === 'branch_manager' && currentUser.city
            ? `${currentUser.city} şubesine yeni üye ekleyin`
            : 'Sendikaya yeni üye ekleyin'
          }
        </p>
        
        {currentUser?.role_type === 'branch_manager' && currentUser.city && (
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
            <MapPin className="w-4 h-4 mr-1" />
            {currentUser.city} Şubesi
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Kişisel Bilgiler */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Kişisel Bilgiler</h3>
              <p className="text-sm text-slate-600">Üyenin temel kişisel bilgileri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.first_name ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="Adını giriniz"
              />
              {errors.first_name && (
                <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Soyad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.last_name ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="Soyadını giriniz"
              />
              {errors.last_name && (
                <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                TC Kimlik No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="tc_identity"
                value={formData.tc_identity}
                onChange={handleInputChange}
                maxLength={11}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.tc_identity ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="TC Kimlik Numarasını giriniz"
              />
              {errors.tc_identity && (
                <p className="mt-1 text-sm text-red-600">{errors.tc_identity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Doğum Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.birth_date ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors.birth_date && (
                <p className="mt-1 text-sm text-red-600">{errors.birth_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cinsiyet <span className="text-red-500">*</span>
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.gender ? 'border-red-500' : 'border-slate-300'
                }`}
              >
                <option value="">Cinsiyet seçiniz</option>
                <option value="Erkek">Erkek</option>
                <option value="Kadın">Kadın</option>
                <option value="Diğer">Diğer</option>
              </select>
              {errors.gender && (
                <p className="mt-1 text-sm text-red-600">{errors.gender}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                İl <span className="text-red-500">*</span>
              </label>
              <select
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                disabled={currentUser?.role_type === 'branch_manager'}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.city ? 'border-red-500' : 'border-slate-300'
                } ${currentUser?.role_type === 'branch_manager' ? 'bg-slate-100 cursor-not-allowed' : ''}`}
              >
                <option value="">İl seçiniz</option>
                {turkishCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
              {currentUser?.role_type === 'branch_manager' && (
                <p className="mt-1 text-sm text-blue-600">
                  Şube yöneticisi olarak sadece {currentUser.city} iline üye ekleyebilirsiniz.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                İlçe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.district ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="İlçe giriniz"
              />
              {errors.district && (
                <p className="mt-1 text-sm text-red-600">{errors.district}</p>
              )}
            </div>


            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Medeni Durum
              </label>
              <select
                name="marital_status"
                value={formData.marital_status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Medeni durum seçiniz</option>
                <option value="Bekar">Bekar</option>
                <option value="Evli">Evli</option>
                <option value="Boşanmış">Boşanmış</option>
                <option value="Dul">Dul</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Çocuk Sayısı
              </label>
              <input
                type="number"
                name="children_count"
                value={formData.children_count}
                onChange={handleInputChange}
                min="0"
                max="20"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Eğitim Durumu
              </label>
              <select
                name="education_level"
                value={formData.education_level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Eğitim durumu seçiniz</option>
                <option value="İlkokul">İlkokul</option>
                <option value="Ortaokul">Ortaokul</option>
                <option value="Lise">Lise</option>
                <option value="Ön Lisans">Ön Lisans</option>
                <option value="Lisans">Lisans</option>
                <option value="Yüksek Lisans">Yüksek Lisans</option>
                <option value="Doktora">Doktora</option>
              </select>
            </div>
          </div>
        </div>

        {/* İletişim Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">İletişim Bilgileri</h3>
              <p className="text-sm text-slate-600">Üyenin iletişim bilgileri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Telefon <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.phone ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="05XX XXX XX XX"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                E-posta <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="ornek@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adres
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ev adresi giriniz"
              />
            </div>
          </div>
        </div>

        {/* İş Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">İş Bilgileri</h3>
              <p className="text-sm text-slate-600">Üyenin çalışma bilgileri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                İşyeri
              </label>
              <input
                type="text"
                name="workplace"
                value={formData.workplace}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Çalıştığı işyeri"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pozisyon
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="İş pozisyonu"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                İşe Başlama Tarihi
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Acil Durum İletişim */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Acil Durum İletişim</h3>
              <p className="text-sm text-slate-600">Acil durumlarda ulaşılacak kişi bilgileri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Kişi Adı
              </label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Acil durum kişisi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Telefon
              </label>
              <input
                type="tel"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="05XX XXX XX XX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Yakınlık Derecesi
              </label>
              <select
                name="emergency_contact_relation"
                value={formData.emergency_contact_relation}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Yakınlık derecesi seçiniz</option>
                <option value="Eş">Eş</option>
                <option value="Anne">Anne</option>
                <option value="Baba">Baba</option>
                <option value="Kardeş">Kardeş</option>
                <option value="Çocuk">Çocuk</option>
                <option value="Arkadaş">Arkadaş</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Üye Giriş Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Üye Giriş Bilgileri</h3>
              <p className="text-sm text-slate-600">
                Mobil uygulamaya giriş için şifre belirleyin. Bu alanı boş bırakırsanız üyenin şifresini daha sonra güncelleyebilirsiniz.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="En az 6 karakter"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Şifre (Tekrar)
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Şifreyi tekrar girin"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notlar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Ek Notlar</h3>
              <p className="text-sm text-slate-600">Üye hakkında ek bilgiler</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notlar
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Üye hakkında ek bilgiler, özel durumlar vb."
            />
          </div>
        </div>

        {/* Form Butonları */}
        <div className="flex items-center justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Üye Ekle</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
