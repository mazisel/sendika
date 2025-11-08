'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { cityOptions } from '@/lib/cities';
import { AdminUser, DefinitionType, GeneralDefinition } from '@/lib/types';
import { ArrowLeft, Save, User, MapPin, Phone, Mail, Briefcase, Heart, GraduationCap, Baby, AlertTriangle, Key, Hash, Upload, Trash2 } from 'lucide-react';
import type { PostgrestError } from '@supabase/supabase-js';

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
  membership_number: string;
  membership_date: string;
}

interface PendingDocument {
  id: string;
  name: string;
  type: string;
  file: File;
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
  notes: '',
  membership_number: '',
  membership_date: ''
};

const fieldLabels: Record<string, string> = {
  first_name: 'Ad',
  last_name: 'Soyad',
  tc_identity: 'TC Kimlik No',
  birth_date: 'Doğum tarihi',
  gender: 'Cinsiyet',
  city: 'İl',
  district: 'İlçe',
  phone: 'Telefon',
  email: 'E-posta',
  address: 'Adres',
  workplace: 'Çalıştığı kurum',
  position: 'Görevi',
  start_date: 'Başlangıç tarihi',
  emergency_contact_name: 'Acil durum kişi adı',
  emergency_contact_phone: 'Acil durum kişi telefonu',
  emergency_contact_relation: 'Acil durum kişi ilişki',
  education_level: 'Eğitim durumu',
  marital_status: 'Medeni durumu',
  children_count: 'Çocuk sayısı',
  notes: 'Notlar',
  membership_number: 'Üye numarası',
  membership_date: 'Üye kayıt tarihi'
};

