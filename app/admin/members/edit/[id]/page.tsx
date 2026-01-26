'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { cityOptions } from '@/lib/cities';
import { getDistrictsByCity } from '@/lib/districts';
import { AdminUser, DefinitionType, GeneralDefinition } from '@/lib/types';
import type { MemberDue } from '@/types/dues';
import { ArrowLeft, Save, User, MapPin, Phone, Mail, Briefcase, AlertTriangle, Key, Wallet, CircleDollarSign, CheckCircle2, TrendingDown, Loader2, ArrowRight } from 'lucide-react';

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
  institution: string;
  institution_register_no: string;
  retirement_register_no: string;
  start_date: string;

  father_name: string;
  mother_name: string;
  birth_place: string;
  blood_group: string;


  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  education_level: string;
  marital_status: string;
  children_count: number;
  notes: string;
  membership_status: string;
  is_active: boolean;
  membership_date: string;
  decision_number: string;
  selected_branch_id: string; // UI only
  region: string | null; // Manual override or calculated
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
  institution: '',
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
  membership_status: 'active',
  is_active: true,
  membership_date: '',
  decision_number: '',
  selected_branch_id: '',
  region: null,
};

const emptyMemberDueSummary = {
  total_expected: 0,
  total_paid: 0,
  total_outstanding: 0,
  paid_count: 0,
  partial_count: 0,
  overdue_count: 0,
  pending_count: 0
};

type MemberDueRecord = MemberDue & {
  member_due_periods?: {
    name: string;
    due_date: string;
    due_amount: number;
    penalty_rate?: number;
    status?: string;
  } | null;
  total_due_amount?: number;
  outstanding_amount?: number;
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'UTC'
});

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return dateFormatter.format(date);
};

