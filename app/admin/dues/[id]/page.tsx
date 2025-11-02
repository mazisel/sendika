'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CalendarRange,
  CheckCheck,
  FileSpreadsheet,
  Loader2,
  PiggyBank,
  Receipt,
  ShieldAlert,
  SquareCheckBig,
  UserCircle,
  Wallet
} from 'lucide-react';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/lib/types';
import type {
  DuePeriod,
  DuePeriodSummary,
  MemberDue,
  MemberDuePayment,
  PaymentMethod
} from '@/types/dues';
import type { FinanceAccount, FinanceCategory } from '@/types/finance';

type MemberDueWithRelations = MemberDue & {
  members: {
    id: string;
    first_name: string;
    last_name: string;
    membership_number: string | null;
    tc_identity: string | null;
    city: string | null;
    district: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  member_due_payments: MemberDuePayment[];
  total_due_amount: number;
  outstanding_amount: number;
  last_payment_at: string | null;
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  bank_transfer: 'Havale/EFT',
  credit_card: 'Kredi Kartı',
  debit_card: 'Banka Kartı',
  online: 'Online Tahsilat',
  other: 'Diğer'
};

const STATUS_BADGES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  partial: 'bg-amber-100 text-amber-700 ring-amber-200',
  paid: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  overdue: 'bg-red-100 text-red-700 ring-red-200',
  cancelled: 'bg-gray-200 text-gray-600 ring-gray-300'
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

const formatCurrency = (value: number) => {
  const amount = Number(value) || 0;
  const [integerPart, decimalPart] = amount.toFixed(2).split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInteger},${decimalPart} ₺`;
};

interface PaymentFormState {
  amount: string;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string;
  notes: string;
  financeAccountId: string;
  financeCategoryId: string;
  recordFinance: boolean;
}

const initialPaymentForm = (): PaymentFormState => ({
  amount: '',
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash',
  reference_number: '',
  notes: '',
  financeAccountId: '',
  financeCategoryId: '',
  recordFinance: true
});

export default function DuePeriodDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const periodId = params?.id;

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [period, setPeriod] = useState<DuePeriod | null>(null);
  const [summary, setSummary] = useState<DuePeriodSummary | null>(null);
  const [memberDues, setMemberDues] = useState<MemberDueWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<MemberDueWithRelations | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(initialPaymentForm);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([]);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>([]);
  const [financeMetaLoading, setFinanceMetaLoading] = useState(false);
  const [financeMetaError, setFinanceMetaError] = useState<string | null>(null);

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }

    setCurrentUser(user);

    if (PermissionManager.canManageFinance(user)) {
      loadFinanceMetadata();
    }
  }, [router]);

  useEffect(() => {
    if (!periodId) return;
    loadPeriodDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodId]);

  const loadPeriodDetail = async () => {
    if (!periodId) return;
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch(`/api/dues/periods/${periodId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Aidat dönemi bilgisi yüklenemedi.');
      }

      const data = await response.json();
      setPeriod(data?.data?.period ?? null);
      setSummary(data?.data?.summary ?? null);
      setMemberDues(data?.data?.member_dues ?? []);
    } catch (error) {
      console.error('Aidat dönemi detayları yüklenirken hata:', error);
      setError(error instanceof Error ? error.message : 'Aidat dönemi bilgisi yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
    }
    return accessToken;
  };

  const authorizedFetch = async (url: string) => {
    const accessToken = await getAccessToken();
    return fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      credentials: 'include'
    });
  };

  const loadFinanceMetadata = async () => {
    try {
      setFinanceMetaLoading(true);
      setFinanceMetaError(null);

      const [accountsRes, categoriesRes] = await Promise.all([
        authorizedFetch('/api/finance/accounts?withSummary=false&includeInactive=false'),
        authorizedFetch('/api/finance/categories?type=income&includeInactive=false')
      ]);

      const accountsPayload = await accountsRes.json().catch(() => ({}));
      const categoriesPayload = await categoriesRes.json().catch(() => ({}));

      if (!accountsRes.ok) {
        throw new Error(accountsPayload?.message || 'Finans hesapları alınamadı.');
      }

      if (!categoriesRes.ok) {
        throw new Error(categoriesPayload?.message || 'Finans kategorileri alınamadı.');
      }

      setFinanceAccounts(accountsPayload?.data ?? []);
      setFinanceCategories(categoriesPayload?.data ?? []);
    } catch (error) {
      console.error('Finans meta verileri alınırken hata:', error);
      setFinanceMetaError(
        error instanceof Error ? error.message : 'Finans verileri alınamadı.'
      );
    } finally {
      setFinanceMetaLoading(false);
    }
  };

  const filteredMemberDues = useMemo(() => {
    return memberDues.filter(due => {
      const matchesStatus = statusFilter === 'all' ? true : due.status === statusFilter;
      const matchesSearch = searchTerm
        ? (due.members?.first_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (due.members?.last_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (due.members?.membership_number ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (due.members?.tc_identity ?? '').includes(searchTerm)
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [memberDues, statusFilter, searchTerm]);

  const canManageDues = currentUser ? PermissionManager.canManageDues(currentUser) : false;
  const canManageFinance = currentUser ? PermissionManager.canManageFinance(currentUser) : false;

  useEffect(() => {
    if (!paymentModalOpen || !canManageFinance) {
      return;
    }
    setPaymentForm(prev => {
      const defaultAccount = financeAccounts[0]?.id ?? '';
      const defaultCategory = financeCategories[0]?.id ?? '';
      return {
        ...prev,
        financeAccountId: prev.financeAccountId || defaultAccount,
        financeCategoryId: prev.financeCategoryId || defaultCategory,
        recordFinance:
          financeAccounts.length > 0 && financeCategories.length > 0 ? prev.recordFinance : false
      };
    });
  }, [financeAccounts, financeCategories, paymentModalOpen, canManageFinance]);

  const handleStatusChange = async (nextStatus: 'collecting' | 'closed') => {
    if (!periodId) return;

    const confirmMessage =
      nextStatus === 'closed'
        ? 'Bu dönem kapatılacak. Daha sonra yeniden açabilirsiniz. Devam edilsin mi?'
        : 'Bu dönem tahsilata açılacak. Devam etmek istiyor musunuz?';

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setUpdatingStatus(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch(`/api/dues/periods/${periodId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Aidat dönemi güncellenemedi.');
      }

      const payload = await response.json();
      setPeriod(payload?.data ?? null);
    } catch (error) {
      console.error('Aidat dönemi güncellenirken hata:', error);
      alert(
        error instanceof Error ? error.message : 'Aidat dönemi güncellenemedi.'
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openPaymentModal = (due: MemberDueWithRelations) => {
    setSelectedDue(due);
    setPaymentForm({
      amount: due.outstanding_amount > 0 ? due.outstanding_amount.toString() : '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      reference_number: '',
      notes: '',
      financeAccountId: financeAccounts[0]?.id ?? '',
      financeCategoryId: financeCategories[0]?.id ?? '',
      recordFinance: canManageFinance && financeAccounts.length > 0 && financeCategories.length > 0
    });
    setPaymentError(null);
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedDue(null);
    setPaymentForm(initialPaymentForm());
    setPaymentError(null);
  };

  const handlePaymentFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = event.target;
    if (type === 'checkbox' && event.target instanceof HTMLInputElement) {
      setPaymentForm(prev => ({
        ...prev,
        [name]: event.target.checked
      }));
    } else {
      setPaymentForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setPaymentError(null);
  };

  const handlePaymentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDue) return;

    const numericAmount = Number(paymentForm.amount);
    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setPaymentError('Geçerli bir ödeme tutarı giriniz.');
      return;
    }

  if (!paymentForm.payment_date) {
    setPaymentError('Ödeme tarihi zorunludur.');
    return;
  }

  if (
    paymentForm.recordFinance &&
    canManageFinance &&
    (!paymentForm.financeAccountId || !paymentForm.financeCategoryId)
  ) {
    setPaymentError('Finans kaydı için hesap ve kategori seçmelisiniz.');
    return;
  }

  try {
    setSavingPayment(true);
    const accessToken = await getAccessToken();

    const response = await fetch('/api/dues/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      credentials: 'include',
      body: JSON.stringify({
        member_due_id: selectedDue.id,
        amount: numericAmount,
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number.trim(),
        notes: paymentForm.notes.trim(),
        record_finance_transaction: paymentForm.recordFinance && canManageFinance,
        finance_account_id:
          paymentForm.recordFinance && canManageFinance ? paymentForm.financeAccountId || null : null,
        finance_category_id:
          paymentForm.recordFinance && canManageFinance ? paymentForm.financeCategoryId || null : null
      })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.message || 'Ödeme kaydedilemedi.');
    }

    const payload = await response.json();
    const updatedDue = payload?.data?.member_due;

      setMemberDues(prev =>
        prev.map(due =>
          due.id === selectedDue.id
            ? {
                ...due,
                ...updatedDue,
                total_due_amount: Math.max(
                  (updatedDue.amount_due ?? 0) -
                    (updatedDue.discount_amount ?? 0) +
                    (updatedDue.penalty_amount ?? 0),
                  0
                ),
                outstanding_amount: Math.max(
                  Math.max(
                    (updatedDue.amount_due ?? 0) -
                      (updatedDue.discount_amount ?? 0) +
                      (updatedDue.penalty_amount ?? 0),
                    0
                  ) - (updatedDue.paid_amount ?? 0),
                  0
                )
              }
            : due
        )
      );

      await loadPeriodDetail();
      if (canManageFinance) {
        await loadFinanceMetadata();
      }
      alert('Ödeme kaydı başarıyla oluşturuldu.');
      closePaymentModal();
    } catch (error) {
      console.error('Ödeme kaydedilirken hata:', error);
      setPaymentError(
        error instanceof Error ? error.message : 'Ödeme kaydedilemedi.'
      );
    } finally {
      setSavingPayment(false);
    }
  };

  const exportCsv = () => {
    const headers = [
      'Üye No',
      'Ad Soyad',
      'TC Kimlik',
      'Telefon',
      'Durum',
      'Beklenen Tutar',
      'Ödenen Tutar',
      'Kalan Tutar',
      'Son Ödeme Tarihi'
    ];
    const rows = memberDues.map(due => [
      due.members?.membership_number ?? '',
      `${due.members?.first_name ?? ''} ${due.members?.last_name ?? ''}`.trim(),
      due.members?.tc_identity ?? '',
      due.members?.phone ?? '',
      due.status,
      due.total_due_amount.toString().replace('.', ','),
      (due.paid_amount ?? 0).toString().replace('.', ','),
      due.outstanding_amount.toString().replace('.', ','),
      due.last_payment_at ?? ''
    ]);

    const csvContent =
      [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = period
      ? `${period.name.replace(/\s+/g, '_').toLowerCase()}_aidat_listesi.csv`
      : 'aidat_listesi.csv';
    link.setAttribute('download', safeName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!periodId) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Geçersiz aidat dönemi bilgisi.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href="/admin/dues"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Aidat dönemlerine dön
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {period?.name ?? 'Aidat Dönemi'}
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Döneme bağlı tüm aidat kayıtlarını, ödeme hareketlerini ve üyelerin durumlarını burada
            yönetebilirsiniz.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={!memberDues.length}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60"
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV Aktar
          </button>
          {canManageDues && period?.status !== 'closed' && (
            <button
              onClick={() => handleStatusChange(period?.status === 'draft' ? 'collecting' : 'closed')}
              disabled={updatingStatus}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-60"
            >
              {updatingStatus ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : period?.status === 'draft' ? (
                <SquareCheckBig className="w-4 h-4" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              {period?.status === 'draft' ? 'Tahsilata Aç' : 'Dönemi Kapat'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-500">
          <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          Aidat dönemi bilgileri yükleniyor...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <CalendarRange className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-slate-500">Dönem Aralığı</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {period ? `${formatDate(period.period_start)} - ${formatDate(period.period_end)}` : '-'}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div>
                  <span className="text-slate-500">Son Ödeme</span>
                  <p className="font-medium text-slate-900">
                    {period ? formatDate(period.due_date) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Durum</span>
                  <p className="font-medium text-slate-900 capitalize">{period?.status}</p>
                </div>
                <div>
                  <span className="text-slate-500">Aidat Tutarı</span>
                  <p className="font-medium text-slate-900">
                    {period ? formatCurrency(period.due_amount ?? 0) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Gecikme Oranı</span>
                  <p className="font-medium text-slate-900">
                    %{period?.penalty_rate ?? 0}
                  </p>
                </div>
              </div>
              {period?.description && (
                <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
                  {period.description}
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Tahsil Edilen</p>
                  <p className="text-xl font-semibold text-emerald-600">
                    {summary ? formatCurrency(summary.total_paid_amount ?? 0) : '0,00 ₺'}
                  </p>
                </div>
                <PiggyBank className="w-8 h-8 text-emerald-500" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {summary?.paid_member_count ?? 0} üye ödemesini tamamladı.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Kalan Bakiye</p>
                  <p className="text-xl font-semibold text-orange-600">
                    {summary ? formatCurrency(summary.total_outstanding_amount ?? 0) : '0,00 ₺'}
                  </p>
                </div>
                <ShieldAlert className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {summary?.overdue_member_count ?? 0} üyenin ödemesi gecikti.
              </p>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Üye Aidat Listesi</h2>
                <p className="text-sm text-slate-500">
                  Üyelerin aidat durumlarını inceleyin, ödemeleri kaydedin.
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                <input
                  type="search"
                  placeholder="Üye adı, üye no veya TC ara..."
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  className="w-full md:w-64 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={statusFilter}
                  onChange={event =>
                    setStatusFilter(event.target.value as typeof statusFilter)
                  }
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Beklemede</option>
                  <option value="partial">Kısmi Ödeme</option>
                  <option value="paid">Tamamlandı</option>
                  <option value="overdue">Gecikmiş</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Üye
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      İletişim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Beklenen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ödenen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Kalan
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
                  {filteredMemberDues.map(due => (
                    <tr key={due.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-blue-500" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {`${due.members?.first_name ?? ''} ${due.members?.last_name ?? ''}`.trim() || 'Üye'}
                            </div>
                            <div className="text-xs text-slate-500">
                              Üye No: {due.members?.membership_number ?? '-'}
                            </div>
                            <div className="text-xs text-slate-500">
                              TC: {due.members?.tc_identity ?? '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        <div>{due.members?.phone ?? '-'}</div>
                        <div className="text-xs text-slate-400">{due.members?.email ?? '-'}</div>
                        <div className="text-xs text-slate-400">
                          {due.members?.city ?? '-'} / {due.members?.district ?? '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                        {formatCurrency(due.total_due_amount ?? 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600">
                        {formatCurrency(due.paid_amount ?? 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {formatCurrency(due.outstanding_amount ?? 0)}
                        {due.last_payment_at && (
                          <div className="text-xs text-slate-400 mt-1">
                            Son ödeme: {formatDate(due.last_payment_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                            STATUS_BADGES[due.status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'
                          }`}
                        >
                          {due.status === 'pending' && 'Beklemede'}
                          {due.status === 'partial' && 'Kısmi'}
                          {due.status === 'paid' && 'Ödendi'}
                          {due.status === 'overdue' && 'Gecikmiş'}
                          {due.status === 'cancelled' && 'İptal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-y-2">
                        <button
                          onClick={() => openPaymentModal(due)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <Receipt className="w-4 h-4" />
                          Ödeme Kaydet
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredMemberDues.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                        Filtreye uygun kayıt bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {paymentModalOpen && selectedDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Ödeme Kaydı Oluştur</h3>
                <p className="text-sm text-slate-500">
                  {`${selectedDue.members?.first_name ?? ''} ${selectedDue.members?.last_name ?? ''}`.trim() ||
                    'Üye'} için ödeme bilgisi girin.
                </p>
              </div>
              <button
                onClick={closePaymentModal}
                className="text-slate-500 hover:text-slate-700"
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Ödeme Tutarı *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={handlePaymentFormChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Ödeme Tarihi *
                  </label>
                  <input
                    type="date"
                    name="payment_date"
                    value={paymentForm.payment_date}
                    onChange={handlePaymentFormChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Ödeme Yöntemi *
                  </label>
                  <select
                    name="payment_method"
                    value={paymentForm.payment_method}
                    onChange={handlePaymentFormChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(method => (
                      <option key={method} value={method}>
                        {PAYMENT_METHOD_LABELS[method]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Referans No
                  </label>
                  <input
                    type="text"
                    name="reference_number"
                    value={paymentForm.reference_number}
                    onChange={handlePaymentFormChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Banka dekont no veya makbuz kodu"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Açıklama
                </label>
                <textarea
                  name="notes"
                  value={paymentForm.notes}
                  onChange={handlePaymentFormChange}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opsiyonel notlar veya açıklamalar"
                />
              </div>
              {canManageFinance && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="recordFinance"
                      checked={paymentForm.recordFinance}
                      onChange={handlePaymentFormChange}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Finans hareketi oluştur</p>
                      <p className="text-xs text-slate-500">
                        Ödeme kaydıyla birlikte finans modülünde gelir hareketi oluşturulur ve seçilen
                        hesaba işlenir.
                      </p>
                    </div>
                  </div>

                  {paymentForm.recordFinance && (
                    <>
                      {financeMetaError && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          {financeMetaError}
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 uppercase">
                            Finans Hesabı
                          </label>
                          <select
                            name="financeAccountId"
                            value={paymentForm.financeAccountId}
                            onChange={handlePaymentFormChange}
                            disabled={financeAccounts.length === 0 || financeMetaLoading}
                            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">
                              {financeAccounts.length === 0 ? 'Hesap bulunamadı' : 'Hesap seçiniz'}
                            </option>
                            {financeAccounts.map(account => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                          {financeAccounts.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">
                              Finans hesabı bulunamadı. Finans &gt; Yeni Hesap menüsünden oluşturabilirsiniz.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 uppercase">
                            Finans Kategorisi
                          </label>
                          <select
                            name="financeCategoryId"
                            value={paymentForm.financeCategoryId}
                            onChange={handlePaymentFormChange}
                            disabled={financeCategories.length === 0 || financeMetaLoading}
                            className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">
                              {financeCategories.length === 0 ? 'Kategori bulunamadı' : 'Kategori seçiniz'}
                            </option>
                            {financeCategories.map(category => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          {financeCategories.length === 0 && (
                            <p className="mt-1 text-xs text-amber-600">
                              Finans geliri kategorisi bulunamadı. Finans sayfasından ekleyebilirsiniz.
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {paymentError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {paymentError}
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-slate-400" />
                  <span>
                    Bekleyen bakiye:{' '}
                    {formatCurrency(selectedDue.outstanding_amount ?? 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    Son ödeme:{' '}
                    {selectedDue.last_payment_at ? formatDate(selectedDue.last_payment_at) : '-'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-60"
                >
                  {savingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Receipt className="w-4 h-4" />
                  )}
                  Ödemeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
