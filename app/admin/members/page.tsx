'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { AdminUser } from '@/lib/types';
import { Logger } from '@/lib/logger';
import { Search, Eye, Check, X, Filter, Download, UserCheck, UserX, Clock, FileText, MapPin, Plus, Edit, AlertTriangle, FileUp, LogOut, Settings2 } from 'lucide-react';
import EditMemberModal from '@/components/members/EditMemberModal';
import MemberFilesModal from '@/components/members/MemberFilesModal';
import ResignationModal from '@/components/members/ResignationModal';
import { cityOptions } from '@/lib/cities';
import { getDistrictsByCity } from '@/lib/districts';

interface Member {
  id: string;
  membership_number: string;
  decision_number: string | null;
  decision_date: string | null;
  first_name: string;
  last_name: string;
  tc_identity: string;
  birth_date: string;
  gender: string;
  city: string;
  district: string;
  phone: string | null;
  email: string | null;
  region: number | null;
  address: string;
  workplace: string;
  position: string;
  membership_status: 'pending' | 'active' | 'inactive' | 'suspended' | 'resigned';
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  education_level: string;
  marital_status: string;
  children_count: number;
  blood_group: string | null;

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showResignationModal, setShowResignationModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // Kullanıcı bilgilerini al
    const user = AdminAuth.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState('identity');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    membershipNumber: true,
    fullName: true,
    tcIdentity: true,
    contact: true,
    location: true,
    status: true,
    createdAt: true,
    decisionNumber: false,
    workplace: false,
    position: false,
    education: false,
    bloodGroup: false,
    gender: false,
    birthDate: false,
    maritalStatus: false,
  });

  // Sütun tanımları
  const columnDefinitions = [
    { key: 'membershipNumber', label: 'Üye No' },
    { key: 'decisionNumber', label: 'Karar No' },
    { key: 'fullName', label: 'Ad Soyad' },
    { key: 'tcIdentity', label: 'TC Kimlik' },
    { key: 'contact', label: 'İletişim' },
    { key: 'location', label: 'Konum' },
    { key: 'status', label: 'Durum' },
    { key: 'createdAt', label: 'Kayıt Tarihi' },
    { key: 'workplace', label: 'İşyeri' },
    { key: 'position', label: 'Pozisyon' },
    { key: 'education', label: 'Eğitim' },
    { key: 'bloodGroup', label: 'Kan Grubu' },
    { key: 'gender', label: 'Cinsiyet' },
    { key: 'birthDate', label: 'Doğum Tarihi' },
    { key: 'maritalStatus', label: 'Medeni Durum' },
  ];

  const toggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey as keyof typeof prev]
    }));
  };

  const [advancedFilters, setAdvancedFilters] = useState({
    // Identity
    city: '',
    district: '',
    gender: '',
    education: '',
    blood_group: '',
    minAge: '',
    maxAge: '',
    region: '',
    maritalStatus: '',
    tcIdentity: '',
    firstName: '',
    lastName: '',
    fatherName: '',
    motherName: '',
    birthPlace: '',
    birthDate: '',
    membershipNumber: '',
    // Job
    workplace: '',
    position: '',
    workCity: '',
    workDistrict: '',
    institution: '',
    institutionRegNo: '',
    retirementRegNo: '',
    // Contact
    address: '',
    email: '',
    phone: '',
    // Membership
    membershipStatus: '',
    membershipStartDate: '',
    membershipEndDate: '',
    resignationReason: '',
    resignationStartDate: '',
    resignationEndDate: '',
    membershipDuration: '',
    dueStatus: '',
  });

  useEffect(() => {
    // Kullanıcı bilgileri yüklendikten sonra üyeleri getiri
    if (currentUser) {
      loadMembers();
    }
  }, [currentUser]);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, statusFilter, advancedFilters]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedMemberIds(new Set());
  }, [filteredMembers]);

  const loadMembers = async () => {
    try {
      let query = supabase
        .from('members')
        .select('*');

      if (currentUser && currentUser.role_type === 'branch_manager' && currentUser.city) {
        query = query.eq('city', currentUser.city);
      } else if (currentUser && currentUser.role_type === 'regional_manager' && currentUser.region) {
        query = query.eq('region', currentUser.region);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Üyeler yüklenirken hata:', error);
      alert('Üyeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = [...members];

    // Durum filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.membership_status === statusFilter);
    }

    // Arama filtresi
    if (searchTerm) {
      const lowered = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.first_name.toLowerCase().includes(lowered) ||
        member.last_name.toLowerCase().includes(lowered) ||
        member.tc_identity.includes(searchTerm) ||
        (member.email?.toLowerCase().includes(lowered) ?? false) ||
        (member.phone?.includes(searchTerm) ?? false) ||
        (member.membership_number?.toLowerCase().includes(lowered) ?? false)
      );
    }

    // Gelişmiş Filtreler
    if (showAdvancedSearch) {
      if (advancedFilters.city) {
        filtered = filtered.filter(m => m.city === advancedFilters.city);
      }
      if (advancedFilters.district) {
        filtered = filtered.filter(m => m.district === advancedFilters.district);
      }
      if (advancedFilters.workplace) {
        filtered = filtered.filter(m => m.workplace?.toLowerCase().includes(advancedFilters.workplace.toLowerCase()));
      }
      if (advancedFilters.position) {
        filtered = filtered.filter(m => m.position?.toLowerCase().includes(advancedFilters.position.toLowerCase()));
      }
      if (advancedFilters.gender) {
        filtered = filtered.filter(m => m.gender === advancedFilters.gender);
      }
      if (advancedFilters.education) {
        filtered = filtered.filter(m => m.education_level === advancedFilters.education);
      }
      if (advancedFilters.region) {
        filtered = filtered.filter(m => m.region?.toString() === advancedFilters.region);
      }
      if (advancedFilters.maritalStatus) {
        filtered = filtered.filter(m => m.marital_status === advancedFilters.maritalStatus);
      }

      // Yaş Filtresi
      if (advancedFilters.minAge || advancedFilters.maxAge) {
        filtered = filtered.filter(m => {
          if (!m.birth_date) return false;
          const birthDate = new Date(m.birth_date);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }

          if (advancedFilters.minAge && age < parseInt(advancedFilters.minAge)) return false;
          if (advancedFilters.maxAge && age > parseInt(advancedFilters.maxAge)) return false;
          return true;
        });
      }
    }

    setFilteredMembers(filtered);
  };

  const getMissingContactFields = (member: Member) => {
    const missing: string[] = [];
    if (!member.phone) missing.push('Telefon');
    if (!member.email) missing.push('E-posta');
    return missing;
  };

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({
          membership_status: newStatus,
          is_active: newStatus === 'active'
        })
        .eq('id', memberId);

      if (error) throw error;

      await Logger.log({
        action: 'UPDATE',
        entityType: 'MEMBER',
        entityId: memberId,
        details: {
          change: 'status_update',
          new_status: newStatus,
          previous_status: members.find(m => m.id === memberId)?.membership_status
        },
        userId: currentUser?.id
      });

      alert('Üye durumu başarıyla güncellendi.');
      loadMembers();
      setShowDetails(false);
    } catch (error) {
      console.error('Üye durumu güncellenirken hata:', error);
      alert('Üye durumu güncellenirken bir hata oluştu.');
    }
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.size === filteredMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const toggleSelectMember = (id: string) => {
    const newSelected = new Set(selectedMemberIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMemberIds(newSelected);
  };

  const handleBulkSms = () => {
    const selected = members.filter(m => selectedMemberIds.has(m.id));
    sessionStorage.setItem('sms_selected_members', JSON.stringify(selected));
    router.push('/admin/sms');
  };

  const exportToCSV = () => {
    const headers = ['Üye No', 'Ad', 'Soyad', 'TC Kimlik', 'Telefon', 'E-posta', 'İl', 'İlçe', 'Durum', 'Kayıt Tarihi'];
    const csvContent = [
      headers.join(','),
      ...filteredMembers.map(member => [
        member.membership_number || '',
        member.first_name,
        member.last_name,
        member.tc_identity,
        member.phone ?? '',
        member.email ?? '',
        member.city,
        member.district,
        member.membership_status,
        new Date(member.created_at).toLocaleDateString('tr-TR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uyeler_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300', icon: Clock, text: 'Beklemede' },
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300', icon: UserCheck, text: 'Aktif' },
      inactive: { color: 'bg-gray-100 text-gray-800 dark:bg-slate-700/40 dark:text-slate-200', icon: UserX, text: 'Pasif' },
      suspended: { color: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300', icon: X, text: 'Askıda' },
      resigned: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300', icon: LogOut, text: 'İstifa' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">Üyeler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Üye Yönetimi</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">
          {currentUser?.role_type === 'branch_manager' && currentUser.city
            ? `${currentUser.city} şubesi üyelerini görüntüleyin ve yönetin`
            : 'Sendika üyelerini görüntüleyin ve yönetin'
          }
        </p>
        {currentUser?.role_type === 'branch_manager' && currentUser.city && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
            <MapPin className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-300" />
            {currentUser.city} Şubesi
          </div>
        )}
      </div>

      {/* Filtreler ve Arama */}
      <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 p-4 mb-6">
        {/* Row 1: Search, Status, Actions */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Ad, soyad, TC, e-posta veya telefon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Status Filter */}
          <div className="w-[160px]">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="suspended">Askıda</option>
              <option value="resigned">İstifa</option>
            </select>
          </div>

          {/* Advanced Search Toggle */}
          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${showAdvancedSearch
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600'
              }`}
          >
            <Filter className="w-4 h-4" />
            Detaylı Arama
            {showAdvancedSearch && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin/members/new')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Üye
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* Advanced Search Panel - Tabbed Interface */}
        {showAdvancedSearch && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 animate-in slide-in-from-top-2">
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-4 bg-gradient-to-r from-cyan-500 to-blue-500 p-1 rounded-lg">
              {['identity', 'job', 'contact', 'membership'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSearchTab(tab)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSearchTab === tab
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-white/90 hover:bg-white/10'
                    }`}
                >
                  {tab === 'identity' && 'KİMLİK'}
                  {tab === 'job' && 'GÖREV'}
                  {tab === 'contact' && 'İLETİŞİM'}
                  {tab === 'membership' && 'ÜYELİK'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 border border-gray-200 dark:border-slate-700">

              {/* KİMLİK Tab */}
              {activeSearchTab === 'identity' && (
                <div className="space-y-4">
                  {/* Row 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">TC Kimlik Numarası</label>
                      <input
                        type="text"
                        value={advancedFilters.tcIdentity || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, tcIdentity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="TC Kimlik Numarası"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Adı</label>
                      <input
                        type="text"
                        value={advancedFilters.firstName || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Adı"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Soyadı</label>
                      <input
                        type="text"
                        value={advancedFilters.lastName || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Soyadı"
                      />
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Baba Adı</label>
                      <input
                        type="text"
                        value={advancedFilters.fatherName || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, fatherName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Baba Adı"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Anne Adı</label>
                      <input
                        type="text"
                        value={advancedFilters.motherName || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, motherName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Anne Adı"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Cinsiyet</label>
                      <select
                        value={advancedFilters.gender}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        <option value="Erkek">Erkek</option>
                        <option value="Kadın">Kadın</option>
                      </select>
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Doğum Yeri</label>
                      <select
                        value={advancedFilters.birthPlace || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, birthPlace: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        {cityOptions.map(city => (
                          <option key={city.code} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Doğum Tarihi</label>
                      <input
                        type="date"
                        value={advancedFilters.birthDate || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, birthDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Kan Grubu</label>
                      <select
                        value={advancedFilters.blood_group}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, blood_group: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
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
                  </div>
                  {/* Row 4 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Öğrenim</label>
                      <select
                        value={advancedFilters.education}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, education: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        <option value="İlköğretim">İlköğretim</option>
                        <option value="Lise">Lise</option>
                        <option value="Önlisans">Önlisans</option>
                        <option value="Lisans">Lisans</option>
                        <option value="Yüksek Lisans">Yüksek Lisans</option>
                        <option value="Doktora">Doktora</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Üye No</label>
                      <input
                        type="text"
                        value={advancedFilters.membershipNumber || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, membershipNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Üye No"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Medeni Durum</label>
                      <select
                        value={advancedFilters.maritalStatus}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, maritalStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        <option value="Evli">Evli</option>
                        <option value="Bekar">Bekar</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* GÖREV Tab */}
              {activeSearchTab === 'job' && (
                <div className="space-y-4">
                  {/* Row 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Bölge / Şube</label>
                      <select
                        value={advancedFilters.region}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, region: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Bölge Şube seçiniz</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <option key={i} value={i.toString()}>{i}. Bölge</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Görev İl</label>
                      <select
                        value={advancedFilters.workCity || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, workCity: e.target.value, workDistrict: '' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        {cityOptions.map(city => (
                          <option key={city.code} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Görev İlçe</label>
                      <select
                        value={advancedFilters.workDistrict || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, workDistrict: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        disabled={!advancedFilters.workCity}
                      >
                        <option value="">Tümünü Seç</option>
                        {advancedFilters.workCity && getDistrictsByCity(advancedFilters.workCity).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">İşyeri</label>
                      <input
                        type="text"
                        value={advancedFilters.workplace}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, workplace: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="İşyeri seçiniz"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Kurum</label>
                      <input
                        type="text"
                        value={advancedFilters.institution || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, institution: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Kurum seçiniz"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Kadro Ünvanı</label>
                      <input
                        type="text"
                        value={advancedFilters.position}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Kadro ünvanı seçiniz"
                      />
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Kurum Sicil No</label>
                      <input
                        type="text"
                        value={advancedFilters.institutionRegNo || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, institutionRegNo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Kurum Sicil No"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Emekli Sicil No</label>
                      <input
                        type="text"
                        value={advancedFilters.retirementRegNo || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, retirementRegNo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Emekli Sicil No"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* İLETİŞİM Tab */}
              {activeSearchTab === 'contact' && (
                <div className="space-y-4">
                  {/* Row 1 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Adres</label>
                    <textarea
                      value={advancedFilters.address || ''}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      placeholder="Adres"
                      rows={2}
                    />
                  </div>
                  {/* Row 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">İl</label>
                      <select
                        value={advancedFilters.city}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, city: e.target.value, district: '' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        {cityOptions.map(city => (
                          <option key={city.code} value={city.name}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">İlçe</label>
                      <select
                        value={advancedFilters.district}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, district: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        disabled={!advancedFilters.city}
                      >
                        <option value="">Tümünü Seç</option>
                        {advancedFilters.city && getDistrictsByCity(advancedFilters.city).map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">E-Posta</label>
                      <input
                        type="email"
                        value={advancedFilters.email || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="E Posta"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Telefon Numarası</label>
                      <input
                        type="text"
                        value={advancedFilters.phone || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                        placeholder="Telefon Numarası"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ÜYELİK Tab */}
              {activeSearchTab === 'membership' && (
                <div className="space-y-4">
                  {/* Row 1 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Üyelik Durumu</label>
                      <select
                        value={advancedFilters.membershipStatus || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, membershipStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        <option value="pending">Beklemede</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                        <option value="suspended">Askıda</option>
                        <option value="resigned">İstifa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Üyelik Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={advancedFilters.membershipStartDate || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, membershipStartDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Üyelik Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={advancedFilters.membershipEndDate || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, membershipEndDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  {/* Row 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">İstifa Nedeni</label>
                      <select
                        value={advancedFilters.resignationReason || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, resignationReason: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        <option value="İsteğe Bağlı">İsteğe Bağlı</option>
                        <option value="Emeklilik">Emeklilik</option>
                        <option value="İşten Ayrılma">İşten Ayrılma</option>
                        <option value="Nakil">Nakil</option>
                        <option value="Vefat">Vefat</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">İstifa Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={advancedFilters.resignationStartDate || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, resignationStartDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">İstifa Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={advancedFilters.resignationEndDate || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, resignationEndDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  {/* Row 3 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Yaş Aralığı</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={advancedFilters.minAge}
                          onChange={(e) => setAdvancedFilters({ ...advancedFilters, minAge: e.target.value })}
                          className="w-1/2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                          placeholder="Min"
                        />
                        <input
                          type="number"
                          value={advancedFilters.maxAge}
                          onChange={(e) => setAdvancedFilters({ ...advancedFilters, maxAge: e.target.value })}
                          className="w-1/2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                          placeholder="Max"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Üyelik Süresi</label>
                      <select
                        value={advancedFilters.membershipDuration || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, membershipDuration: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        <option value="0-1">0-1 Yıl</option>
                        <option value="1-3">1-3 Yıl</option>
                        <option value="3-5">3-5 Yıl</option>
                        <option value="5-10">5-10 Yıl</option>
                        <option value="10+">10+ Yıl</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-slate-300 mb-1">Aidat Durumu</label>
                      <select
                        value={advancedFilters.dueStatus || ''}
                        onChange={(e) => setAdvancedFilters({ ...advancedFilters, dueStatus: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800"
                      >
                        <option value="">Tümünü Seç</option>
                        <option value="paid">Ödendi</option>
                        <option value="unpaid">Ödenmedi</option>
                        <option value="partial">Kısmi Ödeme</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={() => setAdvancedFilters({
                  city: '', district: '', workplace: '', position: '',
                  gender: '', education: '', blood_group: '', minAge: '', maxAge: '',
                  region: '', maritalStatus: '', tcIdentity: '', firstName: '', lastName: '',
                  fatherName: '', motherName: '', birthPlace: '', birthDate: '', membershipNumber: '',
                  workCity: '', workDistrict: '', institution: '', institutionRegNo: '', retirementRegNo: '',
                  address: '', email: '', phone: '', membershipStatus: '', membershipStartDate: '',
                  membershipEndDate: '', resignationReason: '', resignationStartDate: '', resignationEndDate: '',
                  membershipDuration: '', dueStatus: ''
                })}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Formu Temizle
              </button>
              <button
                onClick={() => filterMembers()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Belirtilen Kriterlerle Ara
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span>Toplam <strong>{filteredMembers.length}</strong> üye bulundu</span>
            {selectedMemberIds.size > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                <span>{selectedMemberIds.size} üye seçildi</span>
                <button onClick={() => setSelectedMemberIds(new Set())} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Column Selector */}
            <div className="relative">
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                Sütunlar
              </button>

              {showColumnSelector && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 p-2">
                  <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 px-2 py-1 border-b border-gray-200 dark:border-slate-700 mb-2">
                    Görünecek Sütunlar
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {columnDefinitions.map(col => (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key as keyof typeof visibleColumns]}
                          onChange={() => toggleColumn(col.key)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-slate-300">{col.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-slate-700 mt-2 pt-2 flex gap-2">
                    <button
                      onClick={() => setVisibleColumns({
                        membershipNumber: true, fullName: true, tcIdentity: true, contact: true,
                        location: true, status: true, createdAt: true, decisionNumber: false,
                        workplace: false, position: false, education: false, bloodGroup: false,
                        gender: false, birthDate: false, maritalStatus: false
                      })}
                      className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
                    >
                      Varsayılana Dön
                    </button>
                    <button
                      onClick={() => setShowColumnSelector(false)}
                      className="px-2 py-1 text-xs bg-primary-500 text-white hover:bg-primary-600 rounded"
                    >
                      Tamam
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Actions for Selected */}
            {selectedMemberIds.size > 0 && (
              <div className="mr-4 flex gap-2">
                <button
                  onClick={handleBulkSms}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  Seçilenlere SMS Yaz
                </button>
              </div>
            )}

            <span className="flex items-center">
              <span className="w-3 h-3 bg-yellow-100 dark:bg-yellow-500/40 rounded-full mr-1"></span>
              Beklemede: {members.filter(m => m.membership_status === 'pending').length}
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-green-100 dark:bg-green-500/40 rounded-full mr-1"></span>
              Aktif: {members.filter(m => m.membership_status === 'active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Üye Listesi */}
      <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider w-8">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.size > 0 && selectedMemberIds.size === filteredMembers.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                {visibleColumns.membershipNumber && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Üye No</th>
                )}
                {visibleColumns.decisionNumber && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Karar No</th>
                )}
                {visibleColumns.fullName && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ad Soyad</th>
                )}
                {visibleColumns.tcIdentity && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">TC Kimlik</th>
                )}
                {visibleColumns.contact && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">İletişim</th>
                )}
                {visibleColumns.location && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Konum</th>
                )}
                {visibleColumns.workplace && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">İşyeri</th>
                )}
                {visibleColumns.position && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Pozisyon</th>
                )}
                {visibleColumns.education && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Eğitim</th>
                )}
                {visibleColumns.bloodGroup && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kan Grubu</th>
                )}
                {visibleColumns.gender && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Cinsiyet</th>
                )}
                {visibleColumns.birthDate && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Doğum Tarihi</th>
                )}
                {visibleColumns.maritalStatus && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Medeni Durum</th>
                )}
                {visibleColumns.status && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Durum</th>
                )}
                {visibleColumns.createdAt && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kayıt Tarihi</th>
                )}
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-slate-800">
              {filteredMembers.map((member) => {
                const missingFields = getMissingContactFields(member);
                return (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.has(member.id)}
                        onChange={() => toggleSelectMember(member.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    {visibleColumns.membershipNumber && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                        {member.membership_number || '-'}
                      </td>
                    )}
                    {visibleColumns.decisionNumber && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.decision_number || '-'}
                      </td>
                    )}
                    {visibleColumns.fullName && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            {member.first_name} {member.last_name}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.tcIdentity && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.tc_identity}
                      </td>
                    )}
                    {visibleColumns.contact && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-slate-100">{member.phone || '-'}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{member.email || '-'}</div>
                        {missingFields.length > 0 && (
                          <div
                            className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] dark:bg-amber-500/20 dark:text-amber-200"
                            title={`Eksik alanlar: ${missingFields.join(', ')}`}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Eksik bilgi
                          </div>
                        )}
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-slate-100">{member.city}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{member.district}</div>
                      </td>
                    )}
                    {visibleColumns.workplace && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.workplace || '-'}
                      </td>
                    )}
                    {visibleColumns.position && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.position || '-'}
                      </td>
                    )}
                    {visibleColumns.education && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.education_level || '-'}
                      </td>
                    )}
                    {visibleColumns.bloodGroup && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.blood_group || '-'}
                      </td>
                    )}
                    {visibleColumns.gender && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.gender || '-'}
                      </td>
                    )}
                    {visibleColumns.birthDate && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.birth_date ? new Date(member.birth_date).toLocaleDateString('tr-TR') : '-'}
                      </td>
                    )}
                    {visibleColumns.maritalStatus && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {member.marital_status || '-'}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        {getStatusBadge(member.membership_status)}
                        {member.membership_status === 'resigned' && (
                          <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">İstifa etti</div>
                        )}
                      </td>
                    )}
                    {visibleColumns.createdAt && (
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        {new Date(member.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowDetails(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMember(member)
                            setShowEditModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Düzenle"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMember(member)
                            setShowFilesModal(true)
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="Özlük Dosyaları"
                        >
                          <FileText className="w-5 h-5" />
                        </button>

                        {member.membership_status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedMember(member)
                              setShowResignationModal(true)
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="İstifa İşlemi"
                          >
                            <LogOut className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && selectedMember && (
        <EditMemberModal
          member={selectedMember}
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadMembers()
            setShowEditModal(false)
          }}
        />
      )}

      {showFilesModal && selectedMember && (
        <MemberFilesModal
          member={selectedMember}
          onClose={() => setShowFilesModal(false)}
        />
      )}

      {showResignationModal && selectedMember && (
        <ResignationModal
          member={selectedMember}
          onClose={() => setShowResignationModal(false)}
          onSuccess={() => {
            loadMembers()
            setShowResignationModal(false)
          }}
        />
      )}

      {/* Üye Detay Modal */}
      {showDetails && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-4 border border-gray-200 dark:border-slate-700 w-full max-w-4xl shadow-lg dark:shadow-slate-900/40 rounded-md bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Üye Detayları</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-900 dark:text-slate-100">
              {/* Kişisel Bilgiler */}
              <div className="col-span-1 md:col-span-2 bg-gray-50 dark:bg-slate-900/60 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Kişisel Bilgiler</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Üye No</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100 font-medium">{selectedMember.membership_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ad Soyad</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100 font-medium">{selectedMember.first_name} {selectedMember.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">TC Kimlik No</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">{selectedMember.tc_identity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Doğum Tarihi</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">
                      {selectedMember.birth_date ? new Date(selectedMember.birth_date).toLocaleDateString('tr-TR') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cinsiyet</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">{selectedMember.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Medeni Durum / Çocuk</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">
                      {selectedMember.marital_status || '-'} / {selectedMember.children_count}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Eğitim Durumu</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">{selectedMember.education_level || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Acil Durum Kişisi</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">
                      {selectedMember.emergency_contact_name} ({selectedMember.emergency_contact_relation})
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMember.emergency_contact_phone}</p>
                  </div>
                </div>
              </div>

              {/* İletişim Bilgileri */}
              <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">İletişim Bilgileri</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Telefon</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">E-posta</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.email || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">İl / İlçe</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.city} / {selectedMember.district}</dd>
                  </div>
                  {selectedMember.region && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Bölge</dt>
                      <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.region}. Bölge</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Adres</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.address || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* İş Bilgileri */}
              <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">İş Bilgileri</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">İşyeri</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.workplace || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Pozisyon</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.position || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Acil Durum */}
              <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Acil Durum İletişim</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Kişi</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.emergency_contact_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Telefon</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.emergency_contact_phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Yakınlık</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.emergency_contact_relation || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Durum ve İşlemler */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400 mr-2">Mevcut Durum:</span>
                  {getStatusBadge(selectedMember.membership_status)}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => setShowFilesModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Özlük Dosyaları
                  </button>
                  {selectedMember.membership_status === 'active' && (
                    <button
                      onClick={() => setShowResignationModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      İstifa İşlemi
                    </button>
                  )}
                  {selectedMember.membership_status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateMemberStatus(selectedMember.id, 'active')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        Üyeliği Onayla
                      </button>
                      <button
                        onClick={() => updateMemberStatus(selectedMember.id, 'inactive')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Reddet
                      </button>
                    </>
                  )}
                  {selectedMember.membership_status === 'active' && (
                    <button
                      onClick={() => updateMemberStatus(selectedMember.id, 'suspended')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                    >
                      Askıya Al
                    </button>
                  )}
                  {selectedMember.membership_status === 'suspended' && (
                    <button
                      onClick={() => updateMemberStatus(selectedMember.id, 'active')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Aktif Et
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
