'use client';

import React, { useState } from 'react';
import { Member } from '@/lib/types';
import { Search, Loader2, RefreshCw } from 'lucide-react';
import { cityOptions } from '@/lib/cities';

const OPERATOR_OPTIONS = [ // Keep these as they might be used for type checking or imported, but main logic is in ConditionBuilder now.
    // Actually, we can remove them if they are not exported, but Condition interface is exported.
    // Let's import Condition from ConditionBuilder instead of defining it here.
];

import ConditionBuilder, { Condition } from './ConditionBuilder';

interface BulkUpdateTabProps {
    members: Member[];
    onFindMembers: (conditions: Condition[]) => void;
    results: Member[] | null;
    isLoading?: boolean;
    onRowClick: (member: Member) => void;
}

export { type Condition }; // Re-export if needed elsewhere

export default function BulkUpdateTab({ members, onFindMembers, results, isLoading, onRowClick }: BulkUpdateTabProps) {

    const [conditions, setConditions] = useState<Condition[]>([
        { id: '1', field: 'city', operator: 'isEmpty', value: '' }
    ]);

    const handleSearch = () => {
        onFindMembers(conditions);
    };

    return (
        <div className="space-y-6">
            <ConditionBuilder
                conditions={conditions}
                setConditions={setConditions}
                onSearch={handleSearch}
                isLoading={isLoading}
                buttonText="Üyeleri Bul"
            />


            {/* Results Table */}
            {results && results.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm overflow-hidden animate-in slide-in-from-top-4">
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
