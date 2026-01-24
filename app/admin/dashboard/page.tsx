'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminAuth } from '@/lib/auth';
import { AdminUser } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { PermissionManager } from '@/lib/permissions';
import TurkeyStatsMap from '@/components/TurkeyStatsMap';
import {
  Users,
  FileText,
  Megaphone,
  Building2,
  MapPin,
  Tags,
  Image,
  UserPlus,
  Bell,
  TrendingUp,
  Activity,
  Calendar,
  BarChart3,
  ArrowUpRight,
  Eye,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  PieChart,
  Target,
  Globe
} from 'lucide-react';
import CityMembersModal from '@/components/dashboard/CityMembersModal';
import StatsDetailModal, { StatsType } from '@/components/dashboard/StatsDetailModal';

interface DashboardStats {
  totalNews: number;
  totalAnnouncements: number;
  totalMembers: number;
  totalAdminUsers: number;
  totalSliders: number;
  totalBranches: number;
  totalCategories: number;
  totalManagement: number;
  recentNews: number;
  recentMembers: number;
  activeHeaderAnnouncements: number;
  pendingMembers: number;
  // Üye istatistikleri
  activeMembers: number;
  newMembersThisMonth: number;
  resignedMembersThisMonth: number;
  suspendedMembers: number;
}

