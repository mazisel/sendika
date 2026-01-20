'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    MapPin,
    Clock,
    X,
    CalendarDays,
    MoreVertical,
    Trash2,
    Edit2
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { logAuditAction } from '@/lib/audit-logger';
import { PermissionManager } from '@/lib/permissions';
import { AdminUser } from '@/lib/types';
import { Mail, MessageSquare, Users as UsersIcon } from 'lucide-react';

interface CalendarEvent {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    location: string;
    category: string;
    color: string;
    created_by: string;
}

export default function CalendarPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [notifySms, setNotifySms] = useState(false);
    const [notifyEmail, setNotifyEmail] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [location, setLocation] = useState('');
    const [category, setCategory] = useState('meeting');
    const [color, setColor] = useState('blue');

    useEffect(() => {
        fetchEvents();
        fetchAdminUsers();
    }, [currentMonth]);

    const fetchAdminUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('admin_users')
                .select('*')
                .eq('is_active', true)
                .order('full_name');
            if (error) throw error;
            setAdminUsers(data || []);
        } catch (err) {
            console.error('Admin users fetch error:', err);
        }
    };

    const fetchParticipants = async (eventId: string) => {
        try {
            const { data, error } = await supabase
                .from('calendar_event_participants')
                .select('admin_id')
                .eq('event_id', eventId);
            if (error) throw error;
            setSelectedParticipants(data.map(p => p.admin_id));
        } catch (err) {
            console.error('Participants fetch error:', err);
        }
    };

    const fetchEvents = async () => {
        setLoading(true);
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);

        try {
            const { data, error } = await supabase
                .from('calendar_events')
                .select('*')
                .gte('start_date', start.toISOString())
                .lte('start_date', end.toISOString());

            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error('Events fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEvent = async () => {
        if (!title || !startDate || !endDate) {
            alert('Lütfen gerekli alanları doldurun');
            return;
        }

        setIsProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: adminUser } = await supabase
                .from('admin_users')
                .select('id')
                .eq('email', user.email)
                .single();

            if (!adminUser) return;

            const eventData = {
                title,
                description,
                start_date: startDate,
                end_date: endDate,
                location,
                category,
                color,
                created_by: adminUser.id
            };

            let eventId = editingEvent?.id;

            if (editingEvent) {
                const { error } = await supabase
                    .from('calendar_events')
                    .update(eventData)
                    .eq('id', editingEvent.id);

                if (error) throw error;

                await logAuditAction({
                    action: 'UPDATE',
                    entityType: 'CALENDAR',
                    entityId: editingEvent.id,
                    details: { title }
                });
            } else {
                const { data, error } = await supabase
                    .from('calendar_events')
                    .insert(eventData)
                    .select()
                    .single();

                if (error) throw error;
                eventId = data.id;

                await logAuditAction({
                    action: 'CREATE',
                    entityType: 'CALENDAR',
                    details: { title }
                });
            }

            // Sync participants
            if (eventId) {
                // Delete existing
                await supabase
                    .from('calendar_event_participants')
                    .delete()
                    .eq('event_id', eventId);

                // Insert new
                if (selectedParticipants.length > 0) {
                    const participantData = selectedParticipants.map(adminId => ({
                        event_id: eventId,
                        admin_id: adminId
                    }));
                    const { error: pError } = await supabase
                        .from('calendar_event_participants')
                        .insert(participantData);
                    if (pError) throw pError;
                }

                // Send notifications
                if (notifySms || notifyEmail) {
                    await sendNotifications(eventId);
                }
            }

            setIsModalOpen(false);
            resetForm();
            fetchEvents();
        } catch (error) {
            console.error('Save error:', error);
            alert('Hata oluştu');
        } finally {
            setIsProcessing(false);
        }
    };

    const sendNotifications = async (eventId: string) => {
        const selectedUsers = adminUsers.filter(u => selectedParticipants.includes(u.id));
        const message = `YENİ ETKİNLİK: ${title}\nTarih: ${format(parseISO(startDate), 'dd.MM.yyyy HH:mm')}\nKonum: ${location || 'Belirtilmedi'}`;

        for (const user of selectedUsers) {
            if (notifySms && user.phone) {
                await fetch('/api/sms/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: user.phone, message })
                });
            }

            if (notifyEmail && user.email) {
                await fetch('/api/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'general',
                        to: user.email,
                        subject: 'Yeni Takvim Etkinliği Daveti',
                        title: 'Takvim Etkinliği',
                        message: `${title}\n\nDetaylar:\nTarih: ${format(parseISO(startDate), 'dd.MM.yyyy HH:mm')}\nKonum: ${location || 'Belirtilmedi'}\nAçıklama: ${description || '-'}`
                    })
                });
            }
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase
                .from('calendar_events')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await logAuditAction({
                action: 'DELETE',
                entityType: 'CALENDAR',
                entityId: id
            });

            fetchEvents();
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setStartDate('');
        setEndDate('');
        setLocation('');
        setCategory('meeting');
        setColor('blue');
        setEditingEvent(null);
        setSelectedParticipants([]);
        setNotifySms(false);
        setNotifyEmail(false);
    };

    const openEditModal = (event: CalendarEvent) => {
        setEditingEvent(event);
        setTitle(event.title);
        setDescription(event.description);
        setStartDate(event.start_date.slice(0, 16));
        setEndDate(event.end_date.slice(0, 16));
        setLocation(event.location);
        setCategory(event.category);
        setColor(event.color);
        fetchParticipants(event.id);
        setIsModalOpen(true);
    };

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                        <CalendarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                            {format(currentMonth, 'MMMM yyyy', { locale: tr })}
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Yönetim Takvimi ve Planlama</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Bugün
                    </button>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all ml-4"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="font-semibold text-sm">Yeni Etkinlik</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        return (
            <div className="grid grid-cols-7 mb-4 px-2">
                {days.map((day, i) => (
                    <div key={i} className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, "d");
                const cloneDay = day;
                const dayEvents = events.filter(e => isSameDay(parseISO(e.start_date), cloneDay));

                days.push(
                    <div
                        key={day.toString()}
                        className={`min-h-[140px] border border-slate-100 dark:border-slate-800 relative group transition-all p-2 ${!isSameMonth(day, monthStart) ? "bg-slate-50/50 dark:bg-slate-900/40 text-slate-300 dark:text-slate-700" : "bg-white dark:bg-slate-900"
                            } ${isSameDay(day, new Date()) ? "ring-2 ring-blue-500 ring-inset z-10" : ""}`}
                        onClick={() => {
                            setSelectedDate(cloneDay);
                            setStartDate(format(cloneDay, "yyyy-MM-dd'T'HH:mm"));
                            setEndDate(format(cloneDay, "yyyy-MM-dd'T'HH:mm"));
                        }}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-bold ${isSameDay(day, new Date()) ? "bg-blue-600 text-white px-2 py-0.5 rounded-md" : ""}`}>
                                {formattedDate}
                            </span>
                        </div>
                        <div className="space-y-1 overflow-y-auto max-h-[100px] no-scrollbar">
                            {dayEvents.map((event) => (
                                <div
                                    key={event.id}
                                    onClick={(e) => { e.stopPropagation(); openEditModal(event); }}
                                    className={`text-[10px] px-2 py-1.5 rounded-lg border-l-4 shadow-sm cursor-pointer transition-all hover:scale-105 ${event.color === 'blue' ? "bg-blue-50 text-blue-700 border-blue-500 dark:bg-blue-900/20 dark:text-blue-300" :
                                        event.color === 'red' ? "bg-red-50 text-red-700 border-red-500 dark:bg-red-900/20 dark:text-red-300" :
                                            event.color === 'green' ? "bg-green-50 text-green-700 border-green-500 dark:bg-green-900/20 dark:text-green-300" :
                                                event.color === 'purple' ? "bg-purple-50 text-purple-700 border-purple-500 dark:bg-purple-900/20 dark:text-purple-300" :
                                                    "bg-orange-50 text-orange-700 border-orange-500 dark:bg-orange-900/20 dark:text-orange-300"
                                        }`}
                                >
                                    <div className="font-bold truncate">{event.title}</div>
                                    <div className="flex items-center opacity-70 mt-0.5">
                                        <Clock className="w-2.5 h-2.5 mr-1" />
                                        {format(parseISO(event.start_date), 'HH:mm')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">{rows}</div>;
    };

    return (
        <div className="p-4 md:p-8">
            {renderHeader()}
            {renderDays()}
            {renderCells()}

            {/* Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in duration-300">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {editingEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik Ekle'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                title="Kapat"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Başlık</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ziyaret, toplantı, konferans..."
                                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Başlangıç</label>
                                    <input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Bitiş</label>
                                    <input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Konum</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Şehir, bina veya oda..."
                                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Kategori</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="meeting">Toplantı</option>
                                        <option value="visit">Saha Ziyareti</option>
                                        <option value="ceremony">Tören / Kutlama</option>
                                        <option value="deadline">Son Tarih</option>
                                        <option value="other">Diğer</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Renk</label>
                                    <div className="flex space-x-2 pt-2">
                                        {['blue', 'red', 'green', 'purple', 'orange'].map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setColor(c)}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-slate-800 dark:border-white scale-125' : 'border-transparent'
                                                    } ${c === 'blue' ? 'bg-blue-500' :
                                                        c === 'red' ? 'bg-red-500' :
                                                            c === 'green' ? 'bg-green-500' :
                                                                c === 'purple' ? 'bg-purple-500' :
                                                                    'bg-orange-500'
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Açıklama</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detaylı bilgi..."
                                    className="w-full h-20 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 flex items-center">
                                        <UsersIcon className="w-3 h-3 mr-1" /> Katılımcılar
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                                        {adminUsers.map(user => (
                                            <label key={user.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedParticipants.includes(user.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedParticipants([...selectedParticipants, user.id]);
                                                        } else {
                                                            setSelectedParticipants(selectedParticipants.filter(id => id !== user.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{user.full_name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-6 pt-2">
                                    <label className="flex items-center space-x-2 cursor-pointer group">
                                        <div className={`p-1.5 rounded-lg transition-colors ${notifySms ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                            <MessageSquare className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={notifySms}
                                            onChange={(e) => setNotifySms(e.target.checked)}
                                            className="hidden"
                                        />
                                        <span className={`text-xs font-bold uppercase ${notifySms ? 'text-orange-600' : 'text-slate-500'}`}>SMS Gönder</span>
                                    </label>

                                    <label className="flex items-center space-x-2 cursor-pointer group">
                                        <div className={`p-1.5 rounded-lg transition-colors ${notifyEmail ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={notifyEmail}
                                            onChange={(e) => setNotifyEmail(e.target.checked)}
                                            className="hidden"
                                        />
                                        <span className={`text-xs font-bold uppercase ${notifyEmail ? 'text-blue-600' : 'text-slate-500'}`}>E-Posta Gönder</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            {editingEvent && (
                                <button
                                    onClick={() => handleDeleteEvent(editingEvent.id)}
                                    className="flex items-center space-x-2 text-red-600 hover:text-red-700 font-semibold text-sm transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Sil</span>
                                </button>
                            )}
                            <div className="flex space-x-3 ml-auto">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSaveEvent}
                                    disabled={isProcessing}
                                    className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-200 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isProcessing ? 'İşleniyor...' : (editingEvent ? 'Güncelle' : 'Kaydet')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
