'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
// import { Database } from '@/lib/database.types';
import { Loader2, Search, Filter, Shield } from 'lucide-react';

interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;

    ip_address: string;
    user_agent: string;
    created_at: string;
    // We might have legacy details or new details with ip_details.
    // The query returns `details` as jsonb.
    details: any;
    admin_users?: {
        full_name: string;
        email: string;
    };
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState('');
    const [filterEntity, setFilterEntity] = useState('');

    // const supabase = createClientComponentClient();

    useEffect(() => {
        fetchLogs();
    }, [filterAction, filterEntity]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.error('No session found');
                setLoading(false);
                return;
            }

            const params = new URLSearchParams();
            if (filterAction) params.append('action', filterAction);
            if (filterEntity) params.append('entity', filterEntity);

            const res = await fetch(`/api/audit-log?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                throw new Error('Failed to fetch logs');
            }

            const data = await res.json();
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Denetim Kayıtları</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Sistem üzerindeki kritik işlemlerin kayıtları.
                    </p>
                </div>
                <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Güvenli Loglama Aktif</span>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Filtrele:</span>
                </div>

                <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">Tüm İşlemler</option>
                    <option value="LOGIN">Giriş</option>
                    <option value="LOGOUT">Çıkış</option>
                    <option value="CREATE">Ekleme</option>
                    <option value="UPDATE">Güncelleme</option>
                    <option value="DELETE">Silme</option>
                    <option value="VIEW">Görüntüleme</option>
                </select>

                <select
                    value={filterEntity}
                    onChange={(e) => setFilterEntity(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">Tüm Kaynaklar</option>
                    <option value="AUTH">Kimlik Doğrulama</option>
                    <option value="MEMBER">Üye İşlemleri</option>
                    <option value="SETTINGS">Ayarlar</option>
                    <option value="USER">Kullanıcılar</option>
                </select>

                <button
                    onClick={() => { setFilterAction(''); setFilterEntity(''); }}
                    className="ml-auto text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    Filtreleri Temizle
                </button>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-3">Tarih</th>
                                <th className="px-6 py-3">Kullanıcı</th>
                                <th className="px-6 py-3">İşlem</th>
                                <th className="px-6 py-3">Kaynak</th>
                                <th className="px-6 py-3">IP / Konum</th>
                                <th className="px-6 py-3">Detaylar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                                        <p className="mt-2 text-slate-500">Kayıtlar yükleniyor...</p>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Kayıt bulunamadı.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-xs">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 dark:text-slate-100">
                                                {log.admin_users?.full_name || 'Bilinmeyen'}
                                            </div>
                                            <div className="text-xs text-slate-500">{log.admin_users?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${log.action === 'LOGIN' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                                                    log.action === 'LOGOUT' ? 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' :
                                                        log.action === 'DELETE' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' :
                                                            log.action === 'UPDATE' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' :
                                                                'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'}
                      `}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-700 dark:text-slate-300 font-medium">{log.entity_type}</div>
                                            {log.entity_id && <div className="text-xs text-slate-500 font-mono mt-0.5">{log.entity_id}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                                {log.ip_address || ' - '}
                                            </div>
                                            {/* Extract city from details.ip_details if available */}
                                            {log.details?.ip_details?.city && (
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {log.details.ip_details.city}, {log.details.ip_details.country}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 max-w-xs overflow-x-auto">
                                                {JSON.stringify(typeof log.details === 'string' ? JSON.parse(log.details) : log.details, null, 2)}
                                            </pre>
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
