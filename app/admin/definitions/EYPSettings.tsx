'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Building2,
  Save,
  Loader2,
  Plus,
  Trash2,
  Star,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SenderSettings {
  eyp_sender_kkk: string;
  eyp_sender_mersis: string;
  eyp_sender_name: string;
  eyp_sender_phone: string;
  eyp_sender_email: string;
  eyp_sender_address: string;
  eyp_sender_city: string;
  eyp_sender_district: string;
}

interface Organization {
  id: string;
  name: string;
  short_name?: string;
  kkk?: string;
  mersis?: string;
  vkn?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  address?: string;
  postal_code?: string;
  district?: string;
  city?: string;
  country?: string;
  kep_address?: string;
  organization_type: string;
  is_active: boolean;
  is_favorite: boolean;
  notes?: string;
  created_at: string;
}

const initialSenderSettings: SenderSettings = {
  eyp_sender_kkk: '',
  eyp_sender_mersis: '',
  eyp_sender_name: '',
  eyp_sender_phone: '',
  eyp_sender_email: '',
  eyp_sender_address: '',
  eyp_sender_city: '',
  eyp_sender_district: ''
};

const emptyOrganization: Partial<Organization> = {
  name: '',
  short_name: '',
  kkk: '',
  mersis: '',
  vkn: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  address: '',
  postal_code: '',
  district: '',
  city: '',
  country: 'Türkiye',
  kep_address: '',
  organization_type: 'public',
  is_active: true,
  is_favorite: false,
  notes: ''
};

