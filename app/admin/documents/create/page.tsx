'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Control } from 'react-hook-form';
import {
    ArrowLeft, Send, Save, Eye, FileText,
    Bold, Italic, AlignLeft, AlignCenter, AlignRight,
    Plus, Trash2, Calendar, GripVertical
} from 'lucide-react';
import Link from 'next/link';
import { DocumentService } from '@/lib/services/documentService';
import { toast } from 'react-hot-toast';
import { AdminAuth } from '@/lib/auth';

// --- Types ---

interface Signer {
    name: string;
    title: string;
    is_proxy?: boolean; // Vekil mi?
}

interface DocFormData {
    category_code: string; // Dosya Kodu (Örn: 302.01)
    subject: string;
    receiver: string; // Sayın: ...
    content: string;
    date: string;
    signers: Signer[];
    type: 'outgoing' | 'internal';
    sender_unit: string; // "Genel Merkez" vs
    textAlign: 'left' | 'center' | 'right' | 'justify';
    receiverTextAlign: 'left' | 'center' | 'right' | 'justify';
    logoUrl?: string;
}

export default function AdvancedDocumentCreator() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false); // Mobile toggle

    // Default Header Info
    const DEFAULT_HEADER = {
        title: "T.C.",
        orgName: "SENDİKA YÖNETİM SİSTEMİ", // Dinamik olabilir
        subUnit: "GENEL MERKEZ YÖNETİM KURULU"
    };

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<DocFormData>({
        defaultValues: {
            type: 'outgoing',
            sender_unit: DEFAULT_HEADER.subUnit,
            date: new Date().toISOString().split('T')[0],
            signers: [{ name: 'Ad Soyad', title: 'Genel Başkan' }],
            textAlign: 'justify',
            receiverTextAlign: 'left',
            logoUrl: ''
        }
    });

    // Valid values for preview
    const formValues = watch();

    // Signers Field Array
    const { fields: signerFields, append: appendSigner, remove: removeSigner } = useFieldArray({
        control,
        name: "signers"
    });

    const onSubmit = async (data: DocFormData, status: 'draft' | 'sent') => {
        setLoading(true);
        const user = AdminAuth.getCurrentUser();

        if (!user) {
            toast.error('Oturum hatası.');
            setLoading(false);
            return;
        }

        try {
            const year = new Date().getFullYear();

            // Generate Sequence (Only for 'sent' typically, but let's generate for now to show)
            // Ideally drafts might not have a number yet.
            let docNumber = 'TASLAK';
            if (status === 'sent') {
                docNumber = await DocumentService.generateNextSequence(data.type, year);
            }

            // Create Payload
            const { error } = await DocumentService.createDocument({
                type: data.type,
                status: status,
                document_number: docNumber,
                reference_date: new Date(data.date).toISOString(),
                sender: data.sender_unit,
                receiver: data.receiver,
                subject: data.subject,
                description: data.content, // HTML or Plain text
                category_code: data.category_code,
                created_by: user.id
            });

            if (error) throw error;

            toast.success(status === 'sent' ? `Belge resmileşti: ${docNumber}` : 'Taslak kaydedildi.');
            router.push('/admin/documents/outgoing');

        } catch (err: any) {
            console.error(err);
            toast.error('Hata: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] -m-6 overflow-hidden">
            {/* Toolbar */}
            <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-violet-600" />
                            Yeni Resmi Yazı
                        </h1>
                        <span className="text-xs text-slate-500">Mevcut Durum: Yeni Kayıt</span>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleSubmit((d) => onSubmit(d, 'draft'))}
                        disabled={loading}
                        className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
                    >
                        <Save className="w-4 h-4 inline-block mr-2" />
                        Taslak Kaydet
                    </button>
                    <button
                        onClick={handleSubmit((d) => onSubmit(d, 'sent'))}
                        disabled={loading}
                        className="px-4 py-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700 text-sm font-medium shadow-sm"
                    >
                        <Send className="w-4 h-4 inline-block mr-2" />
                        Resmileştir ve Gönder
                    </button>
                </div>
            </header>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* Editor Pane (Left) */}
                <div className={`w-full md:w-[400px] lg:w-[450px] bg-slate-50 border-r border-slate-200 overflow-y-auto p-6 space-y-6 ${previewMode ? 'hidden md:block' : 'block'}`}>

                    {/* Section: Künye */}
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-2">Belge Künyesi</h3>

                        <div>
                            <label className="text-xs font-medium text-slate-500">Logo URL (Opsiyonel)</label>
                            <input placeholder="https://..." {...register('logoUrl')} className="form-input w-full mt-1 text-sm border-slate-300 rounded-md" />
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500">Gönderen Birim</label>
                            <input {...register('sender_unit')} className="form-input w-full mt-1 text-sm bg-slate-50 border-slate-300 rounded-md" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-500">Tarih</label>
                                <input type="date" {...register('date')} className="form-input w-full mt-1 text-sm border-slate-300 rounded-md" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500">Dosya Kodu</label>
                                <input placeholder="302.01" {...register('category_code')} className="form-input w-full mt-1 text-sm border-slate-300 rounded-md" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500">Konu</label>
                            <input {...register('subject', { required: true })} placeholder="Toplantı hk." className="form-input w-full mt-1 text-sm border-slate-300 rounded-md" />
                            {errors.subject && <span className="text-red-500 text-xs">Zorunlu alan</span>}
                        </div>
                    </div>

                    {/* Section: İçerik */}
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2 mb-2">İçerik</h3>

                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-medium text-slate-500">Alıcı (Hitap)</label>
                                <div className="flex space-x-1 bg-slate-100 p-1 rounded-md">
                                    <button type="button" onClick={() => setValue('receiverTextAlign', 'left')} className={`p-1 rounded ${formValues.receiverTextAlign === 'left' ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <AlignLeft className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('receiverTextAlign', 'center')} className={`p-1 rounded ${formValues.receiverTextAlign === 'center' ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <AlignCenter className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('receiverTextAlign', 'right')} className={`p-1 rounded ${formValues.receiverTextAlign === 'right' ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <AlignRight className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('receiverTextAlign', 'justify')} className={`p-1 rounded ${formValues.receiverTextAlign === 'justify' ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-justify"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
                                    </button>
                                </div>
                            </div>
                            <input {...register('receiver', { required: true })} placeholder="ANKARA VALİLİĞİNE" className="form-input w-full mt-1 text-sm border-slate-300 rounded-md font-bold" />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-medium text-slate-500">Metin</label>
                                <div className="flex space-x-1 bg-slate-100 p-1 rounded-md">
                                    <button type="button" onClick={() => setValue('textAlign', 'left')} className={`p-1 rounded ${formValues.textAlign === 'left' ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <AlignLeft className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('textAlign', 'center')} className={`p-1 rounded ${formValues.textAlign === 'center' ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <AlignCenter className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('textAlign', 'right')} className={`p-1 rounded ${formValues.textAlign === 'right' ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <AlignRight className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('textAlign', 'justify')} className={`p-1 rounded ${formValues.textAlign === 'justify' ? 'bg-white shadow text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-justify"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
                                    </button>
                                </div>
                            </div>
                            <textarea
                                {...register('content')}
                                rows={10}
                                className="form-textarea w-full mt-1 text-sm border-slate-300 rounded-md p-3 leading-relaxed"
                                placeholder="Belge içeriğini buraya yazınız..."
                            ></textarea>
                        </div>
                    </div>

                    {/* Section: İmzacılar */}
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                            <h3 className="text-sm font-semibold text-slate-900">İmzacılar</h3>
                            <button type="button" onClick={() => appendSigner({ name: '', title: '' })} className="text-violet-600 hover:bg-violet-50 p-1 rounded">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {signerFields.map((field, index) => (
                                <div key={field.id} className="flex items-start space-x-2 bg-slate-50 p-2 rounded-md">
                                    <div className="grid gap-2 flex-1">
                                        <input
                                            placeholder="Ad Soyad"
                                            {...register(`signers.${index}.name` as const)}
                                            className="text-xs border-slate-300 rounded px-2 py-1"
                                        />
                                        <input
                                            placeholder="Ünvan (Örn: Başkan)"
                                            {...register(`signers.${index}.title` as const)}
                                            className="text-xs border-slate-300 rounded px-2 py-1"
                                        />
                                    </div>
                                    <button onClick={() => removeSigner(index)} className="text-slate-400 hover:text-red-500 mt-2">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Preview Pane (Right) - Light Mode Forced via Inline Styles */}
                <div
                    style={{ backgroundColor: '#e5e7eb' }}
                    className={`flex-1 p-8 overflow-y-auto flex justify-center ${!previewMode ? 'hidden md:flex' : 'flex'}`}
                >
                    {/* A4 Page Container */}
                    <div
                        style={{ backgroundColor: 'white', color: 'black' }}
                        className="w-[210mm] min-h-[297mm] shadow-2xl px-[25mm] py-[25mm] text-[12pt] font-serif leading-normal relative mx-auto transition-all scale-[0.8] lg:scale-[0.9] xl:scale-100 origin-top printable-content"
                    >

                        {/* Header */}
                        <div className="text-center mb-8 border-b-2 border-red-600 pb-4 relative">
                            {formValues.logoUrl && (
                                <img src={formValues.logoUrl} alt="Logo" className="absolute left-0 top-0 h-20 w-auto object-contain" />
                            )}
                            <h2 className="text-red-600 font-bold text-lg uppercase">{DEFAULT_HEADER.title}</h2>
                            <h3 style={{ color: 'black' }} className="font-bold text-xl uppercase">{DEFAULT_HEADER.orgName}</h3>
                            <p style={{ color: 'black' }} className="text-sm mt-1 uppercase">{formValues.sender_unit || DEFAULT_HEADER.subUnit}</p>
                        </div>

                        {/* Meta Data Row */}
                        <div style={{ color: 'black' }} className="flex justify-between items-start mb-8 font-sans text-[11pt]">
                            <div className="space-y-1">
                                <p><span className="font-bold">Sayı:</span> {formValues.category_code ? `${formValues.category_code}-` : ''}TASLAK</p>
                                <p><span className="font-bold">Konu:</span> {formValues.subject}</p>
                            </div>
                            <div className="text-right">
                                <p><span className="font-bold">Tarih:</span> {formValues.date ? new Date(formValues.date).toLocaleDateString('tr-TR') : '-'}</p>
                            </div>
                        </div>

                        {/* Receiver */}
                        <div style={{ color: 'black', textAlign: formValues.receiverTextAlign || 'left' }} className="mb-10 pl-16 font-bold uppercase tracking-wide">
                            {formValues.receiver || '[ALICI BİLGİSİ BURAYA GELECEK]'}
                        </div>

                        {/* Content */}
                        <div style={{ color: 'black', textAlign: formValues.textAlign || 'justify' }} className="mb-16 indent-12 whitespace-pre-wrap min-h-[200px]">
                            {formValues.content || '[İçerik bekleniyor...]'}
                        </div>

                        {/* Signatures */}
                        <div style={{ color: 'black' }} className="flex justify-end space-x-12 mt-auto pt-12 pr-4">
                            {formValues.signers?.map((signer: Signer, idx: number) => (
                                <div key={idx} className="text-center min-w-[150px]">
                                    <p className="font-bold whitespace-nowrap">{signer.name}</p>
                                    <p className="text-[10pt]">{signer.title}</p>
                                    {/* Mock Signature Space */}
                                    <div className="h-16"></div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Info */}
                        <div className="absolute bottom-10 left-[25mm] right-[25mm] border-t border-slate-300 pt-2 text-[8pt] text-slate-500 font-sans flex justify-between">
                            <div>
                                <p>{DEFAULT_HEADER.orgName}</p>
                                <p>Adres: Genel Merkez Binası, Ankara</p>
                            </div>
                            <div className='text-right'>
                                <p>Bilgi İçin: Genel Sekreterlik</p>
                                <p>Tel: 0312 000 00 00</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Mobile Toggle */}
            <div className="md:hidden fixed bottom-6 right-6">
                <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className="w-14 h-14 bg-violet-600 rounded-full text-white shadow-lg flex items-center justify-center"
                >
                    {previewMode ? <AlignLeft className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
            </div>
        </div>
    );
}
