import { useState, useEffect } from 'react';
import { X, Phone, MapPin, Briefcase, Eye, User, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import MemberDetailModal from '@/components/members/MemberDetailModal';

interface StatsDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    filter: {
        type: string;
        value: any;
        label?: string;
    };
    startDate?: string | null;
}

export default function StatsDetailModal({ isOpen, onClose, title, filter, startDate }: StatsDetailModalProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [showMemberDetails, setShowMemberDetails] = useState(false);

    useEffect(() => {
        if (isOpen && filter) {
            loadMembers();
        }
    }, [isOpen, filter, startDate]);

    const loadMembers = async () => {
        try {
            setLoading(true);
            let query = supabase.from('members').select('*');

            // Apply date filter if exists (and not overridden by specific date filters)
            if (startDate && !['date_range', 'join_date_month', 'join_period'].includes(filter.type)) {
                query = query.gte('created_at', startDate);
            }


            // Apply filters based on type
            switch (filter.type) {
                case 'gender':
                    query = query.eq('gender', filter.value);
                    break;
                case 'city':
                    query = query.eq('city', filter.value);
                    break;
                case 'workplace':
                    query = query.eq('workplace', filter.value);
                    break;
                case 'position':
                    query = query.eq('position', filter.value);
                    break;
                case 'education':
                    query = query.eq('education_level', filter.value);
                    break;
                case 'marital':
                    query = query.eq('marital_status', filter.value);
                    break;
                case 'children':
                    if (filter.value === '3+') {
                        query = query.gte('children_count', 3);
                    } else {
                        // Extract number from string like "1 Çocuk", "2 Çocuk" or use the raw number if passed
                        const count = typeof filter.value === 'number' ? filter.value :
                            filter.value === 'Çocuksuz' ? 0 :
                                parseInt(filter.value);
                        query = query.eq('children_count', count);
                    }
                    break;
                case 'age':
                    const today = new Date();
                    const currentYear = today.getFullYear();
                    let minAge = 0;
                    let maxAge = 100;

                    if (filter.value === '18-24') { minAge = 18; maxAge = 24; }
                    else if (filter.value === '25-34') { minAge = 25; maxAge = 34; }
                    else if (filter.value === '35-44') { minAge = 35; maxAge = 44; }
                    else if (filter.value === '45-54') { minAge = 45; maxAge = 54; }
                    else if (filter.value === '55-64') { minAge = 55; maxAge = 64; }
                    else if (filter.value === '65+') { minAge = 65; maxAge = 150; }

                    // Calculate birth dates
                    // Max Age corresponds to Min Birth Date (Current Year - Max Age - 1)
                    // Min Age corresponds to Max Birth Date (Current Year - Min Age)
                    const maxBirthDate = new Date(currentYear - minAge, today.getMonth(), today.getDate()).toISOString();
                    const minBirthDate = new Date(currentYear - maxAge - 1, today.getMonth(), today.getDate()).toISOString();

                    query = query.lte('birth_date', maxBirthDate).gte('birth_date', minBirthDate);
                    break;

                case 'status':
                    query = query.eq('membership_status', filter.value);
                    break;

                case 'date_range':
                    if (filter.value === 'this_month') {
                        const start = new Date();
                        start.setDate(1);
                        query = query.gte('created_at', start.toISOString());
                    } else if (filter.value === 'last_month') {
                        const start = new Date();
                        start.setMonth(start.getMonth() - 1);
                        start.setDate(1);
                        const end = new Date();
                        end.setDate(0);
                        query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
                    }
                    break;

                case 'join_date_month':
                    // format: "Kas 2025" or similar locale string from page.tsx (short month name)
                    // We need to parse this local specific string back to date range.
                    // This relies on Turkish locale month names.
                    const monthMap: { [key: string]: number } = {
                        'Oca': 0, 'Şub': 1, 'Mar': 2, 'Nis': 3, 'May': 4, 'Haz': 5,
                        'Tem': 6, 'Ağu': 7, 'Eyl': 8, 'Eki': 9, 'Kas': 10, 'Ara': 11,
                        'Jan': 0, 'Feb': 1, 'Apr': 3, 'Jun': 5, // English fallbacks (non-duplicates)
                        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                    };

                    try {
                        const parts = filter.value.split(' ');
                        const monthName = parts[0];
                        const year = parseInt(parts[1]);
                        const monthIndex = monthMap[monthName];

                        if (monthIndex !== undefined && !isNaN(year)) {
                            const start = new Date(year, monthIndex, 1);
                            const end = new Date(year, monthIndex + 1, 0, 23, 59, 59); // Last day of month
                            // Adjust for timezone if needed, but ISO string usually ok for comparison
                            // Use explicit UTC if needed or just local midnight
                            // Supabase stores as timestamptz usually.

                            // Let's ensure strict ISO range
                            const startStr = new Date(year, monthIndex, 1, 0, 0, 0).toISOString();
                            // End date: start of next month? Or end of this month?
                            // easier: start of next month and use lt
                            const nextMonth = new Date(year, monthIndex + 1, 1, 0, 0, 0).toISOString();

                            query = query.gte('created_at', startStr).lt('created_at', nextMonth);
                        }
                    } catch (e) {
                        console.error("Date parse error", e);
                    }
                    break;

                case 'join_period':
                    const now = new Date();
                    if (filter.value === 'Bu ay') {
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        query = query.gte('created_at', start.toISOString());
                    }
                    else if (filter.value === 'Son 3 ay') {
                        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1); // Approx logic from page.tsx
                        // Replicating page.tsx logic: (now - join) < 3 months. 
                        // Actually page.tsx uses detailed diff calculation. 
                        // Let's approximate: >= 3 months ago.

                        // Strict alignment with page.tsx:
                        // if (diffMonths < 1) -> This month
                        // else if (diffMonths < 3) -> Last 3 months (excluding this month? or including?)
                        // page.tsx logic: 
                        // diffMonths < 1 ('Bu ay')
                        // diffMonths < 3 ('Son 3 ay') -> This means 1 <= diff < 3.
                        // So it captures "1 to 3 months ago".

                        // To properly filter, we need range.
                        // "Bu ay": >= start of this month
                        // "Son 3 ay": >= start of 3 months ago AND < start of this month (if exclusives)
                        // BUT typically "Last 3 months" chart includes this month? 
                        // Looking at page.tsx logic:
                        // It uses `if ... else if ...` so they are exclusive buckets.
                        // "Bu ay" bucket takes diff < 1.
                        // "Son 3 ay" bucket takes diff < 3 (so 1..2 months ago).

                        const curMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1); // 2 months back covers diff 1,2

                        // Wait, logic in page.tsx:
                        // (now.year - join.year)*12 + (now.month - join.month)
                        // created_at: 2026-01-15, now: 2026-01-20 -> diff = 0. "Bu ay".
                        // created_at: 2025-12-15 -> diff = 1. "Son 3 ay" (since 1 < 3).
                        // created_at: 2025-11-15 -> diff = 2. "Son 3 ay".
                        // created_at: 2025-10-15 -> diff = 3. "Son 6 ay".

                        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1); // Wait, diff=3 is > 2.

                        // Let's just construct ranges based on 'diffMonths' logic
                        // "Son 3 ay" (diff 1 or 2): start = 2 months ago (start of month), end = start of this month.
                        // e.g. Now=Jan. Diff=1 (Dec), Diff=2 (Nov). 
                        // So Nov 1st <= date < Jan 1st.

                        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                        if (filter.value === 'Son 3 ay') { // 1 <= diff < 3 => 2 months ago, 1 month ago
                            const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                            query = query.gte('created_at', start.toISOString()).lt('created_at', startOfThisMonth.toISOString());
                        }
                        else if (filter.value === 'Son 6 ay') { // 3 <= diff < 6 => 3,4,5 months ago
                            const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                            const end = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                            query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
                        }
                        else if (filter.value === 'Son 1 yıl') { // 6 <= diff < 12
                            const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                            const end = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                            query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
                        }
                        else if (filter.value === '1 yıldan fazla') { // diff >= 12
                            const end = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                            query = query.lt('created_at', end.toISOString());
                        }
                    }
                    break;
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setMembers(data || []);
        } catch (error) {
            console.error('Error fetching filtered members:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
            suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            resigned: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
        };

        const labels = {
            active: 'Aktif',
            pending: 'Bekliyor',
            inactive: 'Pasif',
            suspended: 'Askıda',
            resigned: 'İstifa'
        };

        const style = styles[status as keyof typeof styles] || styles.pending;
        const label = labels[status as keyof typeof labels] || status;

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
                {label}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div
                    className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {title}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {loading ? 'Yükleniyor...' : `Toplam ${members.length} üye bulundu`}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        ) : members.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-400">
                                <User className="w-12 h-12 mb-4 opacity-50" />
                                <p>Bu kriterlere uygun üye bulunamadı.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer"
                                        onClick={() => {
                                            setSelectedMember(member);
                                            setShowMemberDetails(true);
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                                                {member.first_name[0]}{member.last_name[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                                        {member.first_name} {member.last_name}
                                                    </h3>
                                                    {getStatusBadge(member.membership_status)}
                                                </div>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {member.phone || '-'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {member.city || '-'} / {member.district || '-'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase className="w-3 h-3" />
                                                        {member.workplace || '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            title="Detayları Görüntüle"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>

            {/* Nested Member Details Modal */}
            {showMemberDetails && selectedMember && (
                <MemberDetailModal
                    member={selectedMember}
                    isOpen={true}
                    onClose={() => setShowMemberDetails(false)}
                    onEdit={() => { }} // Read only or wire up if needed, but simple view is safer for now
                    onResign={() => { }}
                />
            )}
        </>
    );
}