const documentTypeOptions = [
  { value: 'kimlik', label: 'Kimlik Belgesi' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'sertifika', label: 'Sertifika' },
  { value: 'cv', label: 'Özgeçmiş' },
  { value: 'referans', label: 'Referans Mektubu' },
  { value: 'saglik', label: 'Sağlık Raporu' },
  { value: 'adli_sicil', label: 'Adli Sicil Belgesi' },
  { value: 'diger', label: 'Diğer' }
];

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export default function NewMemberPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [branchRegions, setBranchRegions] = useState<Record<string, number>>({});
  const [cityRegion, setCityRegion] = useState<number | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const canEditMembershipNumber = currentUser ? PermissionManager.canEditRestrictedFields(currentUser) : false;
  const canManageDefinitions = currentUser ? PermissionManager.canManageDefinitions(currentUser) : false;

  const allowedCities = useMemo(() => {
    if (currentUser?.role_type === 'branch_manager' && currentUser.city) {
      return [currentUser.city];
    }

    if (currentUser?.role_type === 'regional_manager' && currentUser.region) {
      const cities = Object.entries(branchRegions)
        .filter(([, region]) => region === currentUser.region)
        .map(([city]) => city)
        .sort((a, b) => a.localeCompare(b, 'tr'));
      return cities;
    }

    return cityOptions.map(option => option.name);
  }, [branchRegions, currentUser]);
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [documentForm, setDocumentForm] = useState<{ name: string; type: string; file: File | null }>({
    name: '',
    type: '',
    file: null
  });
  const [documentError, setDocumentError] = useState('');
  const [documentInputKey, setDocumentInputKey] = useState(0);
  const [definitionOptions, setDefinitionOptions] = useState<Record<DefinitionType, GeneralDefinition[]>>({
    workplace: [],
    position: []
  });
  const [definitionsLoading, setDefinitionsLoading] = useState(true);
  const [isCustomWorkplace, setIsCustomWorkplace] = useState(false);
  const [isCustomPosition, setIsCustomPosition] = useState(false);

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

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranchesLoading(true);
        const { data, error } = await supabase
          .from('branches')
          .select('city, region, is_active');

        if (error) throw error;

        const mapping: Record<string, number> = {};
        (data || []).forEach(branch => {
          if (branch.city && typeof branch.region === 'number') {
            mapping[branch.city] = branch.region;
          }
        });

        setBranchRegions(mapping);
      } catch (error) {
        console.error('Şube bilgileri alınamadı:', error);
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    if (formData.city) {
      setCityRegion(branchRegions[formData.city] ?? null);
    } else {
      setCityRegion(null);
    }
  }, [formData.city, branchRegions]);

  useEffect(() => {
    const fetchDefinitions = async () => {
      try {
        setDefinitionsLoading(true);
        const { data, error } = await supabase
          .from('general_definitions')
          .select('*')
          .in('type', ['workplace', 'position'])
          .eq('is_active', true)
          .order('type')
          .order('sort_order', { ascending: true })
          .order('label', { ascending: true });

        if (error) throw error;

        const grouped: Record<DefinitionType, GeneralDefinition[]> = {
          workplace: [],
          position: []
        };

        (data || []).forEach((item) => {
          const type = item.type as DefinitionType;
          if (grouped[type]) {
            grouped[type].push(item as GeneralDefinition);
          }
        });

        setDefinitionOptions(grouped);
      } catch (error) {
        console.error('Tanımlamalar alınamadı:', error);
      } finally {
        setDefinitionsLoading(false);
      }
    };

    fetchDefinitions();
  }, []);

  useEffect(() => {
    if (
      formData.workplace &&
      !definitionOptions.workplace.some((option) => option.label === formData.workplace) &&
      !isCustomWorkplace
    ) {
      setIsCustomWorkplace(true);
    }
  }, [formData.workplace, definitionOptions.workplace, isCustomWorkplace]);

  useEffect(() => {
    if (
      formData.position &&
      !definitionOptions.position.some((option) => option.label === formData.position) &&
      !isCustomPosition
    ) {
      setIsCustomPosition(true);
    }
  }, [formData.position, definitionOptions.position, isCustomPosition]);

  useEffect(() => {
    if (!definitionsLoading && definitionOptions.workplace.length === 0) {
      setIsCustomWorkplace(true);
    }
  }, [definitionsLoading, definitionOptions.workplace.length]);

  useEffect(() => {
    if (!definitionsLoading && definitionOptions.position.length === 0) {
      setIsCustomPosition(true);
    }
  }, [definitionsLoading, definitionOptions.position.length]);

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

  const resetDocumentForm = () => {
    setDocumentForm({ name: '', type: '', file: null });
    setDocumentInputKey(prev => prev + 1);
  };

  const handleDocumentFieldChange = (field: 'name' | 'type', value: string) => {
    setDocumentForm(prev => ({
      ...prev,
      [field]: value
    }));
    if (documentError) {
      setDocumentError('');
    }
  };

  const handleDocumentFileChange = (file: File | null) => {
    setDocumentForm(prev => ({ ...prev, file }));
    if (documentError) {
      setDocumentError('');
    }
  };

  const handleAddDocument = () => {
    if (!documentForm.name.trim() || !documentForm.type || !documentForm.file) {
      setDocumentError('Belge adı, türü ve dosyası zorunludur.');
      return;
    }

    const uniqueId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setDocuments(prev => [
      ...prev,
      {
        id: uniqueId,
        name: documentForm.name.trim(),
        type: documentForm.type,
        file: documentForm.file
      }
    ]);

    resetDocumentForm();
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const toggleWorkplaceInput = () => {
    if (isCustomWorkplace) {
      const exists = definitionOptions.workplace.some(option => option.label === formData.workplace);
      if (!exists) {
        setFormData(prev => ({ ...prev, workplace: '' }));
      }
    }
    setIsCustomWorkplace(prev => !prev);
  };

  const togglePositionInput = () => {
    if (isCustomPosition) {
      const exists = definitionOptions.position.some(option => option.label === formData.position);
      if (!exists) {
        setFormData(prev => ({ ...prev, position: '' }));
      }
    }
    setIsCustomPosition(prev => !prev);
  };

  const getDocumentTypeLabel = (value: string) =>
    documentTypeOptions.find(option => option.value === value)?.label || 'Diğer';

  const uploadPendingDocuments = async (memberId: string) => {
    for (const doc of documents) {
      const fileExt = doc.file.name.includes('.') ? doc.file.name.split('.').pop() : '';
      const storagePath = `${memberId}/${Date.now()}_${doc.id}${fileExt ? `.${fileExt}` : ''}`;

      const { error: uploadError } = await supabase.storage
        .from('member-documents')
        .upload(storagePath, doc.file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('member-documents')
        .getPublicUrl(storagePath);

      const { error: dbError } = await supabase.from('member_documents').insert({
        member_id: memberId,
        document_name: doc.name,
        document_type: doc.type,
        file_url: publicUrlData.publicUrl,
        file_size: doc.file.size
      });

      if (dbError) {
        throw dbError;
      }
    }

    resetDocumentForm();
    setDocuments([]);
    setDocumentError('');
  };

  const extractColumnName = (text?: string | null): string | null => {
    if (!text) return null;
    const keyMatch = text.match(/Key \(([^)]+)\)/);
    if (keyMatch?.[1]) {
      return keyMatch[1].split(',')[0].trim();
    }
    const columnMatch = text.match(/column \"?([a-z_]+)\"?/i);
    if (columnMatch?.[1]) {
      return columnMatch[1];
    }
    return null;
  };

  const handleInsertError = (error: PostgrestError) => {
    const searchField = (content?: string | null) => {
      if (!content) return null;
      const lowered = content.toLowerCase();
      return (['tc_identity', 'email', 'membership_number'] as const).find(field =>
        lowered.includes(field)
      );
    };

    if (error.code === '23505') {
      const field = searchField(error.message) || searchField(error.details) || extractColumnName(error.details);
      if (field) {
        const label = fieldLabels[field] || field;
        const message = `Bu ${label.toLowerCase()} ile kayıtlı bir üye zaten mevcut.`;
        setErrors(prev => ({ ...prev, [field]: message }));
        return message;
      }
      return 'Girilen bilgilere sahip başka bir üye mevcut. Lütfen kontrol edin.';
    }

    if (error.code === '23502') {
      const column = extractColumnName(error.message) || extractColumnName(error.details);
      if (column && fieldLabels[column]) {
        const message = `${fieldLabels[column]} alanı zorunludur.`;
        setErrors(prev => ({ ...prev, [column]: message }));
        return message;
      }
      return 'Zorunlu alanlardan biri eksik görünüyor. Lütfen formu kontrol edin.';
    }

    if (error.code === '23514') {
      const column = extractColumnName(error.message) || extractColumnName(error.details);
      if (column && fieldLabels[column]) {
        const message = `${fieldLabels[column]} için geçersiz bir değer girdiniz.`;
        setErrors(prev => ({ ...prev, [column]: message }));
        return message;
      }
      return 'Bazı alanlarda geçersiz değerler var. Lütfen bilgileri kontrol edin.';
    }

    if (error.code === '22P02') {
      const column = extractColumnName(error.message) || extractColumnName(error.details);
      if (column && fieldLabels[column]) {
        const message = `${fieldLabels[column]} alanındaki değer geçersiz. Lütfen kontrol edin.`;
        setErrors(prev => ({ ...prev, [column]: message }));
        return message;
      }
      return 'Sayı veya tarih alanlarında geçersiz karakterler var. Lütfen girişleri kontrol edin.';
    }

    return error.details || error.message || 'Üye eklenirken beklenmedik bir hata oluştu.';
  };

  const isValidDateString = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

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
    if (canEditMembershipNumber) {
      if (!formData.membership_number.trim()) {
        newErrors.membership_number = 'Üye numarası zorunludur';
      }
    }

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

    // Tarih formatı kontrolü
    if (formData.birth_date && !isValidDateString(formData.birth_date)) {
      newErrors.birth_date = 'Geçerli bir tarih seçiniz';
    }

    if (formData.start_date && !isValidDateString(formData.start_date)) {
      newErrors.start_date = 'Geçerli bir tarih seçiniz';
    }

    if (formData.membership_date && !isValidDateString(formData.membership_date)) {
      newErrors.membership_date = 'Geçerli bir tarih seçiniz';
    }

    // Şube yöneticisi şehir kontrolü
    if (currentUser?.role_type === 'branch_manager' && currentUser.city && formData.city !== currentUser.city) {
      newErrors.city = `Sadece ${currentUser.city} iline üye ekleyebilirsiniz`;
    }

    if (currentUser?.role_type === 'regional_manager' && currentUser.region) {
      if (!cityRegion) {
        newErrors.city = 'Seçtiğiniz il için bölge bilgisi bulunamadı.';
      } else if (cityRegion !== currentUser.region) {
        newErrors.city = `Sadece ${currentUser.region}. bölgedeki şehirlere üye ekleyebilirsiniz`;
      }
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
      const memberData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        tc_identity: formData.tc_identity.trim(),
        birth_date: formData.birth_date || null,
        gender: formData.gender,
        city: formData.city.trim(),
        district: formData.district.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim(),
        workplace: formData.workplace.trim(),
        position: formData.position.trim(),
        start_date: formData.start_date ? formData.start_date : null,
        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        emergency_contact_relation: formData.emergency_contact_relation.trim(),
        education_level: formData.education_level.trim(),
        marital_status: formData.marital_status.trim(),
        children_count: formData.children_count,
        notes: formData.notes.trim(),
        membership_number: canEditMembershipNumber ? formData.membership_number.trim() : null,
        membership_date: formData.membership_date ? formData.membership_date : null,
        membership_status: 'active', // Admin tarafından eklenen üyeler direkt aktif
        is_active: true,
        region: cityRegion
      };

      const { data, error } = await supabase
        .from('members')
        .insert([memberData])
        .select()
        .single();

      if (error) {
        const message = handleInsertError(error);
        alert(message);
        return;
      }

      if (documents.length > 0 && data?.id) {
        try {
          await uploadPendingDocuments(data.id);
        } catch (docError) {
          console.error('Üye belgeleri yüklenirken hata:', docError);
          alert('Üye kaydedildi ancak belgeler yüklenirken hata oluştu. Belgeleri üye detayından tekrar yükleyebilirsiniz.');
        }
      }

      if (password) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        if (!accessToken) {
          throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
        }

        const response = await fetch(`/api/members/${data.id}/password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          credentials: 'include',
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
        {/* Üyelik Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Hash className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Üyelik Bilgileri</h3>
              <p className="text-sm text-slate-600">Üyeye verilecek benzersiz üye numarasını belirleyin</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Üye Numarası {canEditMembershipNumber && <span className="text-red-500">*</span>}
              </label>
              {canEditMembershipNumber ? (
                <>
                  <input
                    type="text"
                    name="membership_number"
                    value={formData.membership_number}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.membership_number ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="Örn: UYE-000123"
                  />
                  {errors.membership_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.membership_number}</p>
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    Bu numara üyeye giriş ve diğer işlemler için kullanılacaktır. Benzersiz olmalıdır.
                  </p>
                </>
              ) : (
                <div className="w-full px-3 py-2 border border-dashed border-slate-300 rounded-lg bg-slate-50 text-slate-600">
                  Üye numarası kayıt sırasında otomatik atanacaktır. Bu alanı yalnızca süper adminler düzenleyebilir.
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Üye Kayıt Tarihi
              </label>
              <input
                type="date"
                name="membership_date"
                value={formData.membership_date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.membership_date ? 'border-red-500' : 'border-slate-300'
                }`}
              />
              {errors.membership_date && (
                <p className="mt-1 text-sm text-red-600">{errors.membership_date}</p>
              )}
              <p className="mt-2 text-sm text-slate-500">
                Üyenin sendikaya resmi olarak kaydedildiği tarihi seçiniz.
              </p>
            </div>
          </div>
        </div>

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
                {allowedCities.map(city => (
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
              {currentUser?.role_type === 'regional_manager' && currentUser.region && (
                <p className="mt-1 text-sm text-blue-600">
                  Sadece {currentUser.region}. bölgedeki şehirlere üye ekleyebilirsiniz.
                </p>
              )}
              {!branchesLoading && currentUser?.role_type === 'regional_manager' && currentUser.region && allowedCities.length === 0 && (
                <p className="mt-1 text-sm text-red-600">
                  Bu bölgeye bağlı aktif şube bulunamadı. Lütfen önce şube ekleyin.
                </p>
              )}
              {cityRegion && (
                <p className="mt-1 text-sm text-slate-500">
                  Seçilen şehir {cityRegion}. bölgeye bağlı.
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
                Telefon <span className="text-xs text-slate-500 ml-1">(opsiyonel)</span>
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
                E-posta <span className="text-xs text-slate-500 ml-1">(opsiyonel)</span>
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
              {!isCustomWorkplace ? (
                <select
                  name="workplace"
                  value={formData.workplace}
                  onChange={handleInputChange}
                  disabled={definitionsLoading || definitionOptions.workplace.length === 0}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="">
                    {definitionsLoading ? 'Tanımlar yükleniyor...' : 'İşyeri seçiniz'}
                  </option>
                  {definitionOptions.workplace.map((option) => (
                    <option key={option.id} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="workplace"
                  value={formData.workplace}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="İşyeri adı girin"
                />
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                <button
                  type="button"
                  onClick={toggleWorkplaceInput}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {isCustomWorkplace ? 'Listeden Seç' : 'Özel Değer Gir'}
                </button>
                <span className="text-slate-400">
                  {definitionsLoading
                    ? 'Tanımlar yükleniyor'
                    : `${definitionOptions.workplace.length} kayıt`}
                </span>
              </div>
              {canManageDefinitions && (
                <button
                  type="button"
                  onClick={() => router.push('/admin/definitions')}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  Tanımları yönet
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pozisyon
              </label>
              {!isCustomPosition ? (
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  disabled={definitionsLoading || definitionOptions.position.length === 0}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                >
                  <option value="">
                    {definitionsLoading ? 'Tanımlar yükleniyor...' : 'Pozisyon seçiniz'}
                  </option>
                  {definitionOptions.position.map((option) => (
                    <option key={option.id} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="İş pozisyonu girin"
                />
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                <button
                  type="button"
                  onClick={togglePositionInput}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {isCustomPosition ? 'Listeden Seç' : 'Özel Değer Gir'}
                </button>
                <span className="text-slate-400">
                  {definitionsLoading
                    ? 'Tanımlar yükleniyor'
                    : `${definitionOptions.position.length} kayıt`}
                </span>
              </div>
              {canManageDefinitions && (
                <button
                  type="button"
                  onClick={() => router.push('/admin/definitions')}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  Tanımları yönet
                </button>
              )}
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
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
              )}
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

        {/* Üye Belgeleri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Üye Belgeleri</h3>
              <p className="text-sm text-slate-600">Kimlik, diploma vb. belgeleri üyeyi kaydederken yükleyin</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Belge Adı
                </label>
                <input
                  type="text"
                  value={documentForm.name}
                  onChange={(e) => handleDocumentFieldChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Örn. Kimlik Fotokopisi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Belge Türü
                </label>
                <select
                  value={documentForm.type}
                  onChange={(e) => handleDocumentFieldChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Belge türü seçiniz</option>
                  {documentTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dosya
                </label>
                <input
                  key={documentInputKey}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => handleDocumentFileChange(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">PDF, Word, JPG veya PNG dosyaları desteklenir</p>
              </div>
            </div>

            {documentError && (
              <p className="text-sm text-red-600">{documentError}</p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddDocument}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Belgeyi listeye ekle
              </button>
            </div>
          </div>

          <div className="mt-6">
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">
                Henüz eklenmiş belge yok. Belgeleri kayıttan önce listeye ekleyebilirsiniz.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Belge Adı
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Tür
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Dosya
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {documents.map(doc => (
                      <tr key={doc.id}>
                        <td className="px-4 py-2 text-sm text-slate-900">{doc.name}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{getDocumentTypeLabel(doc.type)}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">
                          <div>{doc.file.name}</div>
                          <div className="text-xs text-slate-400">{formatFileSize(doc.file.size)}</div>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Kaldır
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
