'use client';

import { useState, useEffect } from 'react';
import { X, Save, Upload, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cityOptions } from '@/lib/cities';

interface DiscountModalProps {
    discount?: any;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DiscountModal({ discount, isOpen, onClose, onSuccess }: DiscountModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        discount_amount: '',
        city: '',
        district: '',
        address: '',
        phone: '',
        website_url: '',
        image_url: '',
        category: '',
        is_active: true
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (discount) {
            setFormData({
                title: discount.title || '',
                description: discount.description || '',
                discount_amount: discount.discount_amount || '',
                city: discount.city || '',
                district: discount.district || '',
                address: discount.address || '',
                phone: discount.phone || '',
                website_url: discount.website_url || '',
                image_url: discount.image_url || '',
                category: discount.category || '',
                is_active: discount.is_active ?? true
            });
        } else {
            setFormData({
                title: '',
                description: '',
                discount_amount: '',
                city: '',
                district: '',
                address: '',
                phone: '',
                website_url: '',
                image_url: '',
                category: '',
                is_active: true
            });
        }
    }, [discount, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError('Dosya boyutu 5MB\'dan küçük olmalıdır.');
            return;
        }

        if (!file.type.startsWith('image/')) {
            setError('Lütfen geçerli bir resim dosyası seçiniz.');
            return;
        }

        try {
            setLoading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
            const { error: uploadError, data } = await supabase.storage
                .from('discount-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('discount-images')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, image_url: publicUrl }));
        } catch (err) {
            console.error('Upload error:', err);
            setError('Resim yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (discount) {
                const { error } = await supabase
                    .from('discounts')
                    .update(formData)
                    .eq('id', discount.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('discounts')
                    .insert([formData]);
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error saving discount:', err);
            setError('Kaydedilirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-4 border border-gray-200 dark:border-slate-700 w-full max-w-2xl shadow-lg dark:shadow-slate-900/40 rounded-lg bg-white dark:bg-slate-900">
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                        {discount ? 'İndirim Düzenle' : 'Yeni İndirim Ekle'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Firma Adı</label>
                            <input
                                type="text"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                placeholder="Örn: Özel Hastane A.Ş."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">İndirim Tutarı/Oranı</label>
                            <input
                                type="text"
                                name="discount_amount"
                                required
                                value={formData.discount_amount}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                placeholder="Örn: %20 veya 500 TL"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Açıklama</label>
                        <textarea
                            name="description"
                            rows={3}
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            placeholder="İndirim detayları..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">İl</label>
                            <select
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            >
                                <option value="">Seçiniz</option>
                                {cityOptions.map(city => (
                                    <option key={city.code} value={city.name}>{city.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">İlçe</label>
                            <input
                                type="text"
                                name="district"
                                value={formData.district}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telefon</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Web Sitesi</label>
                            <input
                                type="url"
                                name="website_url"
                                value={formData.website_url}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Firma Görseli (1:1 Önerilir)</label>
                        <div className="flex items-center space-x-4">
                            {formData.image_url && (
                                <div className="relative w-24 h-24 border rounded-md overflow-hidden flex-shrink-0 group">
                                    <img
                                        src={formData.image_url}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <div className="flex-1">
                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                                        <p className="mb-1 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Yüklemek için tıklayın</span></p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG (MAX. 5MB)</p>
                                    </div>
                                    <input type='file' className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Aktif</span>
                        </label>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                            <Save className="w-4 h-4 mr-2" />
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
