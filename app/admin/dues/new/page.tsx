'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewDuePeriodPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        period_start: '',
        period_end: '',
        due_date: '',
        due_amount: '',
        penalty_rate: '0',
        description: '',
        autoGenerate: true
    });

    const getAccessToken = async () => {
        const { data } = await supabase.auth.getSession();
        return data?.session?.access_token || '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.name || !form.period_start || !form.period_end || !form.due_date || !form.due_amount) {
            setError('Lütfen tüm zorunlu alanları doldurun');
            return;
        }

        setLoading(true);
        try {
            const token = await getAccessToken();
            if (!token) throw new Error('Oturum bulunamadı');

            const res = await fetch('/api/dues/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name: form.name,
                    period_start: form.period_start,
                    period_end: form.period_end,
                    due_date: form.due_date,
                    due_amount: Number(form.due_amount),
                    penalty_rate: Number(form.penalty_rate) || 0,
                    description: form.description,
                    autoGenerate: form.autoGenerate,
                    includeInactiveMembers: false
                })
            });

            if (!res.ok) throw new Error('Dönem oluşturulamadı');

            router.push('/admin/dues');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            {/* Başlık */}
            <div className="mb-6">
                <Link href="/admin/dues" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Geri
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yeni Aidat Dönemi</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Yeni bir aidat dönemi oluşturun</p>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Dönem Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Örn: 2026 Ocak"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Başlangıç Tarihi <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.period_start}
                            onChange={(e) => setForm(prev => ({ ...prev, period_start: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Bitiş Tarihi <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.period_end}
                            onChange={(e) => setForm(prev => ({ ...prev, period_end: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Son Ödeme Tarihi <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Aidat Tutarı (₺) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={form.due_amount}
                            onChange={(e) => setForm(prev => ({ ...prev, due_amount: e.target.value }))}
                            placeholder="0,00"
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Gecikme Faizi (%)
                        </label>
                        <input
                            type="number"
                            value={form.penalty_rate}
                            onChange={(e) => setForm(prev => ({ ...prev, penalty_rate: e.target.value }))}
                            placeholder="0"
                            min="0"
                            step="0.1"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Açıklama
                    </label>
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Opsiyonel not"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="autoGenerate"
                        checked={form.autoGenerate}
                        onChange={(e) => setForm(prev => ({ ...prev, autoGenerate: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="autoGenerate" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Tüm aktif üyeler için aidat kayıtlarını otomatik oluştur
                    </label>
                </div>

                {/* Butonlar */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <Link
                        href="/admin/dues"
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md"
                    >
                        İptal
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Oluştur
                    </button>
                </div>
            </form>
        </div>
    );
}
