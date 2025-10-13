'use client';

import { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  inactiveMembers: number;
  suspendedMembers: number;
  newMembersThisMonth: number;
  newMembersLastMonth: number;
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
  const [loading, setLoading] = useState(true);
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null);
  const [demographicStats, setDemographicStats] = useState<DemographicStats | null>(null);
  const [geographicStats, setGeographicStats] = useState<GeographicStats | null>(null);
  const [workplaceStats, setWorkplaceStats] = useState<WorkplaceStats | null>(null);
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, [selectedTimeRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadMemberStats(),
        loadDemographicStats(),
        loadGeographicStats(),
        loadWorkplaceStats(),
        loadTimeStats()
      ]);
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberStats = async () => {
    try {
      // Toplam üye sayısı
      const { count: totalMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true });

      // Aktif üyeler
      const { count: activeMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'active')
        .eq('is_active', true);

      // Bekleyen üyeler
      const { count: pendingMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'pending');

      // Pasif üyeler
      const { count: inactiveMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'inactive');

      // Askıya alınan üyeler
      const { count: suspendedMembers } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('membership_status', 'suspended');

      // Bu ay yeni üyeler
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const { count: newMembersThisMonth } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thisMonth.toISOString());

      // Geçen ay yeni üyeler
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      const lastMonthEnd = new Date(thisMonth);
      lastMonthEnd.setDate(0);
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
        newMembersLastMonth: newMembersLastMonth || 0
      });
    } catch (error) {
      console.error('Üye istatistikleri yüklenirken hata:', error);
    }
  };

  const loadDemographicStats = async () => {
    try {
      // Cinsiyet dağılımı
      const { data: genderData } = await supabase
        .from('members')
        .select('gender')
        .not('gender', 'is', null);

      const genderDistribution = genderData?.reduce((acc: any[], member) => {
        const existing = acc.find(item => item.gender === member.gender);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ gender: member.gender, count: 1 });
        }
        return acc;
      }, []) || [];

      // Yaş grupları
      const { data: birthData } = await supabase
        .from('members')
        .select('birth_date')
        .not('birth_date', 'is', null);

      const ageGroups = birthData?.reduce((acc: any[], member) => {
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
      const { data: maritalData } = await supabase
        .from('members')
        .select('marital_status')
        .not('marital_status', 'is', null);

      const maritalStatus = maritalData?.reduce((acc: any[], member) => {
        const existing = acc.find(item => item.status === member.marital_status);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ status: member.marital_status, count: 1 });
        }
        return acc;
      }, []) || [];

      // Eğitim seviyeleri
      const { data: educationData } = await supabase
        .from('members')
        .select('education_level')
        .not('education_level', 'is', null);

      const educationLevels = educationData?.reduce((acc: any[], member) => {
        const existing = acc.find(item => item.level === member.education_level);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ level: member.education_level, count: 1 });
        }
        return acc;
      }, []) || [];

      // Çocuk sayısı istatistikleri
      const { data: childrenData } = await supabase
        .from('members')
        .select('children_count')
        .not('children_count', 'is', null);

      const childrenStats = childrenData?.reduce((acc: any[], member) => {
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

  const loadGeographicStats = async () => {
    try {
      // Şehir dağılımı
      const { data: cityData } = await supabase
        .from('members')
        .select('city')
        .not('city', 'is', null);

      const cityDistribution = cityData?.reduce((acc: any[], member) => {
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
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setGeographicStats({
        cityDistribution,
        topCities
      });
    } catch (error) {
      console.error('Coğrafi istatistikler yüklenirken hata:', error);
    }
  };

  const loadWorkplaceStats = async () => {
    try {
      // En çok çalışanı olan işyerleri
      const { data: workplaceData } = await supabase
        .from('members')
        .select('workplace')
        .not('workplace', 'is', null);

      const topWorkplaces = workplaceData?.reduce((acc: any[], member) => {
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
      const { data: positionData } = await supabase
        .from('members')
        .select('position')
        .not('position', 'is', null);

      const positionDistribution = positionData?.reduce((acc: any[], member) => {
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

  const loadTimeStats = async () => {
    try {
      // Son 12 ayın üyelik trendleri
      const { data: timeData } = await supabase
        .from('members')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const exportStatistics = () => {
    // İstatistikleri CSV formatında export etme fonksiyonu
    const csvData = [
      ['İstatistik Türü', 'Değer', 'Sayı'],
      ['Toplam Üye', '', memberStats?.totalMembers || 0],
      ['Aktif Üye', '', memberStats?.activeMembers || 0],
      ['Bekleyen Üye', '', memberStats?.pendingMembers || 0],
      ['Pasif Üye', '', memberStats?.inactiveMembers || 0],
      ['Askıya Alınan Üye', '', memberStats?.suspendedMembers || 0],
      ['Bu Ay Yeni Üye', '', memberStats?.newMembersThisMonth || 0],
      ['Geçen Ay Yeni Üye', '', memberStats?.newMembersLastMonth || 0]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\
');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `uye_istatistikleri_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getGrowthPercentage = () => {
    if (!memberStats?.newMembersLastMonth || memberStats.newMembersLastMonth === 0) {
      return memberStats?.newMembersThisMonth ? '+100%' : '0%';
    }
    const growth = ((memberStats.newMembersThisMonth - memberStats.newMembersLastMonth) / memberStats.newMembersLastMonth) * 100;
    return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-lg text-slate-600">İstatistikler yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">İstatistikler</h1>
          <p className="text-slate-600 mt-2">Detaylı üye istatistikleri ve analiz raporları</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <button
            onClick={exportStatistics}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Dışa Aktar</span>
          </button>
        </div>
      </div>

      {/* Genel İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Toplam Üye</p>
              <p className="text-3xl font-bold text-slate-900">{memberStats?.totalMembers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Aktif Üye</p>
              <p className="text-3xl font-bold text-green-600">{memberStats?.activeMembers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Bekleyen Üye</p>
              <p className="text-3xl font-bold text-yellow-600">{memberStats?.pendingMembers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Bu Ay Yeni</p>
              <p className="text-3xl font-bold text-blue-600">{memberStats?.newMembersThisMonth || 0}</p>
              <p className="text-sm text-slate-500 mt-1">{getGrowthPercentage()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Demografik İstatistikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cinsiyet Dağılımı */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Cinsiyet Dağılımı</h3>
              <p className="text-sm text-slate-600">Üyelerin cinsiyet bazlı dağılımı</p>
            </div>
          </div>
          <div className="space-y-4">
            {demographicStats?.genderDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700">{item.gender}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (memberStats?.totalMembers || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Yaş Grupları */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Yaş Grupları</h3>
              <p className="text-sm text-slate-600">Üyelerin yaş bazlı dağılımı</p>
            </div>
          </div>
          <div className="space-y-4">
            {demographicStats?.ageGroups.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700">{item.ageGroup}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (memberStats?.totalMembers || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medeni Durum */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Medeni Durum</h3>
              <p className="text-sm text-slate-600">Üyelerin medeni durum dağılımı</p>
            </div>
          </div>
          <div className="space-y-4">
            {demographicStats?.maritalStatus.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700">{item.status}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-pink-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (memberStats?.totalMembers || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eğitim Seviyeleri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Eğitim Seviyeleri</h3>
              <p className="text-sm text-slate-600">Üyelerin eğitim durumu</p>
            </div>
          </div>
          <div className="space-y-4">
            {demographicStats?.educationLevels.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700">{item.level}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (memberStats?.totalMembers || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coğrafi ve İş İstatistikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* En Çok Üyesi Olan Şehirler */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">En Çok Üyesi Olan Şehirler</h3>
              <p className="text-sm text-slate-600">Coğrafi dağılım analizi</p>
            </div>
          </div>
          <div className="space-y-4">
            {geographicStats?.topCities.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700">{item.city}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (geographicStats?.topCities[0]?.count || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* En Çok Çalışanı Olan İşyerleri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">En Çok Çalışanı Olan İşyerleri</h3>
              <p className="text-sm text-slate-600">İşyeri bazlı üye dağılımı</p>
            </div>
          </div>
          <div className="space-y-4">
            {workplaceStats?.topWorkplaces.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700 truncate">{item.workplace}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (workplaceStats?.topWorkplaces[0]?.count || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Çocuk Sayısı ve Pozisyon İstatistikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Çocuk Sayısı İstatistikleri */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Baby className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Çocuk Sayısı Dağılımı</h3>
              <p className="text-sm text-slate-600">Üyelerin çocuk sayısı analizi</p>
            </div>
          </div>
          <div className="space-y-4">
            {demographicStats?.childrenStats.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700">{item.range}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (memberStats?.totalMembers || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pozisyon Dağılımı */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Pozisyon Dağılımı</h3>
              <p className="text-sm text-slate-600">Üyelerin iş pozisyonları</p>
            </div>
          </div>
          <div className="space-y-4">
            {workplaceStats?.positionDistribution.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-700 truncate">{item.position}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-teal-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(item.count / (workplaceStats?.positionDistribution[0]?.count || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zaman Bazlı İstatistikler */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Üyelik Trendleri</h3>
            <p className="text-sm text-slate-600">Katılım tarihi bazlı analiz</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Son 12 Ay Trend */}
          <div>
            <h4 className="text-md font-medium text-slate-800 mb-4">Son 12 Ayın Üyelik Trendleri</h4>
            <div className="space-y-3">
              {timeStats?.membershipTrends.slice(-6).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-700">{item.month}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(item.count / Math.max(...(timeStats?.membershipTrends.map(t => t.count) || [1]))) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Katılım Süresi Analizi */}
          <div>
            <h4 className="text-md font-medium text-slate-800 mb-4">Katılım Süresi Dağılımı</h4>
            <div className="space-y-3">
              {timeStats?.joinDateAnalysis.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-slate-700">{item.period}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ 
                          width: `${(item.count / (memberStats?.totalMembers || 1)) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Özet Kartları */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">İstatistik Özeti</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-slate-600">Aktiflik Oranı</div>
            <div className="text-2xl font-bold text-green-600">
              {memberStats?.totalMembers ? 
                Math.round((memberStats.activeMembers / memberStats.totalMembers) * 100) : 0}%
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-slate-600">Bu Ay Büyüme</div>
            <div className="text-2xl font-bold text-blue-600">
              {getGrowthPercentage()}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-slate-600">En Popüler Şehir</div>
            <div className="text-lg font-bold text-slate-900">
              {geographicStats?.topCities[0]?.city || 'Veri yok'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
