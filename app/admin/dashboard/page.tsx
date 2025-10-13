'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import { AdminUser } from '@/lib/types';
import { supabase } from '@/lib/supabase';
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
}

export default function AdminDashboard() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
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
  }, [router]);

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
        pendingMembers: 0
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
        pendingMembers: 0
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
      title: 'Son 30 Günde Yeni Üyeler',
      value: statsLoading ? '-' : stats?.recentMembers || 0,
      icon: UserPlus,
      color: 'green',
      description: 'Sendikaya katılan üyeler'
    },
    {
      title: 'Aktif Başlık Duyuruları',
      value: statsLoading ? '-' : stats?.activeHeaderAnnouncements || 0,
      icon: Bell,
      color: 'orange',
      description: 'Şu anda yayında'
    },
    {
      title: 'Onay Bekleyen Üyeler',
      value: statsLoading ? '-' : stats?.pendingMembers || 0,
      icon: Clock,
      color: 'yellow',
      description: 'İnceleme gerekiyor'
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
                    <div className={`w-4 h-4 mr-1 ${
                      stat.changeType === 'positive' ? 'text-green-500' : 
                      stat.changeType === 'negative' ? 'text-red-500' : 
                      stat.changeType === 'warning' ? 'text-orange-500' : 'text-slate-400'
                    }`}>
                      {stat.changeType === 'positive' && <TrendingUp className="w-4 h-4" />}
                      {stat.changeType === 'warning' && <AlertCircle className="w-4 h-4" />}
                      {stat.changeType === 'neutral' && <CheckCircle className="w-4 h-4" />}
                    </div>
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-600' : 
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
