'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Eye, Edit, Trash2, FileText, Calendar } from 'lucide-react';
import { DocumentService } from '@/lib/services/documentService';
import { Decision, BoardType } from '@/lib/types/document-management';
import { toast } from 'react-hot-toast';

export default function DecisionsPage() {
    const [decisions, setDecisions] = useState<Decision[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        board_type: '' as BoardType | '',
        status: ''
    });

    useEffect(() => {
        fetchDecisions();
    }, [filters]);

    const fetchDecisions = async () => {
        try {
            setLoading(true);
            const { data, error } = await DocumentService.getDecisions({
                board_type: filters.board_type || undefined,
                status: filters.status || undefined
            });

            if (error) throw error;
            setDecisions(data || []);
        } catch (error) {
            console.error('Error fetching decisions:', error);
            toast.error('Kararlar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const filteredDecisions = decisions.filter(decision =>
        decision.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        decision.decision_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        const STATUS_MAP: Record<string, { label: string, color: string }> = {
            'draft': { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
            'final': { label: 'Kesinleşti', color: 'bg-green-100 text-green-800' },
            'cancelled': { label: 'İptal', color: 'bg-red-100 text-red-800' },
            'revised': { label: 'Revize', color: 'bg-yellow-100 text-yellow-800' }
        };
        const style = STATUS_MAP[status] || { label: status, color: 'bg-gray-100' };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${style.color}`}>
                {style.label}
            </span>
        );
    };

    const getBoardLabel = (type: string) => {
        const MAP: Record<string, string> = {
            'management': 'Yönetim Kurulu',
            'audit': 'Denetim Kurulu',
            'discipline': 'Disiplin Kurulu'
        };
        return MAP[type] || type;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Karar Defteri</h2>
                    <p className="text-slate-500 dark:text-slate-400">Alınan kararları görüntüleyin ve yönetin</p>
                </div>
                <Link
                    href="/admin/documents/decisions/new"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Karar Al
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Karar no veya başlık ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:text-white"
                    />
                </div>

                <div className="flex gap-4">
                    <select
                        value={filters.board_type}
                        onChange={(e) => setFilters(prev => ({ ...prev, board_type: e.target.value as any }))}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                    >
                        <option value="">Tüm Kurullar</option>
                        <option value="management">Yönetim Kurulu</option>
                        <option value="audit">Denetim Kurulu</option>
                        <option value="discipline">Disiplin Kurulu</option>
                    </select>

                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-slate-900 dark:text-white"
                    >
                        <option value="">Tüm Durumlar</option>
                        <option value="draft">Taslak</option>
                        <option value="final">Kesinleşti</option>
                        <option value="cancelled">İptal</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Karar No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kurul</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Başlık</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Yükleniyor...</td>
                                </tr>
                            ) : filteredDecisions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Kayıt bulunamadı.</td>
                                </tr>
                            ) : (
                                filteredDecisions.map((decision) => (
                                    <tr key={decision.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">
                                            {decision.decision_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                {new Date(decision.decision_date).toLocaleDateString('tr-TR')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                                            {getBoardLabel(decision.board_type)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">
                                            {decision.title}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(decision.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <Link href={`/admin/documents/decisions/${decision.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                    <Eye className="w-5 h-5" />
                                                </Link>
                                                {decision.status !== 'final' && (
                                                    <Link href={`/admin/documents/decisions/${decision.id}/edit`} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                                        <Edit className="w-5 h-5" />
                                                    </Link>
                                                )}

                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
