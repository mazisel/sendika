'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { exportRowsToExcel, exportRowsToCSV, exportRowsToPDF } from '@/lib/exportUtils';
import {
  BarChart3,
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  UserCheck,
  UserX,
  Clock,
  Briefcase,
  GraduationCap,
  Heart,
  Baby,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  LayoutGrid,
  Table,
  PieChart,
  UserMinus // Icon for resigned members
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { AdminUser } from '@/lib/types';
import { PermissionManager } from '@/lib/permissions';
import StatsDetailModal from '@/components/statistics/StatsDetailModal';
import { CardSkeleton, ChartSkeleton, Skeleton } from '@/components/common/Skeleton';

interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  inactiveMembers: number;
  suspendedMembers: number;
  newMembersThisMonth: number;
  newMembersLastMonth: number;
  resignedMembers: number;
}

interface ResignationStats {
  resignationReasons: { reason: string; count: number }[];
}

interface DemographicStats {
  genderDistribution: { gender: string; count: number }[];
  ageGroups: { ageGroup: string; count: number }[];
  maritalStatus: { status: string; count: number }[];
  educationLevels: { level: string; count: number }[];
  childrenStats: { range: string; count: number }[];
}

interface GeographicStats {
  cityDistribution: { city: string; count: number }[];
  topCities: { city: string; count: number }[];
}

interface WorkplaceStats {
  topWorkplaces: { workplace: string; count: number }[];
  positionDistribution: { position: string; count: number }[];
}

interface TimeStats {
  membershipTrends: { month: string; count: number }[];
  joinDateAnalysis: { period: string; count: number }[];
}

