'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Eye, Filter, Calendar, FileOutput } from 'lucide-react';
import { DocumentService } from '@/lib/services/documentService';
import { DMDocument } from '@/lib/types/document-management';
import { toast } from 'react-hot-toast';

export default function OutgoingDocumentsPage() {
    const [documents, setDocuments] = useState<DMDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            // Fetch both outgoing and internal? Or just outgoing based on task?
            // Let's fetch outgoing for now as per specific page title.
            // Internal docs could be here or separate. Let's include internal for visibility if user wants "Giden + İç".
            // But typically "Giden Evrak" means sent out. Internal is internal.
            // Filter logic: type=outgoing.
            const { data, error } = await DocumentService.getDocuments({
                type: 'outgoing'
            });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching outgoing documents:', error);
            toast.error('Giden evraklar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.receiver?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Giden Evrak Defteri</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gönderilen resmi yazıların ve evrakların kaydı</p>
                </div>
                <Link
                    href="/admin/documents/create"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Belge Oluştur
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Evrak no, konu veya alıcı ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-900 dark:text-white"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Evrak No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alıcı</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Konu</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Yükleniyor...</td>
                                </tr>
                            ) : filteredDocuments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Kayıtlı giden evrak bulunamadı.</td>
                                </tr>
                            ) : (
                                filteredDocuments.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white font-mono">
                                            {doc.document_number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                {new Date(doc.reference_date).toLocaleDateString('tr-TR')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-[150px] truncate">
                                            {doc.receiver}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs truncate">
                                            {doc.subject}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${doc.status === 'sent' ? 'bg-green-100 text-green-800' :
                                                    doc.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-800' :
                                                        doc.status === 'draft' ? 'bg-slate-100 text-slate-800' :
                                                            doc.status === 'registered' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-slate-100 text-slate-800'
                                                }`}>
                                                {doc.status === 'sent' ? 'Gönderildi' :
                                                    doc.status === 'pending_approval' ? 'İmza Bekliyor' :
                                                        doc.status === 'draft' ? 'Taslak' :
                                                            doc.status === 'registered' ? 'Kayıtlı' :
                                                                doc.status === 'archived' ? 'Arşivlendi' :
                                                                    doc.status === 'cancelled' ? 'İptal' :
                                                                        doc.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link href={`/admin/documents/outgoing/${doc.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                <Eye className="w-5 h-5 inline-block" />
                                            </Link>
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
