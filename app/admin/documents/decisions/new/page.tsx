'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { DocumentService } from '@/lib/services/documentService';
import { BoardType, DecisionStatus } from '@/lib/types/document-management';
import { toast } from 'react-hot-toast';
import { AdminAuth } from '@/lib/auth';

interface DecisionFormData {
    board_type: BoardType;
    meeting_number: string;
    decision_date: string;
    title: string;
    content: string;
    status: DecisionStatus;
    tags: string;
}

export default function NewDecisionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { register, handleSubmit, watch, formState: { errors } } = useForm<DecisionFormData>({
        defaultValues: {
            board_type: 'management',
            decision_date: new Date().toISOString().split('T')[0],
            status: 'draft',
            meeting_number: '',
            title: '',
            content: '',
            tags: ''
        }
    });

    const onSubmit = async (data: DecisionFormData) => {
        setLoading(true);
        setError('');

        const user = AdminAuth.getCurrentUser();
        if (!user) {
            router.push('/admin/login');
            return;
        }

        try {
            // If finalizing immediately, generate number
            let decision_number = 'DRAFT-' + Date.now().toString().slice(-6); // Temporary

            if (data.status === 'final') {
                const year = new Date(data.decision_date).getFullYear();
                decision_number = await DocumentService.generateNextSequence('decision', year);
            }

            const { data: result, error: insertError } = await DocumentService.createDecision({
                ...data,
                tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
                decision_number: decision_number,
                created_by: user.id
            });

            if (insertError) throw insertError;

            toast.success(data.status === 'final' ? 'Karar kesinleştirildi ve kaydedildi.' : 'Karar taslağı oluşturuldu.');
            router.push('/admin/documents/decisions');
        } catch (err: any) {
            console.error('Error creating decision:', err);
            setError(err.message || 'Karar oluşturulurken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Link href="/admin/documents/decisions" className="p-2 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800">
                    <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Yeni Karar Al</h2>
                    <p className="text-slate-500 dark:text-slate-400">Yeni bir kurul kararı oluşturun</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kurul Tipi</label>
                            <select
                                {...register('board_type')}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                            >
                                <option value="management">Yönetim Kurulu</option>
                                <option value="audit">Denetim Kurulu</option>
                                <option value="discipline">Disiplin Kurulu</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Karar Tarihi</label>
                            <input
                                type="date"
                                {...register('decision_date', { required: 'Tarih zorunludur' })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                            />
                            {errors.decision_date && <span className="text-red-500 text-xs">{errors.decision_date.message}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Toplantı No</label>
                            <input
                                type="text"
                                placeholder="Örn: 15"
                                {...register('meeting_number')}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Durum</label>
                            <select
                                {...register('status')}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                            >
                                <option value="draft">Taslak</option>
                                <option value="final">Kesinleşti (Numara Ver)</option>
                            </select>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                "Kesinleşti" seçilirse otomatik Karar No (Yıl/Sıra) atanır.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Karar Başlığı</label>
                        <input
                            type="text"
                            placeholder="Örn: Personel Alımı Hakkında"
                            {...register('title', { required: 'Başlık zorunludur' })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                        />
                        {errors.title && <span className="text-red-500 text-xs">{errors.title.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Karar Metni</label>
                        <textarea
                            rows={6}
                            placeholder="Karar detayları..."
                            {...register('content')}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Etiketler</label>
                        <input
                            type="text"
                            placeholder="Virgülle ayırarak girin: atama, bütçe, genel kurul"
                            {...register('tags')}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="mr-3 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                            <Save className="w-4 h-4 mr-2" />
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
