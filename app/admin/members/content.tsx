'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
import { Skeleton } from '@/components/common/Skeleton';

export default function AdminMembersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'list' | 'search' | 'bulk' | 'distribution'>('list');

  // Data State
  const [allMembers, setAllMembers] = useState<Member[]>([]); // For Search/Bulk/Stats tabs
  const [displayedMembers, setDisplayedMembers] = useState<Member[]>([]); // For List tab (Paginated)
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Search & Filter State
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [dateFilter, setDateFilter] = useState<string>(searchParams.get('date') || 'all');
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
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);

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
      // Fetch regions for filter dropdown
      const fetchRegions = async () => {
        try {
          const { data, error } = await supabase
            .from('regions')
            .select('id, name')
            .order('name');
          if (error) throw error;
          setRegions(data || []);
        } catch (err) {
          console.error('Bölgeler yüklenemedi:', err);
        }
      };
      fetchRegions();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'list' && currentUser) {
      // 500ms debounce for search
      const timer = setTimeout(() => {
        loadMembers(1); // Search değişince sayfa 1'e git
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (activeTab === 'list' && currentUser) {
      loadMembers(1); // Filtre değişince veya kullanıcı yüklenince sayfa 1
    }
  }, [statusFilter, dateFilter, currentUser]);

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

  const loadMembers = async (page = 1, userToUse = currentUser) => {
    try {
      setLoading(true);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('members').select('*', { count: 'exact' });

      // Permission Check
      if (!userToUse || !PermissionManager.canViewMembers(userToUse)) {
        console.warn('User does not have permission to view members', userToUse);
        setDisplayedMembers([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      // Role Based Access Control
      const isSuperAdmin = userToUse?.role === 'super_admin';

      if (!isSuperAdmin) {
        if (userToUse && userToUse.role_type === 'branch_manager' && userToUse.city) {
          query = query.eq('city', userToUse.city);
        } else if (userToUse && userToUse.role_type === 'regional_manager' && userToUse.region) {
          query = query.eq('region', userToUse.region);
        }
      }

      // Apply Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'resigned') {
          // Fix: Only show resigned members when 'resigned' is selected
          query = query.eq('membership_status', 'resigned');
        } else {
          query = query.eq('membership_status', statusFilter);
        }
      }

      // Apply Date Filter
      if (dateFilter !== 'all') {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

        const isResignationCheck = statusFilter === 'resigned' || ['inactive', 'suspended', 'resigned'].includes(statusFilter);
        const dateField = isResignationCheck ? 'updated_at' : 'created_at';

        if (dateFilter === 'this_month') {
          query = query.gte(dateField, firstDayOfMonth);
        } else if (dateFilter === 'last_month') {
          query = query.gte(dateField, firstDayOfLastMonth).lte(dateField, lastDayOfLastMonth);
        }
      }

      // Apply Search Term
      if (searchTerm) {
        // Not: .or() kullanırken parantez içine almak önemli. Ve tüm alanları kapsamak.
        // Supabase Postgrest syntax: column.ilike.value
        const term = `%${searchTerm}%`;
        query = query.or(`first_name.ilike.${term},last_name.ilike.${term},tc_identity.ilike.${term},phone.ilike.${term},membership_number.ilike.${term},email.ilike.${term}`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setDisplayedMembers(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);

    } catch (error: any) {
      console.error('Üyeler yüklenirken hata:', error);
      alert('Üyeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllMembers = async () => {
    console.log('[DEBUG loadAllMembers] Starting...');
    console.log('[DEBUG loadAllMembers] allMembers.length:', allMembers.length);

    if (allMembers.length > 0) {
      console.log('[DEBUG loadAllMembers] Already loaded, skipping');
      return; // Already loaded
    }
    try {
      setLoading(true);
      let query = supabase.from('members').select('*');

      // Permission Check
      console.log('[DEBUG loadAllMembers] currentUser:', currentUser);
      console.log('[DEBUG loadAllMembers] canViewMembers:', currentUser ? PermissionManager.canViewMembers(currentUser) : 'no user');

      if (!currentUser || !PermissionManager.canViewMembers(currentUser)) {
        console.warn('[DEBUG loadAllMembers] Permission denied or no user');
        setAllMembers([]);
        setLoading(false);
        return;
      }

      const isSuperAdmin = currentUser?.role === 'super_admin';
      console.log('[DEBUG loadAllMembers] isSuperAdmin:', isSuperAdmin);
      console.log('[DEBUG loadAllMembers] role_type:', currentUser?.role_type);
      console.log('[DEBUG loadAllMembers] city:', currentUser?.city);
      console.log('[DEBUG loadAllMembers] region:', currentUser?.region);

      if (!isSuperAdmin) {
        if (currentUser && currentUser.role_type === 'branch_manager' && currentUser.city) {
          query = query.eq('city', currentUser.city);
          console.log('[DEBUG loadAllMembers] Filtering by city:', currentUser.city);
        } else if (currentUser && currentUser.role_type === 'regional_manager' && currentUser.region) {
          query = query.eq('region', currentUser.region);
          console.log('[DEBUG loadAllMembers] Filtering by region:', currentUser.region);
        }
      }

      console.log('[DEBUG loadAllMembers] Executing query...');
      const { data, error } = await query.order('created_at', { ascending: false });

      console.log('[DEBUG loadAllMembers] Query completed');
      console.log('[DEBUG loadAllMembers] Error:', error);
      console.log('[DEBUG loadAllMembers] Data count:', data?.length ?? 0);

      if (error) {
        console.error('[DEBUG loadAllMembers] Supabase error:', error.message, error.code, error.details);
        throw error;
      }

      setAllMembers(data || []);
      console.log('[DEBUG loadAllMembers] Members set successfully:', data?.length ?? 0);
    } catch (error: any) {
      console.error('[DEBUG loadAllMembers] Catch block error:', error);
      console.error('[DEBUG loadAllMembers] Error message:', error?.message);
      console.error('[DEBUG loadAllMembers] Error stack:', error?.stack);
    } finally {
      setLoading(false);
      console.log('[DEBUG loadAllMembers] Finished');
    }
  };

  useEffect(() => {
    if (activeTab !== 'list' && currentUser) {
      loadAllMembers();
    }
  }, [activeTab]);

  const handleAdvancedSearch = async () => {
    // Ensure members are loaded
    if (allMembers.length === 0) {
      await loadAllMembers();
    }

    // Clear previous results first
    setDetailedSearchResults([]);

    let filtered = [...allMembers];
    const f = advancedFilters;

    // Apply advanced filters
    if (f.city) {
      filtered = filtered.filter(m => m.city === f.city);
    }
    if (f.district) {
      filtered = filtered.filter(m => m.district === f.district);
    }
    if (f.workplace) {
      const searchVal = f.workplace.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(m => m.workplace?.toLocaleLowerCase('tr-TR').includes(searchVal));
    }
    if (f.position) {
      const searchVal = f.position.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(m => m.position?.toLocaleLowerCase('tr-TR').includes(searchVal));
    }
    if (f.gender) {
      // Handle gender mapping: UI uses 'Erkek'/'Kadın', DB uses 'male'/'female'
      const genderMap: Record<string, string> = { 'Erkek': 'male', 'Kadın': 'female' };
      const dbGender = genderMap[f.gender] || f.gender;
      filtered = filtered.filter(m => m.gender === dbGender);
    }
    if (f.education) {
      filtered = filtered.filter(m => m.education_level === f.education);
    }
    if (f.blood_group) {
      filtered = filtered.filter(m => m.blood_group === f.blood_group);
    }
    if (f.region) {
      // Try matching by region name - regions array contains {id, name}
      filtered = filtered.filter(m => {
        // If m.region is a number, we need to find the region name that matches
        if (typeof m.region === 'number' || !isNaN(Number(m.region))) {
          return String(m.region) === f.region;
        }
        return m.region === f.region;
      });
    }
    if (f.maritalStatus) {
      filtered = filtered.filter(m => m.marital_status === f.maritalStatus);
    }
    if (f.tcIdentity) {
      filtered = filtered.filter(m => m.tc_identity.includes(f.tcIdentity));
    }
    if (f.firstName) {
      const searchVal = f.firstName.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(m => m.first_name.toLocaleLowerCase('tr-TR').includes(searchVal));
    }
    if (f.lastName) {
      const searchVal = f.lastName.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(m => m.last_name.toLocaleLowerCase('tr-TR').includes(searchVal));
    }
    if (f.fatherName) {
      const searchVal = f.fatherName.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(m => m.father_name?.toLocaleLowerCase('tr-TR').includes(searchVal));
    }
    if (f.motherName) {
      const searchVal = f.motherName.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(m => m.mother_name?.toLocaleLowerCase('tr-TR').includes(searchVal));
    }
    if (f.birthPlace) {
      filtered = filtered.filter(m => m.birth_place === f.birthPlace);
    }
    if (f.membershipNumber) {
      filtered = filtered.filter(m => m.membership_number?.toLowerCase().includes(f.membershipNumber.toLowerCase()));
    }
    if (f.institution) {
      const searchVal = f.institution.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(m => m.institution?.toLocaleLowerCase('tr-TR').includes(searchVal));
    }
    if (f.institutionRegNo) {
      filtered = filtered.filter(m => m.institution_register_no?.includes(f.institutionRegNo));
    }
    if (f.retirementRegNo) {
      filtered = filtered.filter(m => m.retirement_register_no?.includes(f.retirementRegNo));
    }
    if (f.email) {
      filtered = filtered.filter(m => m.email?.toLowerCase().includes(f.email.toLowerCase()));
    }
    if (f.phone) {
      // Remove non-digit characters for robust search
      const cleanSearchPhone = f.phone.replace(/\D/g, '');
      filtered = filtered.filter(m => {
        if (!m.phone) return false;
        const cleanMemberPhone = m.phone.replace(/\D/g, '');
        return cleanMemberPhone.includes(cleanSearchPhone);
      });
    }
    if (f.address) {
      const searchVal = f.address.toLocaleLowerCase('tr-TR');
      filtered = filtered.filter(m => m.address?.toLocaleLowerCase('tr-TR').includes(searchVal));
    }
    if (f.membershipStatus) {
      filtered = filtered.filter(m => m.membership_status === f.membershipStatus);
    }

    // Membership date range
    if (f.membershipStartDate) {
      filtered = filtered.filter(m => m.membership_date && m.membership_date >= f.membershipStartDate);
    }
    if (f.membershipEndDate) {
      filtered = filtered.filter(m => m.membership_date && m.membership_date <= f.membershipEndDate);
    }

    // Resignation filters
    if (f.resignationReason) {
      filtered = filtered.filter(m => m.resignation_reason === f.resignationReason);
    }
    if (f.resignationStartDate) {
      filtered = filtered.filter(m => m.resignation_date && m.resignation_date >= f.resignationStartDate);
    }
    if (f.resignationEndDate) {
      filtered = filtered.filter(m => m.resignation_date && m.resignation_date <= f.resignationEndDate);
    }

    // Due status
    if (f.dueStatus) {
      filtered = filtered.filter(m => m.due_status === f.dueStatus);
    }

    // Work city and district - these use the same city/district fields
    // They should NOT be applied if city/district filters are already set (to avoid conflict)
    if (f.workCity && !f.city) {
      filtered = filtered.filter(m => m.city === f.workCity);
    }
    if (f.workDistrict && !f.district) {
      filtered = filtered.filter(m => m.district === f.workDistrict);
    }

    // Age range filter
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

    // Birth date filter
    if (f.birthDate) {
      filtered = filtered.filter(m => m.birth_date === f.birthDate);
    }

    setDetailedSearchResults(filtered);
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



  if (!currentUser || !PermissionManager.canViewMembers(currentUser)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 m-6">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
          <UserX className="w-12 h-12 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Yetkisiz Erişim</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          Bu sayfayı görüntülemek için yeterli izniniz bulunmamaktadır. Lütfen yöneticinizle iletişime geçin.
        </p>


      </div>
    );
  }

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
          {PermissionManager.canManageMembers(currentUser) && (
            <button onClick={() => router.push('/admin/members/new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-4 h-4" /> Yeni Üye
            </button>
          )}
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

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800"
              >
                <option value="all">Tüm Tarihler</option>
                <option value="this_month">Bu Ay</option>
                <option value="last_month">Geçen Ay</option>
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
                    {loading ? (
                      [...Array(10)].map((_, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2"><Skeleton width={16} height={16} /></td>
                          {visibleColumns.membershipNumber && <td className="px-3 py-2"><Skeleton width={60} /></td>}
                          {visibleColumns.mobile && <td className="px-3 py-2"><div className="flex justify-center"><Skeleton variant="circular" width={24} height={24} /></div></td>}
                          {visibleColumns.fullName && <td className="px-3 py-2"><Skeleton width={140} /></td>}
                          {visibleColumns.tcIdentity && <td className="px-3 py-2"><Skeleton width={100} /></td>}
                          {visibleColumns.status && <td className="px-3 py-2"><Skeleton width={70} height={24} className="rounded-full" /></td>}
                          {visibleColumns.contact && <td className="px-3 py-2"><div className="space-y-1"><Skeleton width={100} /><Skeleton width={140} height={12} /></div></td>}
                          {visibleColumns.location && <td className="px-3 py-2"><Skeleton width={120} /></td>}
                          {visibleColumns.workplace && <td className="px-3 py-2"><Skeleton width={160} /></td>}
                          {visibleColumns.fatherName && <td className="px-3 py-2"><Skeleton width={100} /></td>}
                          {visibleColumns.motherName && <td className="px-3 py-2"><Skeleton width={100} /></td>}
                          {visibleColumns.institution && <td className="px-3 py-2"><Skeleton width={140} /></td>}
                          <td className="px-3 py-2 text-right sticky right-0 bg-white dark:bg-slate-900 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                            <div className="flex justify-end gap-2">
                              <Skeleton width={20} height={20} />
                              <Skeleton width={20} height={20} />
                              <Skeleton width={20} height={20} />
                              <Skeleton width={20} height={20} />
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      displayedMembers.map(member => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Toplam <strong>{totalCount}</strong> üyeden <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, totalCount)}</strong> arası gösteriliyor (Sayfa {currentPage}/{Math.ceil(totalCount / pageSize)})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => loadMembers(currentPage - 1)}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Önceki
                </button>
                {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                  const totalPages = Math.ceil(totalCount / pageSize);
                  // Simple logic: show first 5 or logic to center around current page
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    p = currentPage - 2 + i;
                  }
                  if (p > totalPages) return null;

                  return (
                    <button
                      key={p}
                      onClick={() => loadMembers(p)}
                      disabled={loading}
                      className={`px-3 py-1 border rounded-lg ${currentPage === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => loadMembers(currentPage + 1)}
                  disabled={currentPage * pageSize >= totalCount || loading}
                  className="px-3 py-1 border border-gray-300 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-800"
                >
                  Sonraki
                </button>
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
            regions={regions}
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


