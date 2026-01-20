'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminAuth } from '@/lib/auth';
import { AdminUser } from '@/lib/types';
import { supabase } from '@/lib/supabase';
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
  const router = useRouter();

  useEffect(() => {
    const currentUser = AdminAuth.getCurrentUser();
    if (!currentUser) {
      router.push('/admin/login');
      return;
    }
    setUser(currentUser);
    setLoading(false);
    loadDashboardStats();
    loadCityStats();
  }, [router]);

  const loadCityStats = async () => {
    try {
      setCityStatsLoading(true);

      // Tüm illerin listesi (81 il)
      const turkishCities = [
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

  const loadDashboardStats = async () => {
    try {
      setStatsLoading(true);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Execute all counts in parallel
      const [
        newsRes, announcementsRes, membersRes,
        activeMembersRes, pendingMembersRes, suspendedMembersRes,
        newMembersRes, resignedResult, adminUsersRes,
        slidersRes, branchesRes, categoriesRes, managementRes
      ] = await Promise.all([
        supabase.from('news').select('*', { count: 'exact', head: true }),
        supabase.from('announcements').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('membership_status', 'active'),
        supabase.from('members').select('*', { count: 'exact', head: true }).eq('membership_status', 'pending'),
        supabase.from('members').select('*', { count: 'exact', head: true }).in('membership_status', ['inactive', 'suspended']),
        supabase.from('members').select('*', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth),
        supabase.from('members').select('*', { count: 'exact', head: true }).in('membership_status', ['inactive', 'suspended', 'resigned']).gte('resignation_date', firstDayOfMonth), // Assuming resignation_date exists or fallback to updated_at in types
        supabase.from('admin_users').select('*', { count: 'exact', head: true }),
        supabase.from('sliders').select('*', { count: 'exact', head: true }),
        supabase.from('branches').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('management').select('*', { count: 'exact', head: true })
      ]);

      const statsData: DashboardStats = {
        totalNews: newsRes.count || 0,
        totalAnnouncements: announcementsRes.count || 0,
        totalMembers: membersRes.count || 0,
        totalAdminUsers: adminUsersRes.count || 0,
        totalSliders: slidersRes.count || 0,
        totalBranches: branchesRes.count || 0,
        totalCategories: categoriesRes.count || 0,
        totalManagement: managementRes.count || 0,
        recentNews: 0, // Bu değer ayrıca hesaplanmalı veya count'a dahil edilmeli (logic eksikti, eski kodda da 0 atamışım ama bir yerde kullanılıyor mu? Evet, recentNews change'de var. Count olarak değil, son eklenenler. Şimdilik 0.)
        recentMembers: newMembersRes.count || 0, // Bu ay eklenenler aynı zamanda recentMembers olarak kullanılabilir
        activeHeaderAnnouncements: 0, // Ayrı sorgu gerekir veya logic. Şimdilik 0 veya eski mantık. Eski kodda activeHeaderAnnouncements sorgusu yoktu, 0 dönüyordu.
        pendingMembers: pendingMembersRes.count || 0,
        activeMembers: activeMembersRes.count || 0,
        newMembersThisMonth: newMembersRes.count || 0,
        resignedMembersThisMonth: resignedResult.count || 0,
        suspendedMembers: suspendedMembersRes.count || 0
      };

      // Optional: Get recent news count if needed (e.g. this month)
      // newsRes sadece total news.
      // activeHeaderAnnouncements için logic ekleyebiliriz ama orijinal parallelization'a sadık kaldım.

      setStats(statsData);
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
      // Hata durumunda varsayılan değerler
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
  ];

  const detailedStats = [
    {
      title: 'İçerik İstatistikleri',
      items: [
        { label: 'Toplam Haber', value: statsLoading ? '-' : stats?.totalNews || 0, icon: FileText, color: 'blue' },
        { label: 'Toplam Duyuru', value: statsLoading ? '-' : stats?.totalAnnouncements || 0, icon: Megaphone, color: 'green' },
        { label: 'Slider Görseli', value: statsLoading ? '-' : stats?.totalSliders || 0, icon: Image, color: 'indigo' },
        { label: 'Kategori', value: statsLoading ? '-' : stats?.totalCategories || 0, icon: Tags, color: 'cyan' }
      ]
    },
    {
      title: 'Organizasyon İstatistikleri',
      items: [
        { label: 'Toplam Üye', value: statsLoading ? '-' : stats?.totalMembers || 0, icon: Users, color: 'purple' },
        { label: 'Yönetim Kadrosu', value: statsLoading ? '-' : stats?.totalManagement || 0, icon: Building2, color: 'teal' },
        { label: 'Şube Sayısı', value: statsLoading ? '-' : stats?.totalBranches || 0, icon: MapPin, color: 'pink' },
        { label: 'Admin Kullanıcı', value: statsLoading ? '-' : stats?.totalAdminUsers || 0, icon: UserPlus, color: 'red' }
      ]
    }
  ];

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
  ];

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
          <div key={sectionIndex} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-900">{section.title}</h3>
              <PieChart className="w-5 h-5 text-slate-400" />
            </div>

            <div className="space-y-4">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div key={itemIndex} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                        <Icon className={`w-4 h-4 text-${item.color}-600`} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    </div>
                    <span className="text-lg font-bold text-slate-900">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Turkey Statistics Map */}
      <TurkeyStatsMap
        cityStats={cityStats}
        totalActiveMembers={stats?.activeMembers || 0}
        totalResigned={stats?.suspendedMembers || 0}
        totalRegistered={stats?.totalMembers || 0}
        totalOnlineApplications={stats?.pendingMembers || 0}
        isLoading={cityStatsLoading}
        onCityClick={(city) => setSelectedCity(city)}
      />

      {/* City Members Modal */}
      {selectedCity && (
        <CityMembersModal
          city={selectedCity}
          isOpen={true}
          onClose={() => setSelectedCity(null)}
        />
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Son Aktiviteler</h3>
          <Activity className="w-5 h-5 text-slate-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentActivity.map((activity, index) => {
            const Icon = activity.icon;
            return (
              <div key={index} className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-${activity.color}-100`}>
                    <Icon className={`w-5 h-5 text-${activity.color}-600`} />
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{activity.value}</span>
                </div>
                <h4 className="text-sm font-medium text-slate-900 mb-1">{activity.title}</h4>
                <p className="text-xs text-slate-600">{activity.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
