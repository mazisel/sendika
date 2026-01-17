'use client';

import React from 'react';
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { Member } from '@/lib/types';

interface ExportMenuProps {
    data: Member[];
    fileName?: string;
}

export default function ExportMenu({ data, fileName = 'uye-listesi' }: ExportMenuProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleExport = (type: 'excel' | 'csv' | 'pdf') => {
        const timestamp = new Date().toISOString().split('T')[0];
        const finalName = `${fileName}-${timestamp}`;

        if (type === 'excel') exportToExcel(data, finalName);
        if (type === 'csv') exportToCSV(data, finalName);
        if (type === 'pdf') exportToPDF(data, finalName);

        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Dışa Aktar</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
                    <button
                        onClick={() => handleExport('excel')}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                        Excel (.xlsx)
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                        <FileText className="w-4 h-4 text-blue-600" />
                        CSV (.csv)
                    </button>
                    <button
                        onClick={() => handleExport('pdf')}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                        <File className="w-4 h-4 text-red-600" />
                        PDF (.pdf)
                    </button>
                </div>
            )}
        </div>
    );
}
