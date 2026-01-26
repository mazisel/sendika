'use client';

import React from 'react';
import { Member } from '@/lib/types';
import { cityOptions } from '@/lib/cities';
import { getDistrictsByCity } from '@/lib/districts';

// Sort cities alphabetically for dropdowns
const sortedCityOptions = [...cityOptions].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

export interface FilterState {
    city: string;
    district: string;
    workplace: string;
    position: string;
    gender: string;
    education: string;
    blood_group: string;
    minAge: string;
    maxAge: string;
    region: string;
    maritalStatus: string;
    tcIdentity: string;
    firstName: string;
    lastName: string;
    fatherName: string;
    motherName: string;
    birthPlace: string;
    birthDate: string;
    membershipNumber: string;
    workCity: string;
    workDistrict: string;
    institution: string;
    institutionRegNo: string;
    retirementRegNo: string;
    address: string;
    email: string;
    phone: string;
    membershipStatus: string;
    membershipStartDate: string;
    membershipEndDate: string;
    resignationReason: string;
    resignationStartDate: string;
    resignationEndDate: string;
    membershipDuration: string;
    dueStatus: string;
}

interface MemberFilterTabProps {
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    onSearch: () => void;
    onClear: () => void;
    results: Member[] | null;
    onRowClick: (member: Member) => void;
    onConditionalSearch?: (conditions: Condition[]) => void;
    regions?: { id: string; name: string }[];
}

import ConditionBuilder, { Condition } from './ConditionBuilder';

