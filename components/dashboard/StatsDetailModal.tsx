'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, ExternalLink, FileText, Megaphone, Users, Building2, MapPin, Tags, Image, UserPlus, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDateSafe, formatDateTimeSafe } from '@/lib/dateUtils';

export type StatsType = 'news' | 'announcements' | 'members' | 'admin_users' | 'sliders' | 'branches' | 'categories' | 'management' | 'pending_members';

interface StatsDetailModalProps {
    type: StatsType | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function StatsDetailModal({ type, isOpen, onClose }: StatsDetailModalProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (isOpen && type) {
            loadData();
        }
    }, [isOpen, type]);

    const loadData = async () => {
        try {
            setLoading(true);
            let query: any;

            switch (type) {
                case 'news':
                    query = supabase.from('news').select('*').order('created_at', { ascending: false });
                    break;
                case 'announcements':
                    query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
                    break;
                case 'members':
                    query = supabase.from('members').select('*').order('created_at', { ascending: false }).limit(100);
                    break;
                case 'pending_members':
                    query = supabase.from('members').select('*').eq('membership_status', 'pending').order('created_at', { ascending: false });
                    break;
                case 'admin_users':
                    query = supabase.from('admin_users').select('*').order('full_name', { ascending: true });
                    break;
                case 'sliders':
                    query = supabase.from('sliders').select('*').order('sort_order', { ascending: true });
                    break;
                case 'branches':
                    query = supabase.from('branches').select('*').order('branch_name', { ascending: true });
                    break;
                case 'categories':
                    query = supabase.from('categories').select('*').order('sort_order', { ascending: true });
                    break;
                case 'management':
                    query = supabase.from('management').select('*').order('position_order', { ascending: true });
                    break;
                default:
                    return;
            }

            const { data: result, error } = await query;
            if (error) throw error;
            setData(result || []);
        } catch (error) {
            console.error('Veri yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'news': return 'Haber Listesi';
            case 'announcements': return 'Duyuru Listesi';
            case 'members': return 'Üye Listesi (Son 100)';
            case 'pending_members': return 'Bekleyen Başvurular';
            case 'admin_users': return 'Yönetici Listesi';
            case 'sliders': return 'Slider Görselleri';
            case 'branches': return 'Şube Listesi';
            case 'categories': return 'Kategori Listesi';
            case 'management': return 'Yönetim Kadrosu';
            default: return 'Detay Listesi';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'news': return <FileText className="w-5 h-5 text-blue-600" />;
            case 'announcements': return <Megaphone className="w-5 h-5 text-green-600" />;
            case 'members':
            case 'pending_members': return <Users className="w-5 h-5 text-purple-600" />;
            case 'admin_users': return <UserPlus className="w-5 h-5 text-red-600" />;
            case 'sliders': return <Image className="w-5 h-5 text-indigo-600" />;
            case 'branches': return <MapPin className="w-5 h-5 text-pink-600" />;
            case 'categories': return <Tags className="w-5 h-5 text-cyan-600" />;
            case 'management': return <Building2 className="w-5 h-5 text-teal-600" />;
            default: return <FileText className="w-5 h-5 text-slate-600" />;
        }
    };

    const renderTable = () => {
        if (data.length === 0) {
            return (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <p>Herhangi bir kayıt bulunamadı.</p>
                </div>
            );
        }

        switch (type) {
            case 'news':
            case 'announcements':
                return (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3">Başlık</th>
                                <th className="px-4 py-3">Tarih</th>
                                <th className="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.title}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateTimeSafe(item.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => router.push(`/admin/${type === 'news' ? 'news' : 'announcements'}`)} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                            Yönet <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'members':
            case 'pending_members':
                return (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3">Ad Soyad</th>
                                <th className="px-4 py-3">Durum</th>
                                <th className="px-4 py-3">Kayıt Tarihi</th>
                                <th className="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{member.first_name} {member.last_name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${member.membership_status === 'active' ? 'bg-green-100 text-green-700' :
                                            member.membership_status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                            {member.membership_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateSafe(member.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => router.push(`/admin/members?search=${member.tc_identity}`)} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                            Git <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'admin_users':
                return (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3">Ad Soyad</th>
                                <th className="px-4 py-3">E-Posta</th>
                                <th className="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{user.full_name}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{user.email}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => router.push('/admin/users')} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                            Yönet <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'sliders':
                return (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3">Görsel</th>
                                <th className="px-4 py-3">Başlık</th>
                                <th className="px-4 py-3">Sıra</th>
                                <th className="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="w-12 h-8 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Image className="w-full h-full p-1 text-slate-400" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.title || '-'}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.sort_order}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => router.push('/admin/sliders')} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                            Yönet <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'branches':
                return (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3">Şube Adı</th>
                                <th className="px-4 py-3">Başkan</th>
                                <th className="px-4 py-3">Şehir</th>
                                <th className="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.map((branch) => (
                                <tr key={branch.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{branch.branch_name}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{branch.president_name || '-'}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{branch.city}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => router.push('/admin/branches')} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                            Yönet <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'management':
                return (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3">Görsel</th>
                                <th className="px-4 py-3">Ad Soyad</th>
                                <th className="px-4 py-3">Görev</th>
                                <th className="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Users className="w-4 h-4 text-slate-400" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.full_name}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.title}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => router.push('/admin/management')} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                            Yönet <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'categories':
                return (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-4 py-3">Kategori Adı</th>
                                <th className="px-4 py-3">Açıklama</th>
                                <th className="px-4 py-3">Sıra</th>
                                <th className="px-4 py-3 text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.map((cat) => (
                                <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                                        {cat.name}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{cat.description || '-'}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{cat.sort_order}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => router.push('/admin/categories')} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                            Yönet <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            default:
                return (
                    <div className="space-y-2">
                        {data.map((item) => (
                            <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between items-center">
                                <span className="text-slate-900 dark:text-slate-100 font-medium">
                                    {item.name || item.title || item.branch_name || item.role_name || 'Kayıt'}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {item.created_at ? formatDateSafe(item.created_at) : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                            {getIcon()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{getTitle()}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {loading ? 'Veriler hazıllanıyor...' : `${data.length} kayıt listeleniyor`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-64 space-y-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Veriler yükleniyor...</p>
                        </div>
                    ) : renderTable()}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 text-sm font-semibold transition-all"
                    >
                        Kapat
                    </button>
                </div>
            </div>
        </div>
    );
}
