'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { definitionTypeOrder, definitionGroups } from '@/lib/definitions';
import { AdminUser, DefinitionType, GeneralDefinition, Role } from '@/lib/types';
import {
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Shield,
  LayoutGrid,
  MapPin,
  Edit2,
  FileText,
  PenTool
} from 'lucide-react';
import DefaultDocumentSettings from './DefaultDocumentSettings';
import AuthorizedSignersSettings from './AuthorizedSignersSettings';

type DefinitionMap = Record<DefinitionType, GeneralDefinition[]>;

const createEmptyMap = (): DefinitionMap => ({
  workplace: [],
  position: [],
  title: []
});

interface FormState {
  label: string;
  description: string;
  sort_order: string;
  user_id?: string;
}

type FormStateMap = Record<DefinitionType, FormState>;

const createInitialFormState = (): FormStateMap => ({
  workplace: { label: '', description: '', sort_order: '' },
  position: { label: '', description: '', sort_order: '' },
  title: { label: '', description: '', sort_order: '' }
});

type TabType = DefinitionType | 'roles' | 'document_settings' | 'authorized_signers';

export default function DefinitionsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  // Definitions State
  const [definitions, setDefinitions] = useState<DefinitionMap>(createEmptyMap);
  const [formState, setFormState] = useState<FormStateMap>(createInitialFormState);
  const [addingType, setAddingType] = useState<DefinitionType | null>(null);

  // Roles State
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]); // For user selection

  // Shared State
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(definitionTypeOrder[0]);

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }

    if (!PermissionManager.canManageDefinitions(user) && !PermissionManager.isSuperAdmin(user)) {
      router.push('/admin/dashboard');
      return;
    }

    setCurrentUser(user);
    loadAllData();
  }, [router]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadDefinitions(), loadRoles(), loadUsers()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('admin_users').select('*').eq('is_active', true).order('full_name');
    if (data) setUsers(data);
  };

  const loadDefinitions = async () => {
    try {
      setStatusMessage(null);
      const { data, error } = await supabase
        .from('general_definitions')
        .select(`
            *,
            user:admin_users(id, full_name)
        `)
        .order('type')
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;

      const map = createEmptyMap();
      (data || []).forEach((item) => {
        const type = item.type as DefinitionType;
        if (type in map) {
          map[type as DefinitionType].push(item as GeneralDefinition);
        }
      });

      setDefinitions(map);
    } catch (error) {
      console.error('Tanımlamalar yüklenirken hata oluştu:', error);
      // We don't set global error here to avoid blocking other data
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Roller yüklenirken hata:', error);
    }
  };

  const handleFormChange = (type: DefinitionType, field: keyof FormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const handleAddDefinition = async (type: DefinitionType) => {
    const label = formState[type].label.trim();
    if (!label) {
      setStatusMessage({
        type: 'error',
        text: `${definitionGroups[type].label} adı boş olamaz`
      });
      return;
    }

    const maxOrder = definitions[type]?.reduce((max, item) => Math.max(max, item.sort_order), 0) || 0;
    const sortOrder = maxOrder + 1;

    setAddingType(type);
    setStatusMessage(null);

    try {
      const { error } = await supabase.from('general_definitions').insert({
        type,
        label,
        description: formState[type].description.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        is_active: true,
        user_id: type === 'title' && formState[type].user_id ? formState[type].user_id : null
      });

      if (error) {
        if (error.code === '23505') {
          setStatusMessage({
            type: 'error',
            text: `${definitionGroups[type].label} listesinde bu kayıt zaten mevcut`
          });
        } else {
          throw error;
        }
        return;
      }

      setFormState((prev) => ({
        ...prev,
        [type]: { label: '', description: '', sort_order: '' }
      }));

      setStatusMessage({
        type: 'success',
        text: `${definitionGroups[type].label} kaydı eklendi`
      });

      await loadDefinitions();
    } catch (error) {
      console.error('Tanımlama eklenirken hata oluştu:', error);
      setStatusMessage({
        type: 'error',
        text: 'Kayıt eklenirken bir hata oluştu'
      });
    } finally {
      setAddingType(null);
    }
  };

  const handleToggleDefinitionActive = async (definition: GeneralDefinition) => {
    setPendingId(definition.id);
    setStatusMessage(null);

    try {
      const { error } = await supabase
        .from('general_definitions')
        .update({ is_active: !definition.is_active })
        .eq('id', definition.id);

      if (error) throw error;

      setStatusMessage({
        type: 'success',
        text: `${definition.label} kaydı ${definition.is_active ? 'pasifleştirildi' : 'aktif edildi'}`
      });

      await loadDefinitions();
    } catch (error) {
      console.error('Durum güncellenirken hata oluştu:', error);
      setStatusMessage({
        type: 'error',
        text: 'Durum güncellenirken bir hata oluştu'
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleDeleteDefinition = async (definition: GeneralDefinition) => {
    if (!confirm(`"${definition.label}" kaydını silmek istediğinize emin misiniz?`)) return;

    setPendingId(definition.id);
    setStatusMessage(null);

    try {
      const { error } = await supabase.from('general_definitions').delete().eq('id', definition.id);
      if (error) throw error;

      setStatusMessage({ type: 'success', text: `${definition.label} kaydı silindi` });
      await loadDefinitions();
    } catch (error) {
      console.error('Kayıt silinirken hata oluştu:', error);
      setStatusMessage({ type: 'error', text: 'Kayıt silinirken bir hata oluştu' });
    } finally {
      setPendingId(null);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`"${role.name}" rolünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;

    if (role.is_system_role) {
      alert('Sistem rolleri silinemez.');
      return;
    }

    setPendingId(role.id);
    setStatusMessage(null);

    try {
      const { error } = await supabase.from('roles').delete().eq('id', role.id);
      if (error) throw error;

      setStatusMessage({ type: 'success', text: 'Rol başarıyla silindi' });
      await loadRoles();
    } catch (error) {
      console.error('Rol silinirken hata:', error);
      setStatusMessage({ type: 'error', text: 'Rol silinirken bir hata oluştu' });
    } finally {
      setPendingId(null);
    }
  };

  const totalDefinitions = useMemo(() => {
    return definitionTypeOrder.reduce((acc, type) => acc + (definitions[type]?.length || 0), 0) + roles.length;
  }, [definitions, roles]);

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Tanımlamalar</h1>
                <p className="text-slate-600">
                  İşyeri, pozisyon ve kullanıcı rollerini yönetin. Toplam {totalDefinitions} kayıt.
                </p>
              </div>
            </div>
            {statusMessage && (
              <div
                className={`mt-2 flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${statusMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
                  }`}
              >
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>
          <button
            onClick={loadAllData}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {definitionTypeOrder.map((type) => {
            const group = definitionGroups[type];
            const isActive = activeTab === type;
            const Icon = type === 'workplace' ? MapPin : LayoutGrid;

            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                <span>{group.label}</span>
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  {definitions[type]?.length || 0}
                </span>
              </button>
            );
          })}

          {/* Roles Tab */}
          <button
            onClick={() => setActiveTab('roles')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
              ${activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Shield className={`w-4 h-4 ${activeTab === 'roles' ? 'text-blue-500' : 'text-gray-400'}`} />
            <span>Roller</span>
            <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === 'roles' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
              {roles.length}
            </span>
          </button>

          {/* Document Settings Tab */}
          <button
            onClick={() => setActiveTab('document_settings')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
              ${activeTab === 'document_settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'document_settings' ? 'text-blue-500' : 'text-gray-400'}`} />
            <span>Varsayılan Belge Ayarları</span>
          </button>
          <button
            onClick={() => setActiveTab('authorized_signers')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
              ${activeTab === 'authorized_signers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <PenTool className={`w-4 h-4 ${activeTab === 'authorized_signers' ? 'text-blue-500' : 'text-gray-400'}`} />
            <span>İmzacılar</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Definitions Tabs */}
        {definitionTypeOrder.map((type) => {
          if (type !== activeTab) return null;

          const group = definitionGroups[type];
          const list = definitions[type] || [];
          const activeCount = list.filter((item) => item.is_active).length;

          return (
            <section key={type} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fadeIn">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{group.label}</h2>
                  <p className="text-sm text-slate-600">{group.description}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Aktif {activeCount} / Toplam {list.length}
                  </p>
                </div>
                <div className="text-right w-full md:w-auto">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Yeni Kayıt</span>
                  <div className="mt-2 flex space-x-2">
                    <input
                      type="text"
                      placeholder={`${group.label} adı`}
                      value={formState[type].label}
                      onChange={(e) => handleFormChange(type, 'label', e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    <input
                      type="text"
                      placeholder="Açıklama (opsiyonel)"
                      value={formState[type].description}
                      onChange={(e) => handleFormChange(type, 'description', e.target.value)}
                      className="hidden md:block w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />

                    {/* User Selection for Title */}
                    {type === 'title' && (
                      <select
                        value={formState[type].user_id || ''}
                        onChange={(e) => handleFormChange(type, 'user_id', e.target.value)}
                        className="w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Kullanıcı Seç...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={() => handleAddDefinition(type)}
                      disabled={addingType === type || !formState[type].label.trim()}
                      className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 min-w-[80px] justify-center"
                    >
                      {addingType === type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>{addingType === type ? '...' : 'Ekle'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Açıklama (opsiyonel)"
                    value={formState[type].description}
                    onChange={(e) => handleFormChange(type, 'description', e.target.value)}
                    className="mt-2 w-full md:hidden px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {list.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-12 text-center text-sm text-slate-500">
                  <div className="flex justify-center mb-4">
                    <Plus className="w-12 h-12 text-slate-300" />
                  </div>
                  <p>Henüz {group.label.toLowerCase()} kaydı bulunmuyor.</p>
                  <p>Yukarıdaki formdan yeni bir kayıt ekleyebilirsiniz.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {list.map((definition) => (
                    <div
                      key={definition.id}
                      className="py-4 flex items-center justify-between flex-wrap gap-4 group hover:bg-slate-50 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-3">
                          <p className="font-medium text-slate-900">{definition.label}</p>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${definition.is_active
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                              }`}
                          >
                            {definition.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                        {definition.description && (
                          <p className="text-sm text-slate-600 mt-1">{definition.description}</p>
                        )}
                        {definition.description && (
                          <p className="text-sm text-slate-600 mt-1">{definition.description}</p>
                        )}
                        {/* Show bound user */}
                        {definition.user && (
                          <p className="text-xs text-blue-600 mt-1 flex items-center">
                            <span className="font-semibold mr-1">Temsilci:</span> {definition.user.full_name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleDefinitionActive(definition)}
                          disabled={pendingId === definition.id}
                          className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium border ${definition.is_active
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            : 'border-green-200 text-green-700 hover:bg-green-50'
                            } disabled:opacity-50`}
                        >
                          {definition.is_active ? (
                            <ToggleLeft className="w-4 h-4" />
                          ) : (
                            <ToggleRight className="w-4 h-4" />
                          )}
                          <span className="hidden md:inline">{definition.is_active ? 'Pasif' : 'Aktif'}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDefinition(definition)}
                          disabled={pendingId === definition.id}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden md:inline">Sil</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* Roles Tab Content */}
        {activeTab === 'roles' && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fadeIn">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Kullanıcı Rolleri</h2>
                <p className="text-sm text-slate-600">Sistemdeki yetki gruplarını yönetin</p>
              </div>
              <div>
                <Link
                  href="/admin/definitions/roles/new"
                  className="inline-flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Yeni Rol Ekle</span>
                </Link>
              </div>
            </div>

            {roles.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                Rol bulunamadı.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {roles.map((role) => (
                  <div key={role.id} className="py-4 flex items-center justify-between group hover:bg-slate-50 px-2 rounded-lg transition-colors">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-slate-900">{role.name}</h3>
                        {role.is_system_role && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                            Sistem
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{role.description || 'Açıklama yok'}</p>
                    </div>
                    <div className="flex items-center space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/definitions/roles/${role.id}`}
                        className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit2 className="w-5 h-5" />
                      </Link>
                      {!role.is_system_role && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          disabled={pendingId === role.id}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Sil"
                        >
                          {pendingId === role.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {/* Document Settings Tab Content */}
        {activeTab === 'document_settings' && (
          <div className="animate-fadeIn">
            <DefaultDocumentSettings />
          </div>
        )}
        {/* Authorized Signers Tab Content */}
        {activeTab === 'authorized_signers' && (
          <div className="animate-fadeIn">
            <AuthorizedSignersSettings />
          </div>
        )}
      </div>
    </div >
  );
}
