'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  PiggyBank,
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Plus,
  X,
  ArrowRight,
  CalendarDays,
  ListChecks
} from 'lucide-react';
import { AdminAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PermissionManager } from '@/lib/permissions';
import type { AdminUser } from '@/lib/types';
import type {
  FinanceAccount,
  FinanceAccountSummary,
  FinanceCategory,
  FinanceSummary,
  FinanceTransaction,
  FinanceTransactionType
} from '@/types/finance';

interface AccountWithSummary extends FinanceAccount {
  summary: FinanceAccountSummary | null;
}

interface CategoryFormState {
  name: string;
  category_type: 'income' | 'expense' | 'transfer';
  parent_id: string;
  description: string;
}

interface TransactionFormState {
  account_id: string;
  transaction_type: FinanceTransactionType;
  category_id: string;
  amount: string;
  transaction_date: string;
  description: string;
  reference_code: string;
  member_id: string;
  member_due_id: string;
  transfer_account_id: string;
  notes: string;
}

const initialTransactionForm = (): TransactionFormState => ({
  account_id: '',
  transaction_type: 'income',
  category_id: '',
  amount: '',
  transaction_date: new Date().toISOString().split('T')[0],
  description: '',
  reference_code: '',
  member_id: '',
  member_due_id: '',
  transfer_account_id: '',
  notes: ''
});

interface AccountFormState {
  name: string;
  account_type: 'cash' | 'bank' | 'other';
  currency: string;
  opening_balance: string;
  description: string;
}

const initialAccountForm: AccountFormState = {
  name: '',
  account_type: 'cash',
  currency: 'TRY',
  opening_balance: '',
  description: ''
};

const initialCategoryForm: CategoryFormState = {
  name: '',
  category_type: 'income',
  parent_id: '',
  description: ''
};

const currencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2
});

