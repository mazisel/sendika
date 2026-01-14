'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Region, RegionCityAssignment } from '@/lib/types';
import { Edit, Trash2, MapPin, User, Loader2, Plus, AlertCircle } from 'lucide-react';
import RegionForm from './RegionForm';
import { Logger } from '@/lib/logger';
import { AdminAuth } from '@/lib/auth';

export default function RegionList() {
    const [regions, setRegions] = useState<Region[]>([]);
    const [assignments, setAssignments] = useState<RegionCityAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<Region | undefined>(undefined);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Regions
            const { data: regionsData, error: regionsError } = await supabase
                .from('regions')
                .select(`
          *,
          responsible_user:members!responsible_id(id, first_name, last_name, email)
        `)
                .order('name');

            if (regionsError) throw regionsError;

            // Fetch Assignments
            const { data: assignmentsData, error: assignmentsError } = await supabase
                .from('region_city_assignments')
                .select('*');

            if (assignmentsError) throw assignmentsError;

            setRegions(regionsData || []);
            setAssignments(assignmentsData || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (region: Region) => {
        if (!confirm(`${region.name} ve bağlı tüm şehir atamaları silinecek. Emin misiniz?`)) return;

        try {
            const { error } = await supabase
                .from('regions')
                .delete()
                .eq('id', region.id);

            if (error) throw error;

            const user = AdminAuth.getCurrentUser();
            await Logger.log({
                action: 'DELETE',
                entityType: 'SETTINGS',
                entityId: region.id,
                details: { name: region.name, type: 'region' },
                userId: user?.id
            });

            setRegions(prev => prev.filter(r => r.id !== region.id));
            setAssignments(prev => prev.filter(a => a.region_id !== region.id));
        } catch (err: any) {
            alert('Silme işlemi başarısız: ' + err.message);
        }
    };

    const startEdit = (region?: Region) => {
        setSelectedRegion(region);
        setIsEditing(true);
    };

    const handleSuccess = () => {
        setIsEditing(false);
        setSelectedRegion(undefined);
        fetchData();
    };

    if (loading && !isEditing) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (isEditing) {
        return (
            <div>
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedRegion ? 'Bölge Düzenle' : 'Yeni Bölge Ekle'}
                    </h2>
                </div>
                <RegionForm
                    region={selectedRegion}
                    assignments={assignments.filter(a => a.region_id === selectedRegion?.id)}
                    onSuccess={handleSuccess}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Bölgeler</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Bölge yapılandırması ve şehir atamaları
                    </p>
                </div>
                <button
                    onClick={() => startEdit()}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Bölge
                </button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-3" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {regions.map((region) => {
                    const regionAssignments = assignments.filter(a => a.region_id === region.id);

                    return (
                        <div key={region.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {region.name}
                                    </h3>
                                    <div className="flex items-center mt-1 text-sm text-slate-500 dark:text-slate-400">
                                        <User className="w-3 h-3 mr-1" />
                                        {region.responsible_user ? `${region.responsible_user.first_name} ${region.responsible_user.last_name}` : 'Atanmamış'}
                                    </div>
                                </div>
                                <div className="flex space-x-1">
                                    <button
                                        onClick={() => startEdit(region)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg dark:text-blue-400 dark:hover:bg-blue-900/30"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(region)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900/30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="flex items-center mb-2">
                                    <MapPin className="w-4 h-4 text-slate-400 mr-2" />
                                    <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                        Bağlı Şehirler ({regionAssignments.length})
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {regionAssignments.length > 0 ? (
                                        regionAssignments.map(a => (
                                            <span
                                                key={a.id}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                            >
                                                {a.city_name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">Şehir atanmamış</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {regions.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
                        Henüz hiç bölge tanımlanmamış.
                    </div>
                )}
            </div>
        </div>
    );
}
