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
import { Permission, Role, RolePermission } from '@/lib/types';

interface GroupedPermissions {
    [key: string]: Permission[];
}

interface PageProps {
    params: { id: string };
}

export default function EditRolePage({ params }: PageProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permissions, setPermissions] = useState<GroupedPermissions>({});
    const [role, setRole] = useState<Role | null>(null);
    const [loadError, setLoadError] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
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

            await Promise.all([loadPermissions(), loadRole()]);
            setLoading(false);
        };

        init();
    }, [router, params.id]);

    const loadPermissions = async () => {
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

        const grouped = (data || []).reduce((acc: GroupedPermissions, curr: Permission) => {
            const group = curr.group_name;
            if (!acc[group]) acc[group] = [];
            acc[group].push(curr);
            return acc;
        }, {});

        setPermissions(grouped);
    };

    const loadRole = async () => {
        // Role data
        const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('*')
            .eq('id', params.id)
            .single();

        if (roleError) {
            console.error('Role load error:', roleError);
            setLoadError(true);
            return;
        }

        setRole(roleData);
        setFormData({
            name: roleData.name,
            description: roleData.description || ''
        });

        // Role permissions
        const { data: permData, error: permError } = await supabase
            .from('role_permissions')
            .select('permission_id')
            .eq('role_id', params.id);

        if (permError) {
            console.error('Role permissions load error:', permError);
        } else {
            const perms = new Set((permData || []).map((p: any) => p.permission_id));
            setSelectedPermissions(perms);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setMessage({ type: 'error', text: 'Rol adı zorunludur' });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            // 1. Update Role (Only if not system role, though system roles allow permission updates usually)
            if (!role?.is_system_role) {
                const { error: roleError } = await supabase
                    .from('roles')
                    .update({
                        name: formData.name.trim(),
                        description: formData.description.trim() || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', params.id);

                if (roleError) throw roleError;
            }

            // 2. Update Permissions (Sync)
            // Delete existing
            const { error: delError } = await supabase
                .from('role_permissions')
                .delete()
                .eq('role_id', params.id);

            if (delError) throw delError;

            // Insert new
            if (selectedPermissions.size > 0) {
                const permissionInserts = Array.from(selectedPermissions).map(permId => ({
                    role_id: params.id,
                    permission_id: permId
                }));

                const { error: permError } = await supabase
                    .from('role_permissions')
                    .insert(permissionInserts);

                if (permError) throw permError;
            }

            setMessage({ type: 'success', text: 'Rol başarıyla güncellendi' });
        } catch (error: any) {
            console.error('Update error:', error);
            setMessage({ type: 'error', text: 'Güncelleme sırasında bir hata oluştu' });
        } finally {
            setSaving(false);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            </div>
        );
    }

    if (loadError || !role) {
        return <div className="p-8 text-center text-red-600">Rol bilgileri yüklenemedi.</div>;
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
                <h1 className="text-2xl font-bold text-slate-900">Rol Düzenle: {role.name}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center space-x-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">Rol Bilgileri</h2>
                        {role.is_system_role && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                Sistem Rolü (Adı Değiştirilemez)
                            </span>
                        )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Rol Adı {role.is_system_role ? '' : <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="text"
                                required={!role.is_system_role}
                                disabled={role.is_system_role}
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Açıklama
                            </label>
                            <input
                                type="text"
                                disabled={role.is_system_role}
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-slate-900">Yetkiler</h2>
                    </div>

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
                                                                group === 'documents' ? 'Belge Yönetimi' :
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
                        disabled={saving}
                        className="flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        <span>Değişiklikleri Kaydet</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
