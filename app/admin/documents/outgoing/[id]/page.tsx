'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Download, Share2, FileText, Calendar, User, Building, Paperclip, Clock } from 'lucide-react';
import { DocumentService } from '@/lib/services/documentService';
import { DMDocument, DMAttachment } from '@/lib/types/document-management';
import { toast } from 'react-hot-toast';

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [document, setDocument] = useState<DMDocument | null>(null);
    const [attachments, setAttachments] = useState<DMAttachment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocument();
    }, [params.id]);

    const fetchDocument = async () => {
        try {
            setLoading(true);
            const { data, error } = await DocumentService.getDocumentById(params.id);
            if (error) throw error;
            setDocument(data);

            const atts = await DocumentService.getAttachments(params.id);
            setAttachments(atts || []);
        } catch (error) {
            console.error('Error fetching document:', error);
            toast.error('Belge detayları alınamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAttachment = async (path: string, fileName: string) => {
        try {
            const url = await DocumentService.getAttachmentUrl(path);
            window.open(url, '_blank');
        } catch (err) {
            toast.error('Dosya açılamadı.');
        }
    }

    if (loading) {
        return <div className="p-10 text-center text-slate-500">Yükleniyor...</div>;
    }

    if (!document) {
        return <div className="p-10 text-center text-red-500">Belge bulunamadı.</div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800">
                        <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">{document.document_number}</h1>
                        <p className="text-sm text-slate-500">{document.type === 'outgoing' ? 'Giden Evrak' : 'İç Yazışma'}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Yazdır
                    </button>
                    <button className="flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">
                        <Download className="w-4 h-4 mr-2" />
                        İndir (PDF)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Like A4 Preview) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[600px] relative">
                        {/* Official Letter Head Mockup */}
                        <div className="text-center mb-8 border-b-2 border-red-600 pb-4">
                            <h2 className="text-red-600 font-bold text-lg uppercase">T.C.</h2>
                            <h3 className="text-slate-900 dark:text-white font-bold text-xl uppercase">Sendika Yönetim Sistemi</h3>
                            <p className="text-slate-500 text-xs mt-1">Genel Merkez Yönetim Kurulu</p>
                        </div>

                        <div className="flex justify-between text-sm mb-8 font-mono">
                            <div>
                                <p><span className="font-bold">Sayı:</span> {document.document_number}</p>
                                <p><span className="font-bold">Konu:</span> {document.subject}</p>
                            </div>
                            <div className="text-right">
                                <p><span className="font-bold">Tarih:</span> {new Date(document.reference_date).toLocaleDateString('tr-TR')}</p>
                            </div>
                        </div>

                        <div className="mb-8">
                            <p className="font-bold mb-2">Sayın: {document.receiver}</p>
                        </div>

                        <div className="prose dark:prose-invert max-w-none text-justify whitespace-pre-wrap">
                            {document.description}
                        </div>

                        <div className="absolute bottom-16 right-16 text-center">
                            <p className="font-bold">{document.sender}</p>
                            <p className="text-xs text-slate-500">İmza</p>
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Status Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Belge Durumu</h3>
                        <div className="flex items-center space-x-2 text-green-600 mb-4 bg-green-50 p-3 rounded-lg">
                            <CheckCircleIcon className="w-5 h-5" />
                            <span className="font-medium capitalize">{document.status === 'sent' ? 'Gönderildi' : document.status}</span>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-2">
                                <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Oluşturma</span>
                                <span>{new Date(document.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-2">
                                <span className="flex items-center"><User className="w-4 h-4 mr-2" /> Oluşturan</span>
                                <span>{document.sender}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="flex items-center"><Building className="w-4 h-4 mr-2" /> Kod</span>
                                <span>{document.category_code || '-'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Attachments Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Ekler</h3>
                        {attachments.length === 0 ? (
                            <p className="text-slate-500 text-sm">Ek dosya bulunmuyor.</p>
                        ) : (
                            <ul className="space-y-3">
                                {attachments.map(att => (
                                    <li key={att.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg group">
                                        <div className="flex items-center space-x-3 overflow-hidden">
                                            <Paperclip className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={att.file_name}>
                                                {att.file_name}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDownloadAttachment(att.file_path, att.file_name)}
                                            className="text-slate-400 hover:text-violet-600 transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CheckCircleIcon(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    )
}
