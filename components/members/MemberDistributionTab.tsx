'use client';

import React, { useState, useMemo } from 'react';
import { Member } from '@/lib/types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Calendar, Filter, MapPin, Building2, Users, PieChart as PieChartIcon, ArrowRight, TrendingUp, ArrowUpRight, ArrowDownRight, Sparkles, X } from 'lucide-react';
import { formatDateSafe } from '@/lib/dateUtils';
import ReactMarkdown from 'react-markdown';

interface MemberDistributionTabProps {
    members: Member[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];
const STATUS_COLORS = {
    active: '#22c55e',
    pending: '#eab308',
    inactive: '#64748b',
    suspended: '#ef4444',
    resigned: '#f97316'
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Aktif',
    pending: 'Beklemede',
    inactive: 'Pasif',
    suspended: 'Askıda',
    resigned: 'İstifa'
};

export default function MemberDistributionTab({ members }: MemberDistributionTabProps) {
    const [subTab, setSubTab] = useState<'general' | 'regional' | 'institutions' | 'time' | 'comparison'>('general');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [selectedCity, setSelectedCity] = useState<string>('');

    // Comparison State
    const [compType, setCompType] = useState<'year' | 'month'>('year');
    const [period1Year, setPeriod1Year] = useState<number>(new Date().getFullYear() - 1);
    const [period2Year, setPeriod2Year] = useState<number>(new Date().getFullYear());
    const [period1Month, setPeriod1Month] = useState<string>(`${new Date().getFullYear()}-01`);
    const [period2Month, setPeriod2Month] = useState<string>(`${new Date().getFullYear()}-01`);

    // AI Analysis State
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);

    // Stat Detail Popup State
    const [showStatPopup, setShowStatPopup] = useState(false);
    const [statPopupTitle, setStatPopupTitle] = useState('');
    const [statPopupMembers, setStatPopupMembers] = useState<Member[]>([]);

