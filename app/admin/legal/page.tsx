'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LegalRequest } from '@/lib/types';
import { formatDateSafe } from '@/lib/dateUtils';
import { Loader2, Search, Filter, Eye, Gavel, FileText } from 'lucide-react';
import Link from 'next/link';

export default function LegalRequestsPage() {
    const [requests, setRequests] = useState<LegalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchRequests();
    }, [statusFilter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('legal_requests')
                .select(`
                    *,
                    member:members(first_name, last_name, tc_identity),
                    assigned_admin:admin_users(full_name)
                `)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error('Error fetching legal requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full dark:bg-yellow-900/30 dark:text-yellow-400">Bekliyor</span>;
            case 'in_review': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full dark:bg-blue-900/30 dark:text-blue-400">İncelemede</span>;
            case 'lawyer_assigned': return <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full dark:bg-purple-900/30 dark:text-purple-400">Avukat Atandı</span>;
            case 'completed': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full dark:bg-green-900/30 dark:text-green-400">Tamamlandı</span>;
            case 'cancelled': return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full dark:bg-gray-800 dark:text-gray-400">İptal</span>;
            default: return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Bilinmiyor</span>;
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'disciplinary': return 'Disiplin Soruşturması';
            case 'compensation': return 'Tazminat Talebi';
            case 'consultation': return 'Hukuki Danışma';
            case 'other': return 'Diğer';
            default: return category;
        }
    };

    const filteredRequests = requests.filter(req =>
        req.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.member ? `${req.member.first_name} ${req.member.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) : false)
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Hukuk Destek Talepleri</h1>
                    <p className="text-slate-500 dark:text-slate-400">Üyelerden gelen hukuki destek taleplerini yönetin.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Konu veya üye adı ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="pending">Bekliyor</option>
                        <option value="in_review">İncelemede</option>
                        <option value="lawyer_assigned">Avukat Atandı</option>
                        <option value="completed">Tamamlandı</option>
                        <option value="cancelled">İptal Edildi</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Kayıtlı talep bulunamadı.</p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">Tarih</th>
                                <th className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">Talep Eden</th>
                                <th className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">Kategori / Konu</th>
                                <th className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">Durum</th>
                                <th className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">Atanan</th>
                                <th className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {filteredRequests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {formatDateSafe(req.created_at)}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                                        {req.member ? (
                                            <div>
                                                <div>{req.member.first_name} {req.member.last_name}</div>
                                                <div className="text-xs text-slate-500">{req.member.tc_identity}</div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">Misafir / Bilinmiyor</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-slate-900 dark:text-slate-100 font-medium">{req.subject}</div>
                                        <div className="text-xs text-slate-500">{getCategoryLabel(req.category)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(req.status)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                        {req.assigned_admin ? req.assigned_admin.full_name : <span className="text-slate-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/legal/${req.id}`}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