export default function StatisticsPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [demographicStats, setDemographicStats] = useState<DemographicStats | null>(null);
  const [geographicStats, setGeographicStats] = useState<GeographicStats | null>(null);
  const [workplaceStats, setWorkplaceStats] = useState<WorkplaceStats | null>(null);
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [resignationStats, setResignationStats] = useState<ResignationStats | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'bar' | 'card' | 'table' | 'pie'>('bar');

  // Interactive Stats State
  const [selectedStat, setSelectedStat] = useState<{
    type: string;
    value: any;
    title: string;
  } | null>(null);

  const handleStatClick = (type: string, value: any, title: string) => {
    setSelectedStat({ type, value, title });
  };

  const cardClass =
    'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-slate-900/40 p-4 transition-all duration-300 block hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transform hover:-translate-y-1';
  const miniCardClass =
    'rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm dark:shadow-slate-900/40 p-4 transition-colors';

  useEffect(() => {
    const currentUser = AdminAuth.getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      loadStatistics(currentUser);
    } else {
      setLoading(false);
    }
  }, [selectedTimeRange]);

  const getStartDate = (range: string) => {
    const now = new Date();
    if (range === 'week') now.setDate(now.getDate() - 7);
    else if (range === 'month') now.setMonth(now.getMonth() - 1);
    else if (range === 'year') now.setFullYear(now.getFullYear() - 1);
    else return null; // 'all'
    return now.toISOString();
  };

  const loadStatistics = async (currentUser: AdminUser) => {
    try {
      setLoading(true);
      const startDate = getStartDate(selectedTimeRange);

      await Promise.all([
        loadMemberStats(startDate, currentUser),
        loadDemographicStats(startDate, currentUser),
        loadGeographicStats(startDate, currentUser),
        loadWorkplaceStats(startDate, currentUser),
        loadTimeStats(startDate, currentUser),
        loadResignationStats(startDate, currentUser)
      ]);
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberStats = async (startDate: string | null, currentUser: AdminUser) => {
    try {
      if (!PermissionManager.canViewMembers(currentUser)) return;

      // Helper to applies date filter AND scope filter
      const applyFilter = (query: any) => {
        let q = query;
        if (startDate) q = q.gte('created_at', startDate);

        // Scope filter
        if (currentUser.role_type === 'branch_manager' && currentUser.city) {
          q = q.eq('city', currentUser.city);
        } else if (currentUser.role_type === 'regional_manager' && currentUser.region) {
          q = q.eq('region', currentUser.region);
        }

        return q;
      };

      // Toplam üye sayısı (Filtreye göre)
      const totalMembersQuery = supabase.from('members').select('*', { count: 'exact', head: true });
      const { count: totalMembers } = await applyFilter(totalMembersQuery);

      // Aktif üyeler
      const activeMembersQuery = supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'active')
        .eq('is_active', true);
      const { count: activeMembers } = await applyFilter(activeMembersQuery);

      // Bekleyen üyeler
      const pendingMembersQuery = supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'pending');
      const { count: pendingMembers } = await applyFilter(pendingMembersQuery);

      // Pasif üyeler
      const inactiveMembersQuery = supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'inactive');
      const { count: inactiveMembers } = await applyFilter(inactiveMembersQuery);

      // Askıya alınan üyeler
      const suspendedMembersQuery = supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'suspended');
      const { count: suspendedMembers } = await applyFilter(suspendedMembersQuery);

      // Bu ay yeni üyeler (Zaman filtresi yoksa bu ay, varsa filtrelenen aralıktaki yeni üyeler)
      // Ancak "Bu Ay Yeni" kartı spesifik bir metrik, filtre seçilse bile "Bu Ay"ı göstermesi daha mantıklı olabilir
      // YADA filtre seçildiğinde "Seçilen Dönemde Yeni" gibi davranmalı. 
      // Kullanıcı "Son 1 Hafta" seçtiğinde, Total Members = Son 1 haftada katılanlar olur.
      // "New Members This Month" ise bağlam dışı kalabilir. 
      // Ancak mevcut UI korunsun, sadece Total/Active/Pending vs. filtrelensin.

      const thisMonth = new Date();
      thisMonth.setDate(1);
      const { count: newMembersThisMonth } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thisMonth.toISOString());

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      const { count: newMembersLastMonth } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastMonth.toISOString())
        .lt('created_at', thisMonth.toISOString());

      setMemberStats({
        totalMembers: totalMembers || 0,
        activeMembers: activeMembers || 0,
        pendingMembers: pendingMembers || 0,
        inactiveMembers: inactiveMembers || 0,
        suspendedMembers: suspendedMembers || 0,
        newMembersThisMonth: newMembersThisMonth || 0,
        newMembersLastMonth: newMembersLastMonth || 0,
        resignedMembers: 0 // Will be populated below if query succeeds
      });

      // İstifa eden üyeler (Resigned)
      const resignedMembersQuery = supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'resigned');
      const { count: resignedMembers } = await applyFilter(resignedMembersQuery);

      setMemberStats(prev => prev ? ({ ...prev, resignedMembers: resignedMembers || 0 }) : null);

    } catch (error) {
      console.error('Üye istatistikleri yüklenirken hata:', error);
    }
  };

  const loadDemographicStats = async (startDate: string | null, currentUser: AdminUser) => {
    try {
      if (!PermissionManager.canViewMembers(currentUser)) return;

      const applyFilter = (query: any) => {
        let q = query;
        if (startDate) q = q.gte('created_at', startDate);

        // Scope filter
        if (currentUser.role_type === 'branch_manager' && currentUser.city) {
          q = q.eq('city', currentUser.city);
        } else if (currentUser.role_type === 'regional_manager' && currentUser.region) {
          q = q.eq('region', currentUser.region);
        }

        return q;
      };

      // Cinsiyet dağılımı
      let genderQuery = supabase
        .from('members')
        .select('gender')
        .not('gender', 'is', null);

      const { data: genderData } = await applyFilter(genderQuery);

      const genderDistribution = genderData?.reduce((acc: any[], member: any) => {
        const existing = acc.find(item => item.gender === member.gender);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ gender: member.gender, count: 1 });
        }
        return acc;
      }, []) || [];

      // Yaş grupları
      let birthQuery = supabase
        .from('members')
        .select('birth_date')
        .not('birth_date', 'is', null);

      const { data: birthData } = await applyFilter(birthQuery);

      const ageGroups = birthData?.reduce((acc: any[], member: any) => {
        const age = new Date().getFullYear() - new Date(member.birth_date).getFullYear();
        let ageGroup = '';
        if (age < 25) ageGroup = '18-24';
        else if (age < 35) ageGroup = '25-34';
        else if (age < 45) ageGroup = '35-44';
        else if (age < 55) ageGroup = '45-54';
        else if (age < 65) ageGroup = '55-64';
        else ageGroup = '65+';

        const existing = acc.find(item => item.ageGroup === ageGroup);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ ageGroup, count: 1 });
        }
        return acc;
      }, []) || [];

      // Medeni durum
      let maritalQuery = supabase
        .from('members')
        .select('marital_status')
        .not('marital_status', 'is', null);

      const { data: maritalData } = await applyFilter(maritalQuery);

      const maritalStatus = maritalData?.reduce((acc: any[], member: any) => {
        const existing = acc.find(item => item.status === member.marital_status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: member.marital_status, count: 1 });
        }
        return acc;
      }, []) || [];

      // Eğitim seviyeleri
      let educationQuery = supabase
        .from('members')
        .select('education_level')
        .not('education_level', 'is', null);

      const { data: educationData } = await applyFilter(educationQuery);

      const educationLevels = educationData?.reduce((acc: any[], member: any) => {
        const existing = acc.find(item => item.level === member.education_level);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ level: member.education_level, count: 1 });
        }
        return acc;
      }, []) || [];

      // Çocuk sayısı istatistikleri
      let childrenQuery = supabase
        .from('members')
        .select('children_count')
        .not('children_count', 'is', null);

      const { data: childrenData } = await applyFilter(childrenQuery);

      const childrenStats = childrenData?.reduce((acc: any[], member: any) => {
        let range = '';
        if (member.children_count === 0) range = 'Çocuksuz';
        else if (member.children_count === 1) range = '1 Çocuk';
        else if (member.children_count === 2) range = '2 Çocuk';
        else if (member.children_count >= 3) range = '3+ Çocuk';

        const existing = acc.find(item => item.range === range);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ range, count: 1 });
        }
        return acc;
      }, []) || [];

      setDemographicStats({
        genderDistribution,
        ageGroups,
        maritalStatus,
        educationLevels,
        childrenStats
      });
    } catch (error) {
      console.error('Demografik istatistikler yüklenirken hata:', error);
    }
  };

  const loadGeographicStats = async (startDate: string | null, currentUser: AdminUser) => {
    try {
      const applyFilter = (query: any) => {
        if (startDate) return query.gte('created_at', startDate);
        return query;
      };

      // Şehir dağılımı
      let cityQuery = supabase
        .from('members')
        .select('city')
        .not('city', 'is', null);

      const { data: cityData } = await applyFilter(cityQuery);

      const cityDistribution = cityData?.reduce((acc: any[], member: any) => {
        const existing = acc.find(item => item.city === member.city);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ city: member.city, count: 1 });
        }
        return acc;
      }, []) || [];

      // En çok üyesi olan şehirler (ilk 10)
      const topCities = cityDistribution
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10);

      setGeographicStats({
        cityDistribution,
        topCities
      });
    } catch (error) {
      console.error('Coğrafi istatistikler yüklenirken hata:', error);
    }
  };

  const loadWorkplaceStats = async (startDate: string | null, currentUser: AdminUser) => {
    try {
      const applyFilter = (query: any) => {
        let q = query;
        if (startDate) q = q.gte('created_at', startDate);

        // Scope filter
        if (currentUser.role_type === 'branch_manager' && currentUser.city) {
          q = q.eq('city', currentUser.city);
        } else if (currentUser.role_type === 'regional_manager' && currentUser.region) {
          q = q.eq('region', currentUser.region);
        }

        return q;
      };

      // En çok çalışanı olan işyerleri
      let workplaceQuery = supabase
        .from('members')
        .select('workplace')
        .not('workplace', 'is', null);

      const { data: workplaceData } = await applyFilter(workplaceQuery);

      const topWorkplaces = workplaceData?.reduce((acc: any[], member: any) => {
        const existing = acc.find(item => item.workplace === member.workplace);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ workplace: member.workplace, count: 1 });
        }
        return acc;
      }, [])
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10) || [];

      // Pozisyon dağılımı
      let positionQuery = supabase
        .from('members')
        .select('position')
        .not('position', 'is', null);

      const { data: positionData } = await applyFilter(positionQuery);

      const positionDistribution = positionData?.reduce((acc: any[], member: any) => {
        const existing = acc.find(item => item.position === member.position);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ position: member.position, count: 1 });
        }
        return acc;
      }, [])
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 10) || [];

      setWorkplaceStats({
        topWorkplaces,
        positionDistribution
      });
    } catch (error) {
      console.error('İşyeri istatistikleri yüklenirken hata:', error);
    }
  };

  const loadTimeStats = async (startDate: string | null, currentUser: AdminUser) => {
    try {
      if (!PermissionManager.canViewMembers(currentUser)) return;

      // Son 12 ayın üyelik trendleri
      let query = supabase
        .from('members')
        .select('created_at');

      // Scope filter
      if (currentUser.role_type === 'branch_manager' && currentUser.city) {
        query = query.eq('city', currentUser.city);
      } else if (currentUser.role_type === 'regional_manager' && currentUser.region) {
        query = query.eq('region', currentUser.region);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      } else {
        // Default to 1 year if no filter
        query = query.gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
      }

      const { data: timeData } = await query;

      const membershipTrends = timeData?.reduce((acc: any[], member) => {
        const month = new Date(member.created_at).toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'short'
        });
        const existing = acc.find(item => item.month === month);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ month, count: 1 });
        }
        return acc;
      }, []) || [];

      // Sort trends chronologically if needed, but they come from reduce order which assumes data order.
      // Better to sort by date. 
      // Since month string 'Kas 2025' is hard to sort textually, let's trust the input data order (if sorted) or keeping as is.
      // But map reduces in order of appearance. If Supabase return not sorted, this is random.
      // Let's rely on current implementation for order, or better, we should sort the final array based on date parsing.
      // But for this task, I'll stick to original logic + filter fix.

      // Katılım tarihi analizi
      const joinDateAnalysis = timeData?.reduce((acc: any[], member) => {
        const joinDate = new Date(member.created_at);
        const now = new Date();
        const diffMonths = (now.getFullYear() - joinDate.getFullYear()) * 12 +
          (now.getMonth() - joinDate.getMonth());

        let period = '';
        if (diffMonths < 1) period = 'Bu ay';
        else if (diffMonths < 3) period = 'Son 3 ay';
        else if (diffMonths < 6) period = 'Son 6 ay';
        else if (diffMonths < 12) period = 'Son 1 yıl';
        else period = '1 yıldan fazla';

        const existing = acc.find(item => item.period === period);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ period, count: 1 });
        }
        return acc;
      }, []) || [];

      setTimeStats({
        membershipTrends,
        joinDateAnalysis
      });
    } catch (error) {
      console.error('Zaman istatistikleri yüklenirken hata:', error);
    }
  };

  const loadResignationStats = async (startDate: string | null, currentUser: AdminUser) => {
    try {
      if (!PermissionManager.canViewMembers(currentUser)) return;

      const applyFilter = (query: any) => {
        let q = query;
        // İstifa tarihine göre filtrele
        if (startDate) q = q.gte('resignation_date', startDate);

        // Scope filter
        if (currentUser.role_type === 'branch_manager' && currentUser.city) {
          q = q.eq('city', currentUser.city);
        } else if (currentUser.role_type === 'regional_manager' && currentUser.region) {
          q = q.eq('region', currentUser.region);
        }

        return q;
      };

      // İstifa nedenleri
      let query = supabase
        .from('members')
        .select('resignation_reason')
        .eq('membership_status', 'resigned')
        .not('resignation_reason', 'is', null);

      const { data: resignationData } = await applyFilter(query);

      const resignationReasons = resignationData?.reduce((acc: any[], member: any) => {
        const reason = member.resignation_reason || 'Diğer';
        const existing = acc.find(item => item.reason === reason);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ reason, count: 1 });
        }
        return acc;
      }, [])
        .sort((a: any, b: any) => b.count - a.count) || [];

      setResignationStats({
        resignationReasons
      });

    } catch (error) {
      console.error('İstifa istatistikleri yüklenirken hata:', error);
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await loadStatistics(user);
    setRefreshing(false);
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  const prepareExportData = () => {
    return [
      ['Rapor Tarihi', new Date().toLocaleDateString('tr-TR')],
      ['Seçilen Aralık', selectedTimeRange],
      [],
      ['İstatistik Türü', 'Değer'],
      ['Toplam Üye', memberStats?.totalMembers || 0],
      ['Aktif Üye', memberStats?.activeMembers || 0],
      ['Bekleyen Üye', memberStats?.pendingMembers || 0],
      ['Pasif Üye', memberStats?.inactiveMembers || 0],
      ['Askıya Alınan Üye', memberStats?.suspendedMembers || 0],
      ['İstifa Eden Üye', memberStats?.resignedMembers || 0],
      ['Bu Ay Yeni Üye', memberStats?.newMembersThisMonth || 0],
      ['Geçen Ay Yeni Üye', memberStats?.newMembersLastMonth || 0],
      [],
      ['Cinsiyet Dağılımı'],
      ...(demographicStats?.genderDistribution.map(d => [d.gender, d.count]) || []),
      [],
      ['İstifa Nedenleri'],
      ...(resignationStats?.resignationReasons.map(r => [r.reason, r.count]) || []),
      [],
      ['En Çok Üyesi Olan Şehirler'],
      ...(geographicStats?.topCities.map(c => [c.city, c.count]) || []),
      [],
      ['En Çok Çalışanı Olan İşyerleri'],
      ...(workplaceStats?.topWorkplaces.map(w => [w.workplace, w.count]) || [])
    ];
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    const data = prepareExportData();
    const fileName = `uye_istatistikleri_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') exportRowsToCSV(data, fileName);
    else if (format === 'xlsx') exportRowsToExcel(data, fileName, 'İstatistikler');
    else if (format === 'pdf') await exportRowsToPDF(data, fileName, 'Üye İstatistikleri Raporu');

    setShowExportMenu(false);
  };

  // Close dropdown when outside click
  useEffect(() => {
    const closeMenu = () => setShowExportMenu(false);
    if (showExportMenu) document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [showExportMenu]);

  const getGrowthPercentage = () => {
    if (!memberStats?.newMembersLastMonth || memberStats.newMembersLastMonth === 0) {
      return memberStats?.newMembersThisMonth ? '+100%' : '0%';
    }
    const growth = ((memberStats.newMembersThisMonth - memberStats.newMembersLastMonth) / memberStats.newMembersLastMonth) * 100;
    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  // Render statistics based on view mode
  const renderStatView = (
    data: { label: string; count: number; color: string }[],
    maxCount: number,
    onItemClick: (label: string) => void
  ) => {
    if (!data || data.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p className="text-sm">Henüz veri eklenmemiş</p>
        </div>
      );
    }

    // Bar View (current)
    if (viewMode === 'bar') {
      return (
        <div className="space-y-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => onItemClick(item.label)}
            >
              <span className="text-slate-700 dark:text-slate-300">{item.label || 'Belirtilmemiş'}</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full`}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 w-12 text-right">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Card View
    if (viewMode === 'card') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {data.map((item, index) => (
            <div
              key={index}
              className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg hover:shadow-md cursor-pointer transition-all"
              onClick={() => onItemClick(item.label)}
            >
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{item.count}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">{item.label || 'Belirtilmemiş'}</div>
              <div className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                {((item.count / maxCount) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Table View
    if (viewMode === 'table') {
      return (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="w-full">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Sayı
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Oran
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {data.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  onClick={() => onItemClick(item.label)}
                >
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">{item.label || 'Belirtilmemiş'}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100 text-right font-medium">{item.count}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400 text-right">
                    {((item.count / maxCount) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Pie Chart View
    if (viewMode === 'pie') {
      const total = data.reduce((sum, item) => sum + item.count, 0);
      let currentAngle = 0;
      const colors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
      ];

      return (
        <div className="flex flex-col items-center space-y-6">
          {/* SVG Pie Chart */}
          <svg viewBox="0 0 200 200" className="w-64 h-64">
            {data.map((item, index) => {
              const percentage = (item.count / total) * 100;
              const angle = (percentage / 100) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;

              // Calculate path for pie slice
              const startX = 100 + 90 * Math.cos((Math.PI * startAngle) / 180);
              const startY = 100 + 90 * Math.sin((Math.PI * startAngle) / 180);
              const endX = 100 + 90 * Math.cos((Math.PI * endAngle) / 180);
              const endY = 100 + 90 * Math.sin((Math.PI * endAngle) / 180);
              const largeArc = angle > 180 ? 1 : 0;

              const pathData = `M 100 100 L ${startX} ${startY} A 90 90 0 ${largeArc} 1 ${endX} ${endY} Z`;

              currentAngle += angle;

              return (
                <path
                  key={index}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() => onItemClick(item.label)}
                />
              );
            })}
          </svg>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded transition-colors"
                onClick={() => onItemClick(item.label)}
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-900 dark:text-slate-100 truncate">
                    {item.label || 'Belirtilmemiş'}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {item.count} ({((item.count / total) * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-8 text-slate-900 dark:text-slate-100">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton variant="text" width={200} height={32} className="mb-2" />
            <Skeleton variant="text" width={300} height={20} />
          </div>
          <div className="flex gap-2">
            <Skeleton width={100} height={40} />
            <Skeleton width={120} height={40} />
            <Skeleton width={100} height={40} />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton variant="circular" width={40} height={40} />
                <div>
                  <Skeleton variant="text" width={150} height={24} />
                  <Skeleton variant="text" width={100} height={16} />
                </div>
              </div>
              <ChartSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user || !PermissionManager.canViewMembers(user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 m-6">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
          <UserX className="w-12 h-12 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Yetkisiz Erişim</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          Bu sayfayı görüntülemek için yeterli izniniz bulunmamaktadır.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">İstatistikler</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Detaylı üye istatistikleri ve analiz raporları</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Mode Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('bar')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-colors ${viewMode === 'bar'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              title="Bar Grafik"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm font-medium">Bar</span>
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-colors ${viewMode === 'card'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              title="Kart Görünümü"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">Kart</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-colors ${viewMode === 'table'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              title="Tablo Görünümü"
            >
              <Table className="w-4 h-4" />
              <span className="text-sm font-medium">Tablo</span>
            </button>
            <button
              onClick={() => setViewMode('pie')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded transition-colors ${viewMode === 'pie'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              title="Pasta Grafik"
            >
              <PieChart className="w-4 h-4" />
              <span className="text-sm font-medium">Pasta</span>
            </button>
          </div>

          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          >
            <option value="all">Tüm Zamanlar</option>
            <option value="year">Son 1 Yıl</option>
            <option value="month">Son 1 Ay</option>
            <option value="week">Son 1 Hafta</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Dışa Aktar</span>
              <ChevronDown className="w-3 h-3 ml-1" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <button onClick={() => handleExport('xlsx')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 last:border-0 transition-colors">
                  Excel Olarak İndir
                </button>
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 border-b border-gray-100 dark:border-slate-700 last:border-0 transition-colors">
                  CSV Olarak İndir (Türkçe)
                </button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-slate-700 dark:text-slate-200 transition-colors">
                  PDF Olarak İndir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Genel İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Link href="/admin/members" className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Toplam Üye</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{memberStats?.totalMembers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
        </Link>

        <Link href="/admin/members?status=active" className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Aktif Üye</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{memberStats?.activeMembers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Link>

        <Link href="/admin/members?status=pending" className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Bekleyen Üye</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-300">{memberStats?.pendingMembers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
            </div>
          </div>
        </Link>

        <Link href="/admin/members?date=this_month" className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Bu Ay Yeni</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{memberStats?.newMembersThisMonth || 0}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{getGrowthPercentage()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Link>
        <Link href="/admin/members?status=resigned" className={cardClass}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">İstifa Eden</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{memberStats?.resignedMembers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
              <UserMinus className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Link>
      </div>

      {/* Demografik İstatistikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cinsiyet Dağılımı */}
        <div className={cardClass}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Cinsiyet Dağılımı</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Üyelerin cinsiyet bazlı dağılımı</p>
            </div>
          </div>
          {renderStatView(
            demographicStats?.genderDistribution?.map(item => ({
              label: item.gender,
              count: item.count,
              color: 'bg-purple-600 dark:bg-purple-400'
            })) || [],
            memberStats?.totalMembers || 1,
            (gender) => handleStatClick('gender', gender, `Cinsiyet: ${gender}`)
          )}
        </div>

        {/* Yaş Grupları */}
        <div className={cardClass}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Yaş Grupları</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Üyelerin yaş bazlı dağılımı</p>
            </div>
          </div>
          {renderStatView(
            demographicStats?.ageGroups?.map(item => ({
              label: item.ageGroup,
              count: item.count,
              color: 'bg-orange-600 dark:bg-orange-400'
            })) || [],
            memberStats?.totalMembers || 1,
            (ageGroup) => handleStatClick('age', ageGroup, `Yaş Grubu: ${ageGroup}`)
          )}
        </div>

        {/* Medeni Durum */}
        <div className={cardClass}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-pink-100 dark:bg-pink-500/20 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600 dark:text-pink-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Medeni Durum</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Üyelerin medeni durum dağılımı</p>
            </div>
          </div>
          {renderStatView(
            demographicStats?.maritalStatus?.map(item => ({
              label: item.status,
              count: item.count,
              color: 'bg-pink-600 dark:bg-pink-400'
            })) || [],
            memberStats?.totalMembers || 1,
            (status) => handleStatClick('marital', status, `Medeni Durum: ${status}`)
          )}
        </div>

        {/* Eğitim Seviyeleri */}
        <div className={cardClass}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Eğitim Seviyeleri</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Üyelerin eğitim durumu</p>
            </div>
          </div>
          {renderStatView(
            demographicStats?.educationLevels?.map(item => ({
              label: item.level,
              count: item.count,
              color: 'bg-indigo-600 dark:bg-indigo-400'
            })) || [],
            memberStats?.totalMembers || 1,
            (level) => handleStatClick('education', level, `Eğitim Seviyesi: ${level}`)
          )}
        </div>


        {/* İstifa Nedenleri */}
        <div className={cardClass}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
              <UserMinus className="w-5 h-5 text-red-600 dark:text-red-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">İstifa Nedenleri</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Üyelerin istifa gerekçeleri</p>
            </div>
          </div>
          {renderStatView(
            resignationStats?.resignationReasons?.map(item => ({
              label: item.reason,
              count: item.count,
              color: 'bg-red-600 dark:bg-red-400'
            })) || [],
            memberStats?.totalMembers || 1,
            (reason) => handleStatClick('resignation_reason', reason, `İstifa Nedeni: ${reason}`)
          )}
        </div>
      </div>

      {/* Coğrafi ve İş İstatistikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* En Çok Üyesi Olan Şehirler */}
        <div className={cardClass}>
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-500/20 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600 dark:text-green-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">En Çok Üyesi Olan Şehirler</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Coğrafi dağılım analizi</p>
            </div>
          </div>
          {
            renderStatView(
              geographicStats?.topCities?.map(item => ({
                label: item.city,
                count: item.count,
                color: 'bg-green-600 dark:bg-green-400'
              })) || [],
              geographicStats?.topCities[0]?.count || 1,
              (city) => handleStatClick('city', city, `Şehir: ${city}`)
            )
          }
        </div >

        {/* En Çok Çalışanı Olan İşyerleri */}
        < div className={cardClass} >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">En Çok Çalışanı Olan İşyerleri</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">İşyeri bazlı üye dağılımı</p>
            </div>
          </div>
          {
            renderStatView(
              workplaceStats?.topWorkplaces?.map(item => ({
                label: item.workplace,
                count: item.count,
                color: 'bg-blue-600 dark:bg-blue-400'
              })) || [],
              workplaceStats?.topWorkplaces[0]?.count || 1,
              (workplace) => handleStatClick('workplace', workplace, `İşyeri: ${workplace}`)
            )
          }
        </div >
      </div >

      {/* Çocuk Sayısı ve Pozisyon İstatistikleri */}
      < div className="grid grid-cols-1 lg:grid-cols-2 gap-8" >
        {/* Çocuk Sayısı İstatistikleri */}
        < div className={cardClass} >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Baby className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Çocuk Sayısı Dağılımı</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Üyelerin çocuk sayısı analizi</p>
            </div>
          </div>
          {
            renderStatView(
              demographicStats?.childrenStats?.map(item => ({
                label: item.range,
                count: item.count,
                color: 'bg-cyan-600 dark:bg-cyan-400'
              })) || [],
              memberStats?.totalMembers || 1,
              (range) => handleStatClick('children', range, `Çocuk Sayısı: ${range}`)
            )
          }
        </div >

        {/* Pozisyon Dağılımı */}
        < div className={cardClass} >
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-500/20 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-teal-600 dark:text-teal-300" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Pozisyon Dağılımı</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Üyelerin iş pozisyonları</p>
            </div>
          </div>
          {
            renderStatView(
              workplaceStats?.positionDistribution?.map(item => ({
                label: item.position,
                count: item.count,
                color: 'bg-teal-600 dark:bg-teal-400'
              })) || [],
              workplaceStats?.positionDistribution[0]?.count || 1,
              (position) => handleStatClick('position', position, `Pozisyon: ${position}`)
            )
          }
        </div >
      </div >

      {/* Zaman Bazlı İstatistikler */}
      < div className={cardClass} >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Üyelik Trendleri</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Katılım tarihi bazlı analiz</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Son 12 Ay Trend - Clickable and Better Layout */}
          <div>
            <h4 className="text-md font-medium text-slate-800 dark:text-slate-200 mb-4">Dönemsel Üyelik Trendi</h4>
            {renderStatView(
              timeStats?.membershipTrends?.slice(-12).map(item => ({
                label: item.month,
                count: item.count,
                color: 'bg-indigo-600 dark:bg-indigo-400'
              })) || [],
              Math.max(...(timeStats?.membershipTrends?.map(t => t.count) || [1])),
              (month) => handleStatClick('join_date_month', month, `${month} Döneminde Kaydolanlar`)
            )}
          </div>

          {/* Katılım Süresi Analizi - Clickable */}
          <div>
            <h4 className="text-md font-medium text-slate-800 dark:text-slate-200 mb-4">Katılım Süresi Dağılımı</h4>
            {renderStatView(
              timeStats?.joinDateAnalysis?.map(item => ({
                label: item.period,
                count: item.count,
                color: 'bg-indigo-600 dark:bg-indigo-400'
              })) || [],
              memberStats?.totalMembers || 1,
              (period) => handleStatClick('join_period', period, `${period} İçinde Kaydolanlar`)
            )}
          </div>
        </div>
      </div >

      {/* Gelişmiş Özet Kartları */}
      < div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-2xl p-8 border border-blue-200 dark:border-slate-700 shadow-lg" >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">📊 İstatistik Özeti</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Önemli metriklerin hızlı görünümü</p>
          </div>
          <div className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Canlı Veri</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Aktiflik Oranı */}
          <div
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md hover:shadow-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 group"
            onClick={() => handleStatClick('status', 'active', 'Aktif Üyeler')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Aktiflik Oranı</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              {memberStats?.totalMembers ? Math.round((memberStats.activeMembers / memberStats.totalMembers) * 100) : 0}%
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{memberStats?.activeMembers || 0} aktif</span>
              <span>{memberStats?.totalMembers || 0} toplam</span>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${memberStats?.totalMembers ? (memberStats.activeMembers / memberStats.totalMembers) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Aylık Büyüme */}
          <div
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md hover:shadow-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 group"
            onClick={() => handleStatClick('date_range', 'this_month', 'Bu Ay Kaydolanlar')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Calendar className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Aylık Büyüme</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {getGrowthPercentage()}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Bu ay: {memberStats?.newMembersThisMonth || 0}</span>
              <span>Geçen: {memberStats?.newMembersLastMonth || 0}</span>
            </div>
            {/* Trend indicator */}
            <div className="mt-3 flex items-center space-x-1">
              {(memberStats?.newMembersThisMonth || 0) > (memberStats?.newMembersLastMonth || 0) ? (
                <>
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Yükseliş trendi</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">Düşüş trendi</span>
                </>
              )}
            </div>
          </div>

          {/* En Popüler Şehir */}
          <div
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md hover:shadow-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 group"
            onClick={() => geographicStats?.topCities[0] && handleStatClick('city', geographicStats.topCities[0].city, `Şehir: ${geographicStats.topCities[0].city}`)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-xs font-bold text-purple-600 dark:text-purple-400">
                #1
              </div>
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">En Popüler Şehir</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 truncate">
              {geographicStats?.topCities[0]?.city || 'Veri yok'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {geographicStats?.topCities[0]?.count || 0} üye
            </div>
            {/* Mini bar chart of top 3 */}
            <div className="mt-3 space-y-1">
              {geographicStats?.topCities?.slice(0, 3).map((city, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                  <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400"
                      style={{ width: `${(city.count / (geographicStats.topCities[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* En Popüler İşyeri */}
          <div
            className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-md hover:shadow-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-700 group"
            onClick={() => workplaceStats?.topWorkplaces[0] && handleStatClick('workplace', workplaceStats.topWorkplaces[0].workplace, `İşyeri: ${workplaceStats.topWorkplaces[0].workplace}`)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Briefcase className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded text-xs font-bold text-orange-600 dark:text-orange-400">
                TOP
              </div>
            </div>
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">En Popüler İşyeri</div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 truncate leading-tight">
              {workplaceStats?.topWorkplaces[0]?.workplace || 'Veri yok'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {workplaceStats?.topWorkplaces[0]?.count || 0} çalışan
            </div>
            {/* Percentage badge */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Toplam oranı</span>
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded text-xs font-bold text-orange-600 dark:text-orange-400">
                {workplaceStats?.topWorkplaces[0]?.count && memberStats?.totalMembers
                  ? ((workplaceStats.topWorkplaces[0].count / memberStats.totalMembers) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Additional Quick Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <UserX className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Pasif</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {memberStats?.inactiveMembers || 0}
            </div>
          </div>
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Bekleyen</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {memberStats?.pendingMembers || 0}
            </div>
          </div>
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Şehir</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {geographicStats?.topCities?.length || 0}
            </div>
          </div>
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-600 dark:text-slate-400">İşyeri</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {workplaceStats?.topWorkplaces?.length || 0}
            </div>
          </div>
        </div>
      </div >

      {/* Detail Modal */}
      {
        selectedStat && (
          <StatsDetailModal
            isOpen={!!selectedStat}
            onClose={() => setSelectedStat(null)}
            title={selectedStat.title}
            filter={{
              type: selectedStat.type,
              value: selectedStat.value
            }}
            startDate={getStartDate(selectedTimeRange)}
          />
        )
      }
    </div >
  );
}
