'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

      // Üyeleri şehre göre say
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

      // Basit istatistikler - sadece sayıları al
      const statsData: DashboardStats = {
        totalNews: 0,
        totalAnnouncements: 0,
        totalMembers: 0,
        totalAdminUsers: 0,
        totalSliders: 0,
        totalBranches: 0,
        totalCategories: 0,
        totalManagement: 0,
        recentNews: 0,
        recentMembers: 0,
        activeHeaderAnnouncements: 0,
        pendingMembers: 0,
        activeMembers: 0,
        newMembersThisMonth: 0,
        resignedMembersThisMonth: 0,
        suspendedMembers: 0
      };

      // Her tabloyu ayrı ayrı kontrol et
      try {
        const newsResult = await supabase.from('news').select('*', { count: 'exact', head: true });
        statsData.totalNews = newsResult.count || 0;
      } catch (e) {
        console.warn('News tablosu bulunamadı:', e);
      }

      try {
        const announcementsResult = await supabase.from('announcements').select('*', { count: 'exact', head: true });
        statsData.totalAnnouncements = announcementsResult.count || 0;
      } catch (e) {
        console.warn('Announcements tablosu bulunamadı:', e);
      }

      try {
        const membersResult = await supabase.from('members').select('*', { count: 'exact', head: true });
        statsData.totalMembers = membersResult.count || 0;

        // Aktif üye sayısı
        const activeMembersResult = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('membership_status', 'active');
        statsData.activeMembers = activeMembersResult.count || 0;

        // Bekleyen üye sayısı
        const pendingMembersResult = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('membership_status', 'pending');
        statsData.pendingMembers = pendingMembersResult.count || 0;

        // Askıya alınmış (istifa/pasif) üye sayısı
        const suspendedMembersResult = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .in('membership_status', ['inactive', 'suspended']);
        statsData.suspendedMembers = suspendedMembersResult.count || 0;

        // Bu ayki yeni üyeler
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const newMembersResult = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', firstDayOfMonth);
        statsData.newMembersThisMonth = newMembersResult.count || 0;

        // Bu ay istifa edenler (inactive veya suspended olmuşlar)
        const resignedResult = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .in('membership_status', ['inactive', 'suspended'])
          .gte('updated_at', firstDayOfMonth);
        statsData.resignedMembersThisMonth = resignedResult.count || 0;

      } catch (e) {
        console.warn('Members tablosu bulunamadı:', e);
      }

      try {
        const adminUsersResult = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
        statsData.totalAdminUsers = adminUsersResult.count || 0;
      } catch (e) {
        console.warn('Admin users tablosu bulunamadı:', e);
      }

      try {
        const slidersResult = await supabase.from('sliders').select('*', { count: 'exact', head: true });
        statsData.totalSliders = slidersResult.count || 0;
      } catch (e) {
        console.warn('Sliders tablosu bulunamadı:', e);
      }

      try {
        const branchesResult = await supabase.from('branches').select('*', { count: 'exact', head: true });
        statsData.totalBranches = branchesResult.count || 0;
      } catch (e) {
        console.warn('Branches tablosu bulunamadı:', e);
      }

      try {
        const categoriesResult = await supabase.from('categories').select('*', { count: 'exact', head: true });
        statsData.totalCategories = categoriesResult.count || 0;
      } catch (e) {
        console.warn('Categories tablosu bulunamadı:', e);
      }

      try {
        const managementResult = await supabase.from('management').select('*', { count: 'exact', head: true });
        statsData.totalManagement = managementResult.count || 0;
      } catch (e) {
        console.warn('Management tablosu bulunamadı:', e);
      }

      setStats(statsData);
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
      // Hata durumunda varsayılan değerler
      setStats({
        totalNews: 0,
        totalAnnouncements: 0,
        totalMembers: 0,
        totalAdminUsers: 0,
        totalSliders: 0,
        totalBranches: 0,
        totalCategories: 0,
        totalManagement: 0,
        recentNews: 0,
        recentMembers: 0,
        activeHeaderAnnouncements: 0,
        pendingMembers: 0,
        activeMembers: 0,
        newMembersThisMonth: 0,
        resignedMembersThisMonth: 0,
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
      color: 'blue'
    },
    {
      title: 'Aktif Duyuru',
      value: statsLoading ? '-' : stats?.totalAnnouncements.toString() || '0',
      change: statsLoading ? '-' : `${stats?.activeHeaderAnnouncements || 0} başlık duyurusu`,
      changeType: 'neutral',
      icon: Megaphone,
      color: 'green'
    },
    {
      title: 'Toplam Üye',
      value: statsLoading ? '-' : stats?.totalMembers.toString() || '0',
      change: statsLoading ? '-' : `+${stats?.recentMembers || 0} bu ay`,
      changeType: 'positive',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Bekleyen Üye',
      value: statsLoading ? '-' : stats?.pendingMembers.toString() || '0',
      change: 'Onay bekliyor',
      changeType: 'warning',
      icon: Clock,
      color: 'orange'
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
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
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

        {/* Bu Ay Yeni Üyeler */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
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

        {/* Bu Ay İstifalar */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
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

        {/* Bekleyen Üyeler */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
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
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
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
      />

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