export default function EYPSettings() {
  const [activeSubTab, setActiveSubTab] = useState<'sender' | 'organizations'>('sender');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sender Settings State
  const [senderSettings, setSenderSettings] = useState<SenderSettings>(initialSenderSettings);

  // Organizations State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Partial<Organization> | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadSenderSettings(), loadOrganizations()]);
    setLoading(false);
  };

  const loadSenderSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('eyp_sender_kkk, eyp_sender_mersis, eyp_sender_name, eyp_sender_phone, eyp_sender_email, eyp_sender_address, eyp_sender_city, eyp_sender_district')
        .single();

      if (error) throw error;

      if (data) {
        setSenderSettings({
          eyp_sender_kkk: data.eyp_sender_kkk || '',
          eyp_sender_mersis: data.eyp_sender_mersis || '',
          eyp_sender_name: data.eyp_sender_name || '',
          eyp_sender_phone: data.eyp_sender_phone || '',
          eyp_sender_email: data.eyp_sender_email || '',
          eyp_sender_address: data.eyp_sender_address || '',
          eyp_sender_city: data.eyp_sender_city || '',
          eyp_sender_district: data.eyp_sender_district || ''
        });
      }
    } catch (error) {
      console.error('Gönderen ayarları yüklenemedi:', error);
    }
  };

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('eyp_organizations')
        .select('*')
        .order('is_favorite', { ascending: false })
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Kurumlar yüklenemedi:', error);
    }
  };

  const saveSenderSettings = async () => {
    setSaving(true);
    setStatusMessage(null);

    try {
      // Önce mevcut kaydın id'sini al
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .single();

      if (existing) {
        // Mevcut kaydı güncelle
        const { error } = await supabase
          .from('site_settings')
          .update({
            eyp_sender_kkk: senderSettings.eyp_sender_kkk || null,
            eyp_sender_mersis: senderSettings.eyp_sender_mersis || null,
            eyp_sender_name: senderSettings.eyp_sender_name || null,
            eyp_sender_phone: senderSettings.eyp_sender_phone || null,
            eyp_sender_email: senderSettings.eyp_sender_email || null,
            eyp_sender_address: senderSettings.eyp_sender_address || null,
            eyp_sender_city: senderSettings.eyp_sender_city || null,
            eyp_sender_district: senderSettings.eyp_sender_district || null
          })
          .eq('id', existing.id);

        if (error) throw error;
      }

      setStatusMessage({ type: 'success', text: 'Gönderen bilgileri kaydedildi' });
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      setStatusMessage({ type: 'error', text: 'Kaydetme sırasında hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!editingOrg?.name?.trim()) {
      setStatusMessage({ type: 'error', text: 'Kurum adı zorunludur' });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      if (editingOrg.id) {
        // Update
        const { error } = await supabase
          .from('eyp_organizations')
          .update({
            name: editingOrg.name,
            short_name: editingOrg.short_name || null,
            kkk: editingOrg.kkk || null,
            mersis: editingOrg.mersis || null,
            vkn: editingOrg.vkn || null,
            phone: editingOrg.phone || null,
            fax: editingOrg.fax || null,
            email: editingOrg.email || null,
            website: editingOrg.website || null,
            address: editingOrg.address || null,
            postal_code: editingOrg.postal_code || null,
            district: editingOrg.district || null,
            city: editingOrg.city || null,
            country: editingOrg.country || 'Türkiye',
            kep_address: editingOrg.kep_address || null,
            organization_type: editingOrg.organization_type || 'public',
            is_active: editingOrg.is_active ?? true,
            is_favorite: editingOrg.is_favorite ?? false,
            notes: editingOrg.notes || null
          })
          .eq('id', editingOrg.id);

        if (error) throw error;
        setStatusMessage({ type: 'success', text: 'Kurum güncellendi' });
      } else {
        // Insert
        const { error } = await supabase.from('eyp_organizations').insert({
          name: editingOrg.name,
          short_name: editingOrg.short_name || null,
          kkk: editingOrg.kkk || null,
          mersis: editingOrg.mersis || null,
          vkn: editingOrg.vkn || null,
          phone: editingOrg.phone || null,
          fax: editingOrg.fax || null,
          email: editingOrg.email || null,
          website: editingOrg.website || null,
          address: editingOrg.address || null,
          postal_code: editingOrg.postal_code || null,
          district: editingOrg.district || null,
          city: editingOrg.city || null,
          country: editingOrg.country || 'Türkiye',
          kep_address: editingOrg.kep_address || null,
          organization_type: editingOrg.organization_type || 'public',
          is_active: editingOrg.is_active ?? true,
          is_favorite: editingOrg.is_favorite ?? false,
          notes: editingOrg.notes || null
        });

        if (error) throw error;
        setStatusMessage({ type: 'success', text: 'Kurum eklendi' });
      }

      await loadOrganizations();
      setShowModal(false);
      setEditingOrg(null);
    } catch (error) {
      console.error('Kurum kaydetme hatası:', error);
      setStatusMessage({ type: 'error', text: 'Kaydetme sırasında hata oluştu' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrganization = async (org: Organization) => {
    if (!confirm(`"${org.name}" kurumunu silmek istediğinize emin misiniz?`)) return;

    try {
      const { error } = await supabase
        .from('eyp_organizations')
        .delete()
        .eq('id', org.id);

      if (error) throw error;

      setStatusMessage({ type: 'success', text: 'Kurum silindi' });
      await loadOrganizations();
    } catch (error) {
      console.error('Silme hatası:', error);
      setStatusMessage({ type: 'error', text: 'Silme sırasında hata oluştu' });
    }
  };

  const handleToggleFavorite = async (org: Organization) => {
    try {
      const { error } = await supabase
        .from('eyp_organizations')
        .update({ is_favorite: !org.is_favorite })
        .eq('id', org.id);

      if (error) throw error;
      await loadOrganizations();
    } catch (error) {
      console.error('Favori güncelleme hatası:', error);
    }
  };

  // Filter organizations
  const filteredOrganizations = organizations.filter(org => {
    if (showOnlyFavorites && !org.is_favorite) return false;
    if (filterCity && org.city !== filterCity) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        org.name.toLowerCase().includes(search) ||
        org.short_name?.toLowerCase().includes(search) ||
        org.kkk?.includes(search) ||
        org.city?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Get unique cities for filter
  const cities = Array.from(new Set(organizations.map(o => o.city).filter(Boolean))).sort();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex space-x-4 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('sender')}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${activeSubTab === 'sender'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4" />
            <span>Gönderen Kurum</span>
          </div>
        </button>
        <button
          onClick={() => setActiveSubTab('organizations')}
          className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${activeSubTab === 'organizations'
              ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <span>Alıcı Kurumlar ({organizations.length})</span>
          </div>
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm ${statusMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
            }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Sender Settings */}
      {activeSubTab === 'sender' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Gönderen Kurum Bilgileri</h3>
            <p className="text-sm text-slate-600">EYP paketlerinde gönderen olarak görünecek kurum bilgileri</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kurum Adı *
              </label>
              <input
                type="text"
                value={senderSettings.eyp_sender_name}
                onChange={(e) => setSenderSettings({ ...senderSettings, eyp_sender_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Örn: Belediye-İş Sendikası"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kurum Kayıt Kodu (KKK) *
              </label>
              <input
                type="text"
                value={senderSettings.eyp_sender_kkk}
                onChange={(e) => setSenderSettings({ ...senderSettings, eyp_sender_kkk: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="8 haneli KKK"
                maxLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">Kamu kurumları için zorunlu</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                MERSIS Numarası
              </label>
              <input
                type="text"
                value={senderSettings.eyp_sender_mersis}
                onChange={(e) => setSenderSettings({ ...senderSettings, eyp_sender_mersis: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="16 haneli MERSIS"
                maxLength={16}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Telefon
              </label>
              <input
                type="text"
                value={senderSettings.eyp_sender_phone}
                onChange={(e) => setSenderSettings({ ...senderSettings, eyp_sender_phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0xxx xxx xx xx"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                E-posta
              </label>
              <input
                type="email"
                value={senderSettings.eyp_sender_email}
                onChange={(e) => setSenderSettings({ ...senderSettings, eyp_sender_email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="kurum@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                İl
              </label>
              <input
                type="text"
                value={senderSettings.eyp_sender_city}
                onChange={(e) => setSenderSettings({ ...senderSettings, eyp_sender_city: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="İstanbul"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                İlçe
              </label>
              <input
                type="text"
                value={senderSettings.eyp_sender_district}
                onChange={(e) => setSenderSettings({ ...senderSettings, eyp_sender_district: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Kadıköy"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Adres
              </label>
              <textarea
                value={senderSettings.eyp_sender_address}
                onChange={(e) => setSenderSettings({ ...senderSettings, eyp_sender_address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Açık adres"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={saveSenderSettings}
              disabled={saving}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Kaydet</span>
            </button>
          </div>
        </div>
      )}

      {/* Organizations */}
      {activeSubTab === 'organizations' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Alıcı Kurumlar</h3>
              <p className="text-sm text-slate-600">EYP paketlerinde alıcı olarak seçilebilecek kurumlar</p>
            </div>
            <button
              onClick={() => {
                setEditingOrg({ ...emptyOrganization });
                setShowModal(true);
              }}
              className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Kurum</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Kurum ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tüm İller</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${showOnlyFavorites
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Star className={`w-4 h-4 ${showOnlyFavorites ? 'fill-amber-400' : ''}`} />
              <span>Favoriler</span>
            </button>
          </div>

          {/* Organizations List */}
          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Kurum bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredOrganizations.map(org => (
                <div key={org.id} className="py-4 flex items-start justify-between gap-4 group hover:bg-slate-50 px-2 rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleFavorite(org)}
                        className="shrink-0"
                      >
                        <Star className={`w-4 h-4 ${org.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-400'}`} />
                      </button>
                      <h4 className="font-medium text-slate-900 truncate">{org.name}</h4>
                      {org.short_name && (
                        <span className="text-xs text-slate-500">({org.short_name})</span>
                      )}
                      {!org.is_active && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">Pasif</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      {org.kkk && (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">KKK: {org.kkk}</span>
                      )}
                      {org.city && (
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {org.city}{org.district ? `, ${org.district}` : ''}
                        </span>
                      )}
                      {org.phone && (
                        <span className="flex items-center">
                          <Phone className="w-3 h-3 mr-1" />
                          {org.phone}
                        </span>
                      )}
                      {org.email && (
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {org.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingOrg(org);
                        setShowModal(true);
                      }}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteOrganization(org)}
                      className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Organization Edit Modal */}
      {showModal && editingOrg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingOrg.id ? 'Kurumu Düzenle' : 'Yeni Kurum Ekle'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingOrg(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kurum Adı *
                  </label>
                  <input
                    type="text"
                    value={editingOrg.name || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tam kurum adı"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kısa Ad
                  </label>
                  <input
                    type="text"
                    value={editingOrg.short_name || ''}
                    onChange={(e) => setEditingOrg({ ...editingOrg, short_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Kısaltma"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Kurum Türü
                  </label>
                  <select
                    value={editingOrg.organization_type || 'public'}
                    onChange={(e) => setEditingOrg({ ...editingOrg, organization_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="public">Kamu Kurumu</option>
                    <option value="private">Özel Sektör</option>
                    <option value="ngo">STK / Dernek</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
              </div>

              {/* Identification */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Kimlik Bilgileri</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      KKK
                    </label>
                    <input
                      type="text"
                      value={editingOrg.kkk || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, kkk: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="00000000"
                      maxLength={8}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      MERSIS
                    </label>
                    <input
                      type="text"
                      value={editingOrg.mersis || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, mersis: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="0000000000000000"
                      maxLength={16}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      VKN
                    </label>
                    <input
                      type="text"
                      value={editingOrg.vkn || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, vkn: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      placeholder="00000000000"
                      maxLength={11}
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-900 mb-3">İletişim</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Telefon
                    </label>
                    <input
                      type="text"
                      value={editingOrg.phone || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0xxx xxx xx xx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Faks
                    </label>
                    <input
                      type="text"
                      value={editingOrg.fax || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, fax: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0xxx xxx xx xx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={editingOrg.email || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      KEP Adresi
                    </label>
                    <input
                      type="text"
                      value={editingOrg.kep_address || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, kep_address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="kurum@hs01.kep.tr"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Web Sitesi
                    </label>
                    <input
                      type="url"
                      value={editingOrg.website || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, website: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.kurum.gov.tr"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-slate-900 mb-3">Adres</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      İl
                    </label>
                    <input
                      type="text"
                      value={editingOrg.city || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      İlçe
                    </label>
                    <input
                      type="text"
                      value={editingOrg.district || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, district: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Posta Kodu
                    </label>
                    <input
                      type="text"
                      value={editingOrg.postal_code || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, postal_code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={5}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Açık Adres
                    </label>
                    <textarea
                      value={editingOrg.address || ''}
                      onChange={(e) => setEditingOrg({ ...editingOrg, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="border-t pt-4">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingOrg.is_active ?? true}
                      onChange={(e) => setEditingOrg({ ...editingOrg, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Aktif</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingOrg.is_favorite ?? false}
                      onChange={(e) => setEditingOrg({ ...editingOrg, is_favorite: e.target.checked })}
                      className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-700">Favori</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notlar
                </label>
                <textarea
                  value={editingOrg.notes || ''}
                  onChange={(e) => setEditingOrg({ ...editingOrg, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="İsteğe bağlı notlar..."
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingOrg(null);
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium"
              >
                İptal
              </button>
              <button
                onClick={handleSaveOrganization}
                disabled={saving || !editingOrg.name?.trim()}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{editingOrg.id ? 'Güncelle' : 'Ekle'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
