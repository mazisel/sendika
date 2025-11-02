'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  RefreshCw,
  ShieldAlert,
  Wallet,
  Loader2,
  X
} from 'lucide-react';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/lib/types';
import type { DuePeriod, DuePeriodSummary } from '@/types/dues';

type PeriodWithSummary = DuePeriod & { summary: DuePeriodSummary | null };

const STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  collecting: 'Tahsilat',
  closed: 'Kapalı'
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-gray-200',
  collecting: 'bg-blue-100 text-blue-700 ring-blue-200',
  closed: 'bg-emerald-100 text-emerald-700 ring-emerald-200'
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'UTC'
});

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return dateFormatter.format(date);
};

export default function DuesDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [periods, setPeriods] = useState<PeriodWithSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'collecting' | 'closed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [monthlyModalOpen, setMonthlyModalOpen] = useState(false);
  const [monthlySubmitting, setMonthlySubmitting] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);
  const [monthlyForm, setMonthlyForm] = useState({
    startMonth: '',
    endMonth: '',
    dueAmount: '',
    dueDay: '1',
    penaltyRate: '0',
    description: '',
    autoGenerateMemberDues: true,
    includeInactiveMembers: false
  });

  const getCurrentMonthValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  useEffect(() => {
    const monthValue = getCurrentMonthValue();
    setMonthlyForm(prev => ({
      ...prev,
      startMonth: prev.startMonth || monthValue,
      endMonth: prev.endMonth || monthValue
    }));

    const checkAuth = async () => {
      const user = AdminAuth.getCurrentUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }

      setCurrentUser(user);
      await loadPeriods(user, statusFilter);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPeriods = async (
    user: AdminUser | null,
    filter: 'all' | 'draft' | 'collecting' | 'closed' = 'all'
  ) => {
    try {
      setLoading(true);
      setError(null);

      const queryParam = filter !== 'all' ? `?status=${filter}` : '';
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch(`/api/dues/periods${queryParam}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Aidat dönemleri yüklenemedi.');
      }

      const payload = await response.json();
      setPeriods(payload?.data ?? []);

      const updatedUser = user ?? AdminAuth.getCurrentUser();
      if (!updatedUser) {
        router.push('/admin/login');
      }
    } catch (err) {
      console.error('Aidat dönemleri yüklenirken hata:', err);
      setError(err instanceof Error ? err.message : 'Aidat dönemleri yüklenemedi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    await loadPeriods(currentUser, statusFilter);
  };

  const handleStatusFilterChange = async (value: 'all' | 'draft' | 'collecting' | 'closed') => {
    setStatusFilter(value);
    if (!currentUser) {
      return;
    }
    await loadPeriods(currentUser, value);
  };

  const handleGenerateForPeriod = async (periodId: string) => {
    if (!currentUser) return;

    const confirmGenerate = window.confirm(
      'Bu dönem için aktif üyeler adına aidat kayıtları oluşturulacak. Emin misiniz?'
    );

    if (!confirmGenerate) {
      return;
    }

    try {
      setGeneratingFor(periodId);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch(`/api/dues/periods/${periodId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Aidat kayıtları oluşturulamadı.');
      }

      const payload = await response.json();

      setPeriods(prev =>
        prev.map(period =>
          period.id === periodId
            ? {
                ...period,
                status: period.status === 'draft' ? 'collecting' : period.status,
                summary: payload?.data?.summary ?? period.summary
              }
            : period
        )
      );

      const generatedCount = payload?.data?.generated_member_count ?? 0;
      if (generatedCount > 0) {
        alert(`${generatedCount} üye için aidat kaydı oluşturuldu.`);
      } else {
        alert('Aidat kayıtları zaten mevcut veya yeni kayıt oluşturulamadı.');
      }
    } catch (error) {
      console.error('Aidat kayıtları oluşturulurken hata:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Aidat kayıtları oluşturulurken bir hata oluştu.'
      );
    } finally {
      setGeneratingFor(null);
    }
  };

  const resetMonthlyForm = () => {
    const monthValue = getCurrentMonthValue();
    setMonthlyForm({
      startMonth: monthValue,
      endMonth: monthValue,
      dueAmount: '',
      dueDay: '1',
      penaltyRate: '0',
      description: '',
      autoGenerateMemberDues: true,
      includeInactiveMembers: false
    });
  };

  const handleMonthlyInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = event.target;
    const fieldName = target.name;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setMonthlyForm(prev => ({
        ...prev,
        [fieldName]: target.checked
      }));
    } else {
      setMonthlyForm(prev => ({
        ...prev,
        [fieldName]: target.value
      }));
    }
  };

  const handleMonthlyGeneration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;

    setMonthlyError(null);
    setMonthlySubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch('/api/dues/periods/auto-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          startMonth: monthlyForm.startMonth,
          endMonth: monthlyForm.endMonth,
          dueDay: Number(monthlyForm.dueDay),
          dueAmount: Number(monthlyForm.dueAmount),
          penaltyRate: Number(monthlyForm.penaltyRate),
          description: monthlyForm.description,
          autoGenerateMemberDues: monthlyForm.autoGenerateMemberDues,
          includeInactiveMembers: monthlyForm.includeInactiveMembers
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || 'Aylık aidat dönemleri oluşturulamadı.');
      }

      const insertedCount = payload?.data?.inserted_count ?? 0;
      setMonthlyModalOpen(false);
      resetMonthlyForm();
      await loadPeriods(currentUser, statusFilter);

      if (insertedCount > 0) {
        alert(`${insertedCount} aylık aidat dönemi oluşturuldu.`);
      } else {
        alert(payload?.data?.message || 'Yeni aidat dönemi oluşmadı.');
      }
    } catch (err) {
      console.error('Aylık dönemler oluşturulurken hata:', err);
      setMonthlyError(err instanceof Error ? err.message : 'Aidat dönemleri oluşturulamadı.');
    } finally {
      setMonthlySubmitting(false);
    }
  };

  const aggregatedTotals = useMemo(() => {
    return periods.reduce(
      (acc, period) => {
        const summary = period.summary;
        if (summary) {
          acc.totalExpected += summary.total_expected_amount ?? 0;
          acc.totalPaid += summary.total_paid_amount ?? 0;
          acc.totalOutstanding += summary.total_outstanding_amount ?? 0;
        }
        return acc;
      },
      {
        totalExpected: 0,
        totalPaid: 0,
        totalOutstanding: 0
      }
    );
  }, [periods]);

  const canManageDues = currentUser ? PermissionManager.canManageDues(currentUser) : false;

  const renderStatusBadge = (status: string) => {
    const label = STATUS_LABELS[status] ?? status;
    const classes = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}
      >
        {label}
      </span>
    );
  };

  const renderSummaryCell = (period: PeriodWithSummary) => {
    const summary = period.summary;
    if (!summary) {
      return (
        <div className="text-sm text-slate-500">
          Henüz aidat kaydı oluşturulmamış
        </div>
      );
    }

    const { total_expected_amount, total_paid_amount, total_outstanding_amount } = summary;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Beklenen</span>
          <span className="font-medium text-slate-800">
            {total_expected_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </span>
        </div>
        <div className="flex justify-between text-sm text-emerald-700">
          <span>Tahsil</span>
          <span className="font-medium">
            {total_paid_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </span>
        </div>
        <div className="flex justify-between text-sm text-orange-600">
          <span>Kalan</span>
          <span className="font-medium">
            {total_outstanding_amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Wallet className="w-4 h-4" />
            <span>Aidat Yönetimi</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Aidat Dönemleri
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Üyelerin düzenli aidatlarını takip edin, dönem bazında tahsilatları kontrol edin ve
            gecikmeleri yönetin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Yenile
          </button>
          {canManageDues && (
            <>
              <button
                onClick={() => {
                  resetMonthlyForm();
                  setMonthlyError(null);
                  setMonthlyModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100"
              >
                <CalendarDays className="w-4 h-4" />
                Aylık Oluştur
              </button>
              <Link
                href="/admin/dues/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                <CircleDollarSign className="w-4 h-4" />
                Yeni Dönem
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Beklenen Toplam</p>
              <p className="text-2xl font-semibold text-slate-900">
                {aggregatedTotals.totalExpected.toLocaleString('tr-TR', {
                  style: 'currency',
                  currency: 'TRY'
                })}
              </p>
            </div>
            <CalendarDays className="w-9 h-9 text-blue-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tüm dönemlerdeki toplam planlanan aidat tutarı.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Tahsil Edilen</p>
              <p className="text-2xl font-semibold text-emerald-600">
                {aggregatedTotals.totalPaid.toLocaleString('tr-TR', {
                  style: 'currency',
                  currency: 'TRY'
                })}
              </p>
            </div>
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Kayıtlı tüm dönemlerde tahsil edilen toplam tutar.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Kalan Bakiyeler</p>
              <p className="text-2xl font-semibold text-orange-600">
                {aggregatedTotals.totalOutstanding.toLocaleString('tr-TR', {
                  style: 'currency',
                  currency: 'TRY'
                })}
              </p>
            </div>
            <ShieldAlert className="w-9 h-9 text-orange-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tahsilat bekleyen toplam aidat tutarı.
          </p>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Aidat Dönem Listesi</h2>
            <p className="text-sm text-slate-500">
              Dönem bazında tahsilat performansını takip edin.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={event =>
                handleStatusFilterChange(event.target.value as 'all' | 'draft' | 'collecting' | 'closed')
              }
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="draft">Taslak</option>
              <option value="collecting">Tahsilat</option>
              <option value="closed">Kapalı</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Aidat dönemleri yükleniyor...</span>
            </div>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          </div>
        ) : periods.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-16">
            <CircleDollarSign className="w-10 h-10 text-slate-400" />
            <h3 className="text-lg font-medium text-slate-800">
              Henüz aidat dönemi oluşturulmadı
            </h3>
            <p className="text-sm text-slate-500 max-w-sm">
              Aidat dönemleri oluşturarak düzenli tahsilat planı oluşturabilir ve üyelerin durumlarını
              takip edebilirsiniz.
            </p>
            {canManageDues && (
              <Link
                href="/admin/dues/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition-colors"
              >
                <CircleDollarSign className="w-4 h-4" />
                İlk Dönemi Oluştur
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Dönem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tarih Aralığı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Aidat Tutarı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Özet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {periods.map(period => (
                  <tr key={period.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">{period.name}</div>
                      <div className="text-xs text-slate-500">
                        Oluşturma: {formatDate(period.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div>{formatDate(period.period_start)} &rarr;</div>
                      <div>{formatDate(period.period_end)}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        Son ödeme: {formatDate(period.due_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="font-medium text-slate-900">
                        {period.due_amount.toLocaleString('tr-TR', {
                          style: 'currency',
                          currency: 'TRY'
                        })}
                      </div>
                      {period.penalty_rate > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          Gecikme faizi: %{period.penalty_rate}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {renderSummaryCell(period)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(period.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-y-2">
                      <Link
                        href={`/admin/dues/${period.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        Detayı Gör
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      {canManageDues && period.status !== 'closed' && (
                        <button
                          onClick={() => handleGenerateForPeriod(period.id)}
                          disabled={generatingFor === period.id}
                          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-60"
                        >
                          {generatingFor === period.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                          Aidat Oluştur
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {monthlyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Aylık Aidat Dönemleri Oluştur</h3>
                <p className="text-sm text-slate-500">
                  Seçtiğiniz ay aralığı için otomatik olarak aylık aidat dönemleri oluşturulur.
                </p>
              </div>
              <button
                onClick={() => {
                  setMonthlyModalOpen(false);
                  setMonthlyError(null);
                }}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMonthlyGeneration} className="px-6 py-5 space-y-5">
              {monthlyError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {monthlyError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Başlangıç Ayı *
                  </label>
                  <input
                    type="month"
                    name="startMonth"
                    value={monthlyForm.startMonth}
                    onChange={handleMonthlyInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Bitiş Ayı *
                  </label>
                  <input
                    type="month"
                    name="endMonth"
                    value={monthlyForm.endMonth}
                    onChange={handleMonthlyInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Aidat Tutarı (TL) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="dueAmount"
                    value={monthlyForm.dueAmount}
                    onChange={handleMonthlyInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn. 500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Son Ödeme Günü
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    name="dueDay"
                    value={monthlyForm.dueDay}
                    onChange={handleMonthlyInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn. 15"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Belirtilen günden büyük aylar için otomatik olarak ayın son günü seçilir.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Gecikme Oranı (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="penaltyRate"
                    value={monthlyForm.penaltyRate}
                    onChange={handleMonthlyInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn. 5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Açıklama (opsiyonel)
                </label>
                <textarea
                  name="description"
                  value={monthlyForm.description}
                  onChange={handleMonthlyInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Oluşturulan dönemler için genel bir açıklama ekleyebilirsiniz."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="autoGenerateMemberDues"
                    checked={monthlyForm.autoGenerateMemberDues}
                    onChange={handleMonthlyInputChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Oluşturulan her dönem için otomatik olarak üye aidat kayıtları açılır.
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="includeInactiveMembers"
                    checked={monthlyForm.includeInactiveMembers}
                    onChange={handleMonthlyInputChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Pasif durumdaki üyeler de dahil edilir. Varsayılan olarak sadece aktif ve beklemedeki üyeler dahil olur.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setMonthlyModalOpen(false);
                    setMonthlyError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={monthlySubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-60"
                >
                  {monthlySubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CalendarDays className="w-4 h-4" />
                  )}
                  Aylık Dönemleri Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