const fallbackCurrencyFormat = (value: number) => {
  const amount = Number(value) || 0;
  const [integerPart, decimalPart] = amount.toFixed(2).split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInteger},${decimalPart} ₺`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'UTC' }).format(date);
};

export default function FinanceDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [accounts, setAccounts] = useState<AccountWithSummary[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = useState<
    Array<FinanceTransaction & {
      finance_accounts?: Pick<FinanceAccount, 'id' | 'name' | 'account_type' | 'currency'> | null;
      finance_categories?: Pick<FinanceCategory, 'id' | 'name' | 'category_type'> | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(initialTransactionForm);
  const [transactionSubmitting, setTransactionSubmitting] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountFormState>(initialAccountForm);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [accountFormError, setAccountFormError] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(initialCategoryForm);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | FinanceTransactionType>('all');
  const [isClient, setIsClient] = useState(false);

  const canManageFinance = useMemo(
    () => (currentUser ? PermissionManager.canManageFinance(currentUser) : false),
    [currentUser]
  );

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }

    setCurrentUser(user);
    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
    }
    return accessToken;
  };

  const authorizedFetch = async (url: string, options: RequestInit = {}) => {
    const token = await getAccessToken();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      },
      credentials: 'include'
    });
  };

  const initializeData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadSummary(), loadAccounts(), loadCategories()]);
    } catch (err) {
      console.error('Finans verileri yüklenirken hata:', err);
      setError(err instanceof Error ? err.message : 'Finans verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    const response = await authorizedFetch('/api/finance/summary');
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message || 'Finans özeti alınamadı.');
    }

    setSummary(payload?.data ?? null);
    setTransactions(payload?.data?.recent_transactions ?? []);
  };

  const loadAccounts = async () => {
    const response = await authorizedFetch('/api/finance/accounts?withSummary=true');
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message || 'Finans hesapları alınamadı.');
    }

    setAccounts(payload?.data ?? []);
  };

  const loadCategories = async () => {
    const response = await authorizedFetch('/api/finance/categories?includeInactive=false');
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.message || 'Finans kategorileri alınamadı.');
    }

    setCategories(payload?.data ?? []);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadSummary(), loadAccounts()]);
    } catch (err) {
      console.error('Finans verileri yenilenirken hata:', err);
      setError(err instanceof Error ? err.message : 'Veriler yenilenemedi.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTransactionInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setTransactionForm(prev => ({
      ...prev,
      [name]: value
    }));
    if (formError) {
      setFormError(null);
    }
  };

  const handleAccountInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setAccountForm(prev => ({
      ...prev,
      [name]: value
    }));
    if (accountFormError) {
      setAccountFormError(null);
    }
  };

  const handleCategoryInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: value
    }));
    if (categoryFormError) {
      setCategoryFormError(null);
    }
  };

  const handleTransactionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageFinance) return;

    if (!transactionForm.account_id) {
      setFormError('Lütfen bir hesap seçiniz.');
      return;
    }

    if (!transactionForm.category_id) {
      setFormError('Lütfen bir kategori seçiniz.');
      return;
    }

    if (!transactionForm.amount || Number(transactionForm.amount) <= 0) {
      setFormError('Geçerli bir tutar giriniz.');
      return;
    }

    if (transactionForm.transaction_type === 'transfer' && !transactionForm.transfer_account_id) {
      setFormError('Transfer işlemlerinde hedef hesap seçmelisiniz.');
      return;
    }

    setTransactionSubmitting(true);
    try {
      const response = await authorizedFetch('/api/finance/transactions', {
        method: 'POST',
        body: JSON.stringify({
          ...transactionForm,
          amount: Number(transactionForm.amount) || 0,
          member_id: transactionForm.member_id || null,
          member_due_id: transactionForm.member_due_id || null,
          transfer_account_id:
            transactionForm.transaction_type === 'transfer'
              ? transactionForm.transfer_account_id || null
              : null
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || 'İşlem kaydedilemedi.');
      }

      setTransactionModalOpen(false);
      setTransactionForm(initialTransactionForm());
      await Promise.all([loadSummary(), loadAccounts()]);
    } catch (err) {
      console.error('Finans işlemi kaydedilirken hata:', err);
      setFormError(err instanceof Error ? err.message : 'İşlem kaydedilemedi.');
    } finally {
      setTransactionSubmitting(false);
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageFinance) return;

    if (!categoryForm.name.trim()) {
      setCategoryFormError('Kategori adı zorunludur.');
      return;
    }

    setCategorySubmitting(true);
    try {
      const response = await authorizedFetch('/api/finance/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          category_type: categoryForm.category_type,
          parent_id: categoryForm.parent_id || null,
          description: categoryForm.description.trim()
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || 'Kategori oluşturulamadı.');
      }

      setCategoryForm(initialCategoryForm);
      await loadCategories();
    } catch (err) {
      console.error('Finans kategorisi oluşturulurken hata:', err);
      setCategoryFormError(err instanceof Error ? err.message : 'Kategori oluşturulamadı.');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageFinance) return;

    if (!accountForm.name.trim()) {
      setAccountFormError('Hesap adı zorunludur.');
      return;
    }

    const numericOpening = accountForm.opening_balance
      ? Number(accountForm.opening_balance)
      : 0;

    if (Number.isNaN(numericOpening)) {
      setAccountFormError('Geçerli bir açılış bakiyesi giriniz.');
      return;
    }

    setAccountSubmitting(true);
    try {
      const response = await authorizedFetch('/api/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: accountForm.name.trim(),
          account_type: accountForm.account_type,
          currency: accountForm.currency.trim().toUpperCase() || 'TRY',
          opening_balance: numericOpening,
          description: accountForm.description.trim()
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || 'Hesap oluşturulamadı.');
      }

      setAccountModalOpen(false);
      setAccountForm(initialAccountForm);
      await loadAccounts();
      await loadSummary();
    } catch (err) {
      console.error('Finans hesabı oluşturulurken hata:', err);
      setAccountFormError(err instanceof Error ? err.message : 'Hesap oluşturulamadı.');
    } finally {
      setAccountSubmitting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesAccount =
        selectedAccountFilter === 'all' ||
        transaction.account_id === selectedAccountFilter ||
        transaction.transfer_account_id === selectedAccountFilter;

      const matchesType =
        selectedTypeFilter === 'all' || transaction.transaction_type === selectedTypeFilter;

      return matchesAccount && matchesType;
    });
  }, [transactions, selectedAccountFilter, selectedTypeFilter]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const renderCurrency = (value: number) =>
    isClient ? currencyFormatter.format(value) : fallbackCurrencyFormat(value);

  const incomeCategories = categories.filter(category => category.category_type === 'income');
  const expenseCategories = categories.filter(category => category.category_type === 'expense');
  const transferCategories = categories.filter(category => category.category_type === 'transfer');
  const parentCategoryOptions = categories.filter(category => category.category_type === categoryForm.category_type);

  const activeAccountsForSelect = accounts.filter(account => account.is_active);

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 text-slate-500">
        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
        Finans modülü yükleniyor...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <PiggyBank className="w-4 h-4" />
            <span>Finans Yönetimi</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            Finans ve Muhasebe Özeti
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Kasa ve banka hesaplarınızın durumunu takip edin, gelir/gider hareketlerini kaydedin ve
            analiz edin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shadow hover:bg-slate-50 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Yenile
          </button>
          {canManageFinance && (
            <>
              <button
                onClick={() => {
                  setAccountModalOpen(true);
                  setAccountFormError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg shadow-sm hover:bg-blue-100"
              >
                <Wallet className="w-4 h-4" />
                Yeni Hesap
              </button>
              <button
                onClick={() => {
                  setTransactionModalOpen(true);
                  setTransactionForm(initialTransactionForm());
                  setFormError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Yeni İşlem
              </button>
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Toplam Bakiye</p>
              <p className="text-2xl font-semibold text-slate-900">
                {renderCurrency(summary?.overview.total_balance ?? 0)}
              </p>
            </div>
            <PiggyBank className="w-9 h-9 text-blue-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Tüm aktif finans hesaplarındaki toplam bakiye.
          </p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-600">Toplam Gelir</p>
              <p className="text-2xl font-semibold text-emerald-600">
                {renderCurrency(summary?.overview.total_income ?? 0)}
              </p>
            </div>
            <TrendingUp className="w-9 h-9 text-emerald-500" />
          </div>
          <p className="text-xs text-emerald-700 mt-2">
            Belirlenen dönem içindeki gelir hareketlerinin toplamı.
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Toplam Gider</p>
              <p className="text-2xl font-semibold text-red-600">
                {renderCurrency(summary?.overview.total_expense ?? 0)}
              </p>
            </div>
            <TrendingDown className="w-9 h-9 text-red-500" />
          </div>
          <p className="text-xs text-red-700 mt-2">
            Belirlenen dönem içindeki gider hareketlerinin toplamı.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Transferler</p>
              <p className="text-2xl font-semibold text-slate-900">
                {renderCurrency(
                  (summary?.overview.total_incoming_transfer ?? 0) -
                    (summary?.overview.total_outgoing_transfer ?? 0)
                )}
              </p>
            </div>
            <ListChecks className="w-9 h-9 text-slate-500" />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Belirlenen dönem içindeki kasa/banka transferlerinin net etkisi.
          </p>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Hesaplar</h2>
            <p className="text-sm text-slate-500">
              Kasa ve banka hesaplarınızın güncel bakiyelerini görüntüleyin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Dönem: {formatDate(summary?.period.start)} - {formatDate(summary?.period.end)}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Hesap
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tür
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Current Balance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Gelir
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Gider
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  İşlem Sayısı
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {accounts.map(account => (
                <tr key={account.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">{account.name}</div>
                    <div className="text-xs text-slate-500">
                      Açılış: {renderCurrency(account.opening_balance)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                    {account.account_type === 'cash'
                      ? 'Kasa'
                      : account.account_type === 'bank'
                        ? 'Banka'
                        : 'Diğer'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                    {renderCurrency(
                      account.summary?.current_balance ?? account.current_balance ?? 0
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 text-right">
                    {renderCurrency(account.summary?.total_income ?? 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                    {renderCurrency(account.summary?.total_expense ?? 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right">
                    {account.summary?.transaction_count ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Kategoriler</h2>
            <p className="text-sm text-slate-500">
              Gelir, gider ve transfer kategorilerinizi yönetin.
            </p>
          </div>
          {canManageFinance && (
            <div className="text-xs text-slate-400">
              Yeni kategori ekleyin ve işlemleri daha kolay raporlayın.
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Mevcut Kategoriler</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="text-xs font-semibold text-emerald-700 uppercase">Gelir</h4>
                <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                  {incomeCategories.length === 0 && <li className="text-emerald-600/70">Kategori yok</li>}
                  {incomeCategories.map(category => (
                    <li key={category.id}>{category.name}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <h4 className="text-xs font-semibold text-red-700 uppercase">Gider</h4>
                <ul className="mt-2 space-y-1 text-sm text-red-900">
                  {expenseCategories.length === 0 && <li className="text-red-600/70">Kategori yok</li>}
                  {expenseCategories.map(category => (
                    <li key={category.id}>{category.name}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-semibold text-slate-700 uppercase">Transfer</h4>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {transferCategories.length === 0 && <li className="text-slate-500">Kategori yok</li>}
                  {transferCategories.map(category => (
                    <li key={category.id}>{category.name}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          {canManageFinance && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Yeni Kategori</h3>
              <form className="space-y-4" onSubmit={handleCategorySubmit}>
                {categoryFormError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {categoryFormError}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 uppercase">
                      Kategori Adı
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={categoryForm.name}
                      onChange={handleCategoryInputChange}
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Örn. Aidat Geliri"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 uppercase">
                      Tür
                    </label>
                    <select
                      name="category_type"
                      value={categoryForm.category_type}
                      onChange={handleCategoryInputChange}
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="income">Gelir</option>
                      <option value="expense">Gider</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase">
                    Üst Kategori
                  </label>
                  <select
                    name="parent_id"
                    value={categoryForm.parent_id}
                    onChange={handleCategoryInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    {parentCategoryOptions.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 uppercase">
                    Açıklama
                  </label>
                  <textarea
                    name="description"
                    value={categoryForm.description}
                    onChange={handleCategoryInputChange}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Kategori için kısa açıklama ekleyin"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={categorySubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-60"
                  >
                    {categorySubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Kategoriyi Ekle
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Son İşlemler</h2>
            <p className="text-sm text-slate-500">
              Son finansal hareketlerinizi kontrol edin. Filtreleri kullanarak detaylı inceleme yapın.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedAccountFilter}
              onChange={event => setSelectedAccountFilter(event.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Hesaplar</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <select
              value={selectedTypeFilter}
              onChange={event => setSelectedTypeFilter(event.target.value as typeof selectedTypeFilter)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Türler</option>
              <option value="income">Gelir</option>
              <option value="expense">Gider</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Açıklama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Hesap
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tutar
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredTransactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {transaction.description || transaction.reference_code || '-'}
                    </div>
                    {transaction.notes && (
                      <div className="text-xs text-slate-500">{transaction.notes}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {transaction.finance_categories?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {transaction.finance_accounts?.name || '-'}
                    {transaction.transaction_type === 'transfer' && transaction.transfer_account_id && (
                      <span className="text-xs text-slate-400 block">
                        ➜{' '}
                        {
                          accounts.find(account => account.id === transaction.transfer_account_id)
                            ?.name
                        }
                      </span>
                    )}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                      transaction.transaction_type === 'income'
                        ? 'text-emerald-600'
                        : transaction.transaction_type === 'expense'
                          ? 'text-red-600'
                          : 'text-slate-700'
                    }`}
                  >
                    {transaction.transaction_type === 'expense' ? '-' : transaction.transaction_type === 'transfer' ? '±' : '+'}
                    {renderCurrency(transaction.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
          <span>
            Toplam {filteredTransactions.length} işlem listeleniyor
          </span>
          <Link
            href="/admin/dues"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            Aidat işlemleriyle çapraz kontrol
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Yeni İşlem Modalı */}
      {transactionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Yeni Finans İşlemi</h3>
                <p className="text-sm text-slate-500">
                  Gelir, gider ya da transfer hareketi kaydedin.
                </p>
              </div>
              <button
                onClick={() => {
                  setTransactionModalOpen(false);
                  setFormError(null);
                }}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleTransactionSubmit} className="px-6 py-5 space-y-5">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    İşlem Türü *
                  </label>
                  <select
                    name="transaction_type"
                    value={transactionForm.transaction_type}
                    onChange={handleTransactionInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="income">Gelir</option>
                    <option value="expense">Gider</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    İşlem Tarihi *
                  </label>
                  <input
                    type="date"
                    name="transaction_date"
                    value={transactionForm.transaction_date}
                    onChange={handleTransactionInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hesap *
                  </label>
                  <select
                    name="account_id"
                    value={transactionForm.account_id}
                    onChange={handleTransactionInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Bir hesap seçiniz</option>
                    {activeAccountsForSelect.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Kategori *
                  </label>
                  <select
                    name="category_id"
                    value={transactionForm.category_id}
                    onChange={handleTransactionInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Kategori seçiniz</option>
                    {(transactionForm.transaction_type === 'income'
                      ? incomeCategories
                      : transactionForm.transaction_type === 'expense'
                        ? expenseCategories
                        : transferCategories
                    ).map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tutar (TL) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="amount"
                    value={transactionForm.amount}
                    onChange={handleTransactionInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {transactionForm.transaction_type === 'transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Hedef Hesap *
                    </label>
                    <select
                      name="transfer_account_id"
                      value={transactionForm.transfer_account_id}
                      onChange={handleTransactionInputChange}
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Hedef hesap seçiniz</option>
                      {activeAccountsForSelect
                        .filter(account => account.id !== transactionForm.account_id)
                        .map(account => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Açıklama
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={transactionForm.description}
                    onChange={handleTransactionInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="İşlem açıklaması"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Referans Kodu
                  </label>
                  <input
                    type="text"
                    name="reference_code"
                    value={transactionForm.reference_code}
                    onChange={handleTransactionInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Dekont/Belge numarası"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Notlar
                </label>
                <textarea
                  name="notes"
                  value={transactionForm.notes}
                  onChange={handleTransactionInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ek notlar veya açıklamalar"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setTransactionModalOpen(false);
                    setFormError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={transactionSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-60"
                >
                  {transactionSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  İşlemi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yeni Hesap Modalı */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Yeni Finans Hesabı</h3>
                <p className="text-sm text-slate-500">Kasa veya banka hesabı ekleyin.</p>
              </div>
              <button
                onClick={() => {
                  setAccountModalOpen(false);
                  setAccountFormError(null);
                }}
                className="text-slate-500 hover:text-slate-700"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAccountSubmit} className="px-6 py-5 space-y-5">
              {accountFormError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {accountFormError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hesap Adı *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={accountForm.name}
                    onChange={handleAccountInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Örn. Merkez Kasa"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Hesap Türü *
                  </label>
                  <select
                    name="account_type"
                    value={accountForm.account_type}
                    onChange={handleAccountInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">Kasa</option>
                    <option value="bank">Banka</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Para Birimi
                  </label>
                  <input
                    type="text"
                    name="currency"
                    value={accountForm.currency}
                    onChange={handleAccountInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="TRY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Açılış Bakiyesi
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="opening_balance"
                    value={accountForm.opening_balance}
                    onChange={handleAccountInputChange}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Açıklama
                </label>
                <textarea
                  name="description"
                  value={accountForm.description}
                  onChange={handleAccountInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Hesap açıklaması veya notlar"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setAccountModalOpen(false);
                    setAccountFormError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={accountSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-60"
                >
                  {accountSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Hesabı Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
