'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Phone, Globe, ExternalLink, Search, Filter } from 'lucide-react';
import { cityOptions } from '@/lib/cities';
import Link from 'next/link';

interface Discount {
    id: string;
    title: string;
    description: string;
    discount_amount: string;
    city: string;
    district: string;
    website_url: string;
    image_url: string;
    phone: string;
    category: string;
}

export default function DiscountsPage() {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const { data, error } = await supabase
                .from('discounts')
                .select('*')
                .eq('is_active', true)
                .order('title', { ascending: true });

            if (error) throw error;
            setDiscounts(data || []);
        } catch (error) {
            console.error('İndirimler yüklenirken hata:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDiscounts = discounts.filter(discount => {
        const matchesSearch = discount.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            discount.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCity = selectedCity ? discount.city === selectedCity : true;
        const matchesCategory = selectedCategory ? discount.category === selectedCategory : true;

        return matchesSearch && matchesCity && matchesCategory;
    });

    // Get unique categories for filter
    const categories = Array.from(new Set(discounts.map(d => d.category).filter(Boolean)));

    return (
        <>
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Anlaşmalı Kurumlar ve İndirimler
                    </h1>
                    <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                        Üyelerimize özel indirim ve avantajlardan yararlanın
                    </p>
                </div>
            </section>

            {/* Filter Section */}
            <section className="bg-gray-50 border-b border-gray-200 py-8 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Firma veya hizmet ara..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                            />
                        </div>
                        <div className="w-full md:w-64">
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <select
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm appearance-none bg-white"
                                >
                                    <option value="">Tüm Şehirler</option>
                                    {cityOptions.map(city => (
                                        <option key={city.code} value={city.name}>{city.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {categories.length > 0 && (
                            <div className="w-full md:w-64">
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm appearance-none bg-white"
                                    >
                                        <option value="">Tüm Kategoriler</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <section className="py-12 bg-white min-h-[500px]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {loading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                            <p className="mt-4 text-gray-500">İndirimler yükleniyor...</p>
                        </div>
                    ) : filteredDiscounts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredDiscounts.map((discount) => (
                                <div key={discount.id} className="bg-white border boundary-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            {discount.image_url ? (
                                                <img src={discount.image_url} alt={discount.title} className="w-20 h-20 object-cover rounded-lg border border-gray-100" />
                                            ) : (
                                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-2xl border border-blue-100">
                                                    {discount.title.substring(0, 1)}
                                                </div>
                                            )}
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                                                {discount.discount_amount} İndirim
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{discount.title}</h3>

                                        {(discount.city || discount.district) && (
                                            <div className="flex items-center text-sm text-gray-500 mb-3">
                                                <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0" />
                                                {discount.city} {discount.district && `/ ${discount.district}`}
                                            </div>
                                        )}

                                        <p className="text-gray-600 mb-6 line-clamp-3 text-sm leading-relaxed">
                                            {discount.description}
                                        </p>

                                        <div className="space-y-2 pt-4 border-t border-gray-100">
                                            {discount.phone && (
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Phone className="w-4 h-4 mr-2 text-primary-500" />
                                                    <a href={`tel:${discount.phone}`} className="hover:text-primary-600">{discount.phone}</a>
                                                </div>
                                            )}
                                            {discount.website_url && (
                                                <div className="flex items-center text-sm">
                                                    <Globe className="w-4 h-4 mr-2 text-primary-500" />
                                                    <a
                                                        href={discount.website_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center"
                                                    >
                                                        Web Sitesi
                                                        <ExternalLink className="w-3 h-3 ml-1" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Sonuç Bulunamadı</h3>
                            <p className="text-gray-500">
                                Aradığınız kriterlere uygun indirim bulunmamaktadır.
                            </p>
                            <button
                                onClick={() => { setSearchTerm(''); setSelectedCity(''); setSelectedCategory(''); }}
                                className="mt-4 text-primary-600 hover:text-primary-800 font-medium"
                            >
                                Filtreleri Temizle
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-800 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">Kamu Ulaşım Sen</h3>
                            <p className="text-gray-300">
                                Ulaştırma sektöründeki kamu çalışanlarının haklarını korumak ve geliştirmek için Aralık 2024'te kurulduk.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-4">Hızlı Linkler</h4>
                            <ul className="space-y-2">
                                <li><Link href="/" className="text-gray-300 hover:text-white">Ana Sayfa</Link></li>
                                <li><Link href="/hakkimizda" className="text-gray-300 hover:text-white">Hakkımızda</Link></li>
                                <li><Link href="/yonetim" className="text-gray-300 hover:text-white">Yönetim</Link></li>
                                <li><Link href="/subelerimiz" className="text-gray-300 hover:text-white">Şubelerimiz</Link></li>
                                <li><Link href="/haberler" className="text-gray-300 hover:text-white">Haberler</Link></li>
                                <li><Link href="/indirimler" className="text-gray-300 hover:text-white">İndirimler</Link></li>
                                <li><Link href="/#iletisim" className="text-gray-300 hover:text-white">İletişim</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold mb-4">İletişim</h4>
                            <div className="space-y-2 text-gray-300">
                                <p>Fidanlık Mahallesi Adakale Sokak No:25/24</p>
                                <p>Çankaya/Ankara, Türkiye</p>
                                <p>Tel: 0850 840 0674</p>
                                <p>E-posta: bilgi@kamuulasimsen.org</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-gray-700 mt-8 pt-8 text-center">
                        <p className="text-gray-300">
                            © 2024 Kamu Ulaşım Sen. Tüm hakları saklıdır.
                        </p>
                    </div>
                </div>
            </footer>
        </>
    );
}
