'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LegalRequest, AdminUser } from '@/lib/types';
import { formatDateSafe, formatDateTimeSafe } from '@/lib/dateUtils';
import { Loader2, ArrowLeft, Save, User, Calendar, Tag, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminAuth } from '@/lib/auth'; // Assuming this exists for current user check

export default function LegalRequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [request, setRequest] = useState<LegalRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Edit states
    const [status, setStatus] = useState<string>('');
    const [assignedTo, setAssignedTo] = useState<string>('');

    const [admins, setAdmins] = useState<AdminUser[]>([]);

    useEffect(() => {
        fetchRequest();
        fetchAdmins();
    }, []);

    const fetchRequest = async () => {
        try {
            const { data, error } = await supabase
                .from('legal_requests')
                .select(`
                    *,
                    member:members(*),
                    assigned_admin:admin_users(*)
                `)
                .eq('id', params.id)
                .single();

            if (error) throw error;
            setRequest(data);
            setStatus(data.status);
            setAssignedTo(data.assigned_to || '');
        } catch (error) {
            console.error('Error fetching request:', error);
            alert('Talep bulunamadı.');
            router.push('/admin/legal');
        } finally {
            setLoading(false);
        }
    };

    const fetchAdmins = async () => {
        const { data } = await supabase.from('admin_users').select('*').eq('is_active', true).order('full_name');
        setAdmins(data || []);
    }

    const handleSave = async () => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('legal_requests')
                .update({
                    status,
                    assigned_to: assignedTo || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', params.id);

            if (error) throw error;
            alert('Güncellendi.');
            fetchRequest(); // Refresh
        } catch (error: any) {
            alert('Hata: ' + error.message);
        } finally {
            setUpdating(false);
        }
    };

    const getStatusIcon = (s: string) => {
        switch (s) {
            case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'cancelled': return <XCircle className="w-5 h-5 text-red-500" />;
            case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
            default: return <Loader2 className="w-5 h-5 text-blue-500" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!request) return null;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="mb-6">
                <Link href="/admin/legal" className="text-slate-500 hover:text-slate-700 flex items-center mb-4 text-sm">
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Listeye Dön
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            {request.subject}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Talep No: #{request.id.slice(0, 8)} • Oluşturulma: {formatDateTimeSafe(request.created_at)}
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={updating}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Değişiklikleri Kaydet
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Description Card */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-slate-400" />
                            Talep Detayı
                        </h3>
                        <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                            {request.description}
                        </div>
                    </div>

                    {/* Member Info Card */}
                    {request.member && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-slate-400" />
                                Üye Bilgileri
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 block">Ad Soyad</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{request.member.first_name} {request.member.last_name}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">TC Kimlik</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{request.member.tc_identity}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Şehir / İlçe</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{request.member.city} / {request.member.district}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Telefon</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{request.member.phone || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Kurum / İşyeri</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{request.member.workplace}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
                            Yönetim
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Durum
                                </label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="pending">Bekliyor</option>
                                    <option value="in_review">İncelemede</option>
                                    <option value="lawyer_assigned">Avukat Atandı</option>
                                    <option value="completed">Tamamlandı</option>
                                    <option value="cancelled">İptal Edildi</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Atanan Kişi (Avukat/Yönetici)
                                </label>
                                <select
                                    value={assignedTo}
                                    onChange={(e) => setAssignedTo(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Atanmamış</option>
                                    {admins.map(admin => (
                                        <option key={admin.id} value={admin.id}>
                                            {admin.full_name} ({admin.role_type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex justify-between text-sm py-1">
                                    <span className="text-slate-500">Kategori</span>
                                    <span className="font-medium text-slate-900 dark:text-white capitalize">{request.category}</span>
                                </div>
                                <div className="flex justify-between text-sm py-1">
                                    <span className="text-slate-500">Son Güncelleme</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{formatDateTimeSafe(request.updated_at)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
