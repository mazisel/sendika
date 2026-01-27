'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import type { AdminUser, Member } from '@/lib/types';
import type { DuePeriod } from '@/types/dues';
import { Plus, Calendar, DollarSign, Users, Eye, Play, CheckCircle, Clock, Upload, Search, Loader2 } from 'lucide-react';

export default function DuesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
      <DuesContent />
    </Suspense>
  );
}

function DuesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'periods' | 'bulk'>((searchParams.get('tab') as 'periods' | 'bulk') || 'periods');

  const [user, setUser] = useState<AdminUser | null>(null);
  const [periods, setPeriods] = useState<DuePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toplu Giriş State
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [bulkPayments, setBulkPayments] = useState<Record<string, string>>({});
  const [bulkSaving, setBulkSaving] = useState(false);

  // Filtreler
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterCity, setFilterCity] = useState('');
  const [filterWorkplace, setFilterWorkplace] = useState('');
  const [filterPosition, setFilterPosition] = useState('');

  useEffect(() => {
    const currentUser = AdminAuth.getCurrentUser();
    if (!currentUser) {
      router.push('/admin/login');
      return;
    }
    if (!PermissionManager.canViewDues(currentUser)) {
      router.push('/admin/dashboard');
      return;
    }
    setUser(currentUser);
    loadPeriods();
  }, [router]);

  const handleTabChange = (tab: 'periods' | 'bulk') => {
    setActiveTab(tab);
    router.push(`/admin/dues?tab=${tab}`);
    if (tab === 'bulk' && members.length === 0) {
      loadMembers();
    }
  };

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  };

  const loadPeriods = async () => {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Oturum bulunamadı');

      const res = await fetch('/api/dues/periods', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Dönemler yüklenemedi');

      const { data } = await res.json();
      setPeriods(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/members', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Üyeler yüklenemedi');

      const { data } = await res.json();
      setMembers(data || []);
    } catch {
      setError('Üyeler yüklenemedi');
    } finally {
      setMembersLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'collecting' | 'closed') => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/dues/periods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Güncelleme başarısız');
      loadPeriods();
    } catch {
      alert('Durum güncellenemedi');
    }
  };

  const handleBulkPayment = (memberId: string, amount: string) => {
    setBulkPayments(prev => ({ ...prev, [memberId]: amount }));
  };

  const saveBulkPayments = async () => {
    if (!selectedPeriod) {
      alert('Lütfen bir dönem seçin');
      return;
    }

    const paymentsToSave = Object.entries(bulkPayments)
      .filter(([_, amount]) => amount && Number(amount) > 0)
      .map(([memberId, amount]) => ({ memberId, amount: Number(amount) }));

    if (paymentsToSave.length === 0) {
      alert('Kaydedilecek ödeme bulunamadı');
      return;
    }

    setBulkSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/dues/periods/${selectedPeriod}/payments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payments: paymentsToSave })
      });

      if (!res.ok) throw new Error('Kayıt başarısız');

      alert(`${paymentsToSave.length} ödeme kaydedildi`);
      setBulkPayments({});
      loadPeriods();
    } catch {
      alert('Ödemeler kaydedilemedi');
    } finally {
      setBulkSaving(false);
    }
  };

  const formatCurrency = (val: number) => val.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
  const formatDate = (val: string) => new Date(val).toLocaleDateString('tr-TR');

  const canManage = user ? PermissionManager.canManageDues(user) : false;

  // Filtreli üyeler
  const filteredMembers = members.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      m.first_name?.toLowerCase().includes(term) ||
      m.last_name?.toLowerCase().includes(term) ||
      m.tc_identity?.includes(term) ||
      m.membership_number?.toLowerCase().includes(term)
    );

    const matchesStatus = filterStatus ? m.membership_status === filterStatus : true;
    const matchesCity = filterCity ? m.city === filterCity : true;
    const matchesWorkplace = filterWorkplace ? m.workplace === filterWorkplace : true;
    const matchesPosition = filterPosition ? m.position === filterPosition : true;

    return matchesSearch && matchesStatus && matchesCity && matchesWorkplace && matchesPosition;
  });

  // Mevcut şehirler ve diğer tanımlar listesi
  const availableCities = Array.from(new Set(members.map(m => m.city).filter(Boolean))).sort();
  const availableWorkplaces = Array.from(new Set(members.map(m => m.workplace).filter(Boolean))).sort();
  const availablePositions = Array.from(new Set(members.map(m => m.position).filter(Boolean))).sort();
  // Tahsilatta olan dönemler
  const collectingPeriods = periods.filter(p => p.status === 'collecting');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Başlık */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Aidat Yönetimi</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Aidat dönemlerini ve tahsilatları yönetin
          </p>
        </div>

        {/* Sekmeler */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('periods')}
              className={`${activeTab === 'periods'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Dönemler
            </button>
            <button
              onClick={() => handleTabChange('bulk')}
              className={`${activeTab === 'bulk'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <Upload className="w-4 h-4 mr-2" />
              Toplu Aidat Girişi
            </button>
          </nav>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* DÖNEMLER SEKMESİ */}
        {activeTab === 'periods' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dönemler</h2>
              {canManage && (
                <Link
                  href="/admin/dues/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Yeni Dönem
                </Link>
              )}
            </div>

            {/* Dönem Listesi */}
            <div className="bg-white dark:bg-slate-900 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
              {periods.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Dönem bulunamadı</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Henüz aidat dönemi eklenmemiş.</p>
                  {canManage && (
                    <div className="mt-6">
                      <Link href="/admin/dues/new" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Plus className="w-5 h-5 mr-2" />
                        İlk Dönemi Oluştur
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dönem</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tarih</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tutar</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Durum</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tahsilat</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                      {periods.map((period) => (
                        <tr key={period.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{period.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(period.period_start)} - {formatDate(period.period_end)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(period.due_amount)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${period.status === 'collecting' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              period.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                              {period.status === 'collecting' ? 'Tahsilatta' : period.status === 'draft' ? 'Taslak' : 'Kapalı'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {period.summary ? (
                              <div className="w-32">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-500 dark:text-gray-400">{period.summary.paid_members}/{period.summary.total_members}</span>
                                  <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(period.summary.total_paid_amount)}</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (period.summary.total_paid_amount / period.summary.total_expected_amount) * 100)}%` }}></div>
                                </div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <Link href={`/admin/dues/${period.id}`} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                <Eye className="w-4 h-4" />
                              </Link>
                              {canManage && period.status === 'draft' && (
                                <button onClick={() => updateStatus(period.id, 'collecting')} className="text-green-600 hover:text-green-900 dark:text-green-400 p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30">
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                              {canManage && period.status === 'collecting' && (
                                <button onClick={() => updateStatus(period.id, 'closed')} className="text-gray-600 hover:text-gray-900 dark:text-gray-400 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TOPLU AİDAT GİRİŞİ SEKMESİ */}
        {activeTab === 'bulk' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Toplu Aidat Girişi</h2>
            </div>

            {/* Dönem Seçimi ve Arama */}
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dönem Seçin</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Dönem seçin...</option>
                    {collectingPeriods.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.due_amount)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durum</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="active">Aktif Üyeler</option>
                    <option value="">Tüm Üyeler</option>
                    <option value="passive">Pasif Üyeler</option>
                    <option value="resigned">İstifa Edenler</option>
                    <option value="suspended">Askıya Alınanlar</option>
                    <option value="expelled">İhraç Edilenler</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şehir</label>
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Tüm Şehirler</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">İş Yeri</label>
                  <select
                    value={filterWorkplace}
                    onChange={(e) => setFilterWorkplace(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Tüm İş Yerleri</option>
                    {availableWorkplaces.map(wp => (
                      <option key={wp} value={wp}>{wp}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unvan</label>
                  <select
                    value={filterPosition}
                    onChange={(e) => setFilterPosition(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Tüm Unvanlar</option>
                    {availablePositions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Üye Ara</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Ad, soyad, TC veya üye no..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Üye Listesi */}
            <div className="bg-white dark:bg-slate-900 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
              {membersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Üye bulunamadı</h3>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Üye No</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ad Soyad</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">TC Kimlik</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ödeme Tutarı (₺)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredMembers.slice(0, 50).map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {member.membership_number || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.first_name} {member.last_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {member.tc_identity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                value={bulkPayments[member.id] || ''}
                                onChange={(e) => handleBulkPayment(member.id, e.target.value)}
                                placeholder="0"
                                min="0"
                                step="0.01"
                                className="w-28 px-2 py-1 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredMembers.length > 50 && (
                    <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm text-gray-500">
                      Listelenen: 50 / {filteredMembers.length} üye (arama yaparak daraltın)
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Kaydet Butonu */}
            {filteredMembers.length > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={saveBulkPayments}
                  disabled={bulkSaving || !selectedPeriod}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Ödemeleri Kaydet
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