interface CityStats {
  city: string;
  city_code: string;
  activeMembers: number;
  resignedMembers: number;
  registeredMembers: number;
  onlineApplications: number;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [cityStats, setCityStats] = useState<CityStats[]>([]);
  const [cityStatsLoading, setCityStatsLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedStatsType, setSelectedStatsType] = useState<StatsType | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const currentUser = AdminAuth.getCurrentUser();
        if (!currentUser) {
          router.push('/admin/login');
          return;
        }
        setUser(currentUser);
        loadDashboardStats(currentUser);
        loadCityStats(currentUser);
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [router]);

  const loadCityStats = async (userToUse: AdminUser | null = user) => {
    try {
      setCityStatsLoading(true);

      // Tüm illerin listesi (81 il)
      const allTurkishCities = [
        { city: 'Adana', city_code: '01' },
        { city: 'Adıyaman', city_code: '02' },
        { city: 'Afyonkarahisar', city_code: '03' },
        { city: 'Ağrı', city_code: '04' },
        { city: 'Amasya', city_code: '05' },
        { city: 'Ankara', city_code: '06' },
        { city: 'Antalya', city_code: '07' },
        { city: 'Artvin', city_code: '08' },
        { city: 'Aydın', city_code: '09' },
        { city: 'Balıkesir', city_code: '10' },
        { city: 'Bilecik', city_code: '11' },
        { city: 'Bingöl', city_code: '12' },
        { city: 'Bitlis', city_code: '13' },
        { city: 'Bolu', city_code: '14' },
        { city: 'Burdur', city_code: '15' },
        { city: 'Bursa', city_code: '16' },
        { city: 'Çanakkale', city_code: '17' },
        { city: 'Çankırı', city_code: '18' },
        { city: 'Çorum', city_code: '19' },
        { city: 'Denizli', city_code: '20' },
        { city: 'Diyarbakır', city_code: '21' },
        { city: 'Edirne', city_code: '22' },
        { city: 'Elazığ', city_code: '23' },
        { city: 'Erzincan', city_code: '24' },
        { city: 'Erzurum', city_code: '25' },
        { city: 'Eskişehir', city_code: '26' },
        { city: 'Gaziantep', city_code: '27' },
        { city: 'Giresun', city_code: '28' },
        { city: 'Gümüşhane', city_code: '29' },
        { city: 'Hakkari', city_code: '30' },
        { city: 'Hatay', city_code: '31' },
        { city: 'Isparta', city_code: '32' },
        { city: 'Mersin', city_code: '33' },
        { city: 'İstanbul', city_code: '34' },
        { city: 'İzmir', city_code: '35' },
        { city: 'Kars', city_code: '36' },
        { city: 'Kastamonu', city_code: '37' },
        { city: 'Kayseri', city_code: '38' },
        { city: 'Kırklareli', city_code: '39' },
        { city: 'Kırşehir', city_code: '40' },
        { city: 'Kocaeli', city_code: '41' },
        { city: 'Konya', city_code: '42' },
        { city: 'Kütahya', city_code: '43' },
        { city: 'Malatya', city_code: '44' },
        { city: 'Manisa', city_code: '45' },
        { city: 'Kahramanmaraş', city_code: '46' },
        { city: 'Mardin', city_code: '47' },
        { city: 'Muğla', city_code: '48' },
        { city: 'Muş', city_code: '49' },
        { city: 'Nevşehir', city_code: '50' },
        { city: 'Niğde', city_code: '51' },
        { city: 'Ordu', city_code: '52' },
        { city: 'Rize', city_code: '53' },
        { city: 'Sakarya', city_code: '54' },
        { city: 'Samsun', city_code: '55' },
        { city: 'Siirt', city_code: '56' },
        { city: 'Sinop', city_code: '57' },
        { city: 'Sivas', city_code: '58' },
        { city: 'Tekirdağ', city_code: '59' },
        { city: 'Tokat', city_code: '60' },
        { city: 'Trabzon', city_code: '61' },
        { city: 'Tunceli', city_code: '62' },
        { city: 'Şanlıurfa', city_code: '63' },
        { city: 'Uşak', city_code: '64' },
        { city: 'Van', city_code: '65' },
        { city: 'Yozgat', city_code: '66' },
        { city: 'Zonguldak', city_code: '67' },
        { city: 'Aksaray', city_code: '68' },
        { city: 'Bayburt', city_code: '69' },
        { city: 'Karaman', city_code: '70' },
        { city: 'Kırıkkale', city_code: '71' },
        { city: 'Batman', city_code: '72' },
        { city: 'Şırnak', city_code: '73' },
        { city: 'Bartın', city_code: '74' },
        { city: 'Ardahan', city_code: '75' },
        { city: 'Iğdır', city_code: '76' },
        { city: 'Yalova', city_code: '77' },
        { city: 'Karabük', city_code: '78' },
        { city: 'Kilis', city_code: '79' },
        { city: 'Osmaniye', city_code: '80' },
        { city: 'Düzce', city_code: '81' }
      ];

      // Filter cities based on role
      let turkishCities = [...allTurkishCities];

      if (userToUse?.role === 'super_admin') {
        // No filter
      } else if (userToUse?.role_type === 'branch_manager' && userToUse?.city) {
        turkishCities = allTurkishCities.filter(c => c.city === userToUse.city);
      } else if (userToUse?.role_type === 'regional_manager' && userToUse?.region) {
        // Fetch cities for this region from branches table
        const { data: regionBranches } = await supabase
          .from('branches')
          .select('city')
          .eq('region', userToUse.region);

        if (regionBranches) {
          const validCities = new Set(regionBranches.map(b => b.city));
          turkishCities = allTurkishCities.filter(c => validCities.has(c.city));
        }
      }

      // Try RPC first
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_city_stats');

        if (rpcError) throw rpcError;

        if (rpcData) {
          // Map RPC results to stats
          const statsMap = new Map();
          rpcData.forEach((item: any) => {
            if (item.city_name) {
              statsMap.set(item.city_name.toLowerCase(), item);
            }
          });

          const finalStats = turkishCities.map(c => {
            const stats = statsMap.get(c.city.toLowerCase());
            return {
              city: c.city,
              city_code: c.city_code,
              activeMembers: stats ? (stats.active_count || 0) : 0,
              resignedMembers: stats ? (stats.resigned_count || 0) : 0,
              registeredMembers: stats ? (stats.registered_count || 0) : 0,
              onlineApplications: stats ? (stats.online_applications_count || 0) : 0
            };
          });
          setCityStats(finalStats);
          return; // Success
        }
      } catch (err) {
        console.warn('RPC get_city_stats failed, falling back to client-side aggregation:', err);
      }

      // Fallback: Client-side aggregation (slow but reliable if RPC missing)
      const { data: members } = await supabase
        .from('members')
        .select('city, membership_status');

      const cityStatsMap: { [key: string]: CityStats } = {};

      turkishCities.forEach(c => {
        cityStatsMap[c.city.toLowerCase()] = {
          city: c.city,
          city_code: c.city_code,
          activeMembers: 0,
          resignedMembers: 0,
          registeredMembers: 0,
          onlineApplications: 0
        };
      });

      if (members) {
        members.forEach(member => {
          const cityKey = member.city?.toLowerCase();
          if (cityKey && cityStatsMap[cityKey]) {
            cityStatsMap[cityKey].registeredMembers++;
            if (member.membership_status === 'active') {
              cityStatsMap[cityKey].activeMembers++;
            } else if (member.membership_status === 'inactive' || member.membership_status === 'suspended') {
              cityStatsMap[cityKey].resignedMembers++;
            } else if (member.membership_status === 'pending') {
              cityStatsMap[cityKey].onlineApplications++;
            }
          }
        });
      }

      setCityStats(Object.values(cityStatsMap));
    } catch (error) {
      console.error('İl istatistikleri yüklenirken hata:', error);
    } finally {
      setCityStatsLoading(false);
    }
  };



  const loadDashboardStats = async (userToUse: AdminUser | null = user) => {
    try {
      setStatsLoading(true);

      if (!userToUse) return;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Base query builder
      const getBaseMemberQuery = () => {
        let q = supabase.from('members').select('*', { count: 'exact', head: true });

        // Super admin always sees everything
        if (userToUse?.role === 'super_admin') {
          return q;
        }

        if (userToUse?.role_type === 'branch_manager' && userToUse?.city) {
          q = q.eq('city', userToUse.city);
        } else if (userToUse?.role_type === 'regional_manager' && userToUse?.region) {
          q = q.eq('region', userToUse.region);
        }
        return q;
      };

      // Define permission checks
      const canViewMembers = PermissionManager.canViewMembers(userToUse);
      const canManageNews = PermissionManager.canManageNews(userToUse);
      const canManageAnnouncements = PermissionManager.canManageAnnouncements(userToUse);
      const canViewUsers = PermissionManager.canViewUsers(userToUse);
      const canManageSliders = PermissionManager.canManageSliders(userToUse);
      const canManageBranches = PermissionManager.canManageBranches(userToUse);
      const canManageCategories = PermissionManager.canManageCategories(userToUse);
      const canManageManagement = PermissionManager.canManageManagement(userToUse);

      // Execute queries conditionally
      const promises = [
        canManageNews ? supabase.from('news').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0, error: null }),
        canManageAnnouncements ? supabase.from('announcements').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0, error: null }),
        canViewMembers ? getBaseMemberQuery() : Promise.resolve({ count: 0, error: null }),
        canViewMembers ? getBaseMemberQuery().eq('membership_status', 'active') : Promise.resolve({ count: 0, error: null }),
        canViewMembers ? getBaseMemberQuery().eq('membership_status', 'pending') : Promise.resolve({ count: 0, error: null }),
        canViewMembers ? getBaseMemberQuery().in('membership_status', ['inactive', 'suspended']) : Promise.resolve({ count: 0, error: null }),
        canViewMembers ? getBaseMemberQuery().gte('created_at', firstDayOfMonth) : Promise.resolve({ count: 0, error: null }),
        canViewMembers ? getBaseMemberQuery().in('membership_status', ['inactive', 'suspended', 'resigned']).gte('resignation_date', firstDayOfMonth) : Promise.resolve({ count: 0, error: null }),
        canViewUsers ? supabase.from('admin_users').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0, error: null }),
        canManageSliders ? supabase.from('sliders').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0, error: null }),
        canManageBranches ? supabase.from('branches').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0, error: null }),
        canManageCategories ? supabase.from('categories').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0, error: null }),
        canManageManagement ? supabase.from('management').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0, error: null })
      ];

      const [
        newsRes, announcementsRes, membersRes,
        activeMembersRes, pendingMembersRes, suspendedMembersRes,
        newMembersRes, resignedResult, adminUsersRes,
        slidersRes, branchesRes, categoriesRes, managementRes
      ] = await Promise.all(promises);

      const statsData: DashboardStats = {
        totalNews: newsRes.count || 0,
        totalAnnouncements: announcementsRes.count || 0,
        totalMembers: membersRes.count || 0,
        totalAdminUsers: adminUsersRes.count || 0,
        totalSliders: slidersRes.count || 0,
        totalBranches: branchesRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalManagement: managementRes.count || 0,
        recentNews: 0,
        recentMembers: newMembersRes.count || 0,
        activeHeaderAnnouncements: 0,
        pendingMembers: pendingMembersRes.count || 0,
        activeMembers: activeMembersRes.count || 0,
        newMembersThisMonth: newMembersRes.count || 0,
        resignedMembersThisMonth: resignedResult.count || 0,
        suspendedMembers: suspendedMembersRes.count || 0
      };

      setStats(statsData);
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
      setStats({
        totalNews: 0, totalAnnouncements: 0, totalMembers: 0,
        totalAdminUsers: 0, totalSliders: 0, totalBranches: 0,
        totalCategories: 0, totalManagement: 0, recentNews: 0,
        recentMembers: 0, activeHeaderAnnouncements: 0, pendingMembers: 0,
        activeMembers: 0, newMembersThisMonth: 0, resignedMembersThisMonth: 0,
        suspendedMembers: 0
      });
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-lg text-slate-600">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const quickStats = [
    {
      title: 'Toplam Haber',
      value: statsLoading ? '-' : stats?.totalNews.toString() || '0',
      change: statsLoading ? '-' : `+${stats?.recentNews || 0} bu ay`,
      changeType: 'positive',
      icon: FileText,
      color: 'blue',
      href: '/admin/news'
    },
    {
      title: 'Aktif Duyuru',
      value: statsLoading ? '-' : stats?.totalAnnouncements.toString() || '0',
      change: statsLoading ? '-' : `${stats?.activeHeaderAnnouncements || 0} başlık duyurusu`,
      changeType: 'neutral',
      icon: Megaphone,
      color: 'green',
      href: '/admin/announcements'
    },
    {
      title: 'Toplam Üye',
      value: statsLoading ? '-' : stats?.totalMembers.toString() || '0',
      change: statsLoading ? '-' : `+${stats?.recentMembers || 0} bu ay`,
      changeType: 'positive',
      icon: Users,
      color: 'purple',
      href: '/admin/members'
    },
    {
      title: 'Bekleyen Üye',
      value: statsLoading ? '-' : stats?.pendingMembers.toString() || '0',
      change: 'Onay bekliyor',
      changeType: 'warning',
      icon: Clock,
      color: 'orange',
      href: '/admin/members?status=pending'
    }
  ].filter(item => {
    switch (item.title) {
      case 'Toplam Haber': return PermissionManager.canManageNews(user);
      case 'Aktif Duyuru': return PermissionManager.canManageAnnouncements(user);
      case 'Toplam Üye': return PermissionManager.canViewMembers(user);
      case 'Bekleyen Üye': return PermissionManager.canViewMembers(user);
      default: return true;
    }
  });

  const detailedStats = [
    {
      title: 'İçerik İstatistikleri',
      items: [
        { label: 'Toplam Haber', value: statsLoading ? '-' : stats?.totalNews || 0, icon: FileText, color: 'blue', type: 'news' as StatsType },
        { label: 'Toplam Duyuru', value: statsLoading ? '-' : stats?.totalAnnouncements || 0, icon: Megaphone, color: 'green', type: 'announcements' as StatsType },
        { label: 'Slider Görseli', value: statsLoading ? '-' : stats?.totalSliders || 0, icon: Image, color: 'indigo', type: 'sliders' as StatsType },
        { label: 'Kategori', value: statsLoading ? '-' : stats?.totalCategories || 0, icon: Tags, color: 'cyan', type: 'categories' as StatsType }
      ]
    },
    {
      title: 'Organizasyon İstatistikleri',
      items: [
        { label: 'Toplam Üye', value: statsLoading ? '-' : stats?.totalMembers || 0, icon: Users, color: 'purple', type: 'members' as StatsType },
        { label: 'Yönetim Kadrosu', value: statsLoading ? '-' : stats?.totalManagement || 0, icon: Building2, color: 'teal', type: 'management' as StatsType },
        { label: 'Şube Sayısı', value: statsLoading ? '-' : stats?.totalBranches || 0, icon: MapPin, color: 'pink', type: 'branches' as StatsType },
        { label: 'Admin Kullanıcı', value: statsLoading ? '-' : stats?.totalAdminUsers || 0, icon: UserPlus, color: 'red', type: 'admin_users' as StatsType }
      ]
    }
  ].map(section => ({
    ...section,
    items: section.items.filter(item => {
      switch (item.label) {
        case 'Toplam Haber': return PermissionManager.canManageNews(user);
        case 'Toplam Duyuru': return PermissionManager.canManageAnnouncements(user);
        case 'Slider Görseli': return PermissionManager.canManageSliders(user);
        case 'Kategori': return PermissionManager.canManageCategories(user);
        case 'Toplam Üye': return PermissionManager.canViewMembers(user);
        case 'Yönetim Kadrosu': return PermissionManager.canManageManagement(user);
        case 'Şube Sayısı': return PermissionManager.canManageBranches(user);
        case 'Admin Kullanıcı': return PermissionManager.canViewUsers(user);
        default: return true;
      }
    })
  })).filter(section => section.items.length > 0);

  const recentActivity = [
    {
      title: 'Son 30 Günde Eklenen Haberler',
      value: statsLoading ? '-' : stats?.recentNews || 0,
      icon: FileText,
      color: 'blue',
      description: 'Yeni haber içeriği'
    },
    {
      title: 'Aktif Başlık Duyuruları',
      value: statsLoading ? '-' : stats?.activeHeaderAnnouncements || 0,
      icon: Bell,
      color: 'orange',
      description: 'Şu anda yayında'
    },
    {
      title: 'Toplam Şube',
      value: statsLoading ? '-' : stats?.totalBranches || 0,
      icon: Building2,
      color: 'purple',
      description: 'Aktif şubeler'
    },
    {
      title: 'Yönetim Kadrosu',
      value: statsLoading ? '-' : stats?.totalManagement || 0,
      icon: Users,
      color: 'teal',
      description: 'Yönetim üyeleri'
    }
  ].filter(item => {
    switch (item.title) {
      case 'Son 30 Günde Eklenen Haberler': return PermissionManager.canManageNews(user);
      case 'Aktif Başlık Duyuruları': return PermissionManager.canManageAnnouncements(user);
      case 'Toplam Şube': return PermissionManager.canManageBranches(user);
      case 'Yönetim Kadrosu': return PermissionManager.canManageManagement(user);
      default: return true;
    }
  });

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Hoş geldiniz, {user.full_name}</h1>
            <p className="text-blue-100 text-lg">Sendika yönetim paneline hoş geldiniz. İşte güncel istatistikleriniz.</p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-100">Bugün</div>
              <div className="text-lg font-semibold">{new Date().toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Üye İstatistikleri - Hero Cards */}
      {PermissionManager.canViewMembers(user) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Aktif Üye Sayısı */}
          <Link href="/admin/members?status=active" className="block transform transition-transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Aktif Üye Sayısı</p>
                  <p className="text-4xl font-bold mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse bg-white/20 rounded h-10 w-20 inline-block"></span>
                    ) : (
                      stats?.activeMembers || 0
                    )}
                  </p>
                  <p className="text-emerald-100 text-xs mt-2 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Onaylanmış üyeler
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Users className="w-8 h-8" />
                </div>
              </div>
            </div>
          </Link>

          {/* Bu Ay Yeni Üyeler */}
          <Link href="/admin/members?date=this_month" className="block transform transition-transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Bu Ay Yeni Üyeler</p>
                  <p className="text-4xl font-bold mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse bg-white/20 rounded h-10 w-20 inline-block"></span>
                    ) : (
                      stats?.newMembersThisMonth || 0
                    )}
                  </p>
                  <p className="text-blue-100 text-xs mt-2 flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {new Date().toLocaleDateString('tr-TR', { month: 'long' })} ayı
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <UserPlus className="w-8 h-8" />
                </div>
              </div>
            </div>
          </Link>

          {/* Bu Ay İstifalar */}
          <Link href="/admin/members?status=resigned&date=this_month" className="block transform transition-transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Bu Ay İstifalar</p>
                  <p className="text-4xl font-bold mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse bg-white/20 rounded h-10 w-20 inline-block"></span>
                    ) : (
                      stats?.resignedMembersThisMonth || 0
                    )}
                  </p>
                  <p className="text-red-100 text-xs mt-2 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Ayrılan/Askıya alınan
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Activity className="w-8 h-8" />
                </div>
              </div>
            </div>
          </Link>

          {/* Bekleyen Üyeler */}
          <Link href="/admin/members?status=pending" className="block transform transition-transform hover:-translate-y-1">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Bekleyen Başvurular</p>
                  <p className="text-4xl font-bold mt-2">
                    {statsLoading ? (
                      <span className="animate-pulse bg-white/20 rounded h-10 w-20 inline-block"></span>
                    ) : (
                      stats?.pendingMembers || 0
                    )}
                  </p>
                  <p className="text-amber-100 text-xs mt-2 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Onay bekliyor
                  </p>
                </div>
                <div className="bg-white/20 rounded-full p-3">
                  <Clock className="w-8 h-8" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} href={stat.href || '#'} className="block transform transition-transform hover:-translate-y-1">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      <div className={`w-4 h-4 mr-1 ${stat.changeType === 'positive' ? 'text-green-500' :
                        stat.changeType === 'negative' ? 'text-red-500' :
                          stat.changeType === 'warning' ? 'text-orange-500' : 'text-slate-400'
                        }`}>
                        {stat.changeType === 'positive' && <TrendingUp className="w-4 h-4" />}
                        {stat.changeType === 'warning' && <AlertCircle className="w-4 h-4" />}
                        {stat.changeType === 'neutral' && <CheckCircle className="w-4 h-4" />}
                      </div>
                      <span className={`text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' :
                        stat.changeType === 'negative' ? 'text-red-600' :
                          stat.changeType === 'warning' ? 'text-orange-600' : 'text-slate-500'
                        }`}>
                        {stat.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl bg-${stat.color}-100`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {detailedStats.map((section, sectionIndex) => (
          <div key={sectionIndex} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{section.title}</h3>
              <PieChart className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>

            <div className="space-y-4">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div
                    key={itemIndex}
                    onClick={() => item.type && setSelectedStatsType(item.type)}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/20 text-${item.color}-600 dark:text-${item.color}-400 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.value}</span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Turkey Statistics Map */}
      {PermissionManager.canViewMembers(user) && (
        <TurkeyStatsMap
          cityStats={cityStats}
          totalActiveMembers={stats?.activeMembers || 0}
          totalResigned={stats?.suspendedMembers || 0}
          totalRegistered={stats?.totalMembers || 0}
          totalOnlineApplications={stats?.pendingMembers || 0}
          isLoading={cityStatsLoading}
          onCityClick={(city) => setSelectedCity(city)}
        />
      )}

      {/* City Members Modal */}
      {selectedCity && (
        <CityMembersModal
          city={selectedCity}
          isOpen={true}
          onClose={() => setSelectedCity(null)}
        />
      )}

      {/* Stats Detail Modal */}
      <StatsDetailModal
        type={selectedStatsType}
        isOpen={!!selectedStatsType}
        onClose={() => setSelectedStatsType(null)}
      />

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Son Aktiviteler</h3>
          <Activity className="w-5 h-5 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentActivity.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-${activity.color}-100 dark:bg-${activity.color}-900/20 text-${activity.color}-600 dark:text-${activity.color}-400`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activity.value}</span>
                </div>
                <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">{activity.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">{activity.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
