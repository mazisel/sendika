'use client';

import React from 'react';
import { Search, Loader2, RefreshCw, X, Plus } from 'lucide-react';
import { cityOptions } from '@/lib/cities';

export interface Condition {
    id: string;
    field: string;
    operator: 'isEmpty' | 'isNotEmpty' | 'equals' | 'notEquals' | 'contains';
    value: string;
}

interface ConditionBuilderProps {
    conditions: Condition[];
    setConditions: (conditions: Condition[]) => void;
    onSearch: () => void;
    isLoading?: boolean;
    buttonText?: string;
    showTitle?: boolean;
}

const FIELD_OPTIONS = [
    { value: 'first_name', label: 'Ad' },
    { value: 'last_name', label: 'Soyad' },
    { value: 'tc_identity', label: 'TC Kimlik' },
    { value: 'phone', label: 'Telefon' },
    { value: 'email', label: 'E-posta' },
    { value: 'city', label: 'İl' },
    { value: 'district', label: 'İlçe' },
    { value: 'membership_number', label: 'Üye No' },
    { value: 'blood_group', label: 'Kan Grubu', hasOptions: true },
    { value: 'gender', label: 'Cinsiyet', hasOptions: true },
    { value: 'education_level', label: 'Eğitim Durumu', hasOptions: true },
    { value: 'marital_status', label: 'Medeni Durum', hasOptions: true },
    { value: 'membership_status', label: 'Üyelik Durumu', hasOptions: true },
    { value: 'father_name', label: 'Baba Adı' },
    { value: 'mother_name', label: 'Anne Adı' },
    { value: 'birth_place', label: 'Doğum Yeri' },
    { value: 'institution', label: 'Kurum' },
    { value: 'workplace', label: 'İş Yeri' },
    { value: 'position', label: 'Kadro Unvanı' },
];

const OPERATOR_OPTIONS = [
    { value: 'isEmpty', label: 'Boş Olanlar' },
    { value: 'isNotEmpty', label: 'Dolu Olanlar' },
    { value: 'equals', label: 'Eşittir' },
    { value: 'notEquals', label: 'Eşit Değildir' },
    { value: 'contains', label: 'İçerir' },
];

const FIELD_VALUE_OPTIONS: Record<string, string[]> = {
    blood_group: ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'],
    gender: ['Erkek', 'Kadın'],
    education_level: ['İlkokul', 'Ortaokul', 'Lise', 'Önlisans', 'Lisans', 'Yüksek Lisans', 'Doktora'],
    marital_status: ['Evli', 'Bekar'],
    membership_status: ['active', 'pending', 'inactive', 'suspended', 'resigned'],
};

export default function ConditionBuilder({
    conditions,
    setConditions,
    onSearch,
    isLoading = false,
    buttonText = 'Ara',
    showTitle = true
}: ConditionBuilderProps) {

    const addCondition = () => {
        setConditions([
            ...conditions,
            { id: Date.now().toString(), field: 'city', operator: 'isEmpty', value: '' }
        ]);
    };

    const removeCondition = (id: string) => {
        if (conditions.length > 1) {
            setConditions(conditions.filter(c => c.id !== id));
        }
    };

    const updateCondition = (id: string, key: keyof Condition, value: string) => {
        setConditions(conditions.map(c =>
            c.id === id ? { ...c, [key]: value } : c
        ));
    };

    const renderValueInput = (condition: Condition) => {
        // Dropdown for City
        if (condition.field === 'city') {
            return (
                <select
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Şehir Seçiniz</option>
                    {cityOptions.map(city => (
                        <option key={city.code} value={city.name}>{city.name}</option>
                    ))}
                </select>
            );
        }

        // Dropdown for Defined Options
        if (FIELD_VALUE_OPTIONS[condition.field]) {
            return (
                <select
                    value={condition.value}
                    onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Seçiniz</option>
                    {FIELD_VALUE_OPTIONS[condition.field].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );
        }

        // Default Text Input
        return (
            <input
                type="text"
                value={condition.value}
                onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                placeholder="Değer giriniz..."
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
            />
        );
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm p-6">
            {showTitle && (
                <>
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-500" />
                        Kriter Belirle
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Aşağıdaki kurallara uyan üyeleri bul ve listele. Birden fazla kural eklerseniz, bu kuralların <strong className="text-slate-700 dark:text-slate-300">HEPSİNE</strong> uyan kayıtlar listelenir (VE Mantığı).
                    </p>
                </>
            )}

            <div className="space-y-4">
                {conditions.map((condition, index) => (
                    <div key={condition.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-sm font-bold text-slate-400 w-6">{index + 1}.</span>
                            <select
                                value={condition.field}
                                onChange={(e) => updateCondition(condition.id, 'field', e.target.value)}
                                className="flex-1 sm:w-48 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
                            >
                                {FIELD_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(condition.id, 'operator', e.target.value as any)}
                            className="w-full sm:w-40 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500"
                        >
                            {OPERATOR_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        {['equals', 'notEquals', 'contains'].includes(condition.operator) && (
                            <div className="flex-1 w-full sm:w-auto">
                                {renderValueInput(condition)}
                            </div>
                        )}

                        {conditions.length > 1 && (
                            <button
                                onClick={() => removeCondition(condition.id)}
                                className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <div className="mt-4 flex gap-3">
                <button
                    onClick={addCondition}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors border border-slate-200 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Kural Ekle
                </button>

                <div className="flex-1"></div>

                <button
                    onClick={onSearch}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {isLoading ? 'Aranıyor...' : buttonText}
                </button>
            </div>
        </div>
    );
}
