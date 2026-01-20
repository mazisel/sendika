'use client';

import React, { useState, useEffect } from 'react';
import {
    X, Save, AlertCircle, User, Phone, Briefcase,
    BadgeCheck, Calendar, MapPin, Hash, Activity,
    Users, Heart, GraduationCap, Building2, FileText,
    Mail
} from 'lucide-react';
import { MemberService } from '@/lib/services/memberService';
import { AdminAuth } from '@/lib/auth';
import { cityOptions as cities } from '@/lib/cities';
import { Member } from '@/lib/types';
import { formatDateSafe } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';

interface EditMemberModalProps {
    member: Member;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditMemberModal({ member, isOpen, onClose, onSuccess }: EditMemberModalProps) {
    const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'work' | 'membership'>('personal');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<Member>>({});

    // Definitions State
    const [workplaces, setWorkplaces] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [branches, setBranches] = useState<{ id: string; branch_name: string; city: string; region_id: string | null }[]>([]);
    const [regions, setRegions] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');

    const currentUser = AdminAuth.getCurrentUser();
    const canEditBranch = currentUser?.role_type !== 'branch_manager';

    // Initialize form data when member changes
    useEffect(() => {
        if (member) {
            setFormData({
                ...member,
                birth_date: member.birth_date ? member.birth_date.split('T')[0] : '',
                decision_date: member.decision_date ? member.decision_date.split('T')[0] : '',
            });
            // Try to find branch from city if possible, but member doesn't store branch_id directly usually.
            // We'll rely on city matching if we want to pre-select, or just leave empty if not explicit.
        }
    }, [member]);

    // Fetch definitions and branches/regions
    useEffect(() => {
        const fetchDefinitions = async () => {
            try {
                const [workplaceData, positionData] = await Promise.all([
                    MemberService.getDefinitions('workplace'),
                    MemberService.getDefinitions('position')
                ]);
                setWorkplaces(workplaceData);
                setPositions(positionData);
            } catch (error) {
                console.error('Tanımlar yüklenirken hata:', error);
            }
        };

        const fetchBranchesAndRegions = async () => {
            try {
                const { data: branchData } = await supabase
                    .from('branches')
                    .select('id, branch_name, city, region_id, is_active')
                    .eq('is_active', true);

                if (branchData) {
                    setBranches(branchData.map(b => ({
                        id: b.id,
                        branch_name: b.branch_name,
                        city: b.city,
                        region_id: b.region_id
                    })));
                }

                const { data: regionData } = await supabase
                    .from('regions')
                    .select('id, name')
                    .order('name');

                if (regionData) setRegions(regionData);

            } catch (error) {
                console.error('Şube/Bölge verileri alınamadı:', error);
            }
        };

        if (isOpen) {
            fetchDefinitions();
            fetchBranchesAndRegions();
        }
    }, [isOpen]);

    // Sync selectedBranchId when member or branches load
    useEffect(() => {
        if (isOpen && member && branches.length > 0 && member.city) {
            const matchingBranch = branches.find(b => b.city === member.city);
            if (matchingBranch) {
                setSelectedBranchId(matchingBranch.id);
            }
        }
    }, [isOpen, member, branches]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (name === 'selected_branch_id') {
            setSelectedBranchId(value);
            const selectedBranch = branches.find(b => b.id === value);
            if (selectedBranch) {
                setFormData(prev => ({
                    ...prev,
                    city: selectedBranch.city,
                    region: selectedBranch.region_id
                }));
            }
        } else if (name === 'region') {
            setFormData(prev => ({ ...prev, region: value || null }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'number'
                    ? (value === '' ? null : Math.max(0, parseInt(value)))
                    : value
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await MemberService.updateMember(member.id, formData);
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Update error:', err);
            setError('Güncelleme sırasında bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper for input fields
    const InputField = ({
        label, name, type = 'text', required = false,
        icon: Icon, className = '', options = null, disabled = false, ...rest
    }: any) => (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {options ? (
                <select
                    name={name}
                    value={(formData as any)[name] || ''}
                    onChange={handleChange}
                    disabled={disabled}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    {...rest}
                >
                    <option value="">Seçiniz</option>
                    {options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={(formData as any)[name] || ''}
                    onChange={handleChange}
                    required={required}
                    disabled={disabled}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    {...rest}
                />
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[700px] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 flex justify-between items-center sticky top-0 z-20">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <User className="w-6 h-6 text-blue-600" />
                            Üye Düzenle
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {member.first_name} {member.last_name} ({member.membership_number || 'No Yok'})
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
                    {/* Tabs Panel */}
                    <div className="px-6 pt-6 sticky top-0 z-10 bg-white dark:bg-slate-900">
                        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 flex gap-1 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'personal', label: 'Kişisel Bilgiler', icon: User },
                                { id: 'contact', label: 'İletişim', icon: Phone },
                                { id: 'work', label: 'Kurum & Görev', icon: Briefcase },
                                { id: 'membership', label: 'Üyelik Durumu', icon: BadgeCheck },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar bg-slate-50/50 dark:bg-black/20">
                        <div className="max-w-3xl mx-auto space-y-6">

                            {/* Personal Tab */}
                            {activeTab === 'personal' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InputField label="Ad" name="first_name" required icon={User} />
                                    <InputField label="Soyad" name="last_name" required icon={User} />
                                    <InputField label="TC Kimlik No" name="tc_identity" required icon={Hash} />
                                    <InputField label="Cinsiyet" name="gender" icon={Users} options={[
                                        { value: 'Erkek', label: 'Erkek' },
                                        { value: 'Kadın', label: 'Kadın' }
                                    ]} />
                                    <InputField label="Doğum Tarihi" name="birth_date" type="date" icon={Calendar} />
                                    <InputField label="Doğum Yeri" name="birth_place" icon={MapPin} />
                                    <InputField label="Baba Adı" name="father_name" icon={User} />
                                    <InputField label="Anne Adı" name="mother_name" icon={User} />
                                    <InputField label="Medeni Durum" name="marital_status" icon={Heart} options={[
                                        { value: 'Evli', label: 'Evli' },
                                        { value: 'Bekar', label: 'Bekar' }
                                    ]} />
                                    <InputField label="Çocuk Sayısı" name="children_count" type="number" icon={Users} min="0" />
                                    <InputField label="Eğitim Durumu" name="education_level" icon={GraduationCap} options={[
                                        { value: 'İlköğretim', label: 'İlköğretim' },
                                        { value: 'Lise', label: 'Lise' },
                                        { value: 'Önlisans', label: 'Önlisans' },
                                        { value: 'Lisans', label: 'Lisans' },
                                        { value: 'Yüksek Lisans', label: 'Yüksek Lisans' },
                                        { value: 'Doktora', label: 'Doktora' },
                                    ]} />
                                    <InputField
                                        label="Kan Grubu"
                                        name="blood_group"
                                        icon={Activity}
                                        options={[
                                            { value: 'A Rh+', label: 'A Rh+' },
                                            { value: 'A Rh-', label: 'A Rh-' },
                                            { value: 'B Rh+', label: 'B Rh+' },
                                            { value: 'B Rh-', label: 'B Rh-' },
                                            { value: 'AB Rh+', label: 'AB Rh+' },
                                            { value: 'AB Rh-', label: 'AB Rh-' },
                                            { value: '0 Rh+', label: '0 Rh+' },
                                            { value: '0 Rh-', label: '0 Rh-' },
                                        ]}
                                    />
                                </div>
                            )}

                            {/* Contact Tab */}
                            {activeTab === 'contact' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField label="Telefon" name="phone" type="tel" icon={Phone} />
                                        <InputField label="E-Posta" name="email" type="email" icon={Mail} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField label="İl" name="city" icon={MapPin} disabled={!canEditBranch} options={cities.map(c => ({ value: c.name, label: c.name }))} />
                                        <InputField label="İlçe" name="district" icon={MapPin} />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            Adres
                                        </label>
                                        <textarea
                                            name="address"
                                            value={formData.address || ''}
                                            onChange={handleChange}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                        />
                                    </div>

                                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-red-500" />
                                            Acil Durum İletişim
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <InputField label="İlgili Kişi Adı" name="emergency_contact_name" icon={User} />
                                            <InputField label="Yakınlık Derecesi" name="emergency_contact_relation" icon={Users} />
                                            <InputField label="İletişim Telefonu" name="emergency_contact_phone" type="tel" icon={Phone} className="md:col-span-2" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Work Tab */}
                            {activeTab === 'work' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InputField label="Kurum Adı" name="institution" icon={Building2} className="md:col-span-2" />
                                    <InputField
                                        label="İş Yeri"
                                        name="workplace"
                                        icon={Briefcase}
                                        options={workplaces.map(w => ({ value: w.label, label: w.label }))}
                                    />
                                    <InputField
                                        label="Kadro Unvanı"
                                        name="position"
                                        icon={Briefcase}
                                        options={positions.map(p => ({ value: p.label, label: p.label }))}
                                    />
                                    <InputField label="Kurum Sicil No" name="institution_register_no" icon={FileText} />
                                    <InputField label="Emekli Sicil No" name="retirement_register_no" icon={FileText} />

                                    {/* Branch and Region Selection */}
                                    {canEditBranch && (
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    Şube Seçimi
                                                </label>
                                                <select
                                                    name="selected_branch_id"
                                                    value={selectedBranchId || ''}
                                                    onChange={handleChange}
                                                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                >
                                                    <option value="">Şube Seçiniz (Otomatik Doldur)</option>
                                                    {branches.map(b => (
                                                        <option key={b.id} value={b.id}>
                                                            {b.branch_name} ({b.city})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                    Bölge
                                                </label>
                                                <select
                                                    name="region"
                                                    value={formData.region || ''}
                                                    onChange={handleChange}
                                                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                >
                                                    <option value="">Bölge Seçiniz</option>
                                                    {regions.map(r => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Membership Tab */}
                            {activeTab === 'membership' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InputField label="Üye Numarası" name="membership_number" icon={Hash} />
                                    <InputField label="Karar Numarası" name="decision_number" icon={FileText} />
                                    <InputField label="Üyelik Karar Tarihi" name="decision_date" type="date" icon={Calendar} />
                                    <InputField label="Üyelik Durumu" name="membership_status" icon={Activity} options={[
                                        { value: 'active', label: 'Aktif Üye' },
                                        { value: 'pending', label: 'Onay Bekliyor' },
                                        { value: 'inactive', label: 'Pasif' },
                                        { value: 'suspended', label: 'Askıda' },
                                        { value: 'resigned', label: 'İstifa' },
                                    ]} />

                                    <div className="md:col-span-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="is_active"
                                                checked={formData.is_active || false}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                                className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">Sistem Giriş Yetkisi</div>
                                                <div className="text-xs text-slate-500">Üyenin sisteme giriş yapabilmesini sağlar.</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Değişiklikleri Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
