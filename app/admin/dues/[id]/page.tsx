'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import type { AdminUser } from '@/lib/types';
import type { DuePeriod, DuePeriodSummary, MemberDuePayment } from '@/types/dues';
import {
  CheckCircle2,
  CircleDollarSign,
  Filter,
  Loader2,
  Plus,
  Search,
  X,
  XCircle
} from 'lucide-react';


interface MemberSummary {
  id: string;
  first_name: string;
  last_name: string;
  membership_number?: string | null;
  tc_identity?: string | null;
  city?: string | null;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface MemberDueRow {
  id: string;
  member_id: string;
  period_id: string;
  due_date: string;
  amount_due: number;
  discount_amount: number;
  penalty_amount: number;
  paid_amount: number;
  status: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  total_due_amount?: number;
  outstanding_amount?: number;
  last_payment_at?: string | null;
  members?: MemberSummary | null;
  member_due_payments?: MemberDuePayment[];
}

interface FinanceAccount {
  id: string;
  name: string;
  account_type: string;
  currency: string;
}

interface FinanceCategory {
  id: string;
  name: string;
  category_type: string;
}

const formatCurrency = (value: number | string) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return '₺0,00';
  }
  return numericValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC' });

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return dateFormatter.format(date);
};

const memberDueStatusBadge: Record<string, { label: string; className: string }> = {
  paid: { label: 'Ödendi', className: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  partial: { label: 'Kısmi', className: 'bg-amber-100 text-amber-700 ring-amber-200' },
  overdue: { label: 'Gecikmiş', className: 'bg-red-100 text-red-700 ring-red-200' },
  pending: { label: 'Beklemede', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  cancelled: { label: 'İptal', className: 'bg-gray-200 text-gray-600 ring-gray-300' }
};

export default function DuePeriodDetailPage() {
  const router = useRouter();
  const params = useParams();
  const periodId = params.id as string;

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [period, setPeriod] = useState<DuePeriod | null>(null);
  const [summary, setSummary] = useState<DuePeriodSummary | null>(null);
  const [memberDues, setMemberDues] = useState<MemberDueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'>('all');

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [activeDue, setActiveDue] = useState<MemberDueRow | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccount[]>([]);
  const [financeCategories, setFinanceCategories] = useState<FinanceCategory[]>([]);
  const [financeLoading, setFinanceLoading] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    record_finance_transaction: false,
    finance_account_id: '',
    finance_category_id: ''
  });

  const canManageDues = currentUser ? PermissionManager.canManageDues(currentUser) : false;

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }

    if (!PermissionManager.canViewDues(user)) {
      router.push('/admin/dues');
      return;
    }

    setCurrentUser(user);
  }, [router]);

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.access_token || '';
  };

  const fetchPeriod = async () => {
    if (!periodId) return;
    setLoading(true);
    setError('');
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Oturum bulunamadı.');

      const response = await fetch(`/api/dues/periods/${periodId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include'
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Aidat dönemi alınamadı.');
      }

      setPeriod(payload?.data?.period ?? null);
      setSummary(payload?.data?.summary ?? null);
      setMemberDues(Array.isArray(payload?.data?.member_dues) ? payload.data.member_dues : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aidat dönemi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchPeriod();
  }, [currentUser, periodId]);

  const fetchFinanceOptions = async () => {
    if (financeAccounts.length > 0 && financeCategories.length > 0) return;
    setFinanceLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Oturum bulunamadı.');

      const [accountsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/finance/accounts', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          credentials: 'include'
        }),
        fetch('/api/finance/categories?type=income', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          credentials: 'include'
        })
      ]);

      const accountsPayload = await accountsResponse.json().catch(() => ({}));
      const categoriesPayload = await categoriesResponse.json().catch(() => ({}));

      if (!accountsResponse.ok) {
        throw new Error(accountsPayload?.message || 'Hesaplar alınamadı.');
      }
      if (!categoriesResponse.ok) {
        throw new Error(categoriesPayload?.message || 'Kategoriler alınamadı.');
      }

      setFinanceAccounts(Array.isArray(accountsPayload?.data) ? accountsPayload.data : []);
      setFinanceCategories(Array.isArray(categoriesPayload?.data) ? categoriesPayload.data : []);
    } catch (err) {
      // Opsiyonel
    } finally {
      setFinanceLoading(false);
    }
  };

  const openPaymentModal = (due: MemberDueRow) => {
    const outstanding = due.outstanding_amount ?? Math.max(due.amount_due - due.paid_amount, 0);
    setActiveDue(due);
    setPaymentForm(prev => ({
      ...prev,
      amount: outstanding > 0 ? outstanding.toString() : '',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: ''
    }));
    setPaymentOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentOpen(false);
    setActiveDue(null);
  };

  const handlePaymentSubmit = async () => {
    if (!activeDue) return;
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert('Ödeme tutarı 0\'dan büyük olmalıdır.');
      return;
    }
    if (!paymentForm.payment_date) {
      alert('Ödeme tarihi zorunludur.');
      return;
    }

    if (paymentForm.record_finance_transaction) {
      if (!paymentForm.finance_account_id || !paymentForm.finance_category_id) {
        alert('Finans kaydı için hesap ve kategori seçiniz.');
        return;
      }
    }

    setPaymentLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('Oturum bulunamadı.');

      const response = await fetch('/api/dues/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          member_due_id: activeDue.id,
          amount: Number(paymentForm.amount),
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          reference_number: paymentForm.reference_number,
          notes: paymentForm.notes,
          record_finance_transaction: paymentForm.record_finance_transaction,
          finance_account_id: paymentForm.record_finance_transaction ? paymentForm.finance_account_id : null,
          finance_category_id: paymentForm.record_finance_transaction ? paymentForm.finance_category_id : null
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Ödeme kaydedilemedi.');
      }

      closePaymentModal();
      await fetchPeriod();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ödeme kaydedilemedi.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const filteredDues = useMemo(() => {
    return memberDues.filter(item => {
      const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;
      if (!matchesStatus) return false;

      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const member = item.members;
      const fullName = `${member?.first_name ?? ''} ${member?.last_name ?? ''}`.trim().toLowerCase();
      const membershipNumber = member?.membership_number?.toLowerCase() || '';
      const tc = member?.tc_identity?.toLowerCase() || '';
      return (
        fullName.includes(searchLower) ||
        membershipNumber.includes(searchLower) ||
        tc.includes(searchLower)
      );
    });
  }, [memberDues, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      ) : period ? (
        <>
          <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{period.name}</h1>
                <p className="text-gray-600 text-sm mt-1">
                  {formatDate(period.period_start)} - {formatDate(period.period_end)} · Son ödeme: {formatDate(period.due_date)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CircleDollarSign className="w-4 h-4" />
                {formatCurrency(period.due_amount)}
              </div>
            </div>

              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                  <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Tahakkuk</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summary.total_expected_amount)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Tahsil</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summary.total_paid_amount)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Kalan</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(summary.total_outstanding_amount)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Üye Sayısı</p>
                    <p className="text-2xl font-semibold text-gray-900">{summary.total_members}</p>
                  </div>
                </div>
              )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Search className="w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Üye adı, üye no, TC"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="all">Tümü</option>
                  <option value="pending">Beklemede</option>
                  <option value="partial">Kısmi</option>
                  <option value="paid">Ödendi</option>
                  <option value="overdue">Gecikmiş</option>
                  <option value="cancelled">İptal</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Üye</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Ödenen</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Son Ödeme</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDues.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                        Kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredDues.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {item.members?.first_name} {item.members?.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{item.members?.membership_number || '-'}</div>
                        </td>
                        <td className="px-4 py-3">{formatCurrency(item.total_due_amount ?? item.amount_due)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.paid_amount)}</td>
                        <td className="px-4 py-3">{formatCurrency(item.outstanding_amount ?? 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${memberDueStatusBadge[item.status]?.className || 'bg-slate-100 text-slate-700'}`}>
                            {memberDueStatusBadge[item.status]?.label || item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatDate(item.last_payment_at)}</td>
                        <td className="px-4 py-3 text-right">
                          {canManageDues && (
                            <button
                              onClick={() => openPaymentModal(item)}
                              className="text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" /> Ödeme
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {paymentOpen && activeDue && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg shadow-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ödeme Kaydı</h3>
              <button onClick={closePaymentModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 border border-gray-200">
                <p className="font-medium text-gray-900">
                  {activeDue.members?.first_name} {activeDue.members?.last_name}
                </p>
                <p>Ödenecek: {formatCurrency(activeDue.outstanding_amount ?? 0)}</p>
              </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tutar</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Ödeme Tarihi</label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ödeme Yöntemi</label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="cash">Nakit</option>
                    <option value="bank_transfer">Banka Havalesi</option>
                    <option value="credit_card">Kredi Kartı</option>
                    <option value="debit_card">Banka Kartı</option>
                    <option value="online">Online</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Referans / Dekont No</label>
                  <input
                    type="text"
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Opsiyonel"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Not</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Opsiyonel"
                    rows={2}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={paymentForm.record_finance_transaction}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setPaymentForm(prev => ({ ...prev, record_finance_transaction: checked }));
                      if (checked) {
                        fetchFinanceOptions();
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  Finans işlemi oluştur
                </label>

                {paymentForm.record_finance_transaction && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select
                      value={paymentForm.finance_account_id}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, finance_account_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={financeLoading}
                    >
                      <option value="">Hesap seçin</option>
                      {financeAccounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </option>
                      ))}
                    </select>
                    <select
                      value={paymentForm.finance_category_id}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, finance_category_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={financeLoading}
                    >
                      <option value="">Kategori seçin</option>
                      {financeCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={closePaymentModal}
                className="btn-secondary"
              >
                Vazgeç
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={paymentLoading}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
              >
                {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Ödemeyi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