export default function MemberFilterTab({ filters, setFilters, onSearch, onClear, results, onRowClick, onConditionalSearch, regions = [] }: MemberFilterTabProps) {
    const [activeSearchTab, setActiveSearchTab] = React.useState('identity');
    const [conditions, setConditions] = React.useState<Condition[]>([
        { id: '1', field: 'city', operator: 'isEmpty', value: '' }
    ]);

    const updateFilter = (key: keyof FilterState, value: string) => {
        setFilters({ ...filters, [key]: value });
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-4 animate-in slide-in-from-top-2">
            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                {['identity', 'job', 'contact', 'membership'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveSearchTab(tab)}
                        className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${activeSearchTab === tab
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-gray-200 dark:border-slate-600'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        {tab === 'identity' && 'KİMLİK BİLGİLERİ'}
                        {tab === 'job' && 'MESLEKİ BİLGİLER'}
                        {tab === 'contact' && 'İLETİŞİM BİLGİLERİ'}
                        {tab === 'membership' && 'ÜYELİK BİLGİLERİ'}
                    </button>
                ))}
                <button
                    onClick={() => setActiveSearchTab('conditional')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${activeSearchTab === 'conditional'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-gray-200 dark:border-slate-600'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                        }`}
                >
                    KOŞULLU ARAMA
                </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {/* KİMLİK Tab */}
                {activeSearchTab === 'identity' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">TC Kimlik</label>
                                <input
                                    type="text"
                                    value={filters.tcIdentity}
                                    onChange={(e) => updateFilter('tcIdentity', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="TC Kimlik Numarası"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Ad</label>
                                <input
                                    type="text"
                                    value={filters.firstName}
                                    onChange={(e) => updateFilter('firstName', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Adı"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Soyad</label>
                                <input
                                    type="text"
                                    value={filters.lastName}
                                    onChange={(e) => updateFilter('lastName', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Soyadı"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Baba Adı</label>
                                <input
                                    type="text"
                                    value={filters.fatherName}
                                    onChange={(e) => updateFilter('fatherName', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Baba Adı"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Anne Adı</label>
                                <input
                                    type="text"
                                    value={filters.motherName}
                                    onChange={(e) => updateFilter('motherName', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Anne Adı"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Cinsiyet</label>
                                <select
                                    value={filters.gender}
                                    onChange={(e) => updateFilter('gender', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    <option value="Erkek">Erkek</option>
                                    <option value="Kadın">Kadın</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Doğum Yeri</label>
                                <select
                                    value={filters.birthPlace}
                                    onChange={(e) => updateFilter('birthPlace', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    {sortedCityOptions.map(city => (
                                        <option key={city.code} value={city.name}>{city.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Doğum Tarihi</label>
                                <input
                                    type="date"
                                    value={filters.birthDate}
                                    onChange={(e) => updateFilter('birthDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Kan Grubu</label>
                                <select
                                    value={filters.blood_group}
                                    onChange={(e) => updateFilter('blood_group', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    <option value="A Rh+">A Rh+</option>
                                    <option value="A Rh-">A Rh-</option>
                                    <option value="B Rh+">B Rh+</option>
                                    <option value="B Rh-">B Rh-</option>
                                    <option value="AB Rh+">AB Rh+</option>
                                    <option value="AB Rh-">AB Rh-</option>
                                    <option value="0 Rh+">0 Rh+</option>
                                    <option value="0 Rh-">0 Rh-</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Öğrenim</label>
                                <select
                                    value={filters.education}
                                    onChange={(e) => updateFilter('education', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    <option value="İlkokul">İlkokul</option>
                                    <option value="Ortaokul">Ortaokul</option>
                                    <option value="Lise">Lise</option>
                                    <option value="Ön Lisans">Ön Lisans</option>
                                    <option value="Lisans">Lisans</option>
                                    <option value="Yüksek Lisans">Yüksek Lisans</option>
                                    <option value="Doktora">Doktora</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Medeni Durum</label>
                                <select
                                    value={filters.maritalStatus}
                                    onChange={(e) => updateFilter('maritalStatus', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    <option value="Evli">Evli</option>
                                    <option value="Bekar">Bekar</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Yaş Aralığı</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={filters.minAge}
                                        onChange={(e) => updateFilter('minAge', e.target.value)}
                                        className="w-1/2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                        placeholder="Min"
                                        min="0"
                                        max="120"
                                        onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                    />
                                    <input
                                        type="number"
                                        value={filters.maxAge}
                                        onChange={(e) => updateFilter('maxAge', e.target.value)}
                                        className="w-1/2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                        placeholder="Max"
                                        min="0"
                                        max="120"
                                        onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* GÖREV Tab */}
                {activeSearchTab === 'job' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Bölge</label>
                                <select
                                    value={filters.region}
                                    onChange={(e) => updateFilter('region', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Bölge seçiniz</option>
                                    {regions.map(r => (
                                        <option key={r.id} value={r.name}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Görev İl</label>
                                <select
                                    value={filters.workCity}
                                    onChange={(e) => {
                                        setFilters({ ...filters, workCity: e.target.value, workDistrict: '' });
                                    }}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    {sortedCityOptions.map(city => (
                                        <option key={city.code} value={city.name}>{city.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Görev İlçe</label>
                                <select
                                    value={filters.workDistrict}
                                    onChange={(e) => updateFilter('workDistrict', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    disabled={!filters.workCity}
                                >
                                    <option value="">Tümünü Seç</option>
                                    {filters.workCity && getDistrictsByCity(filters.workCity).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">İş Yeri</label>
                                <input
                                    type="text"
                                    value={filters.workplace}
                                    onChange={(e) => updateFilter('workplace', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="İş Yeri seçiniz"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Kurum</label>
                                <input
                                    type="text"
                                    value={filters.institution}
                                    onChange={(e) => updateFilter('institution', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Kurum seçiniz"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Kadro Unvanı</label>
                                <input
                                    type="text"
                                    value={filters.position}
                                    onChange={(e) => updateFilter('position', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Kadro unvanı seçiniz"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Kurum Sicil No</label>
                                <input
                                    type="text"
                                    value={filters.institutionRegNo}
                                    onChange={(e) => updateFilter('institutionRegNo', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Kurum Sicil No"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Emekli Sicil No</label>
                                <input
                                    type="text"
                                    value={filters.retirementRegNo}
                                    onChange={(e) => updateFilter('retirementRegNo', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Emekli Sicil No"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* İLETİŞİM Tab */}
                {activeSearchTab === 'contact' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Adres</label>
                            <textarea
                                value={filters.address}
                                onChange={(e) => updateFilter('address', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                placeholder="Adres"
                                rows={2}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">İl</label>
                                <select
                                    value={filters.city}
                                    onChange={(e) => setFilters({ ...filters, city: e.target.value, district: '' })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    {sortedCityOptions.map(city => (
                                        <option key={city.code} value={city.name}>{city.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">İlçe</label>
                                <select
                                    value={filters.district}
                                    onChange={(e) => updateFilter('district', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    disabled={!filters.city}
                                >
                                    <option value="">Tümünü Seç</option>
                                    {filters.city && getDistrictsByCity(filters.city).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">E-Posta</label>
                                <input
                                    type="email"
                                    value={filters.email}
                                    onChange={(e) => updateFilter('email', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="E Posta"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Telefon Numarası</label>
                                <input
                                    type="text"
                                    value={filters.phone}
                                    onChange={(e) => updateFilter('phone', e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Telefon Numarası"
                                    maxLength={10}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ÜYELİK Tab */}
                {activeSearchTab === 'membership' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Üye No</label>
                                <input
                                    type="text"
                                    value={filters.membershipNumber}
                                    onChange={(e) => updateFilter('membershipNumber', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                    placeholder="Üye No"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Üyelik Durumu</label>
                                <select
                                    value={filters.membershipStatus}
                                    onChange={(e) => updateFilter('membershipStatus', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    <option value="pending">Beklemede</option>
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Pasif</option>
                                    <option value="suspended">Askıda</option>
                                    <option value="resigned">İstifa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Aidat Durumu</label>
                                <select
                                    value={filters.dueStatus}
                                    onChange={(e) => updateFilter('dueStatus', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    <option value="paid">Ödendi</option>
                                    <option value="unpaid">Ödenmedi</option>
                                    <option value="partial">Kısmi Ödeme</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Üyelik Başlangıç Tarihi</label>
                                <input
                                    type="date"
                                    value={filters.membershipStartDate}
                                    onChange={(e) => updateFilter('membershipStartDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Üyelik Bitiş Tarihi</label>
                                <input
                                    type="date"
                                    value={filters.membershipEndDate}
                                    onChange={(e) => updateFilter('membershipEndDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">İstifa Nedeni</label>
                                <select
                                    value={filters.resignationReason}
                                    onChange={(e) => updateFilter('resignationReason', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                >
                                    <option value="">Tümünü Seç</option>
                                    <option value="İsteğe Bağlı">İsteğe Bağlı</option>
                                    <option value="Emeklilik">Emeklilik</option>
                                    <option value="İşten Ayrılma">İşten Ayrılma</option>
                                    <option value="Nakil">Nakil</option>
                                    <option value="Vefat">Vefat</option>
                                    <option value="Diğer">Diğer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">İstifa Başlangıç</label>
                                <input
                                    type="date"
                                    value={filters.resignationStartDate}
                                    onChange={(e) => updateFilter('resignationStartDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">İstifa Bitiş</label>
                                <input
                                    type="date"
                                    value={filters.resignationEndDate}
                                    onChange={(e) => updateFilter('resignationEndDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* KOŞULLU ARAMA Tab */}
                {activeSearchTab === 'conditional' && (
                    <div className="space-y-4">
                        <ConditionBuilder
                            conditions={conditions}
                            setConditions={setConditions}
                            onSearch={() => onConditionalSearch && onConditionalSearch(conditions)}
                            showTitle={false}
                            buttonText="Filtrele"
                        />
                    </div>
                )}
            </div>

            {/* Action Buttons (Hide in conditional mode since it has its own search button) */}
            {activeSearchTab !== 'conditional' && (
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClear}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        Formu Temizle
                    </button>
                    <button
                        onClick={onSearch}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        Sonuçları Listele
                    </button>
                </div>
            )}
            {/* Results Table */}
            {results && results.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-top-4 mt-6">
                    <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 flex justify-between items-center">
                        <h3 className="font-medium text-slate-900 dark:text-slate-100">
                            Bulunan Kayıtlar ({results.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                            <thead className="bg-gray-50 dark:bg-slate-900/60">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Üye No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TC Kimlik</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İl / İlçe</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-slate-800">
                                {results.map((member) => (
                                    <tr
                                        key={member.id}
                                        className="hover:bg-gray-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                                        onClick={() => onRowClick(member)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                                            {member.membership_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                                            {member.first_name} {member.last_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                                            {member.tc_identity}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                                            {member.city} / {member.district}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${member.membership_status === 'active' ? 'bg-green-100 text-green-800' :
                                                member.membership_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {member.membership_status === 'active' ? 'Aktif' :
                                                    member.membership_status === 'pending' ? 'Beklemede' : 'Pasif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400">Düzenle</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
