'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Member, Region, RegionCityAssignment } from '@/lib/types';
import { cityOptions } from '@/lib/cities';
import { Loader2, Save, X, Search, Check } from 'lucide-react';

interface RegionFormProps {
    region?: Region;
    assignments?: RegionCityAssignment[];
    onSuccess: () => void;
    onCancel: () => void;
}

export default function RegionForm({ region, assignments = [], onSuccess, onCancel }: RegionFormProps) {
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');

    const [name, setName] = useState(region?.name || '');
    const [responsibleId, setResponsibleId] = useState(region?.responsible_id || '');
    const [selectedCities, setSelectedCities] = useState<string[]>(
        assignments.map((a) => a.city_code)
    );

    // To track cities assigned to OTHER regions (to disable/warn)
    const [unavailableCities, setUnavailableCities] = useState<string[]>([]);
    const [citySearch, setCitySearch] = useState('');

    useEffect(() => {
        if (region?.responsible_user) {
            setMembers([region.responsible_user]);
            setMemberSearch(`${region.responsible_user.first_name} ${region.responsible_user.last_name}`);
        }
        fetchUnavailableCities();
    }, [region]);

    // Search members when typing
    useEffect(() => {
        const searchMembers = async () => {
            if (memberSearch.length < 2) return;
            setLoadingMembers(true);
            try {
                const { data, error } = await supabase
                    .from('members')
                    .select('*')
                    .eq('is_active', true)
                    .or(`first_name.ilike.%${memberSearch}%,last_name.ilike.%${memberSearch}%,tc_identity.ilike.%${memberSearch}%`)
                    .limit(20);

                if (error) throw error;
                setMembers(data || []);
            } catch (error) {
                console.error('Error fetching members:', error);
            } finally {
                setLoadingMembers(false);
            }
        };

        const timeoutId = setTimeout(searchMembers, 500);
        return () => clearTimeout(timeoutId);
    }, [memberSearch]);

    const fetchUnavailableCities = async () => {
        try {
            // Fetch all assignments NOT belonging to this region
            let query = supabase.from('region_city_assignments').select('city_code');

            if (region?.id) {
                query = query.neq('region_id', region.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            setUnavailableCities(data?.map(d => d.city_code) || []);
        } catch (error) {
            console.error('Error fetching unavailable cities:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let regionId = region?.id;

            if (region) {
                // Update
                const { error: updateError } = await supabase
                    .from('regions')
                    .update({
                        name,
                        responsible_id: responsibleId || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', region.id);

                if (updateError) throw updateError;
            } else {
                // Create
                const { data, error: createError } = await supabase
                    .from('regions')
                    .insert({
                        name,
                        responsible_id: responsibleId || null
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                regionId = data.id;
            }

            if (!regionId) throw new Error('Region ID missing');

            // Update City Assignments
            // First, delete existing assignments for this region
            if (region) {
                const { error: deleteError } = await supabase
                    .from('region_city_assignments')
                    .delete()
                    .eq('region_id', regionId);

                if (deleteError) throw deleteError;
            }

            // Then insert new ones
            if (selectedCities.length > 0) {
                const newAssignments = selectedCities.map(code => ({
                    region_id: regionId,
                    city_code: code,
                    city_name: cityOptions.find(c => c.code === code)?.name || ''
                }));

                const { error: insertError } = await supabase
                    .from('region_city_assignments')
                    .insert(newAssignments);

                if (insertError) throw insertError;
            }

            onSuccess();
        } catch (error: any) {
            alert('Hata oluştu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleCity = (code: string) => {
        if (unavailableCities.includes(code)) return;

        setSelectedCities(prev =>
            prev.includes(code)
                ? prev.filter(c => c !== code)
                : [...prev, code]
        );
    };

    const filteredCities = cityOptions.filter(city =>
        city.name.toLowerCase().includes(citySearch.toLowerCase())
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bölge Adı */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Bölge Adı
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Örn: 1. Bölge"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Sorumlu Kişi - ÜYELERDEN */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Bölge Sorumlusu (Üye Ara)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                placeholder="Ad, Soyad veya TC ile ara..."
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {loadingMembers && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                </div>
                            )}
                        </div>
                        {memberSearch.length >= 2 && members.length > 0 && (
                            <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 shadow-lg">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        onClick={() => {
                                            setResponsibleId(member.id);
                                            setMemberSearch(`${member.first_name} ${member.last_name}`);
                                            setMembers([]); // Close list
                                        }}
                                        className={`px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700 flex justify-between items-center ${responsibleId === member.id ? 'bg-blue-50 dark:bg-slate-700' : ''}`}
                                    >
                                        <div>
                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                {member.first_name} {member.last_name}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                                TC: {member.tc_identity} - {member.city}
                                            </div>
                                        </div>
                                        {responsibleId === member.id && <Check className="w-4 h-4 text-blue-600" />}
                                    </div>
                                ))}
                            </div>
                        )}
                        <input type="hidden" required value={responsibleId} />
                        {responsibleId && (
                            <div className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center">
                                <Check className="w-3 h-3 mr-1" /> Seçilen: {memberSearch}
                                <button type="button" onClick={() => { setResponsibleId(''); setMemberSearch('') }} className="ml-2 text-red-500 hover:text-red-700">Kaldır</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Şehir Seçimi */}
                <div className="mt-8">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Bağlı Şehirler
                    </label>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            placeholder="Şehir ara..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2 border border-slate-200 dark:border-slate-700 rounded-lg">
                        {filteredCities.map((city) => {
                            const isSelected = selectedCities.includes(city.code);
                            const isUnavailable = unavailableCities.includes(city.code);

                            return (
                                <div
                                    key={city.code}
                                    onClick={() => !isUnavailable && toggleCity(city.code)}
                                    className={`
                    cursor-pointer p-2 rounded-lg text-sm flex items-center justify-between border select-none transition-colors
                    ${isSelected
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                            : isUnavailable
                                                ? 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800/50 dark:border-slate-700 opacity-60 cursor-not-allowed'
                                                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300'
                                        }
                  `}
                                >
                                    <span className="truncate">{city.name}</span>
                                    {isSelected && <Check className="w-3 h-3 ml-1 flex-shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
                >
                    İptal
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Kaydediliyor...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Kaydet
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
