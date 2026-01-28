'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { DocumentService } from '@/lib/services/documentService';
import { uploadFile } from '@/lib/storage';
import { AdminAuth } from '@/lib/auth';
import { Loader2, Save, Upload, Plus, Trash2, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

// Helper to get public URL
const getLogoUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return supabase.storage.from('images').getPublicUrl(url).data.publicUrl;
};

interface DefaultSettingsFormData {
    header_title: string;
    header_org_name: string;
    sender_unit: string;
    logo_url: string;
    right_logo_url: string;
    footer_org_name: string;
    footer_address: string;
    footer_contact: string;
    footer_phone: string;
    text_align: string;
    receiver_text_align: string;
    signers: { name: string; title: string }[];
}


export default function DefaultDocumentSettings() {
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const { register, control, handleSubmit, setValue, watch, formState: { errors } } = useForm<DefaultSettingsFormData>({
        defaultValues: {

            header_title: 'T.C.',
            header_org_name: 'SENDİKA YÖNETİM SİSTEMİ',
            sender_unit: 'GENEL MERKEZ YÖNETİM KURULU',
            logo_url: '',
            right_logo_url: '',
            footer_org_name: 'SENDİKA YÖNETİM SİSTEMİ',
            footer_address: 'Genel Merkez Binası, Ankara',
            footer_contact: 'Genel Sekreterlik',
            footer_phone: '0312 000 00 00',
            text_align: 'justify',
            receiver_text_align: 'left',
            signers: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "signers"
    });

    const logoUrl = watch('logo_url');
    const rightLogoUrl = watch('right_logo_url');

    useEffect(() => {
        const user = AdminAuth.getCurrentUser();
        setCurrentUser(user);
        loadDefaults();
    }, []);

    const loadDefaults = async () => {
        setLoading(true);
        try {
            const { data, error } = await DocumentService.getDocumentDefaults();
            if (data) {
                setValue('header_title', data.header_title || 'T.C.');
                setValue('header_org_name', data.header_org_name || '');
                setValue('sender_unit', data.sender_unit || '');
                setValue('logo_url', data.logo_url || '');
                setValue('right_logo_url', data.right_logo_url || '');
                setValue('footer_org_name', data.footer_org_name || '');
                setValue('footer_address', data.footer_address || '');
                setValue('footer_contact', data.footer_contact || '');
                setValue('footer_phone', data.footer_phone || '');
                setValue('text_align', data.text_align || 'justify');
                setValue('receiver_text_align', data.receiver_text_align || 'left');

                if (data.signers && Array.isArray(data.signers) && data.signers.length > 0) {
                    setValue('signers', data.signers);
                }
            }
        } catch (error) {
            console.error('Error loading defaults:', error);
            // toast.error('Ayarlar yüklenemedi'); // Initial load error might be fine if empty
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (file: File, side: 'left' | 'right') => {
        if (!file) return;

        setUploadingLogo(true);
        const { success, url, error } = await uploadFile(file);

        if (success && url) {
            if (side === 'left') {
                setValue('logo_url', url);
            } else {
                setValue('right_logo_url', url);
            }
            toast.success('Logo yüklendi');
        } else {
            toast.error(error || 'Logo yüklenemedi');
        }
        setUploadingLogo(false);
    };

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            const { error } = await DocumentService.saveDocumentDefaults(data);
            if (error) throw error;
            toast.success('Varsayılan ayarlar kaydedildi');
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toast.error('Kaydedilemedi: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Varsayılan Belge Tanımları</h2>
                        <p className="text-sm text-slate-600">
                            Yeni belge oluştururken otomatik olarak gelecek varsayılan başlık, logo ve imza ayarları.
                        </p>
                    </div>
                    <button
                        onClick={handleSubmit(onSubmit)}
                        disabled={loading || uploadingLogo}
                        className="inline-flex items-center space-x-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Kaydet</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Headers & Logos */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Başlık ve Logolar</h3>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Left Logo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Sol Logo</label>
                                <div className="flex items-center space-x-2">
                                    <div className="w-20 h-20 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                                        {logoUrl ? (
                                            <>
                                                <img src={getLogoUrl(logoUrl)} alt="Sol Logo" className="w-full h-full object-contain p-1" />
                                                <button
                                                    onClick={() => setValue('logo_url', '')}
                                                    type="button"
                                                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : (
                                            <Upload className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="left-logo-upload"
                                            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'left')}
                                        />
                                        <label
                                            htmlFor="left-logo-upload"
                                            className="cursor-pointer text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg inline-block w-full text-center transition-colors"
                                        >
                                            {uploadingLogo ? '...' : 'Logo Yükle'}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Right Logo */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Sağ Logo</label>
                                <div className="flex items-center space-x-2">
                                    <div className="w-20 h-20 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                                        {rightLogoUrl ? (
                                            <>
                                                <img src={getLogoUrl(rightLogoUrl)} alt="Sağ Logo" className="w-full h-full object-contain p-1" />
                                                <button
                                                    onClick={() => setValue('right_logo_url', '')}
                                                    type="button"
                                                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : (
                                            <Upload className="w-6 h-6 text-slate-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id="right-logo-upload"
                                            onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 'right')}
                                        />
                                        <label
                                            htmlFor="right-logo-upload"
                                            className="cursor-pointer text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg inline-block w-full text-center transition-colors"
                                        >
                                            {uploadingLogo ? '...' : 'Logo Yükle'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Başlık (T.C.)</label>
                                <input
                                    {...register('header_title')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kurum Adı</label>
                                <input
                                    {...register('header_org_name')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gönderen Birim</label>
                                <input
                                    {...register('sender_unit')}
                                    placeholder="Örn: GENEL MERKEZ YÖNETİM KURULU"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Footer & Signers */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Alt Bilgi ve İmzalar</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Kurum Adı (Altbilgi)</label>
                                <input
                                    {...register('footer_org_name')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Adres</label>
                                <input
                                    {...register('footer_address')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">İletişim</label>
                                    <input
                                        {...register('footer_contact')}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
                                    <input
                                        {...register('footer_phone')}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-violet-500 focus:border-violet-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <label className="block text-sm font-medium text-slate-700">Varsayılan İmzalar</label>
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-2">
                                    <input
                                        {...register(`signers.${index}.name` as const)}
                                        placeholder="Ad Soyad"
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    />
                                    <input
                                        {...register(`signers.${index}.title` as const)}
                                        placeholder="Unvan"
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => append({ name: '', title: '' })}
                                className="flex items-center space-x-1 text-sm text-violet-600 hover:text-violet-700 font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                <span>İmza Ekle</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
