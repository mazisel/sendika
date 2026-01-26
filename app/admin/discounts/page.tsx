'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Edit, Trash2, MapPin, Globe, ExternalLink, Clock } from 'lucide-react';
import DiscountModal from '@/components/discounts/DiscountModal';
import Image from 'next/image';

interface Discount {
    id: string;
    title: string;
    description: string;
    discount_amount: string;
    city: string;
    district: string;
    website_url: string;
    image_url: string;
    is_active: boolean;
    phone: string;
    end_date?: string;
}

export default function AdminDiscountsPage() {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedDiscount, setSelectedDiscount] = useState<Discount | undefined>(undefined);

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const { data, error } = await supabase
                .from('discounts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDiscounts(data || []);
        } catch (error) {
            console.error('Error fetching discounts:', error);
            alert('İndirimler yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu indirimi silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('discounts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchDiscounts();
        } catch (error) {
            console.error('Error deleting discount:', error);
            alert('Silme işlemi başarısız oldu');
        }
    };

    const filteredDiscounts = discounts.filter(discount =>
        discount.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        discount.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">İndirimler</h1>
                    <p className="text-gray-600 dark:text-slate-400 mt-1">Anlaşmalı kurum ve indirim listesi</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedDiscount(undefined);
                        setShowModal(true);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni İndirim Ekle
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-lg p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Firma adı veya şehir ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDiscounts.map((discount) => (
                        <div key={discount.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-3">
                                        {discount.image_url ? (
                                            <img src={discount.image_url} alt={discount.title} className="w-16 h-16 object-cover rounded bg-gray-50 dark:bg-slate-800" />
                                        ) : (
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded flex items-center justify-center font-bold text-xl">
                                                {discount.title.substring(0, 1)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100">{discount.title}</h3>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${discount.is_active
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                {discount.is_active ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                                        <span className="font-bold text-blue-600 dark:text-blue-400 mr-2">{discount.discount_amount}</span>
                                        <span>İndirim</span>
                                    </div>
                                    {(discount.city || discount.district) && (
                                        <div className="flex items-center text-sm text-gray-500 dark:text-slate-500">
                                            <MapPin className="w-4 h-4 mr-2" />
                                            {discount.city} {discount.district && `/ ${discount.district}`}
                                        </div>
                                    )}
                                    {discount.end_date && (
                                        <div className="flex items-center text-sm text-amber-600 dark:text-amber-400">
                                            <Clock className="w-4 h-4 mr-2" />
                                            Son Geçerlilik: {new Date(discount.end_date).toLocaleDateString('tr-TR')}
                                        </div>
                                    )}
                                    {discount.website_url && (
                                        <a
                                            href={discount.website_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center text-sm text-blue-600 hover:underline"
                                        >
                                            <Globe className="w-4 h-4 mr-2" />
                                            Web Sitesi
                                            <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2 mb-4">
                                    {discount.description}
                                </p>

                                <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                                    <button
                                        onClick={() => {
                                            setSelectedDiscount(discount);
                                            setShowModal(true);
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                                        title="Düzenle"
                                    >
                                        <Edit className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(discount.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <DiscountModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        fetchDiscounts();
                        setShowModal(false);
                    }}
                    discount={selectedDiscount}
                />
            )}
        </div>
    );
}
