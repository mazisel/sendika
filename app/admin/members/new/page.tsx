'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { cityOptions } from '@/lib/cities';
import { getDistrictsByCity } from '@/lib/districts';
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

  // Professional
  workplace: string; // İş Yeri
  institution: string; // Kurum
  position: string; // Kadro Unvanı
  institution_register_no: string; // Kurum Sicil No
  retirement_register_no: string; // Emekli Sicil No
  start_date: string;

  // Personal Additional
  father_name: string;
  mother_name: string;
  birth_place: string;
  blood_group: string;

  // Contact & Other
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
  institution: '',
  position: '',
  institution_register_no: '',
  retirement_register_no: '',
  start_date: '',

  father_name: '',
  mother_name: '',
  birth_place: '',
  blood_group: '',

  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  education_level: '',
  marital_status: '',
  children_count: 0,
  notes: '',
  membership_number: '',
  membership_date: '',
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
  workplace: 'İş Yeri',
  institution: 'Kurum',
  position: 'Kadro Unvanı',
  institution_register_no: 'Kurum Sicil No',
  retirement_register_no: 'Emekli Sicil No',
  start_date: 'Başlangıç tarihi',
  father_name: 'Baba Adı',
  mother_name: 'Anne Adı',
  birth_place: 'Doğum Yeri',
  blood_group: 'Kan Grubu',
  emergency_contact_name: 'Acil durum kişi adı',
  emergency_contact_phone: 'Acil durum kişi telefonu',
  emergency_contact_relation: 'Acil durum kişi ilişki',
  education_level: 'Eğitim durumu',
  marital_status: 'Medeni durumu',
  children_count: 'Çocuk sayısı',
  notes: 'Notlar',
  membership_number: 'Üye numarası',
  membership_date: 'Üye kayıt tarihi',
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

  const currentDistricts = useMemo(() => {
    return formData.city ? getDistrictsByCity(formData.city) : [];
  }, [formData.city]);

  // Şehir değiştiğinde ilçe seçimi geçersizse sıfırla
  useEffect(() => {
    if (formData.city && formData.district) {
      const validDistricts = getDistrictsByCity(formData.city);
      if (!validDistricts.includes(formData.district)) {
        setFormData(prev => ({ ...prev, district: '' }));
      }
    }
  }, [formData.city]);

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

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    setCurrentUser(user);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'children_count' ? parseInt(value) || 0 : value
    }));

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

    const file = documentForm.file;
    const uniqueId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setDocuments(prev => [
      ...prev,
      {
        id: uniqueId,
        name: documentForm.name.trim(),
        type: documentForm.type,
        file
      }
    ]);

    resetDocumentForm();
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
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

    if (!formData.first_name.trim()) newErrors.first_name = 'Ad zorunludur';
    if (!formData.last_name.trim()) newErrors.last_name = 'Soyad zorunludur';
    if (!formData.tc_identity.trim()) newErrors.tc_identity = 'TC Kimlik No zorunludur';
    if (!formData.birth_date) newErrors.birth_date = 'Doğum tarihi zorunludur';
    if (!formData.gender) newErrors.gender = 'Cinsiyet zorunludur';
    if (!formData.city.trim()) newErrors.city = 'İl zorunludur';
    if (!formData.district.trim()) newErrors.district = 'İlçe zorunludur';
    if (!formData.father_name.trim()) newErrors.father_name = 'Baba adı zorunludur';
    if (!formData.mother_name.trim()) newErrors.mother_name = 'Anne adı zorunludur';
    if (!formData.birth_place.trim()) newErrors.birth_place = 'Doğum yeri zorunludur';
    if (!formData.blood_group) newErrors.blood_group = 'Kan grubu zorunludur';
    if (!formData.marital_status) newErrors.marital_status = 'Medeni durum zorunludur';
    if (!formData.education_level) newErrors.education_level = 'Öğrenim durumu zorunludur';
    if (!formData.institution.trim()) newErrors.institution = 'Kurum adı zorunludur';
    if (!formData.workplace.trim()) newErrors.workplace = 'İş yeri zorunludur';
    if (!formData.position.trim()) newErrors.position = 'Kadro unvanı zorunludur';
    if (!formData.institution_register_no.trim()) newErrors.institution_register_no = 'Kurum sicil no zorunludur';
    if (!formData.start_date) newErrors.start_date = 'İşe başlama tarihi zorunludur';
    if (!formData.phone.trim()) newErrors.phone = 'Telefon zorunludur';

    if (canEditMembershipNumber) {
      if (!formData.membership_number.trim()) {
        newErrors.membership_number = 'Üye numarası zorunludur';
      }
    }

    if (formData.tc_identity && formData.tc_identity.length !== 11) {
      newErrors.tc_identity = 'TC Kimlik No 11 haneli olmalıdır';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }

    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Geçerli bir telefon numarası giriniz';
    }

    if (formData.birth_date && !isValidDateString(formData.birth_date)) {
      newErrors.birth_date = 'Geçerli bir tarih seçiniz';
    }
    if (formData.start_date && !isValidDateString(formData.start_date)) {
      newErrors.start_date = 'Geçerli bir tarih seçiniz';
    }
    if (formData.membership_date && !isValidDateString(formData.membership_date)) {
      newErrors.membership_date = 'Geçerli bir tarih seçiniz';
    }

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
        institution: formData.institution.trim(),
        institution_register_no: formData.institution_register_no.trim(),
        retirement_register_no: formData.retirement_register_no.trim(),
        start_date: formData.start_date ? formData.start_date : null,

        father_name: formData.father_name.trim(),
        mother_name: formData.mother_name.trim(),
        birth_place: formData.birth_place.trim(),
        blood_group: formData.blood_group,

        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        emergency_contact_relation: formData.emergency_contact_relation.trim(),
        education_level: formData.education_level.trim(),
        marital_status: formData.marital_status.trim(),
        children_count: formData.children_count,
        notes: formData.notes.trim(),
        membership_number: canEditMembershipNumber ? formData.membership_number.trim() : null,
        membership_date: formData.membership_date ? formData.membership_date : null,

        membership_status: 'active',
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

      await Logger.log({
        action: 'CREATE',
        entityType: 'MEMBER',
        entityId: data.id,
        details: { memberName: `${memberData.first_name} ${memberData.last_name}`, createdBy: currentUser?.id },
        userId: currentUser?.id
      });

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
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
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

        <div>
          {/* Document Upload Button */}
          <input
            type="file"
            accept="image/*"
            id="id-card-upload"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              if (file.size > 5 * 1024 * 1024) {
                alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
                return;
              }

              const formData = new FormData();
              formData.append('file', file);

              try {
                setLoading(true);
                const response = await fetch('/api/ai/scan-id', {
                  method: 'POST',
                  body: formData
                });

                if (!response.ok) {
                  const errorData = await response.json().catch(() => null);
                  throw new Error(errorData?.error || 'Kimlik tarama başarısız oldu.');
                }

                const data = await response.json();

                if (data.error) {
                  throw new Error(data.error);
                }

                setFormData(prev => ({
                  ...prev,
                  first_name: data.first_name || prev.first_name,
                  last_name: data.last_name || prev.last_name,
                  tc_identity: data.tc_identity || prev.tc_identity,
                  birth_date: data.birth_date || prev.birth_date,
                  gender: data.gender || prev.gender
                }));

                alert('Kimlik bilgileri başarıyla tarandı ve forma dolduruldu! Lütfen bilgileri kontrol ediniz.');

              } catch (error) {
                console.error('ID Scan error:', error);
                alert('Kimlik taranırken bir hata oluştu. Lütfen tekrar deneyin veya elle giriş yapın.');
              } finally {
                setLoading(false);
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => document.getElementById('id-card-upload')?.click()}
            disabled={loading}
            className="group relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800"
          >
            <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0 flex items-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4 text-purple-600 group-hover:text-white" />}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-500 group-hover:text-white">
                {loading ? 'Taranıyor...' : 'Akıllı Kimlik Tara (AI)'}
              </span>
            </span>
          </button>
        </div>
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
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.membership_number ? 'border-red-500' : 'border-slate-300'
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.membership_date ? 'border-red-500' : 'border-slate-300'
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.first_name ? 'border-red-500' : 'border-slate-300'
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.last_name ? 'border-red-500' : 'border-slate-300'
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.tc_identity ? 'border-red-500' : 'border-slate-300'
                  }`}
                placeholder="TC Kimlik Numarasını giriniz"
              />
              {errors.tc_identity && (
                <p className="mt-1 text-sm text-red-600">{errors.tc_identity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Baba Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="father_name"
                value={formData.father_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Baba adı"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Anne Adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="mother_name"
                value={formData.mother_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Anne adı"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Doğum Yeri <span className="text-red-500">*</span>
              </label>
              <select
                name="birth_place"
                value={formData.birth_place}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seçiniz</option>
                {cityOptions.map(city => (
                  <option key={city.code} value={city.name}>{city.name}</option>
                ))}
              </select>
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.birth_date ? 'border-red-500' : 'border-slate-300'
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.gender ? 'border-red-500' : 'border-slate-300'
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
                Kan Grubu <span className="text-red-500">*</span>
              </label>
              <select
                name="blood_group"
                value={formData.blood_group}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seçiniz</option>
                <option value="A Rh+">A Rh+</option>
                <option value="A Rh-">A Rh-</option>
                <option value="B Rh+">B Rh+</option>
                <option value="B Rh-">B Rh-</option>
                <option value="AB Rh+">AB Rh+</option>
                <option value="AB Rh-">AB Rh-</option>
                <option value="0 Rh+">0 Rh+</option>
                <option value="0 Rh-">0 Rh-</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Eğitim Durumu <span className="text-red-500">*</span>
              </label>
              <select
                name="education_level"
                value={formData.education_level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seçiniz</option>
                <option value="İlkokul">İlkokul</option>
                <option value="Ortaokul">Ortaokul</option>
                <option value="Lise">Lise</option>
                <option value="Önlisans">Önlisans</option>
                <option value="Lisans">Lisans</option>
                <option value="Yüksek Lisans">Yüksek Lisans</option>
                <option value="Doktora">Doktora</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Medeni Durum <span className="text-red-500">*</span>
              </label>
              <select
                name="marital_status"
                value={formData.marital_status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seçiniz</option>
                <option value="Bekar">Bekar</option>
                <option value="Evli">Evli</option>
                <option value="Boşanmış">Boşanmış</option>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
              <p className="text-sm text-slate-600">Üyenin iletişim ve adres bilgileri</p>
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.phone ? 'border-red-500' : 'border-slate-300'
                  }`}
                placeholder="5XX XXX XX XX"
                maxLength={10}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                E-posta
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : 'border-slate-300'
                  }`}
                placeholder="ornek@email.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.city ? 'border-red-500' : 'border-slate-300'
                  }`}
              >
                <option value="">İl Seçiniz</option>
                {allowedCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                İlçe <span className="text-red-500">*</span>
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.district ? 'border-red-500' : 'border-slate-300'
                  }`}
                disabled={!formData.city}
              >
                <option value="">İlçe Seçiniz</option>
                {currentDistricts.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
              {errors.district && (
                <p className="mt-1 text-sm text-red-600">{errors.district}</p>
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
                placeholder="Açık adres giriniz"
              />
            </div>
          </div>
        </div>

        {/* Mesleki Bilgiler */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Mesleki Bilgiler</h3>
              <p className="text-sm text-slate-600">Üyenin çalışma hayatı ile ilgili bilgiler</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                İş Yeri (Çalıştığı Kurum) <span className="text-red-500">*</span>
              </label>
              <select
                name="workplace"
                value={formData.workplace}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seçiniz</option>
                {definitionOptions.workplace.map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              {canManageDefinitions && (
                <div className="mt-1">
                  <a href="/admin/definitions?tab=workplace" target="_blank" className="text-xs text-blue-600 hover:underline">
                    + Yeni İş Yeri Ekle
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Kurum <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Kurum adı"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Kadro Unvanı (Pozisyon) <span className="text-red-500">*</span>
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seçiniz</option>
                {definitionOptions.position.map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              {canManageDefinitions && (
                <div className="mt-1">
                  <a href="/admin/definitions?tab=position" target="_blank" className="text-xs text-blue-600 hover:underline">
                    + Yeni Unvan Ekle
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Kurum Sicil No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="institution_register_no"
                value={formData.institution_register_no}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Sicil No"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Emekli Sicil No
              </label>
              <input
                type="text"
                name="retirement_register_no"
                value={formData.retirement_register_no}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Emekli Sicil No"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                İşe Başlama Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.start_date ? 'border-red-500' : 'border-slate-300'
                  }`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
              )}
            </div>
          </div>
        </div>

        {/* Portföy ve Şifre (Opsiyonel) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Üye Hesabı (Opsiyonel)</h3>
              <p className="text-sm text-slate-600">Üyenin sisteme giriş yapabilmesi için şifre belirleyin</p>
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.password ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="******"
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.confirmPassword ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="******"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Upload className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="text-md font-semibold text-slate-900">Belgeler</h4>
            </div>

            {/* Document Upload Area */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    placeholder="Belge Adı"
                    value={documentForm.name}
                    onChange={(e) => handleDocumentFieldChange('name', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={documentForm.type}
                    onChange={(e) => handleDocumentFieldChange('type', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="">Belge Türü</option>
                    {documentTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4 flex gap-2">
                  <input
                    key={documentInputKey}
                    type="file"
                    onChange={(e) => handleDocumentFileChange(e.target.files?.[0] || null)}
                    className="flex-1 text-sm text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm"
                  >
                    Ekle
                  </button>
                </div>
              </div>
              {documentError && <p className="text-xs text-red-500">{documentError}</p>}

              {/* Pending Document List */}
              {documents.length > 0 && (
                <div className="bg-slate-50 rounded-lg border border-slate-200">
                  <ul className="divide-y divide-slate-200">
                    {documents.map((doc) => (
                      <li key={doc.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <Upload className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{doc.name}</p>
                            <p className="text-xs text-slate-500 flex items-center">
                              <span>{getDocumentTypeLabel(doc.type)}</span>
                              <span className="mx-1">•</span>
                              <span>{formatFileSize(doc.file.size)}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Kaldır"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-8 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Üyeyi Kaydet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
