'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import { X, Phone, User, MapPin, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CityMembersModalProps {
    city: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function CityMembersModal({ city, isOpen, onClose }: CityMembersModalProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (isOpen && city) {
            loadMembers();
        }
    }, [isOpen, city]);

    const loadMembers = async () => {
        try {
            setLoading(true);
            // Şehre göre üyeleri getir, sadece aktif olanlar veya hepsi? 
            // İstatistik haritasında hepsi görünüyor ama detayda genellikle aktifler merak edilir.
            // Ancak harita tüm sayıları gösteriyor. Hepsini çekelim, statüsü gösterelim.
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .eq('city', city)
                .order('membership_status', { ascending: true }) // active önce gelsin (alfabetik olarak değil ama custom sort zor, status ile gruplayabiliriz)
                .order('first_name', { ascending: true });

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Üyeler yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Beklemede' },
            active: { color: 'bg-green-100 text-green-800', text: 'Aktif' },
            inactive: { color: 'bg-gray-100 text-gray-800', text: 'Pasif' },
            suspended: { color: 'bg-red-100 text-red-800', text: 'Askıda' },
            resigned: { color: 'bg-orange-100 text-orange-800', text: 'İstifa' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                {config.text}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{city} İli Üye Listesi</h3>
                            <p className="text-sm text-slate-500">{loading ? 'Yükleniyor...' : `${members.length} kayıt bulundu`}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>Bu şehirde kayıtlı üye bulunmamaktadır.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Ad Soyad</th>
                                        <th className="px-4 py-3">Durum</th>
                                        <th className="px-4 py-3">İş Yeri / Kurum</th>
                                        <th className="px-4 py-3">İletişim</th>
                                        <th className="px-4 py-3 rounded-tr-lg text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-slate-900">
                                                {member.first_name} {member.last_name}
                                                <div className="text-xs text-slate-400 font-normal">{member.tc_identity}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {getStatusBadge(member.membership_status)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <div className="truncate max-w-[200px]" title={member.workplace}>{member.workplace}</div>
                                                <div className="text-xs text-slate-400 truncate max-w-[200px]">{member.institution}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <Phone className="w-3 h-3" />
                                                    {member.phone}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => window.open(`/admin/members?search=${member.tc_identity}`, '_blank')}
                                                    className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs font-medium"
                                                >
                                                    Detay <ExternalLink className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        onClick={() => router.push(`/admin/members?city=${city}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                        Tüm Listeyi Yönetim Sayfasında Gör
                    </button>
                </div>
            </div>
        </div>
    );
}
