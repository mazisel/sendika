'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { AdminUser, Member } from '@/lib/types';
import { Logger } from '@/lib/logger';
import {
  Search, Eye, Check, X, Filter, Download, UserCheck, UserX, Clock,
  FileText, MapPin, Plus, Edit, AlertTriangle, LogOut, Settings2,
  Maximize2, Minimize2, Users, ListFilter, List, Smartphone, Trash2, PieChart as PieChartIcon
} from 'lucide-react';
import EditMemberModal from '@/components/members/EditMemberModal';
import MemberFilesModal from '@/components/members/MemberFilesModal';
import MemberDetailModal from '@/components/members/MemberDetailModal';
import ResignationModal from '@/components/members/ResignationModal';
import MemberFilterTab, { FilterState } from '@/components/members/MemberFilterTab';
import BulkUpdateTab, { Condition } from '@/components/members/BulkUpdateTab';
import MemberDistributionTab from '@/components/members/MemberDistributionTab';
import ExportMenu from '@/components/ExportMenu';

export default function AdminMembersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'list' | 'search' | 'bulk' | 'distribution'>('list');

  // Data State
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [displayedMembers, setDisplayedMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    city: '', district: '', workplace: '', position: '',
    gender: '', education: '', blood_group: '', minAge: '', maxAge: '',
    region: '', maritalStatus: '', tcIdentity: '', firstName: '', lastName: '',
    fatherName: '', motherName: '', birthPlace: '', birthDate: '', membershipNumber: '',
    workCity: '', workDistrict: '', institution: '', institutionRegNo: '', retirementRegNo: '',
    address: '', email: '', phone: '', membershipStatus: '', membershipStartDate: '',
    membershipEndDate: '', resignationReason: '', resignationStartDate: '', resignationEndDate: '',
    membershipDuration: '', dueStatus: ''
  });
  const [bulkSearchResults, setBulkSearchResults] = useState<Member[] | null>(null);
  const [detailedSearchResults, setDetailedSearchResults] = useState<Member[] | null>(null);

  // UI State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showResignationModal, setShowResignationModal] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  // Close column selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [columnSelectorRef]);

  const [visibleColumns, setVisibleColumns] = useState({
    membershipNumber: true,
    mobile: true,
    fullName: true,
    tcIdentity: true,
    status: true,
    contact: true,
    location: true,
    workplace: true, // Default visible
    fatherName: false,
    motherName: false,
    institution: false,
  });

  // Column Variants State
  const [variants, setVariants] = useState<Record<string, typeof visibleColumns>>({});
  const [newVariantName, setNewVariantName] = useState('');

  // Load variants from local storage on mount
  useEffect(() => {
    const savedVariants = localStorage.getItem('sendika_member_column_variants');
    if (savedVariants) {
      try {
        setVariants(JSON.parse(savedVariants));
      } catch (e) {
        console.error('Failed to parse column variants', e);
      }
    }
  }, []);

  const saveVariant = () => {
    if (!newVariantName.trim()) {
      alert('Lütfen bir isim giriniz'); // Using alert instead of toast for simplicity or import toast
      return;
    }
    const updatedVariants = { ...variants, [newVariantName.trim()]: visibleColumns };
    setVariants(updatedVariants);
    localStorage.setItem('sendika_member_column_variants', JSON.stringify(updatedVariants));
    setNewVariantName('');
    alert('Görünüm kaydedildi');
  };

  const deleteVariant = (name: string) => {
    const { [name]: removed, ...rest } = variants;
    setVariants(rest);
    localStorage.setItem('sendika_member_column_variants', JSON.stringify(rest));
    alert('Görünüm silindi');
  };

  const applyVariant = (name: string) => {
    if (variants[name]) {
      setVisibleColumns(variants[name]);
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key as keyof typeof visibleColumns] }));
  };
  const columnDefinitions = [
    { key: 'membershipNumber', label: 'Üye No' },
    { key: 'mobile', label: 'Mobil' },
    { key: 'decisionNumber', label: 'Karar No' },
    { key: 'fullName', label: 'Ad Soyad' },
    { key: 'tcIdentity', label: 'TC Kimlik' },
    { key: 'contact', label: 'İletişim' },
    { key: 'location', label: 'Konum' },
    { key: 'status', label: 'Durum' },
    { key: 'createdAt', label: 'Kayıt Tarihi' },
    { key: 'workplace', label: 'İş Yeri' },
    { key: 'position', label: 'Kadro Unvanı' },
    { key: 'company', label: 'Kurum' },
    { key: 'education', label: 'Eğitim' },
    { key: 'bloodGroup', label: 'Kan Grubu' },
    { key: 'gender', label: 'Cinsiyet' },
    { key: 'birthDate', label: 'Doğum Tarihi' },
    { key: 'maritalStatus', label: 'Medeni Durum' },
    { key: 'fatherName', label: 'Baba Adı' },
    { key: 'motherName', label: 'Anne Adı' },
    { key: 'birthPlace', label: 'Doğum Yeri' },
    { key: 'institution', label: 'Kurum' },
    { key: 'institutionRegNo', label: 'Kurum Sicil No' },
    { key: 'retirementRegNo', label: 'Emekli Sicil No' },
  ];

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    setCurrentUser(user);
    if (user) {
      loadMembers();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'list') {
      filterMembers();
    }
  }, [allMembers, searchTerm, statusFilter, dateFilter, activeTab]);

  // Handle URL parameters for filtering
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const dateParam = searchParams.get('date');

    if (statusParam) {
      // Map 'suspended' param to 'suspended' status if needed, or 'inactive'
      // The dashboard uses 'suspended' for resigned members in some contexts, 
      // but let's assume direct mapping first
      setStatusFilter(statusParam);
    }

    if (dateParam) {
      setDateFilter(dateParam);
    }
  }, [searchParams]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      let query = supabase.from('members').select('*');

      if (currentUser && currentUser.role_type === 'branch_manager' && currentUser.city) {
        query = query.eq('city', currentUser.city);
      } else if (currentUser && currentUser.role_type === 'regional_manager' && currentUser.region) {
        query = query.eq('region', currentUser.region);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setAllMembers(data || []);
      setDisplayedMembers(data || []);
    } catch (error) {
      console.error('Üyeler yüklenirken hata:', error);
      alert('Üyeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    // Debug log to trace filtering logic
    console.log('Filtering members with:', { statusFilter, dateFilter, allMembersCount: allMembers.length });
    let filtered = [...allMembers];

    if (statusFilter !== 'all') {
      if (statusFilter === 'resigned') {
        filtered = filtered.filter(member => ['inactive', 'suspended', 'resigned'].includes(member.membership_status));
      } else {
        filtered = filtered.filter(member => member.membership_status === statusFilter);
      }
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const isResignationCheck = statusFilter === 'resigned' || ['inactive', 'suspended', 'resigned'].includes(statusFilter);
      const dateField = isResignationCheck ? 'updated_at' : 'created_at';

      if (dateFilter === 'this_month') {
        filtered = filtered.filter(member => {
          const dateVal = (member as any)[dateField];
          if (!dateVal) return false;
          return new Date(dateVal) >= firstDayOfMonth;
        });
      } else if (dateFilter === 'last_month') {
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        filtered = filtered.filter(member => {
          const dateVal = (member as any)[dateField];
          if (!dateVal) return false;
          const date = new Date(dateVal);
          return date >= firstDayOfLastMonth && date <= lastDayOfLastMonth;
        });
      }
    }

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

    setDisplayedMembers(filtered);
    setSelectedMemberIds(new Set());
  };

  const handleAdvancedSearch = () => {
    let filtered = [...allMembers];
    const f = advancedFilters;

    // Apply advanced filters similarly to the original logic
    if (f.city) filtered = filtered.filter(m => m.city === f.city);
    if (f.district) filtered = filtered.filter(m => m.district === f.district);
    if (f.workplace) filtered = filtered.filter(m => m.workplace?.toLowerCase().includes(f.workplace.toLowerCase()));
    if (f.position) filtered = filtered.filter(m => m.position?.toLowerCase().includes(f.position.toLowerCase()));
    if (f.gender) filtered = filtered.filter(m => m.gender === f.gender);
    if (f.education) filtered = filtered.filter(m => m.education_level === f.education);
    if (f.region) filtered = filtered.filter(m => m.region?.toString() === f.region);
    if (f.maritalStatus) filtered = filtered.filter(m => m.marital_status === f.maritalStatus);
    if (f.tcIdentity) filtered = filtered.filter(m => m.tc_identity.includes(f.tcIdentity));
    if (f.firstName) filtered = filtered.filter(m => m.first_name.toLowerCase().includes(f.firstName.toLowerCase()));
    if (f.lastName) filtered = filtered.filter(m => m.last_name.toLowerCase().includes(f.lastName.toLowerCase()));
    if (f.fatherName) filtered = filtered.filter(m => m.father_name?.toLowerCase().includes(f.fatherName.toLowerCase()));
    if (f.motherName) filtered = filtered.filter(m => m.mother_name?.toLowerCase().includes(f.motherName.toLowerCase()));
    if (f.birthPlace) filtered = filtered.filter(m => m.birth_place === f.birthPlace);
    if (f.membershipNumber) filtered = filtered.filter(m => m.membership_number?.includes(f.membershipNumber));
    if (f.institution) filtered = filtered.filter(m => m.institution?.toLowerCase().includes(f.institution.toLowerCase()));
    if (f.institutionRegNo) filtered = filtered.filter(m => m.institution_register_no?.includes(f.institutionRegNo));
    if (f.retirementRegNo) filtered = filtered.filter(m => m.retirement_register_no?.includes(f.retirementRegNo));
    if (f.email) filtered = filtered.filter(m => m.email?.toLowerCase().includes(f.email.toLowerCase()));
    if (f.phone) filtered = filtered.filter(m => m.phone?.includes(f.phone));
    if (f.membershipStatus) filtered = filtered.filter(m => m.membership_status === f.membershipStatus);

    // Add other filters as needed...
    if (f.minAge || f.maxAge) {
      filtered = filtered.filter(m => {
        if (!m.birth_date) return false;
        const birthDate = new Date(m.birth_date);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        if (f.minAge && age < parseInt(f.minAge)) return false;
        if (f.maxAge && age > parseInt(f.maxAge)) return false;
        return true;
      });
    }

    setDetailedSearchResults(filtered);
    // Remove automatic tab switch
    // setDisplayedMembers(filtered);
    // setActiveTab('list'); 
    alert(`${filtered.length} kayıt bulundu.`);
  };

  const handleBulkFind = (conditions: Condition[]) => {
    let filtered = [...allMembers].filter(member => {
      // AND Logic: Must match ALL conditions
      return conditions.every(condition => {
        const val = (member as any)[condition.field];
        const checkVal = val ? String(val).toLowerCase() : '';
        const targetVal = condition.value.toLowerCase();

        switch (condition.operator) {
          case 'isEmpty':
            return !val || val === '';
          case 'isNotEmpty':
            return val && val !== '';
          case 'equals':
            return checkVal === targetVal;
          case 'notEquals':
            return checkVal !== targetVal;
          case 'contains':
            return checkVal.includes(targetVal);
          default:
            return true;
        }
      });
    });

    if (filtered.length === 0) {
      alert('Seçilen kriterlere uygun kayıt bulunamadı.');
      return;
    }

    setBulkSearchResults(filtered);
    // Remove automatic tab switch
    // setDisplayedMembers(filtered);
    // setActiveTab('list'); 
    alert(`${filtered.length} kayıt bulundu.`);
  };



  const handleClearAdvancedFilters = () => {
    setAdvancedFilters({
      city: '', district: '', workplace: '', position: '',
      gender: '', education: '', blood_group: '', minAge: '', maxAge: '',
      region: '', maritalStatus: '', tcIdentity: '', firstName: '', lastName: '',
      fatherName: '', motherName: '', birthPlace: '', birthDate: '', membershipNumber: '',
      workCity: '', workDistrict: '', institution: '', institutionRegNo: '', retirementRegNo: '',
      address: '', email: '', phone: '', membershipStatus: '', membershipStartDate: '',
      membershipEndDate: '', resignationReason: '', resignationStartDate: '', resignationEndDate: '',
      membershipDuration: '', dueStatus: ''
    });
  };

  // ... (Other helpers like updateMemberStatus, getStatusBadge, exportToCSV remain same or similar)
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
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('members').update({ membership_status: newStatus, is_active: newStatus === 'active' }).eq('id', memberId);
      if (error) throw error;
      await Logger.log({ action: 'UPDATE', entityType: 'MEMBER', entityId: memberId, details: { newStatus }, userId: currentUser?.id });
      alert('Durum güncellendi.');
      loadMembers();
      setShowDetails(false);
    } catch (error) {
      console.error(error);
      alert('Hata oluştu.');
    }
  };

  const getMissingContactFields = (member: Member) => {
    const missing: string[] = [];
    if (!member.phone) missing.push('Telefon');
    if (!member.email) missing.push('E-posta');
    return missing;
  };

  const handleBulkSms = () => {
    const selected = allMembers.filter(m => selectedMemberIds.has(m.id));
    sessionStorage.setItem('sms_selected_members', JSON.stringify(selected));
    router.push('/admin/sms');
  };

  const toggleSelectAll = () => {
    if (selectedMemberIds.size === displayedMembers.length) {
      setSelectedMemberIds(new Set());
    } else {
      setSelectedMemberIds(new Set(displayedMembers.map(m => m.id)));
    }
  };

  const toggleSelectMember = (id: string) => {
    const newSelected = new Set(selectedMemberIds);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelectedMemberIds(newSelected);
  };

  return (
    <div className="p-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Üye Yönetimi</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            {currentUser?.city ? `${currentUser.city} Şubesi üyelerini yönetin` : 'Tüm üyeleri yönetin'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/admin/members/new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Yeni Üye
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-slate-800">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'list' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
          >
            <List className="w-4 h-4" />
            Üye Listesi
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'search' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
          >
            <Filter className="w-4 h-4" />
            Detaylı Arama
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'bulk' ? 'border-orange-600 text-orange-600 dark:text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
          >
            <Users className="w-4 h-4" />
            Toplu Bilgi Güncelleme
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'distribution' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
          >
            <PieChartIcon className="w-4 h-4" />
            Üye Dağılım ve Analiz
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Tab 1: Member List (and results container for others) */}
        {activeTab === 'list' && (
          <>
            {/* Quick Search & Actions Toolbar */}
            <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-lg p-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Hızlı ara: Ad, Soyad, TC, Telefon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="pending">Beklemede</option>
                <option value="inactive">Pasif</option>
              </select>

              <div className="flex items-center gap-2">
                <button onClick={() => setIsCompact(!isCompact)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700">
                  {isCompact ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <ExportMenu data={displayedMembers} fileName="uye-listesi" />
                <div className="relative" ref={columnSelectorRef}>
                  <button onClick={() => setShowColumnSelector(!showColumnSelector)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700">
                    <Settings2 className="w-4 h-4" /> Sütunlar
                  </button>
                  {showColumnSelector && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 flex flex-col max-h-[500px]">

                      {/* Variants Section */}
                      <div className="p-3 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Kayıtlı Görünümler</div>

                        {Object.keys(variants).length > 0 ? (
                          <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                            {Object.keys(variants).map(name => (
                              <div key={name} className="flex items-center justify-between group text-sm">
                                <button
                                  onClick={() => applyVariant(name)}
                                  className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate text-left flex-1"
                                  title="Uygula"
                                >
                                  {name}
                                </button>
                                <button
                                  onClick={() => deleteVariant(name)}
                                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                  title="Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic mb-3">Henüz kayıtlı görünüm yok.</div>
                        )}

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newVariantName}
                            onChange={(e) => setNewVariantName(e.target.value)}
                            placeholder="Görünüm adı..."
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                            onKeyDown={(e) => e.key === 'Enter' && saveVariant()}
                          />
                          <button
                            onClick={saveVariant}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Kaydet
                          </button>
                        </div>
                      </div>

                      <div className="p-3 overflow-y-auto flex-1">
                        <div className="font-semibold text-xs text-gray-500 mb-2 uppercase tracking-wider">Görünecek Sütunlar</div>
                        <div className="space-y-1">
                          {columnDefinitions.map(col => (
                            <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded cursor-pointer text-sm">
                              <input type="checkbox" checked={visibleColumns[col.key as keyof typeof visibleColumns]} onChange={() => toggleColumn(col.key)} className="rounded text-blue-600 border-gray-300 dark:border-slate-600 focus:ring-blue-500" />
                              <span className="text-slate-700 dark:text-slate-200">{col.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results Info */}
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-slate-400">
              <span>Toplam <strong>{displayedMembers.length}</strong> kayıt listeleniyor.</span>
              {selectedMemberIds.size > 0 &&
                <span className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                  {selectedMemberIds.size} seçildi
                  <button onClick={handleBulkSms} className="hover:underline ml-2">SMS Gönder</button>
                </span>
              }
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className={`${isCompact ? 'w-full' : 'min-w-full'} divide-y divide-gray-200 dark:divide-slate-800`}>
                  <thead className="bg-gray-50 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-3 py-2 w-8"><input type="checkbox" onChange={toggleSelectAll} className="rounded" /></th>
                      {visibleColumns.membershipNumber && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Üye No</th>}
                      {visibleColumns.mobile && <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Mobil</th>}
                      {visibleColumns.fullName && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ad Soyad</th>}
                      {visibleColumns.tcIdentity && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">TC Kimlik</th>}
                      {visibleColumns.status && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>}
                      {visibleColumns.contact && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">İletişim</th>}
                      {visibleColumns.location && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Konum</th>}
                      {visibleColumns.workplace && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">İş Yeri</th>}
                      {/* Add other columns conditionally as per visibleColumns state */}
                      {visibleColumns.fatherName && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Baba Adı</th>}
                      {visibleColumns.motherName && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Anne Adı</th>}
                      {visibleColumns.institution && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kurum</th>}

                      <th className="px-3 py-2 text-right sticky right-0 bg-gray-50 dark:bg-slate-900 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {displayedMembers.map(member => (
                      <tr
                        key={member.id}
                        className="group hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer"
                        onClick={(e) => {
                          // Prevent triggering if checkbox or specific buttons are clicked if needed
                          // For now, allow row click except on interaction elements if we want to be safe, 
                          // but usually row click is fine. 
                          // Let's filter out if the click target is a button or input
                          if ((e.target as HTMLElement).tagName.toLowerCase() !== 'input' &&
                            (e.target as HTMLElement).tagName.toLowerCase() !== 'button' &&
                            !(e.target as HTMLElement).closest('button')) {
                            setSelectedMember(member);
                            setShowDetails(true);
                          }
                        }}
                      >
                        <td className="px-3 py-2"><input type="checkbox" checked={selectedMemberIds.has(member.id)} onChange={() => toggleSelectMember(member.id)} className="rounded" /></td>
                        {visibleColumns.membershipNumber && <td className="px-3 py-2 text-sm">{member.membership_number}</td>}
                        {visibleColumns.mobile && (
                          <td className="px-3 py-2 text-center">
                            {member.last_login_at ? (
                              <div className="flex justify-center group relative">
                                <Smartphone className="w-4 h-4 text-green-500" />
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                  Son Giriş: {new Date(member.last_login_at).toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-center" title="Hiç giriş yapmadı">
                                <Smartphone className="w-4 h-4 text-slate-300 dark:text-slate-700" />
                              </div>
                            )}
                          </td>
                        )}
                        {visibleColumns.fullName && <td className="px-3 py-2 text-sm font-medium">{member.first_name} {member.last_name}</td>}
                        {visibleColumns.tcIdentity && <td className="px-3 py-2 text-sm">{member.tc_identity}</td>}
                        {visibleColumns.status && <td className="px-3 py-2">{getStatusBadge(member.membership_status)}</td>}
                        {visibleColumns.contact && <td className="px-3 py-2 text-sm">
                          <div>{member.phone}</div>
                          <div className="text-gray-400 text-xs">{member.email}</div>
                        </td>}
                        {visibleColumns.location && <td className="px-3 py-2 text-sm">{member.city} / {member.district}</td>}
                        {visibleColumns.workplace && <td className="px-3 py-2 text-sm">{member.workplace}</td>}

                        {visibleColumns.fatherName && <td className="px-3 py-2 text-sm">{member.father_name}</td>}
                        {visibleColumns.motherName && <td className="px-3 py-2 text-sm">{member.mother_name}</td>}
                        {visibleColumns.institution && <td className="px-3 py-2 text-sm">{member.institution}</td>}

                        <td className="px-3 py-2 text-right sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/60 transition-colors shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex justify-end gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setShowFilesModal(true); }} className="text-gray-500 hover:text-purple-600" title="Özlük Dosyası"><FileText className="w-5 h-5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setShowDetails(true); }} className="text-gray-500 hover:text-blue-600" title="Detaylar"><Eye className="w-5 h-5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setShowEditModal(true); }} className="text-gray-500 hover:text-green-600" title="Düzenle"><Edit className="w-5 h-5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setShowResignationModal(true); }} className="text-gray-500 hover:text-red-600" title="İstifa Ettir"><LogOut className="w-5 h-5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Advanced Search */}
        {activeTab === 'search' && (
          <MemberFilterTab
            filters={advancedFilters}
            setFilters={setAdvancedFilters}
            onSearch={handleAdvancedSearch}
            onClear={handleClearAdvancedFilters}

            results={detailedSearchResults}
            onRowClick={(member) => { setSelectedMember(member); setShowDetails(true); }}
            onConditionalSearch={(conditions) => {
              // Reuse logic from handleBulkFind but set to detailedSearchResults
              let filtered = [...allMembers].filter(member => {
                return conditions.every(condition => {
                  const val = (member as any)[condition.field];
                  const checkVal = val ? String(val).toLowerCase() : '';
                  const targetVal = condition.value.toLowerCase();

                  switch (condition.operator) {
                    case 'isEmpty': return !val || val === '';
                    case 'isNotEmpty': return val && val !== '';
                    case 'equals': return checkVal === targetVal;
                    case 'notEquals': return checkVal !== targetVal;
                    case 'contains': return checkVal.includes(targetVal);
                    default: return true;
                  }
                });
              });

              if (filtered.length === 0) {
                alert('Seçilen kriterlere uygun kayıt bulunamadı.');
                return;
              }
              setDetailedSearchResults(filtered);
              alert(`${filtered.length} kayıt bulundu.`);
            }}
          />
        )}

        {/* Tab 3: Bulk Update */}
        {activeTab === 'bulk' && (
          <BulkUpdateTab
            members={allMembers}
            onFindMembers={handleBulkFind}
            results={bulkSearchResults}
            isLoading={loading}
            onRowClick={(member) => { setSelectedMember(member); setShowDetails(true); }}
          />
        )}

        {/* Tab 4: Distribution Analysis */}
        {activeTab === 'distribution' && (
          <MemberDistributionTab members={allMembers} />
        )}
      </div>

      {/* Detail Modal */}
      {showDetails && selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          isOpen={true}
          onClose={() => setShowDetails(false)}
          onEdit={() => { setShowDetails(false); setShowEditModal(true); }}
          onResign={() => { setShowResignationModal(true); }}
        />
      )}

      {/* Modals rendered after DetailModal to appear on top if stacked */}
      {showEditModal && selectedMember && <EditMemberModal member={selectedMember} isOpen={true} onClose={() => setShowEditModal(false)} onSuccess={() => { loadMembers(); setShowEditModal(false); }} />}
      {showFilesModal && selectedMember && <MemberFilesModal member={selectedMember} onClose={() => setShowFilesModal(false)} />}
      {showResignationModal && selectedMember && <ResignationModal member={selectedMember} onClose={() => setShowResignationModal(false)} onSuccess={() => { loadMembers(); setShowResignationModal(false); }} />}


    </div>
  );
}