export default function EditMemberPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [membershipNumber, setMembershipNumber] = useState<string>('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [duesLoading, setDuesLoading] = useState(false);
  const [duesError, setDuesError] = useState('');
  const [memberDuesSummary, setMemberDuesSummary] = useState(emptyMemberDueSummary);
  const [memberDueRecords, setMemberDueRecords] = useState<MemberDueRecord[]>([]);
  const [branchRegions, setBranchRegions] = useState<Record<string, string>>({});
  const [branches, setBranches] = useState<{ id: string; branch_name: string; city: string; region_id: string | null }[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [cityRegion, setCityRegion] = useState<string | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const canEditMembershipNumber = currentUser ? PermissionManager.canEditRestrictedFields(currentUser) : false;
  const [definitionOptions, setDefinitionOptions] = useState<Record<DefinitionType, GeneralDefinition[]>>({
    workplace: [],
    position: [],
    title: []
  });
  const [definitionsLoading, setDefinitionsLoading] = useState(true);
  const canManageDefinitions = currentUser ? PermissionManager.canManageDefinitions(currentUser) : false;

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

  const allowedCities = useMemo(() => {
    if (currentUser?.role_type === 'branch_manager' && currentUser.city) {
      return [currentUser.city];
    }

    if (currentUser?.role_type === 'regional_manager' && currentUser.region) {
      const cities = Object.entries(branchRegions)
        .filter(([, region]) => region === currentUser.region?.toString())
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

  const formatCurrency = (value: number) =>
    value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });

  const memberDueStatusBadges: Record<string, { label: string; className: string }> = {
    paid: { label: 'Ödendi', className: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
    partial: { label: 'Kısmi', className: 'bg-amber-100 text-amber-700 ring-amber-200' },
    overdue: { label: 'Gecikmiş', className: 'bg-red-100 text-red-700 ring-red-200' },
    pending: { label: 'Beklemede', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
    cancelled: { label: 'İptal', className: 'bg-gray-200 text-gray-600 ring-gray-300' }
  };

  const getStatusBadge = (status: string) =>
    memberDueStatusBadges[status] ?? {
      label: status,
      className: 'bg-slate-100 text-slate-700 ring-slate-200'
    };

  useEffect(() => {
    // Kullanıcı bilgilerini al
    const user = AdminAuth.getCurrentUser();
    setCurrentUser(user);

    // Üye bilgilerini yükle
    loadMember();
    loadMemberDues();
  }, [memberId]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranchesLoading(true)
        const { data, error } = await supabase
          .from('branches')
          .select('id, branch_name, city, region_id, is_active')
          .eq('is_active', true);

        if (error) throw error;

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

        setBranchRegions(mapping);
      } catch (error) {
        console.error('Şube bilgileri alınamadı:', error);
      } finally {
        setBranchesLoading(false)
      }
    };

    fetchBranches();
  }, []);

  useEffect(() => {
    if (formData.city) {
      const region = branchRegions[formData.city] ?? null;
      setCityRegion(region);
      if (!formData.region && region) {
        setFormData(prev => ({ ...prev, region }));
      }
    } else {
      setCityRegion(null);
    }
  }, [formData.city, branchRegions]);

  // Sync selected branch if city matches an existing branch
  useEffect(() => {
    if (branches.length > 0 && formData.city && !formData.selected_branch_id) {
      const matchingBranch = branches.find(b => b.city === formData.city);
      if (matchingBranch) {
        setFormData(prev => ({ ...prev, selected_branch_id: matchingBranch.id }));
      }
    }
  }, [branches, formData.city]);

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

  const loadMember = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (error) throw error;

      if (data) {
        const viewer = AdminAuth.getCurrentUser();
        if (viewer && !PermissionManager.canViewMembers(viewer, data.region, data.city)) {
          alert('Bu üyeyi görüntüleme yetkiniz bulunmuyor.');
          router.push('/admin/members');
          return;
        }

        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          tc_identity: data.tc_identity || '',
          birth_date: data.birth_date || '',
          gender: data.gender || '',
          city: data.city || '',
          district: data.district || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          workplace: data.workplace || '',
          position: data.position || '',
          institution: data.institution || '',
          institution_register_no: data.institution_register_no || '',
          retirement_register_no: data.retirement_register_no || '',
          start_date: data.start_date || '',
          father_name: data.father_name || '',
          mother_name: data.mother_name || '',
          birth_place: data.birth_place || '',
          blood_group: data.blood_group || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relation: data.emergency_contact_relation || '',
          education_level: data.education_level || '',
          marital_status: data.marital_status || '',
          children_count: data.children_count || 0,
          notes: data.notes || '',
          membership_status: data.membership_status || 'active',
          is_active: data.is_active || true,
          membership_date: data.membership_date || '',
          decision_number: data.decision_number || '',
          selected_branch_id: '',
          region: data.region || null,
        });
        setMembershipNumber(data.membership_number || '');
        setCityRegion(data.region || null);
      }
    } catch (error) {
      console.error('Üye bilgileri yüklenirken hata:', error);
      alert('Üye bilgileri yüklenirken bir hata oluştu.');
      router.push('/admin/members');
    } finally {
      setPageLoading(false);
    }
  };

  const loadMemberDues = async () => {
    if (!memberId) return;
    try {
      setDuesLoading(true);
      setDuesError('');
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch(`/api/dues/members/${memberId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Aidat bilgileri alınamadı.');
      }

      const payload = await response.json();
      const summaryData = payload?.data?.summary ?? emptyMemberDueSummary;
      const duesList: MemberDueRecord[] = Array.isArray(payload?.data?.dues)
        ? payload.data.dues
        : [];

      duesList.sort((a, b) => {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
        return dateB - dateA;
      });

      setMemberDuesSummary(summaryData);
      setMemberDueRecords(duesList);
    } catch (error) {
      console.error('Üye aidat bilgileri alınırken hata:', error);
      setDuesError(
        error instanceof Error ? error.message : 'Aidat bilgileri alınamadı.'
      );
    } finally {
      setDuesLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setPasswordError('');
    setConfirmPasswordError('');

    if (!password) {
      setPasswordError('Lütfen bir şifre giriniz');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Şifreler eşleşmiyor');
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    if (!session?.access_token) {
      alert('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch(`/api/members/${memberId}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Şifre güncellenemedi');
      }

      alert('Üye şifresi başarıyla güncellendi.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Şifre güncellenirken hata:', error);
      const message = error instanceof Error
        ? error.message
        : 'Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.';
      alert(message);
    } finally {
      setPasswordLoading(false);
    }
  };

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

    if (canEditMembershipNumber && !membershipNumber.trim()) {
      newErrors.membership_number = 'Üye numarası zorunludur';
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
        newErrors.city = 'Seçilen il için bölge bilgisi bulunamadı.';
      } else if (cityRegion !== currentUser.region) {
        newErrors.city = `Sadece ${currentUser.region}. bölgedeki üyeleri düzenleyebilirsiniz`;
      }
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
      const updatedData: Record<string, any> = {
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
        membership_date: formData.membership_date ? formData.membership_date : null,
        decision_number: formData.decision_number.trim() || null,

        membership_status: formData.membership_status,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
        region: formData.region || cityRegion
      };

      if (canEditMembershipNumber) {
        updatedData.membership_number = membershipNumber.trim();
      }

      const { error } = await supabase
        .from('members')
        .update(updatedData)
        .eq('id', memberId);

      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('tc_identity')) {
            setErrors({ tc_identity: 'Bu TC Kimlik No ile kayıtlı başka bir üye mevcut' });
          } else if (error.message.includes('email')) {
            setErrors({ email: 'Bu e-posta adresi ile kayıtlı başka bir üye mevcut' });
          } else {
            throw error;
          }
          return;
        }
        throw error;
      }

      alert('Üye bilgileri başarıyla güncellendi!');

      await Logger.log({
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityId: memberId as string,
        details: { memberName: `${updatedData.first_name} ${updatedData.last_name}`, updatedBy: currentUser?.id },
        userId: currentUser?.id
      });

      router.push('/admin/members');
    } catch (error) {
      console.error('Üye güncellenirken hata:', error);
      alert('Üye güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Üye bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

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

        <h1 className="text-3xl font-bold text-slate-900">Üye Bilgilerini Düzenle</h1>
        <p className="text-slate-600 mt-2">
          {formData.first_name} {formData.last_name} - Üye No: {membershipNumber}
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
        {/* Üyelik Durumu */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Üyelik Durumu</h3>
              <p className="text-sm text-slate-600">Üyenin mevcut durumu ve aktiflik bilgileri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Üye Numarası {canEditMembershipNumber && <span className="text-red-500">*</span>}
              </label>
              {canEditMembershipNumber ? (
                <>
                  <input
                    type="text"
                    value={membershipNumber}
                    onChange={(e) => setMembershipNumber(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.membership_number ? 'border-red-500' : 'border-slate-300'
                      }`}
                    placeholder="Örn: UYE-000123"
                  />
                  {errors.membership_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.membership_number}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-500">
                    Bu alan yalnızca süper adminler tarafından güncellenebilir.
                  </p>
                </>
              ) : (
                <div className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600">
                  {membershipNumber || 'Otomatik oluşturuldu'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Üyelik Durumu
              </label>
              <select
                name="membership_status"
                value={formData.membership_status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Beklemede</option>
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="suspended">Askıda</option>
              </select>
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
                className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.membership_date ? 'border-red-500' : 'border-slate-300'
                  }`}
              />
              {errors.membership_date && (
                <p className="mt-1 text-sm text-red-600">{errors.membership_date}</p>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex justify-between">
                    <span>Şube Seçimi</span>
                    {branchesLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  </label>
                  <select
                    name="selected_branch_id"
                    value={formData.selected_branch_id || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Şube Seçini</option>
                    {branches.length > 0 ? (
                      branches.map(branch => (
                        <option key={branch.id} value={branch.id}>
                          {branch.branch_name} ({branch.city})
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>Şube listesi yüklenemedi veya boş</option>
                    )}
                  </select>
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
                    {regions.length > 0 ? (
                      regions.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>Bölge listesi yükleniyor...</option>
                    )}
                  </select>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
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

        {/* Aidat Özeti ve Şifre Güncelleme (Mevcut mantık korunarak) */}

        {/* Aidat Özeti */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CircleDollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Aidat Durumu</h3>
              <p className="text-sm text-slate-600">Üyenin güncel aidat ve ödeme bilgileri</p>
            </div>
          </div>

          {duesLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : duesError ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center">
              <TrendingDown className="w-5 h-5 mr-2" />
              {duesError}
            </div>
          ) : (
            <>
              {/* Özet Kartları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <span className="text-sm font-medium text-blue-600">Toplam Tahakkuk</span>
                  <div className="mt-2 text-2xl font-bold text-blue-900">
                    {formatCurrency(memberDuesSummary.total_expected)}
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <span className="text-sm font-medium text-emerald-600">Toplam Ödenen</span>
                  <div className="mt-2 text-2xl font-bold text-emerald-900">
                    {formatCurrency(memberDuesSummary.total_paid)}
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <span className="text-sm font-medium text-red-600">Kalan Borç</span>
                  <div className="mt-2 text-2xl font-bold text-red-900">
                    {formatCurrency(memberDuesSummary.total_outstanding)}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <span className="text-sm font-medium text-purple-600">Ödenme Oranı</span>
                  <div className="mt-2 text-2xl font-bold text-purple-900">
                    {memberDuesSummary.total_expected > 0
                      ? `%${Math.round((memberDuesSummary.total_paid / memberDuesSummary.total_expected) * 100)}`
                      : '%0'}
                  </div>
                </div>
              </div>

              {/* Son Hareketler Listesi - İsteğe bağlı eklenebilir veya "Detaylar" butonu ile aidat sayfasına yönlendirilebilir */}
              <div className="flex justify-end">
                <Link
                  href={`/admin/dues?member=${memberId}`}
                  className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Tüm Aidat Geçmişini Gör <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Şifre Güncelleme */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Şifre Güncelleme</h3>
              <p className="text-sm text-slate-600">Üyenin sisteme giriş şifresini güncelleyin</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Yeni Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${passwordError ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="******"
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Yeni Şifre (Tekrar)
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${confirmPasswordError ? 'border-red-500' : 'border-slate-300'}`}
                placeholder="******"
              />
              {confirmPasswordError && (
                <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>
              )}
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handlePasswordUpdate}
                disabled={passwordLoading || !password}
                className="w-full md:w-auto px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {passwordLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
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
                <span>Değişiklikleri Kaydet</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
