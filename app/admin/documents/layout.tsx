'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Book,
    FileInput,
    FileOutput,
    PlusCircle,
    FileText
} from 'lucide-react';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';

export default function DocumentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const currentUser = AdminAuth.getCurrentUser();
        setUser(currentUser);
    }, []);

    if (!user) return null;

    const allTabs = [
        {
            name: 'Karar Defteri',
            href: '/admin/documents/decisions',
            icon: Book,
            pattern: 'decisions',
            permission: 'decisions.view'
        },
        {
            name: 'Belge Oluştur',
            href: '/admin/documents/create',
            icon: PlusCircle,
            pattern: 'create',
            permission: 'documents.create'
        },
        {
            name: 'Gelen Evrak',
            href: '/admin/documents/incoming',
            icon: FileInput,
            pattern: 'incoming',
            permission: 'documents.view'
        },
        {
            name: 'Giden Evrak',
            href: '/admin/documents/outgoing',
            icon: FileOutput,
            pattern: 'outgoing',
            permission: 'documents.view'
        }
    ];

    const tabs = allTabs.filter(tab => PermissionManager.hasPermission(user, tab.permission));

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
            {/* Module Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                        <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Belge Yönetimi</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Karar defteri, gelen/giden evrak ve resmi yazışma yönetimi
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const isActive = pathname.includes(tab.pattern);
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.name}
                                href={tab.href}
                                className={`
                  flex items-center px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors
                  ${isActive
                                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                    }
                `}
                            >
                                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'}`} />
                                {tab.name}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-auto">
                {children}
            </div>
        </div>
    );
}
