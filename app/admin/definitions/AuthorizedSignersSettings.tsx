'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DocumentService } from '@/lib/services/documentService';
import { Loader2, Plus, Trash2, AlertTriangle, CheckCircle2, User, Search, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AdminUserCompact {
    id: string;
    full_name: string;
    email: string;
    role: string;
    signature_url?: string;
}

interface AuthorizedSigner {
    id: string;
    user_id: string;
    title?: string;
    sort_order: number;
    user: AdminUserCompact;
}

export default function AuthorizedSignersSettings() {
    const [signers, setSigners] = useState<AuthorizedSigner[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<AdminUserCompact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [addingUser, setAddingUser] = useState<string | null>(null);
    const [titles, setTitles] = useState<any[]>([]); // { id, label }
    const [selectedTitles, setSelectedTitles] = useState<Record<string, string>>({}); // userId -> title label

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([loadSigners(), loadUsers(), loadTitles()]);
        } finally {
            setLoading(false);
        }
    };

    const loadTitles = async () => {
        // Assuming definitions are in 'general_definitions' table with type 'title'
        // We can use supabase directly or a service.
        const { data } = await supabase
            .from('general_definitions')
            .select('id, label')
            .eq('type', 'title')
            .eq('is_active', true)
            .order('sort_order');

        if (data) setTitles(data);
    };

    const loadSigners = async () => {
        const { data, error } = await DocumentService.getAuthorizedSigners();
        if (error) {
            console.error('Error loading signers:', error);
            toast.error('İmzacılar yüklenemedi');
            return;
        }
        setSigners(data || []);
    };

    const loadUsers = async () => {
        const { data, error } = await supabase
            .from('admin_users')
            .select('id, full_name, email, role, signature_url')
            .eq('is_active', true)
            .order('full_name');

        if (error) {
            console.error('Error loading users:', error);
            return;
        }
        setUsers(data || []);
    };

    const handleAddSigner = async (userId: string) => {
        setAddingUser(userId);
        const title = selectedTitles[userId] || ''; // User selected title or empty

        try {
            const { error } = await DocumentService.addAuthorizedSigner(userId, title);
            if (error) {
                if (error.code === '23505') { // Unique violation
                    toast.error('Bu kullanıcı zaten ekli');
                } else {
                    throw error;
                }
                return;
            }

            toast.success('İmzacı eklendi');
            await loadSigners();
            // Clear selection
            setSelectedTitles(prev => {
                const next = { ...prev };
                delete next[userId];
                return next;
            });
        } catch (error: any) {
            console.error('Error adding signer:', error);
            toast.error('Ekleme hatası: ' + error.message);
        } finally {
            setAddingUser(null);
            setSearchQuery(''); // Clear search to reset view
        }
    };

    const handleRemoveSigner = async (id: string, name: string) => {
        if (!confirm(`${name} kullanıcısını imzacılar listesinden çıkarmak istediğinize emin misiniz?`)) return;

        try {
            const { error } = await DocumentService.removeAuthorizedSigner(id);
            if (error) throw error;

            toast.success('İmzacı çıkarıldı');
            setSigners(prev => prev.filter(s => s.id !== id));
        } catch (error: any) {
            console.error('Error removing signer:', error);
            toast.error('Silme hatası');
        }
    };

    // Filter users: exclude already added ones and match search
    const filteredUsers = users.filter(u => {
        const isAlreadySigner = signers.some(s => s.user_id === u.id);
        const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase());
        return !isAlreadySigner && matchesSearch;
    });

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Yetkili İmzacılar</h2>
                        <p className="text-sm text-slate-600">
                            Belge oluştururken imza atabilecek yetkili kullanıcıları belirleyin.
                        </p>
                    </div>
                </div>

                {/* Add New Signer Section */}
                <div className="mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Yeni İmzacı Ekle
                    </h3>
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                            type="text"
                            placeholder="Kullanıcı ara (Ad Soyad veya E-posta)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                        />
                    </div>

                    {searchQuery && (
                        <div className="mt-2 bg-white rounded-lg border border-slate-200 max-h-60 overflow-y-auto shadow-sm">
                            {filteredUsers.length === 0 ? (
                                <div className="p-3 text-sm text-slate-500 text-center">Kullanıcı bulunamadı veya hepsi zaten ekli.</div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {filteredUsers.map(user => (
                                        <div key={user.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">{user.full_name}</p>
                                                    <p className="text-xs text-slate-500">{user.role}</p>
                                                </div>
                                                {!user.signature_url && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        İmzak Yok
                                                    </span>
                                                )}
                                            </div>

                                            {/* Title Selection */}
                                            <div className="flex items-center gap-2 mr-2">
                                                {titles.length > 0 ? (
                                                    <select
                                                        className="text-xs border-slate-200 rounded py-1 pl-2 pr-6 focus:ring-violet-500 focus:border-violet-500"
                                                        value={selectedTitles[user.id] || ''}
                                                        onChange={(e) => setSelectedTitles(prev => ({ ...prev, [user.id]: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="">Unvan Seç...</option>
                                                        {titles.map(t => (
                                                            <option key={t.id} value={t.label}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Unvan tanımı yok</span>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => handleAddSigner(user.id)}
                                                disabled={addingUser === user.id}
                                                className="text-sm font-medium text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {addingUser === user.id ? 'Ekleniyor...' : 'Ekle'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Signers List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                            Yükleniyor...
                        </div>
                    ) : signers.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                            Henüz yetkili imzacı eklenmemiş.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {signers.map((signer) => (
                                <div key={signer.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-violet-200 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                                            <span className="font-semibold">{signer.user.full_name.charAt(0)}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-900">{signer.user.full_name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{signer.user.role}</span>
                                                {signer.title && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-slate-700">{signer.title}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {signer.user.signature_url ? (
                                            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>İmza Hazır</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100" title="Kullanıcının profilinde imza görseli bulunmuyor">
                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                <span>İmza Görseli Yok</span>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => handleRemoveSigner(signer.id, signer.user.full_name)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Listeden Çıkar"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
