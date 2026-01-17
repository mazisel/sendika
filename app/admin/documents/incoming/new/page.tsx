'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, AlertCircle, Upload } from 'lucide-react';
import Link from 'next/link';
import { DocumentService } from '@/lib/services/documentService';
import { DMDocument } from '@/lib/types/document-management';
import { toast } from 'react-hot-toast';
import { AdminAuth } from '@/lib/auth';

interface IncomingDocFormData {
    reference_date: string;
    sender: string;
    subject: string;
    description: string;
    category_code: string;
}

export default function NewIncomingDocumentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const { register, handleSubmit, formState: { errors } } = useForm<IncomingDocFormData>({
        defaultValues: {
            reference_date: new Date().toISOString().split('T')[0],
            sender: '',
            subject: '',
            description: '',
            category_code: ''
        }
    });

    const onSubmit = async (data: IncomingDocFormData) => {
        setLoading(true);
        setError('');

        const user = AdminAuth.getCurrentUser();
        if (!user) {
            router.push('/admin/login');
            return;
        }

        try {
            const year = new Date(data.reference_date).getFullYear();

            // 1. Generate Document Number
            const document_number = await DocumentService.generateNextSequence('incoming', year);

            // 2. Create Document Record
            const { data: doc, error: docError } = await DocumentService.createDocument({
                type: 'incoming',
                status: 'registered',
                document_number: document_number,
                reference_date: data.reference_date,
                sender: data.sender,
                subject: data.subject,
                description: data.description,
                category_code: data.category_code,
                created_by: user.id
            });

            if (docError) throw docError;

            // 3. Upload Attachment if exists
            if (file && doc) {
                try {
                    await DocumentService.uploadAttachment(file, doc.id, 'document');
                } catch (uploadErr) {
                    console.error('Attachment upload failed but doc created:', uploadErr);
                    toast.error('Evrak kaydedildi ancak dosya yüklenemedi.');
                    // We don't block success here, but warn.
                }
            }

            toast.success(`Evrak başarıyla kaydedildi. No: ${document_number}`);
            router.push('/admin/documents/incoming');
        } catch (err: any) {
            console.error('Error creating incoming document:', err);
            setError(err.message || 'Evrak kaydedilirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Link href="/admin/documents/incoming" className="p-2 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800">
                    <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </Link>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Gelen Evrak Kaydı</h2>
                    <p className="text-slate-500 dark:text-slate-400">Yeni bir gelen evrakı sisteme kaydedin</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            {/* Form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Gönderen (Kurum/Kişi)</label>
                            <input
                                type="text"
                                placeholder="Örn: Çalışma Bakanlığı"
                                {...register('sender', { required: 'Gönderen bilgisi zorunludur' })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                            />
                            {errors.sender && <span className="text-red-500 text-xs">{errors.sender.message}</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Evrak Tarihi (Geliş)</label>
                            <input
                                type="date"
                                {...register('reference_date', { required: 'Tarih zorunludur' })}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                            />
                            {errors.reference_date && <span className="text-red-500 text-xs">{errors.reference_date.message}</span>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Konu</label>
                        <input
                            type="text"
                            placeholder="Örn: Toplu İş Sözleşmesi Hk."
                            {...register('subject', { required: 'Konu zorunludur' })}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                        />
                        {errors.subject && <span className="text-red-500 text-xs">{errors.subject.message}</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama / Not</label>
                        <textarea
                            rows={3}
                            placeholder="Evrak hakkında kısa açıklama..."
                            {...register('description')}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Dosya Planı Kodu</label>
                            <input
                                type="text"
                                placeholder="Örn: 101.02"
                                {...register('category_code')}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Evrak Eki (PDF/Resim)</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="file"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm text-slate-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100
                       "
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Sadece dijital görüntü veya tarama.</p>
                        </div>
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
