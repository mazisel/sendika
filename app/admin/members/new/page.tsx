'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { MemberService } from '@/lib/services/memberService';
import { cityOptions } from '@/lib/cities';
import { getDistrictsByCity } from '@/lib/districts';
import { AdminUser, DefinitionType, GeneralDefinition } from '@/lib/types';
import { ArrowLeft, Save, User, MapPin, Phone, Mail, Briefcase, Heart, GraduationCap, Baby, AlertTriangle, Key, Hash, Upload, Trash2, Activity, FileText, Lock, Unlock } from 'lucide-react';
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
  decision_number: string;
  selected_branch_id: string; // UI only
  region: string | null; // Manual override or calculated
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
  decision_number: '',
  selected_branch_id: '',
  region: null,
};

const fieldLabels: Record<string, string> = {
  first_name: 'Ad',
  last_name: 'Soyad',
  tc_identity: 'TC Kimlik No',
  birth_date: 'Doğum Tarihi',
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
  start_date: 'İşe Başlama Tarihi',
  father_name: 'Baba Adı',
  mother_name: 'Anne Adı',
  birth_place: 'Doğum Yeri',
  blood_group: 'Kan Grubu',
  emergency_contact_name: 'Acil Durum Kişi Adı',
  emergency_contact_phone: 'Acil Durum Kişi Telefonu',
  emergency_contact_relation: 'Acil Durum Kişi Yakınlığı',
  education_level: 'Eğitim Durumu',
  marital_status: 'Medeni Durumu',
  children_count: 'Çocuk Sayısı',
  notes: 'Notlar',
  membership_number: 'Üye Numarası',
  membership_date: 'Üye Kayıt Tarihi',
  decision_number: 'Karar No',
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
  const [branchRegions, setBranchRegions] = useState<Record<string, string>>({});
  const [cityRegion, setCityRegion] = useState<string | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const canEditMembershipNumber = currentUser ? PermissionManager.canEditRestrictedFields(currentUser) : false;
  const canManageDefinitions = currentUser ? PermissionManager.canManageDefinitions(currentUser) : false;

  const allowedCities = useMemo(() => {
    if (currentUser?.role_type === 'branch_manager' && currentUser.city) {
      return [currentUser.city];
    }

    if (currentUser?.role_type === 'regional_manager' && currentUser.region) {
      const cities = Object.entries(branchRegions)
        .filter(([, region]) => region === currentUser.region?.toString()) // Convert currentUser.region to string if it's number, or just compare
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
    position: [],
    title: []
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

  const [branches, setBranches] = useState<{ id: string; branch_name: string; city: string; region_id: string | null }[]>([]);
  const [regions, setRegions] = useState<any[]>([]); // Using any for Region type temporarily or import it

  useEffect(() => {
    const fetchRegionsData = async () => {
      try {
        const { data, error } = await supabase
          .from('regions')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setRegions(data || []);
      } catch (error) {
        console.error('Bölgeler alınamadı:', error);
      }
    };
    fetchRegionsData();
  }, []);

  const [isLockOpen, setIsLockOpen] = useState(false);

  // Auto-generate membership number
  useEffect(() => {
    const fetchNextNumber = async () => {
      if (formData.membership_number) return;

      try {
        const { data } = await supabase
          .from('members')
          .select('membership_number')
          .not('membership_number', 'is', null)
          .neq('membership_number', '')
          .order('created_at', { ascending: false })
          .limit(200);

        if (data && data.length > 0) {
          const numbers = data
            .map(m => parseInt(m.membership_number))
            .filter(n => !isNaN(n));

          if (numbers.length > 0) {
            const maxNum = Math.max(...numbers);
            setFormData(prev => ({ ...prev, membership_number: String(maxNum + 1) }));
          } else {
            setFormData(prev => ({ ...prev, membership_number: '1' }));
          }
        } else {
          setFormData(prev => ({ ...prev, membership_number: '1' }));
        }
      } catch (error) {
        console.error('Error fetching next member number:', error);
      }
    };

    fetchNextNumber();
  }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranchesLoading(true);
        const { data, error } = await supabase
          .from('branches')
          .select('id, branch_name, city, region_id, is_active')
          .eq('is_active', true);

        if (error) throw error;

        // Map database fields to our internal state
        const validBranches = (data || [])
          .map(b => ({
            id: b.id,
            branch_name: b.branch_name,
            city: b.city,
            region_id: b.region_id
          }));

        setBranches(validBranches);

        const mapping: Record<string, string> = {};
        validBranches.forEach(branch => {
          if (branch.city && branch.region_id) {
            mapping[branch.city] = branch.region_id;
          }
        });
        // We'll use mapping to auto-select region based on city from branch
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
      const region = branchRegions[formData.city] ?? null;
      setCityRegion(region);
      // Auto-update form region if not set or if needed. 
      // Let's rely on user selection or auto-fill from branch.
      // If city changes and we have a region mapping, maybe update the form region too?
      if (!formData.region && region) {
        setFormData(prev => ({ ...prev, region }));
      }
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
          position: [],
          title: []
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

    if (name === 'selected_branch_id') {
      const selectedBranch = branches.find(b => b.id === value);
      if (selectedBranch) {
        setFormData(prev => ({
          ...prev,
          selected_branch_id: value,
          city: selectedBranch.city,
          region: selectedBranch.region_id
        }));
      } else {
        setFormData(prev => ({ ...prev, selected_branch_id: '' }));
      }
    } else if (name === 'region') {
      setFormData(prev => ({ ...prev, region: value || null }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'children_count' ? Math.max(0, parseInt(value) || 0) : value
      }));
    }

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
    if (file && file.size > 10 * 1024 * 1024) {
      setDocumentError('Dosya boyutu 10MB\'dan büyük olamaz.');
      setDocumentForm(prev => ({ ...prev, file: null }));
      return;
    }

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

      await MemberService.uploadDocument(doc.file, storagePath);

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
    // Pattern 1: Key (column_name)
    const keyMatch = text.match(/Key \(([^)]+)\)/);
    if (keyMatch?.[1]) {
      return keyMatch[1].split(',')[0].trim();
    }
    // Pattern 2: column "column_name"
    const columnMatch = text.match(/column \"?([a-z_]+)\"?/i);
    if (columnMatch?.[1]) {
      return columnMatch[1];
    }
    // Pattern 3: "column_name" = value
    const valueMatch = text.match(/\"([a-z_]+)\"\s*=/i);
    if (valueMatch?.[1]) {
      return valueMatch[1];
    }
    // Pattern 4: invalid input for ... column_name
    const inputMatch = text.match(/invalid input.*?\"([a-z_]+)\"/i);
    if (inputMatch?.[1]) {
      return inputMatch[1];
    }
    return null;
  };

  const handleInsertError = (error: PostgrestError) => {
    // Debug logging for development
    console.error('PostgrestError:', { code: error.code, message: error.message, details: error.details, hint: error.hint });

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
        scrollToField(field);
        return message;
      }
      return 'Girilen bilgilere sahip başka bir üye mevcut. Lütfen kontrol edin.';
    }

    if (error.code === '23502') {
      const column = extractColumnName(error.message) || extractColumnName(error.details);
      if (column && fieldLabels[column]) {
        const message = `${fieldLabels[column]} alanı zorunludur.`;
        setErrors(prev => ({ ...prev, [column]: message }));
        scrollToField(column);
        return message;
      }
      return 'Zorunlu alanlardan biri eksik görünüyor. Lütfen formu kontrol edin.';
    }

    if (error.code === '23514') {
      const column = extractColumnName(error.message) || extractColumnName(error.details);
      if (column && fieldLabels[column]) {
        const message = `${fieldLabels[column]} için geçersiz bir değer girdiniz.`;
        setErrors(prev => ({ ...prev, [column]: message }));
        scrollToField(column);
        return message;
      }
      return 'Bazı alanlarda geçersiz değerler var. Lütfen bilgileri kontrol edin.';
    }

    if (error.code === '22P02') {
      const column = extractColumnName(error.message) || extractColumnName(error.details);
      if (column && fieldLabels[column]) {
        const message = `${fieldLabels[column]} alanındaki değer geçersiz (tip hatası). Lütfen kontrol edin.`;
        setErrors(prev => ({ ...prev, [column]: message }));
        scrollToField(column);
        return message;
      }
      // If we can't determine the specific field, show a generic message with details
      // The debug log will help identify the actual problem
      return `Sayı veya tarih alanlarında geçersiz karakterler var. (${error.details || error.message})`;
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
      if (!formData.email?.trim()) {
        newErrors.email = 'Şifre belirlemek için E-posta adresi zorunludur';
      }
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

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      scrollToField(firstErrorField);
      return false;
    }

    return true;
  };

  const scrollToField = (fieldName: string) => {
    const element = document.getElementsByName(fieldName)[0] || document.getElementById(fieldName);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
        element.focus();
      }
    }
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
        start_date: formData.start_date || null, // start_date boş ise null gönder

        father_name: formData.father_name.trim(),
        mother_name: formData.mother_name.trim(),
        birth_place: formData.birth_place.trim(),
        blood_group: formData.blood_group,

        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_phone: formData.emergency_contact_phone.trim(),
        emergency_contact_relation: formData.emergency_contact_relation.trim(),
        education_level: formData.education_level.trim(),
        marital_status: formData.marital_status.trim(),
        children_count: Number(formData.children_count) || 0, // Ensure valid integer
        notes: formData.notes.trim(),
        membership_number: canEditMembershipNumber ? formData.membership_number.trim() : null,
        membership_date: formData.membership_date ? formData.membership_date : null,
        decision_number: formData.decision_number.trim() || null,

        membership_status: 'active',
        is_active: true,
        region: formData.region ? Number(formData.region) : (typeof cityRegion === 'number' ? cityRegion : null)
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
                Üye Numarası <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="membership_number"
                  value={formData.membership_number}
                  onChange={handleInputChange}
                  readOnly={!isLockOpen}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.membership_number ? 'border-red-500' : 'border-slate-300'
                    } ${!isLockOpen ? 'bg-slate-100 text-slate-500' : ''}`}
                  placeholder="Otomatik atanır"
                />
                {canEditMembershipNumber && (
                  <button
                    type="button"
                    onClick={() => setIsLockOpen(!isLockOpen)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 focus:outline-none transition-colors"
                    title={isLockOpen ? "Kilitle" : "Düzenlemek için kilidi aç"}
                  >
                    {isLockOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                )}
              </div>
              {errors.membership_number && (
                <p className="mt-1 text-sm text-red-600">{errors.membership_number}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {isLockOpen
                  ? 'Dikkat: Numarayı manuel olarak düzenliyorsunuz. Benzersiz olmalıdır.'
                  : `Son üye numarasına göre otomatik belirlenmiştir. ${canEditMembershipNumber ? 'Değiştirmek için kilit ikonuna basınız.' : ''}`}
              </p>
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
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-3 h-3" /> {errors.membership_date}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Karar Numarası
              </label>
              <input
                type="text"
                name="decision_number"
                value={formData.decision_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: 2024/15"
              />
            </div>

            {/* Şube ve Bölge Seçimi (Admin için) */}
            {!currentUser?.role_type || currentUser.role_type !== 'branch_manager' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Şube Seçimi
                  </label>
                  <select
                    name="selected_branch_id"
                    value={formData.selected_branch_id}
                    onChange={handleInputChange}
                    disabled={branchesLoading}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Şube Seçiniz</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.branch_name} ({branch.city})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Şube seçildiğinde İl ve Bölge bilgileri otomatik gelir.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bölge
                  </label>
                  <select
                    name="region"
                    value={formData.region || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Bölge Seçiniz</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    İl veya şube seçimine göre otomatik gelir, gerekirse değiştirebilirsiniz.
                  </p>
                </div>
              </>
            ) : null}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.father_name ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Baba adı"
              />
              {errors.father_name && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.father_name}
                </p>
              )}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.mother_name ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Anne adı"
              />
              {errors.mother_name && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.mother_name}
                </p>
              )}
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
                Kan Grubu
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.education_level ? 'border-red-500' : 'border-slate-300'}`}
              >
                <option value="">Seçiniz</option>
                <option value="İlkokul">İlkokul</option>
                <option value="Ortaokul">Ortaokul</option>
                <option value="Lise">Lise</option>
                <option value="Ön Lisans">Ön Lisans</option>
                <option value="Lisans">Lisans</option>
                <option value="Yüksek Lisans">Yüksek Lisans</option>
                <option value="Doktora">Doktora</option>
              </select>
              {errors.education_level && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.education_level}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Medeni Durum <span className="text-red-500">*</span>
              </label>
              <select
                name="marital_status"
                value={formData.marital_status}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.marital_status ? 'border-red-500' : 'border-slate-300'}`}
              >
                <option value="">Seçiniz</option>
                <option value="Bekar">Bekar</option>
                <option value="Evli">Evli</option>
                <option value="Boşanmış">Boşanmış</option>
              </select>
              {errors.marital_status && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.marital_status}
                </p>
              )}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.children_count ? 'border-red-500' : 'border-slate-300'}`}
              />
              {errors.children_count && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.children_count}
                </p>
              )}
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

        {/* Acil Durum Bilgileri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Acil Durum Bilgileri</h3>
              <p className="text-sm text-slate-600">Acil durumlarda ulaşılacak kişi bilgileri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adı Soyadı
              </label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ad Soyad"
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
                placeholder="5XX XXX XX XX"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Yakınlık Derecesi
              </label>
              <input
                type="text"
                name="emergency_contact_relation"
                value={formData.emergency_contact_relation}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: Eşi, Babası, Kardeşi"
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.workplace ? 'border-red-500' : 'border-slate-300'}`}
              >
                <option value="">Seçiniz</option>
                {definitionOptions.workplace.map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              {errors.workplace && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.workplace}
                </p>
              )}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.institution ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Kurum adı"
              />
              {errors.institution && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.institution}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Kadro Unvanı (Pozisyon) <span className="text-red-500">*</span>
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.position ? 'border-red-500' : 'border-slate-300'}`}
              >
                <option value="">Seçiniz</option>
                {definitionOptions.position.map(opt => (
                  <option key={opt.id} value={opt.label}>{opt.label}</option>
                ))}
              </select>
              {errors.position && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.position}
                </p>
              )}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.institution_register_no ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="Sicil No"
              />
              {errors.institution_register_no && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.institution_register_no}
                </p>
              )}
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
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.start_date}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Üye Hesabı (Opsiyonel) */}
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
        </div>

        {/* Belgeler */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Belgeler</h3>
              <p className="text-sm text-slate-600">Üyeye ait belgeleri ekleyin</p>
            </div>
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
