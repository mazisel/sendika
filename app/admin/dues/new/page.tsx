'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/lib/types';
import {
  ArrowLeft,
  CalendarRange,
  CircleDollarSign,
  Loader2,
  PenSquare,
  ShieldAlert
} from 'lucide-react';

interface CreatePeriodForm {
  name: string;
  period_start: string;
  period_end: string;
  due_date: string;
  due_amount: string;
  penalty_rate: string;
  description: string;
  autoGenerate: boolean;
  includeInactiveMembers: boolean;
}

const initialForm: CreatePeriodForm = {
  name: '',
  period_start: '',
  period_end: '',
  due_date: '',
  due_amount: '',
  penalty_rate: '',
  description: '',
  autoGenerate: true,
  includeInactiveMembers: false
};

export default function CreateDuePeriodPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<CreatePeriodForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CreatePeriodForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }

    if (!PermissionManager.canManageDues(user)) {
      router.push('/admin/dues');
      return;
    }

    setCurrentUser(user);
  }, [router]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = event.target;
    const fieldName = target.name;

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setForm(prev => ({
        ...prev,
        [fieldName]: target.checked
      }));
    } else {
      setForm(prev => ({
        ...prev,
        [fieldName]: target.value
      }));
    }

    if (errors[fieldName as keyof CreatePeriodForm]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors: Partial<Record<keyof CreatePeriodForm, string>> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Dönem adı zorunludur.';
    }
    if (!form.period_start) {
      newErrors.period_start = 'Başlangıç tarihi zorunludur.';
    }
    if (!form.period_end) {
      newErrors.period_end = 'Bitiş tarihi zorunludur.';
    }
    if (!form.due_date) {
      newErrors.due_date = 'Son ödeme tarihi zorunludur.';
    }
    if (!form.due_amount || Number.isNaN(Number(form.due_amount)) || Number(form.due_amount) <= 0) {
      newErrors.due_amount = 'Geçerli bir aidat tutarı giriniz.';
    }
    if (form.penalty_rate && Number(form.penalty_rate) < 0) {
      newErrors.penalty_rate = 'Gecikme oranı negatif olamaz.';
    }

    if (
      form.period_start &&
      form.period_end &&
      new Date(form.period_start) > new Date(form.period_end)
    ) {
      newErrors.period_end = 'Bitiş tarihi başlangıç tarihinden önce olamaz.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setGlobalError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Oturumunuz geçersiz veya süresi dolmuş. Lütfen tekrar giriş yapın.');
      }

      const response = await fetch('/api/dues/periods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          period_start: form.period_start,
          period_end: form.period_end,
          due_date: form.due_date,
          due_amount: Number(form.due_amount),
          penalty_rate: form.penalty_rate ? Number(form.penalty_rate) : 0,
          description: form.description.trim(),
          autoGenerate: form.autoGenerate,
          includeInactiveMembers: form.includeInactiveMembers
        })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || 'Aidat dönemi oluşturulamadı.');
      }

      const payload = await response.json();
      const createdPeriod = payload?.data;

      alert('Aidat dönemi başarıyla oluşturuldu.');

      if (createdPeriod?.id) {
        router.push(`/admin/dues/${createdPeriod.id}`);
      } else {
        router.push('/admin/dues');
      }
    } catch (error) {
      console.error('Aidat dönemi oluşturulurken hata:', error);
      setGlobalError(
        error instanceof Error ? error.message : 'Aidat dönemi oluşturulamadı.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <CalendarRange className="w-4 h-4" />
            <span>Aidat Yönetimi</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Yeni Aidat Dönemi Oluştur
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Dönem tarihlerini, tahsil edilecek tutarı ve gecikme politikasını belirleyin.
            İsterseniz oluşturulduktan sonra otomatik olarak aktif üyelere aidat kayıtları oluşturulur.
          </p>
        </div>
        <Link
          href="/admin/dues"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Aidat Dönemleri
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6 max-w-4xl"
      >
        {globalError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {globalError}
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Temel Bilgiler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Dönem Adı *
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Örn. 2024 Ocak Aidatı"
                  className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.name
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-200 focus:ring-blue-500'
                  }`}
                />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Aidat Tutarı (TL) *
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="due_amount"
                  value={form.due_amount}
                  onChange={handleChange}
                  placeholder="Örn. 500"
                  className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    errors.due_amount
                      ? 'border-red-300 focus:ring-red-400'
                      : 'border-slate-200 focus:ring-blue-500'
                  }`}
                />
              </div>
              {errors.due_amount && (
                <p className="mt-1 text-xs text-red-600">{errors.due_amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                name="period_start"
                value={form.period_start}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.period_start
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.period_start && (
                <p className="mt-1 text-xs text-red-600">{errors.period_start}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Bitiş Tarihi *
              </label>
              <input
                type="date"
                name="period_end"
                value={form.period_end}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.period_end
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.period_end && (
                <p className="mt-1 text-xs text-red-600">{errors.period_end}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Son Ödeme Tarihi *
              </label>
              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.due_date
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.due_date && (
                <p className="mt-1 text-xs text-red-600">{errors.due_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Gecikme Oranı (%) 
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="penalty_rate"
                value={form.penalty_rate}
                onChange={handleChange}
                placeholder="Örn. 5"
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                  errors.penalty_rate
                    ? 'border-red-300 focus:ring-red-400'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {errors.penalty_rate && (
                <p className="mt-1 text-xs text-red-600">{errors.penalty_rate}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Opsiyonel. Gecikmeli ödemelerde uygulanacak ek oran (ör: %5).
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Açıklama</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Dönem Açıklaması
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Üyelere gösterilecek kısa açıklama veya hatırlatma notu ekleyin."
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Otomasyon Ayarları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <input
                type="checkbox"
                name="autoGenerate"
                checked={form.autoGenerate}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-slate-900">Otomatik Aidat Oluştur</span>
                <p className="text-sm text-slate-600 mt-1">
                  Kaydedildiğinde aktif ve beklemede olan tüm üyeler için aidat kayıtları oluşturulur.
                  Gerekirse daha sonra tekrar oluşturabilirsiniz.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <input
                type="checkbox"
                name="includeInactiveMembers"
                checked={form.includeInactiveMembers}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-slate-900">Pasif Üyeleri Dahil Et</span>
                <p className="text-sm text-slate-600 mt-1">
                  Gerekli durumlarda pasif üyeler için de aidat kaydı oluşturulur. Varsayılan olarak
                  sadece aktif ve beklemede olan üyeler dahildir.
                </p>
              </div>
            </label>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ShieldAlert className="w-5 h-5 mt-0.5 text-amber-500" />
            <div>
              <p className="font-medium">
                Otomatik aidat oluşturma işlemi mevcut kayıtları tekrar etmez.
              </p>
              <p className="mt-1">
                Aynı dönem için daha önce aidat kaydı oluşturulmuş üyeler tekrar eklenmez. Gerektiğinde
                dönem detay sayfasından manuel olarak tekrar aidat oluşturabilirsiniz.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenSquare className="w-4 h-4" />}
            Dönemi Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
