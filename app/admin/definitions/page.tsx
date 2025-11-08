'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { definitionTypeOrder, definitionGroups } from '@/lib/definitions';
import { AdminUser, DefinitionType, GeneralDefinition } from '@/lib/types';
import {
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  RefreshCw,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

type DefinitionMap = Record<DefinitionType, GeneralDefinition[]>;

const createEmptyMap = (): DefinitionMap => ({
  workplace: [],
  position: []
});

interface FormState {
  label: string;
  description: string;
  sort_order: string;
}

type FormStateMap = Record<DefinitionType, FormState>;

const createInitialFormState = (): FormStateMap => ({
  workplace: { label: '', description: '', sort_order: '' },
  position: { label: '', description: '', sort_order: '' }
});

export default function DefinitionsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [definitions, setDefinitions] = useState<DefinitionMap>(createEmptyMap);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<FormStateMap>(createInitialFormState);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingDefinitionId, setPendingDefinitionId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<DefinitionType | null>(null);

  useEffect(() => {
    const user = AdminAuth.getCurrentUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }

    if (!PermissionManager.canManageDefinitions(user)) {
      router.push('/admin/dashboard');
      return;
    }

    setCurrentUser(user);
    loadDefinitions();
  }, [router]);

  const loadDefinitions = async () => {
    try {
      setLoading(true);
      setStatusMessage(null);

      const { data, error } = await supabase
        .from('general_definitions')
        .select('*')
        .order('type')
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });

      if (error) {
        throw error;
      }

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
      setStatusMessage({
        type: 'error',
        text: 'Tanımlamalar yüklenirken bir hata oluştu'
      });
    } finally {
      setLoading(false);
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

    const sortOrder = formState[type].sort_order
      ? Number(formState[type].sort_order)
      : (definitions[type]?.length || 0) * 10;

    setAddingType(type);
    setStatusMessage(null);

    try {
      const { error } = await supabase.from('general_definitions').insert({
        type,
        label,
        description: formState[type].description.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        is_active: true
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

  const handleToggleActive = async (definition: GeneralDefinition) => {
    setPendingDefinitionId(definition.id);
    setStatusMessage(null);

    try {
      const { error } = await supabase
        .from('general_definitions')
        .update({ is_active: !definition.is_active })
        .eq('id', definition.id);

      if (error) {
        throw error;
      }

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
      setPendingDefinitionId(null);
    }
  };

  const handleDelete = async (definition: GeneralDefinition) => {
    if (!confirm(`"${definition.label}" kaydını silmek istediğinize emin misiniz?`)) {
      return;
    }

    setPendingDefinitionId(definition.id);
    setStatusMessage(null);

    try {
      const { error } = await supabase
        .from('general_definitions')
        .delete()
        .eq('id', definition.id);

      if (error) {
        throw error;
      }

      setStatusMessage({
        type: 'success',
        text: `${definition.label} kaydı silindi`
      });

      await loadDefinitions();
    } catch (error) {
      console.error('Kayıt silinirken hata oluştu:', error);
      setStatusMessage({
        type: 'error',
        text: 'Kayıt silinirken bir hata oluştu'
      });
    } finally {
      setPendingDefinitionId(null);
    }
  };

  const totalDefinitions = useMemo(() => {
    return definitionTypeOrder.reduce((acc, type) => acc + (definitions[type]?.length || 0), 0);
  }, [definitions]);

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
                  İşyeri, pozisyon gibi ortak listeleri yönetin. Toplam {totalDefinitions} kayıt.
                </p>
              </div>
            </div>
            {statusMessage && (
              <div
                className={`mt-2 flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                  statusMessage.type === 'success'
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
            onClick={loadDefinitions}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {definitionTypeOrder.map((type) => {
          const group = definitionGroups[type];
          const list = definitions[type] || [];
          const activeCount = list.filter((item) => item.is_active).length;

          return (
            <section key={type} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{group.label}</h2>
                  <p className="text-sm text-slate-600">{group.description}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Aktif {activeCount} / Toplam {list.length}
                  </p>
                  {group.helper && (
                    <p className="text-xs text-slate-400 mt-1">{group.helper}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wide text-slate-500">Yeni Kayıt</span>
                  <div className="mt-2 flex space-x-2">
                    <input
                      type="text"
                      placeholder={`${group.label} adı`}
                      value={formState[type].label}
                      onChange={(e) => handleFormChange(type, 'label', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Sıra"
                      value={formState[type].sort_order}
                      onChange={(e) => handleFormChange(type, 'sort_order', e.target.value)}
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Açıklama (opsiyonel)"
                      value={formState[type].description}
                      onChange={(e) => handleFormChange(type, 'description', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hidden md:block w-60"
                    />
                    <button
                      onClick={() => handleAddDefinition(type)}
                      disabled={addingType === type || !formState[type].label.trim()}
                      className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{addingType === type ? 'Ekleniyor...' : 'Ekle'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Açıklama (opsiyonel)"
                    value={formState[type].description}
                    onChange={(e) => handleFormChange(type, 'description', e.target.value)}
                    className="mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:hidden w-full"
                  />
                </div>
              </div>

              {list.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-sm text-slate-500">
                  Henüz {group.label.toLowerCase()} kaydı bulunmuyor. Yukarıdan yeni kayıt ekleyin.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {list.map((definition) => (
                    <div
                      key={definition.id}
                      className="py-4 flex items-center justify-between flex-wrap gap-4"
                    >
                      <div>
                        <div className="flex items-center space-x-3">
                          <p className="font-medium text-slate-900">{definition.label}</p>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              definition.is_active
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
                        <p className="text-xs text-slate-400 mt-1">
                          Sıra: {definition.sort_order ?? 0} · Güncellendi:{' '}
                          {new Date(definition.updated_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(definition)}
                          disabled={pendingDefinitionId === definition.id}
                          className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium border ${
                            definition.is_active
                              ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                              : 'border-green-200 text-green-700 hover:bg-green-50'
                          } disabled:opacity-50`}
                        >
                          {definition.is_active ? (
                            <ToggleLeft className="w-4 h-4" />
                          ) : (
                            <ToggleRight className="w-4 h-4" />
                          )}
                          <span>{definition.is_active ? 'Pasif Yap' : 'Aktif Yap'}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(definition)}
                          disabled={pendingDefinitionId === definition.id}
                          className="flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
