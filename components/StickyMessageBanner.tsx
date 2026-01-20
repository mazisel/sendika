'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { MessageSquare } from 'lucide-react';

interface StickyMessage {
    id: string;
    message: string;
    created_by: string;
    created_at: string;
    creator_name?: string;
}

export default function StickyMessageBanner() {
    const [message, setMessage] = useState<StickyMessage | null>(null);

    useEffect(() => {
        loadMessage();

        // Subscribe to changes
        const channel = supabase
            .channel('sticky_messages_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'sticky_messages'
            }, () => {
                loadMessage();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadMessage = async () => {
        try {
            const { data, error } = await supabase
                .from('sticky_messages')
                .select(`
          *,
          creator:admin_users!sticky_messages_created_by_fkey(full_name)
        `)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('Sticky message load error:', error);
                return;
            }

            if (data && data.length > 0) {
                const item = data[0];
                setMessage({
                    ...item,
                    creator_name: item.creator?.full_name
                });
            } else {
                setMessage(null);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    if (!message) return null;

    return (
        <Link
            href="/admin/tools/sticky-message"
            className="hidden lg:flex items-center bg-yellow-50/50 dark:bg-yellow-900/20 border border-yellow-200/50 dark:border-yellow-800/50 rounded-full px-3 py-1 animate-in fade-in slide-in-from-top-1 duration-500 hover:bg-yellow-100/60 dark:hover:bg-yellow-900/40 transition-all group mr-4"
            title="Mesajı Düzenle"
        >
            <div className="flex items-center space-x-2 overflow-hidden">
                <MessageSquare className="w-3 h-3 text-yellow-600 dark:text-yellow-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="flex items-center space-x-2 overflow-hidden">
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px] xl:max-w-[300px]">
                        {message.message}
                    </p>
                    <div className="flex items-center space-x-1 whitespace-nowrap border-l border-slate-300 dark:border-slate-700 pl-2">
                        <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400">
                            {message.creator_name || 'Yönetim'}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 text-opacity-70">
                            • {new Date(message.created_at).toLocaleString('tr-TR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