    const openStatPopup = (title: string, memberList: Member[]) => {
        setStatPopupTitle(title);
        setStatPopupMembers(memberList);
        setShowStatPopup(true);
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setShowAiModal(true);
        try {
            // Prepare context based on current view
            const context = subTab === 'general' ? 'Genel Üyelik İstatistikleri' :
                subTab === 'regional' ? 'Bölgesel Dağılım Analizi' :
                    subTab === 'institutions' ? 'Kurum ve İş Yeri Dağılımı' :
                        subTab === 'time' ? 'Zaman İçindeki Üye Artışı' : 'Karşılaştırmalı Analiz';

            // Prepare aggregated stats payload
            const statsPayload = {
                totalMembers: filteredMembers.length,
                statusDistribution: aggregateBy(filteredMembers, 'membership_status', STATUS_LABELS),
                genderDistribution: aggregateBy(filteredMembers, 'gender'),
                topCities: aggregateBy(filteredMembers, 'city').slice(0, 5),
                // Add more specific stats dependent on view if needed, or send general summary
            };

            const response = await fetch('/api/ai/analyze-members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stats: statsPayload, context })
            });

            const data = await response.json();
            if (response.ok) {
                setAiAnalysis(data.analysis);
            } else {
                setAiAnalysis('Analiz alınırken bir hata oluştu: ' + (data.error || 'Bilinmeyen hata'));
            }
        } catch (error) {
            setAiAnalysis('Bir bağlantı hatası oluştu.');
        } finally {
            setIsAnalyzing(false);
        }
    };


    // --- FILTERING ---
    const filteredMembers = useMemo(() => {
        return members.filter(m => {
            const date = new Date(m.created_at);
            const start = startDate ? new Date(startDate) : new Date('2000-01-01');
            const end = endDate ? new Date(endDate) : new Date();
            end.setHours(23, 59, 59, 999);

            const dateMatch = date >= start && date <= end;
            const cityMatch = selectedCity ? m.city === selectedCity : true;

            return dateMatch && cityMatch;
        });
    }, [members, startDate, endDate, selectedCity]);

    // --- AGGREGATION HELPERS ---
    const aggregateBy = (data: Member[], key: keyof Member, labelMap?: Record<string, string>) => {
        const counts: Record<string, number> = {};
        data.forEach(m => {
            const rawVal = String(m[key] || 'Bilinmiyor');
            const label = labelMap ? (labelMap[rawVal] || rawVal) : rawVal;
            counts[label] = (counts[label] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    // --- SINGLE PERIOD STATS ---
    const stats = useMemo(() => {
        return {
            total: filteredMembers.length,
            active: filteredMembers.filter(m => m.membership_status === 'active').length,
            pending: filteredMembers.filter(m => m.membership_status === 'pending').length,
            resigned: filteredMembers.filter(m => m.membership_status === 'resigned').length,
            male: filteredMembers.filter(m => m.gender === 'Erkek' || m.gender === 'male').length,
            female: filteredMembers.filter(m => m.gender === 'Kadın' || m.gender === 'female').length,
        };
    }, [filteredMembers]);

    // --- CHART DATA (Localized) ---
    const statusData = useMemo(() => aggregateBy(filteredMembers, 'membership_status', STATUS_LABELS), [filteredMembers]);
    const genderData = useMemo(() => aggregateBy(filteredMembers, 'gender'), [filteredMembers]);
    const cityData = useMemo(() => aggregateBy(filteredMembers, 'city').slice(0, 10), [filteredMembers]);
    const districtData = useMemo(() => aggregateBy(filteredMembers, 'district').slice(0, 15), [filteredMembers]);
    const educationData = useMemo(() => aggregateBy(filteredMembers, 'education_level'), [filteredMembers]);
    const workplaceData = useMemo(() => aggregateBy(filteredMembers, 'workplace').slice(0, 10), [filteredMembers]);
    const institutionData = useMemo(() => aggregateBy(filteredMembers, 'institution').slice(0, 10), [filteredMembers]);
    const regionData = useMemo(() => {
        const d = aggregateBy(filteredMembers, 'region');
        return d.map(x => ({ ...x, name: x.name === 'Bilinmiyor' ? 'Tanımsız' : `${x.name}. Bölge` }));
    }, [filteredMembers]);

    // --- TIME SERIES DATA ---
    const timeData = useMemo(() => {
        const months: Record<string, number> = {};
        filteredMembers.forEach(m => {
            const date = new Date(m.created_at);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months[key] = (months[key] || 0) + 1;
        });

        const sortedMonths = Object.keys(months).sort();
        let cumulative = 0;

        return sortedMonths.map(month => {
            cumulative += months[month];
            return {
                name: month,
                'Yeni Üye': months[month],
                'Toplam': cumulative
            };
        });
    }, [filteredMembers]);


    // --- COMPARISON DATA LOGIC ---
    const comparisonData = useMemo(() => {
        if (compType === 'year') {
            // YEAR vs YEAR
            const getMembersForYear = (year: number) => members.filter(m => new Date(m.created_at).getFullYear() === year);
            const m1 = getMembersForYear(period1Year);
            const m2 = getMembersForYear(period2Year);

            const total1 = m1.length;
            const total2 = m2.length;
            const growth = total1 === 0 ? 0 : ((total2 - total1) / total1) * 100;

            const months1 = new Array(12).fill(0);
            const months2 = new Array(12).fill(0);
            m1.forEach(m => months1[new Date(m.created_at).getMonth()]++);
            m2.forEach(m => months2[new Date(m.created_at).getMonth()]++);

            const chartData = Array.from({ length: 12 }, (_, i) => {
                const date = new Date(2000, i, 1);
                return {
                    name: date.toLocaleDateString('tr-TR', { month: 'long' }),
                    [period1Year]: months1[i],
                    [period2Year]: months2[i]
                };
            });

            const cityCounts1: Record<string, number> = {};
            const cityCounts2: Record<string, number> = {};
            m1.forEach(m => cityCounts1[m.city] = (cityCounts1[m.city] || 0) + 1);
            m2.forEach(m => cityCounts2[m.city] = (cityCounts2[m.city] || 0) + 1);
            const topCities = Object.keys(cityCounts2).sort((a, b) => cityCounts2[b] - cityCounts2[a]).slice(0, 5);
            const cityChartData = topCities.map(city => ({
                name: city,
                [period1Year]: cityCounts1[city] || 0,
                [period2Year]: cityCounts2[city] || 0
            }));

            return { total1, total2, growth, chartData, cityChartData, label1: period1Year, label2: period2Year };
        } else {
            // MONTH vs MONTH
            const [y1, mo1] = period1Month.split('-').map(Number);
            const [y2, mo2] = period2Month.split('-').map(Number);

            const getMembersForMonth = (year: number, month: number) => members.filter(m => {
                const d = new Date(m.created_at);
                return d.getFullYear() === year && (d.getMonth() + 1) === month;
            });

            const m1 = getMembersForMonth(y1, mo1);
            const m2 = getMembersForMonth(y2, mo2);

            const total1 = m1.length;
            const total2 = m2.length;
            const growth = total1 === 0 ? 0 : ((total2 - total1) / total1) * 100;

            // Daily chart logic (Days 1-31)
            const days1 = new Array(32).fill(0);
            const days2 = new Array(32).fill(0);
            m1.forEach(m => days1[new Date(m.created_at).getDate()]++);
            m2.forEach(m => days2[new Date(m.created_at).getDate()]++);

            const chartData = Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                return {
                    name: `${day}. Gün`,
                    [period1Month]: days1[day],
                    [period2Month]: days2[day]
                };
            });

            const cityCounts1: Record<string, number> = {};
            const cityCounts2: Record<string, number> = {};
            m1.forEach(m => cityCounts1[m.city] = (cityCounts1[m.city] || 0) + 1);
            m2.forEach(m => cityCounts2[m.city] = (cityCounts2[m.city] || 0) + 1);
            const topCities = Object.keys(cityCounts2).sort((a, b) => cityCounts2[b] - cityCounts2[a]).slice(0, 5);
            const cityChartData = topCities.map(city => ({
                name: city,
                [period1Month]: cityCounts1[city] || 0,
                [period2Month]: cityCounts2[city] || 0
            }));


            return { total1, total2, growth, chartData, cityChartData, label1: period1Month, label2: period2Month };
        }
    }, [members, compType, period1Year, period2Year, period1Month, period2Month]);


    // --- UI COMPONENTS ---
    const StatCard = ({ title, value, sub, icon: Icon, color, onClick }: any) => (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between transition-all hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-900/60 group ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex flex-col">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{title}</p>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">{value}</div>
            </div>
            <div className={`p-2 rounded-md ${color} bg-opacity-10 dark:bg-opacity-10 group-hover:bg-opacity-20 transition-colors`}>
                <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
    );

    const ChartCard = ({ title, children, height = 300 }: any) => (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                {title}
            </h3>
            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg text-sm">
                    <p className="font-semibold mb-2 text-slate-700 dark:text-slate-200">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span>{entry.name}:</span>
                            <span className="font-bold">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Main Navigation & Filter Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">

                {/* Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0">
                    {[
                        { id: 'general', label: 'Genel Bakış', icon: PieChartIcon },
                        { id: 'regional', label: 'Bölgesel', icon: MapPin },
                        { id: 'institutions', label: 'Kurumsal', icon: Building2 },
                        { id: 'time', label: 'Zaman Analizi', icon: Calendar },
                        { id: 'comparison', label: 'Karşılaştırma', icon: TrendingUp },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setSubTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 border ${subTab === tab.id
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-sm'
                                : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Date Filter (Only for non-comparison tabs) */}
                {subTab !== 'comparison' && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 ml-auto">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-xs focus:ring-0 text-slate-600 dark:text-slate-300 w-28 p-0"
                            placeholder="Başlangıç"
                        />
                        <span className="text-slate-300">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-xs focus:ring-0 text-slate-600 dark:text-slate-300 w-28 p-0"
                            placeholder="Bitiş"
                        />
                    </div>
                )}

                <button
                    onClick={handleAnalyze}
                    className="ml-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-sm font-medium shadow-md flex items-center gap-2 transition-all hover:scale-105"
                >
                    <Sparkles className="w-4 h-4" />
                    Yapay Zeka Analizi
                </button>
            </div>

            {/* AI Analysis Modal */}
            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold">
                                <Sparkles className="w-5 h-5" />
                                <h3>Yapay Zeka Analizi</h3>
                            </div>
                            <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="relative w-16 h-16">
                                        <div className="absolute inset-0 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                                    </div>
                                    <p className="text-slate-500 animate-pulse">Veriler analiz ediliyor, lütfen bekleyin...</p>
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert max-w-none prose-sm prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-p:text-slate-600 dark:prose-p:text-slate-300">
                                    <ReactMarkdown>{aiAnalysis || ''}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stat Detail Popup Modal */}
            {showStatPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                                <Users className="w-5 h-5" />
                                <h3>{statPopupTitle} ({statPopupMembers.length} kişi)</h3>
                            </div>
                            <button onClick={() => setShowStatPopup(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                            {statPopupMembers.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">Bu kritere uygun üye bulunmuyor.</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700">
                                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Üye No</th>
                                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Ad Soyad</th>
                                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">TC Kimlik</th>
                                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">İl</th>
                                            <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-400">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {statPopupMembers.slice(0, 100).map((member, idx) => (
                                            <tr key={member.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
                                                <td className="py-2 px-3 font-mono text-xs">{member.membership_number}</td>
                                                <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">{member.first_name} {member.last_name}</td>
                                                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{member.tc_identity}</td>
                                                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{member.city}</td>
                                                <td className="py-2 px-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${member.membership_status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        member.membership_status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            member.membership_status === 'resigned' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                        }`}>
                                                        {STATUS_LABELS[member.membership_status] || member.membership_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {statPopupMembers.length > 100 && (
                                <div className="text-center py-4 text-sm text-slate-500">
                                    ... ve {statPopupMembers.length - 100} kişi daha (ilk 100 gösteriliyor)
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CONTENT AREAS */}

            {/* 1. Comparison Tab Special View */}
            {subTab === 'comparison' ? (
                <div className="space-y-6">
                    {/* Comparison Controls */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Dönem Karşılaştırma</h3>
                            <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                <button
                                    onClick={() => setCompType('year')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${compType === 'year' ? 'bg-white dark:bg-slate-800 shadow text-blue-600' : 'text-slate-500'}`}
                                >
                                    Yıllık
                                </button>
                                <button
                                    onClick={() => setCompType('month')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${compType === 'month' ? 'bg-white dark:bg-slate-800 shadow text-blue-600' : 'text-slate-500'}`}
                                >
                                    Aylık
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {compType === 'year' ? (
                                <>
                                    <select
                                        value={period1Year}
                                        onChange={(e) => setPeriod1Year(Number(e.target.value))}
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm"
                                    >
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                    <span className="text-slate-400 font-medium">VS</span>
                                    <select
                                        value={period2Year}
                                        onChange={(e) => setPeriod2Year(Number(e.target.value))}
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm"
                                    >
                                        {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </>
                            ) : (
                                <>
                                    <input
                                        type="month"
                                        value={period1Month}
                                        onChange={(e) => setPeriod1Month(e.target.value)}
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm"
                                    />
                                    <span className="text-slate-400 font-medium">VS</span>
                                    <input
                                        type="month"
                                        value={period2Month}
                                        onChange={(e) => setPeriod2Month(e.target.value)}
                                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-sm"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Stats & Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                            <h4 className="text-blue-100 text-sm font-medium mb-4">Toplam Yeni Üye Karşılaştırması</h4>
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-4xl font-bold">{comparisonData.total2}</span>
                                <span className="text-blue-200 mb-1 text-sm">({comparisonData.label2})</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-100 pb-4 border-b border-white/20">
                                <span>vs {comparisonData.total1} ({comparisonData.label1})</span>
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                {comparisonData.growth >= 0 ? (
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-green-300">
                                        <ArrowUpRight className="w-6 h-6" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-red-300">
                                        <ArrowDownRight className="w-6 h-6" />
                                    </div>
                                )}
                                <div>
                                    <div className={`text-xl font-bold ${comparisonData.growth >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                        {comparisonData.growth > 0 ? '+' : ''}{comparisonData.growth.toFixed(1)}%
                                    </div>
                                    <div className="text-blue-200 text-xs">{compType === 'year' ? 'Yıllık' : 'Aylık'} Değişim</div>
                                </div>
                            </div>
                        </div>

                        {/* Comparison Chart */}
                        <div className="lg:col-span-2">
                            <ChartCard title={compType === 'year' ? "Aylık Kayıt Karşılaştırması" : "Günlük Kayıt Karşılaştırması"}>
                                <BarChart data={comparisonData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={compType === 'month' ? 2 : 0} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar dataKey={comparisonData.label1} name={`${comparisonData.label1}`} fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey={comparisonData.label2} name={`${comparisonData.label2}`} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ChartCard>
                        </div>
                    </div>

                    <ChartCard title={`Şehirlere Göre Dağılım Karşılaştırması (En çok üye olan 5 şehir)`}>
                        <BarChart data={comparisonData.cityChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.5} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey={comparisonData.label1} name={`${comparisonData.label1}`} fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={20} />
                            <Bar dataKey={comparisonData.label2} name={`${comparisonData.label2}`} fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ChartCard>
                </div>

            ) : (
                /* 2. Standard Tabs (General, Regional, etc.) */
                <>
                    {/* Quick Stats Grid - Compact Version */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatCard
                            title="Toplam Üye"
                            value={stats.total}
                            icon={Users}
                            color="text-blue-600 bg-blue-100"
                            onClick={() => openStatPopup('Tüm Üyeler', filteredMembers)}
                        />
                        <StatCard
                            title="Aktif"
                            value={stats.active}
                            icon={Users}
                            color="text-green-600 bg-green-100"
                            onClick={() => openStatPopup('Aktif Üyeler', filteredMembers.filter(m => m.membership_status === 'active'))}
                        />
                        <StatCard
                            title="Onay Bekleyen"
                            value={stats.pending}
                            icon={Users}
                            color="text-yellow-600 bg-yellow-100"
                            onClick={() => openStatPopup('Onay Bekleyen Üyeler', filteredMembers.filter(m => m.membership_status === 'pending'))}
                        />
                        <StatCard
                            title="İstifa/Ayrılan"
                            value={stats.resigned}
                            icon={Users}
                            color="text-red-600 bg-red-100"
                            onClick={() => openStatPopup('İstifa Eden Üyeler', filteredMembers.filter(m => m.membership_status === 'resigned'))}
                        />
                        <StatCard
                            title="Erkek"
                            value={stats.male}
                            icon={Users}
                            color="text-indigo-600 bg-indigo-100"
                            onClick={() => openStatPopup('Erkek Üyeler', filteredMembers.filter(m => m.gender === 'male' || m.gender === 'Erkek'))}
                        />
                        <StatCard
                            title="Kadın"
                            value={stats.female}
                            icon={Users}
                            color="text-pink-600 bg-pink-100"
                            onClick={() => openStatPopup('Kadın Üyeler', filteredMembers.filter(m => m.gender === 'female' || m.gender === 'Kadın'))}
                        />
                    </div>

                    {subTab === 'general' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Üyelik Durumu Dağılımı">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        className="cursor-pointer icon-hover-scale"
                                        onClick={(data) => {
                                            const label = data.name;
                                            // STATUS_LABELS values are the names. We need to match member's status label.
                                            const filtered = filteredMembers.filter(m => (STATUS_LABELS[m.membership_status] || m.membership_status) === label);
                                            openStatPopup(`${label} Listesi`, filtered);
                                        }}
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[Object.keys(STATUS_LABELS).find(k => STATUS_LABELS[k] === entry.name) as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ChartCard>

                            <ChartCard title="Eğitim Durumu Dağılımı">
                                <BarChart data={educationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.5} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="value"
                                        name="Kişi Sayısı"
                                        fill="#8884d8"
                                        radius={[0, 4, 4, 0]}
                                        barSize={20}
                                        className="cursor-pointer"
                                        onClick={(data) => {
                                            const label = data.name;
                                            const filtered = filteredMembers.filter(m => m.education_level === label);
                                            openStatPopup(`${label} Eğitim Seviyesi`, filtered);
                                        }}
                                    >
                                        {educationData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartCard>

                            <ChartCard title="Cinsiyet Dağılımı">
                                <PieChart>
                                    <Pie
                                        data={genderData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={0}
                                        outerRadius={100}
                                        dataKey="value"
                                        className="cursor-pointer icon-hover-scale"
                                        onClick={(data) => {
                                            const label = data.name;
                                            let filtered: Member[] = [];
                                            if (label === 'Erkek') {
                                                filtered = filteredMembers.filter(m => m.gender === 'male' || m.gender === 'Erkek');
                                            } else if (label === 'Kadın') {
                                                filtered = filteredMembers.filter(m => m.gender === 'female' || m.gender === 'Kadın');
                                            } else {
                                                filtered = filteredMembers.filter(m => m.gender === label);
                                            }
                                            openStatPopup(`${label} Üyeler`, filtered);
                                        }}
                                    >
                                        {genderData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.name === 'Erkek' ? '#3b82f6' : '#ec4899'} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" />
                                </PieChart>
                            </ChartCard>
                        </div>
                    )}

                    {subTab === 'regional' && (
                        <div className="space-y-6">
                            <ChartCard title="Şehirlere Göre Üye Dağılımı (İlk 10)">
                                <BarChart data={cityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="value"
                                        name="Üye Sayısı"
                                        fill="#3b82f6"
                                        radius={[4, 4, 0, 0]}
                                        className="cursor-pointer"
                                        onClick={(data) => {
                                            const city = data.name;
                                            const filtered = filteredMembers.filter(m => m.city === city);
                                            openStatPopup(`${city} Üye Listesi`, filtered);
                                        }}
                                    />
                                </BarChart>
                            </ChartCard>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <ChartCard title="Bölgesel Dağılım">
                                    <PieChart>
                                        <Pie
                                            data={regionData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            fill="#82ca9d"
                                            dataKey="value"
                                            label
                                            className="cursor-pointer icon-hover-scale"
                                            onClick={(data) => {
                                                const label = data.name;
                                                const filtered = filteredMembers.filter(m => {
                                                    const r = m.region ? String(m.region) : 'Bilinmiyor';
                                                    const mapped = r === 'Bilinmiyor' ? 'Tanımsız' : `${r}. Bölge`;
                                                    return mapped === label;
                                                });
                                                openStatPopup(`${label} Listesi`, filtered);
                                            }}
                                        >
                                            {regionData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ChartCard>

                                <ChartCard title={`İlçelere Göre Dağılım (${selectedCity ? selectedCity : 'Tümü'} - İlk 15)`}>
                                    <BarChart data={districtData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.5} />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip content={<CustomTooltip />} />
                                        <Bar
                                            dataKey="value"
                                            name="Kişi Sayısı"
                                            fill="#ffc658"
                                            radius={[0, 4, 4, 0]}
                                            barSize={15}
                                            className="cursor-pointer"
                                            onClick={(data) => {
                                                const label = data.name;
                                                const filtered = filteredMembers.filter(m => m.district === label);
                                                openStatPopup(`${label} İlçesi Üyeleri`, filtered);
                                            }}
                                        />
                                    </BarChart>
                                </ChartCard>
                            </div>
                        </div>
                    )}

                    {subTab === 'institutions' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="En Çok Üyesi Olan Kurumlar (İlk 10)">
                                <BarChart data={institutionData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.5} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="value"
                                        name="Üye Sayısı"
                                        fill="#82ca9d"
                                        radius={[0, 4, 4, 0]}
                                        barSize={20}
                                        className="cursor-pointer"
                                        onClick={(data) => {
                                            const label = data.name;
                                            const filtered = filteredMembers.filter(m => m.institution === label);
                                            openStatPopup(`${label} Kurumu Üyeleri`, filtered);
                                        }}
                                    />
                                </BarChart>
                            </ChartCard>

                            <ChartCard title="En Çok Üyesi Olan İş Yerleri (İlk 10)">
                                <BarChart data={workplaceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.5} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Bar
                                        dataKey="value"
                                        name="Üye Sayısı"
                                        fill="#8884d8"
                                        radius={[0, 4, 4, 0]}
                                        barSize={20}
                                        className="cursor-pointer"
                                        onClick={(data) => {
                                            const label = data.name;
                                            const filtered = filteredMembers.filter(m => m.workplace === label);
                                            openStatPopup(`${label} İş Yeri Üyeleri`, filtered);
                                        }}
                                    />
                                </BarChart>
                            </ChartCard>
                        </div>
                    )}

                    {subTab === 'time' && (
                        <div className="space-y-6">
                            <ChartCard title="Aylık Yeni Üye Kaydı" height={350}>
                                <AreaChart data={timeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="Yeni Üye"
                                        stroke="#8884d8"
                                        fillOpacity={1}
                                        fill="url(#colorMonthly)"
                                        className="cursor-pointer"
                                        activeDot={{
                                            onClick: (props: any, event: any) => {
                                                const payload = props.payload;
                                                if (!payload) return;

                                                const label = payload.name; // YYYY-MM
                                                const filtered = filteredMembers.filter(m => {
                                                    const d = new Date(m.created_at);
                                                    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                                    return k === label;
                                                });
                                                openStatPopup(`${label} Dönemi Yeni Üyeler`, filtered);
                                            }
                                        }}
                                    />
                                </AreaChart>
                            </ChartCard>

                            <ChartCard title="Kümülatif Üye Artışı" height={350}>
                                <LineChart data={timeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="Toplam" stroke="#82ca9d" strokeWidth={3} dot={false} />
                                </LineChart>
                            </ChartCard>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
