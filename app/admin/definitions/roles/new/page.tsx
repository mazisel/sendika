'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Shield,
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { Permission } from '@/lib/types';

interface GroupedPermissions {
    [key: string]: Permission[];
}

export default function NewRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [permissions, setPermissions] = useState<GroupedPermissions>({});
    const [loadError, setLoadError] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        role_type: 'general_manager' // Default value
    });
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const init = async () => {
            // Auth Check
            const user = AdminAuth.getCurrentUser();
            if (!user) {
                router.push('/admin/login');
                return;
            }
            if (!PermissionManager.canManageDefinitions(user) && !PermissionManager.isSuperAdmin(user)) {
                router.push('/admin/dashboard');
                return;
            }

            // Load Permissions
            const { data, error } = await supabase
                .from('permissions')
                .select('*')
                .order('group_name', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                console.error('Permissions load error:', error);
                setLoadError(true);
                return;
            }

            // Group permissions
            const grouped = (data || []).reduce((acc: GroupedPermissions, curr: Permission) => {
                const group = curr.group_name;
                if (!acc[group]) acc[group] = [];
                acc[group].push(curr);
                return acc;
            }, {});

            setPermissions(grouped);
        };

        init();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // ... (validation)

        try {
            // 1. Create Role
            const { data: roleData, error: roleError } = await supabase
                .from('roles')
                .insert({
                    name: formData.name.trim(),
                    description: formData.description.trim() || null,
                    role_type: formData.role_type,
                    is_system_role: false
                })
                .select()
                .single();

            if (roleError) throw roleError;

            // 2. Assign Permissions
            if (selectedPermissions.size > 0) {
                const permissionInserts = Array.from(selectedPermissions).map(permId => ({
                    role_id: roleData.id,
                    permission_id: permId
                }));

                const { error: permError } = await supabase
                    .from('role_permissions')
                    .insert(permissionInserts);

                if (permError) throw permError;
            }

            setMessage({ type: 'success', text: 'Rol başarıyla oluşturuldu' });
            setTimeout(() => router.push('/admin/definitions/roles'), 1500);
        } catch (error: any) {
            console.error('Create error:', error);
            setMessage({
                type: 'error',
                text: error.code === '23505' ? 'Bu isimde bir rol zaten var' : 'Rol oluşturulurken bir hata oluştu'
            });
            setLoading(false);
        }
    };

    const togglePermission = (id: string) => {
        const newSet = new Set(selectedPermissions);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedPermissions(newSet);
    };

    const toggleGroup = (groupName: string, select: boolean) => {
        const newSet = new Set(selectedPermissions);
        permissions[groupName]?.forEach(p => {
            if (select) newSet.add(p.id);
            else newSet.delete(p.id);
        });
        setSelectedPermissions(newSet);
    };

    if (loadError) {
        return <div className="p-8 text-center text-red-600">Yetkiler yüklenirken bir hata oluştu.</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 mb-6">
                <Link
                    href="/admin/definitions/roles"
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Yeni Rol Oluştur</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Rol Bilgileri</h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Rol Adı <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                placeholder="Örn: İnsan Kaynakları Uzmanı"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Açıklama
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500"
                                placeholder="Rolün amacı ve kapsamı..."
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Rol Kapsamı (Yönetici Tipi) <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.role_type || ''}
                                onChange={e => setFormData(prev => ({ ...prev, role_type: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                            >
                                <option value="general_manager">Genel Merkez Yöneticisi (Tüm Veri)</option>
                                <option value="regional_manager">Bölge Yöneticisi (Sadece Bölge Verisi)</option>
                                <option value="branch_manager">Şube Yöneticisi (Sadece Şube Verisi)</option>
                            </select>
                            <p className="mt-1 text-xs text-slate-500">
                                Bu rolün hangi veri seviyesine erişebileceğini belirler.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                    <h2 className="text-lg font-semibold text-slate-900">Yetkiler</h2>

                    {Object.entries(permissions).map(([group, perms]) => {
                        // Restrict 'users' permission group to Super Admin ONLY
                        if (group === 'users') {
                            const currentUser = AdminAuth.getCurrentUser();
                            if (!currentUser || currentUser.role !== 'super_admin') {
                                return null;
                            }
                        }

                        return (
                            <div key={group} className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="font-medium text-slate-700 capitalize">
                                        {group === 'system' ? 'Sistem' :
                                            group === 'members' ? 'Üyeler' :
                                                group === 'finance' ? 'Finans' :
                                                    group === 'content' ? 'İçerik' :
                                                        group === 'structure' ? 'Yapı/Şubeler' :
                                                            group === 'legal' ? 'Hukuk' :
                                                                group === 'users' ? 'Kullanıcı Yönetimi' : group}
                                    </h3>
                                    <div className="space-x-2 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(group, true)}
                                            className="text-violet-600 hover:text-violet-700 font-medium"
                                        >
                                            Tümünü Seç
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(group, false)}
                                            className="text-slate-500 hover:text-slate-700"
                                        >
                                            Temizle
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {perms.map(perm => (
                                        <label key={perm.id} className="flex items-start space-x-3 cursor-pointer group">
                                            <div className="relative flex items-center h-5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.has(perm.id)}
                                                    onChange={() => togglePermission(perm.id)}
                                                    className="h-4 w-4 text-violet-600 border-slate-300 rounded focus:ring-violet-500"
                                                />
                                            </div>
                                            <div className="text-sm">
                                                <p className="font-medium text-slate-700 group-hover:text-violet-700 transition-colors">
                                                    {perm.name}
                                                </p>
                                                {perm.description && (
                                                    <p className="text-slate-500 text-xs mt-0.5">{perm.description}</p>
                                                )}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {message && (
                    <div className={`p-4 rounded-lg flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span>{message.text}</span>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>Kaydet ve Oluştur</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
