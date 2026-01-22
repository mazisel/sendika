'use client';

import React, { useState } from 'react';
import { Member } from '@/lib/types';
import {
    X, User, Phone, Mail, MapPin, Briefcase,
    Calendar, Building2, BadgeCheck, Activity,
    FileText, Hash, GraduationCap, Heart, Users,
    Upload, Trash2, Download, AlertCircle, Folder, Edit,
    MessageSquare, Key, Send, RefreshCw, Copy, Check, Eye
} from 'lucide-react';
import { formatDateSafe, formatDateTimeSafe } from '@/lib/dateUtils';
import { MemberService, MemberDocument } from '@/lib/services/memberService';
import { AdminAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import DocumentPreviewModal from '@/components/common/DocumentPreviewModal';

interface MemberDetailModalProps {
    member: Member;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: () => void;
    onResign?: () => void;
}

export default function MemberDetailModal({ member, isOpen, onClose, onEdit, onResign }: MemberDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'personal' | 'contact' | 'work' | 'membership' | 'files' | 'actions'>('personal');
    const [documents, setDocuments] = useState<MemberDocument[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [smsMessage, setSmsMessage] = useState('');
    const [sendingSms, setSendingSms] = useState(false);
    const [generatingPassword, setGeneratingPassword] = useState(false);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);
    const currentUser = AdminAuth.getCurrentUser();

    // Load documents when 'files' tab is active
    React.useEffect(() => {
        if (activeTab === 'files' && isOpen) {
            loadDocuments();
        }
    }, [activeTab, isOpen, member.id]);

    const loadDocuments = async () => {
        setLoadingDocuments(true);
        try {
            const docs = await MemberService.getMemberDocuments(member.id);
            setDocuments(docs);
        } catch (err) {
            console.error('Documents load error:', err);
            setFileError('Belgeler yüklenirken hata oluştu.');
        } finally {
            setLoadingDocuments(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        if (file.size > 10 * 1024 * 1024) {
            alert('Dosya boyutu 10MB\'dan büyük olamaz.');
            return;
        }

        setUploading(true);
        setFileError(null);

        try {
            const fileName = `personnel_${member.id}_${Date.now()}_${file.name}`;
            const filePath = `${member.id}/${fileName}`;
            const uploadedPath = await MemberService.uploadDocument(file, filePath);
            const { data: { publicUrl } } = supabase.storage.from('member-documents').getPublicUrl(uploadedPath || filePath);

            await MemberService.createDocumentRecord({
                member_id: member.id,
                document_type: 'personnel_file',
                document_name: file.name,
                file_url: publicUrl,
                file_size: file.size,
                uploaded_by: currentUser?.id
            });

            loadDocuments();
        } catch (err) {
            console.error('Upload error:', err);
            setFileError(err instanceof Error ? err.message : 'Dosya yüklenirken hata oluştu.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (doc: MemberDocument) => {
        if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;

        try {
            // Extract path basics
            const urlObj = new URL(doc.file_url);
            const pathParts = urlObj.pathname.split('/member-documents/');
            const filePath = pathParts[1];

            if (filePath) {
                await MemberService.deleteDocument(doc.id, filePath);
                setDocuments(prev => prev.filter(d => d.id !== doc.id));
            } else {
                throw new Error('Dosya yolu bulunamadı.');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Silme işlemi başarısız.');
        }
    };

    const handleSendSms = async (customMessage?: string) => {
        const messageToSend = typeof customMessage === 'string' ? customMessage : smsMessage;

        if (!member.phone) {
            setActionError('Üyenin telefon numarası bulunmuyor.');
            return;
        }

        if (!messageToSend.trim()) {
            setActionError('Lütfen bir mesaj yazın.');
            return;
        }

        setSendingSms(true);
        setActionError(null);
        setActionSuccess(null);

        try {
            const response = await fetch('/api/sms/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: member.phone,
                    message: messageToSend
                })
            });

            const data = await response.json();

            if (data.success) {
                setActionSuccess('SMS başarıyla gönderildi.');
                if (typeof customMessage !== 'string') {
                    setSmsMessage('');
                }
            } else {
                setActionError(data.error || 'SMS gönderilemedi.');
            }
        } catch (err) {
            console.error('SMS error:', err);
            setActionError('SMS gönderilirken bir hata oluştu.');
        } finally {
            setSendingSms(false);
        }
    };

    const handleGenerateMobilePassword = async () => {
        if (!member.phone) {
            setActionError('Üyenin telefon numarası bulunmuyor.');
            return;
        }

        if (!confirm('Yeni bir şifre oluşturulup üyeye SMS olarak gönderilecek. Bu işlem mevcut şifreyi geçersiz kılar. Onaylıyor musunuz?')) return;

        setGeneratingPassword(true);
        setActionError(null);
        setActionSuccess(null);

        try {
            // Generate 6 digit random code
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            // Call secure API to create/update Supabase Auth user and send SMS
            const response = await fetch('/api/auth/mobile-credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    memberId: member.id,
                    memberName: `${member.first_name} ${member.last_name}`,
                    phone: member.phone,
                    password: code
                })
            });

            const data = await response.json();

            if (data.success) {
                // We show the generated password once to the admin
                // We do NOT store it in the members table anymore (security best practice)
                // But we can update the UI locally to show it just now
                setActionSuccess(`Kullanıcı yetkilendirildi ve şifre SMS gönderildi: ${code}`);

                // Optionally update local state to reflect that a password exists (if we had a flag)
                // member.has_mobile_access = true; // Hypothetical update
            } else {
                setActionError(data.error || 'İşlem başarısız.');
            }
        } catch (err) {
            console.error('Password generation error:', err);
            setActionError('Şifre oluşturulurken bir hata oluştu.');
        } finally {
            setGeneratingPassword(false);
        }
    };

    if (!isOpen) return null;

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-green-100 text-green-700 border-green-200',
            pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            inactive: 'bg-gray-100 text-gray-700 border-gray-200',
            suspended: 'bg-orange-100 text-orange-700 border-orange-200',
            resigned: 'bg-red-100 text-red-700 border-red-200'
        };

        const labels = {
            active: 'Aktif Üye',
            pending: 'Onay Bekliyor',
            inactive: 'Pasif',
            suspended: 'Askıda',
            resigned: 'İstifa'
        };

        const key = status as keyof typeof styles;
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[key] || styles.inactive}`}>
                {labels[key] || status}
            </span>
        );
    };

    const InfoItem = ({ icon: Icon, label, value, className = '' }: { icon: any, label: string, value?: React.ReactNode, className?: string }) => (
        <div className={`flex flex-col p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 ${className}`}>
            <div className="flex items-center gap-2 mb-1.5 text-slate-500 dark:text-slate-400">
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">
                {value || '-'}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[700px] animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Clean Split Design */}
                <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-6 flex justify-between items-start sticky top-0 z-20">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{member.first_name} {member.last_name}</h2>
                            {getStatusBadge(member.membership_status)}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
                            <Hash className="w-4 h-4 opacity-70" />
                            Üye No: {member.membership_number || 'Atanmamış'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {onEdit && (
                            <button
                                onClick={onEdit}
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-full transition-colors"
                                title="Düzenle"
                            >
                                <Edit className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col z-10 bg-slate-50/50 dark:bg-black/20">

                    {/* Tabs Panel */}
                    <div className="px-6 pt-6 sticky top-0 z-10">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1 flex gap-1 overflow-x-auto no-scrollbar pb-2">
                            {[
                                { id: 'personal', label: 'Kişisel', icon: User },
                                { id: 'contact', label: 'İletişim', icon: Phone },
                                { id: 'work', label: 'Kurum & Görev', icon: Briefcase },
                                { id: 'membership', label: 'Üyelik', icon: BadgeCheck },
                                { id: 'files', label: 'Özlük Dosyası', icon: Folder },
                                { id: 'actions', label: 'İşlemler', icon: Activity },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4 flex-shrink-0" />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                        <div className="space-y-6">

                            {activeTab === 'personal' && (
                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InfoItem icon={Hash} label="TC Kimlik No" value={member.tc_identity} />
                                    <InfoItem icon={Calendar} label="Doğum Tarihi" value={formatDateSafe(member.birth_date)} />
                                    <InfoItem icon={MapPin} label="Doğum Yeri" value={member.birth_place} />
                                    <InfoItem icon={Users} label="Cinsiyet" value={member.gender} />
                                    <InfoItem icon={User} label="Baba Adı" value={member.father_name} />
                                    <InfoItem icon={User} label="Anne Adı" value={member.mother_name} />
                                    <InfoItem icon={Heart} label="Medeni Durum" value={member.marital_status} />
                                    <InfoItem icon={GraduationCap} label="Eğitim Durumu" value={member.education_level} />
                                    <InfoItem icon={Activity} label="Kan Grubu" value={member.blood_group} />
                                    <InfoItem icon={Users} label="Çocuk Sayısı" value={member.children_count} />
                                </div>
                            )}

                            {activeTab === 'contact' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="grid grid-cols-2 gap-3">
                                        <InfoItem icon={Phone} label="Telefon" value={member.phone} className="col-span-2 sm:col-span-1" />
                                        <InfoItem icon={Mail} label="E-Posta" value={member.email} className="col-span-2 sm:col-span-1" />
                                    </div>
                                    <InfoItem icon={MapPin} label="Adres" value={member.address} className="col-span-2" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <InfoItem icon={MapPin} label="İl" value={member.city} />
                                        <InfoItem icon={MapPin} label="İlçe" value={member.district} />
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-red-500" />
                                            Acil Durum İletişim
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InfoItem icon={User} label="İlgili Kişi" value={member.emergency_contact_name} className="col-span-2 sm:col-span-1" />
                                            <InfoItem icon={Phone} label="Telefon" value={member.emergency_contact_phone} className="col-span-2 sm:col-span-1" />
                                            <InfoItem icon={Users} label="Yakınlık" value={member.emergency_contact_relation} className="col-span-2" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'work' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InfoItem icon={Building2} label="Kurum" value={member.institution} className="col-span-2" />
                                    <InfoItem icon={Briefcase} label="İş Yeri" value={member.workplace} className="col-span-2" />
                                    <InfoItem icon={Briefcase} label="Kadro Unvanı" value={member.position} />
                                    <InfoItem icon={MapPin} label="Bölge" value={member.region ? `${member.region}. Bölge` : '-'} />
                                    <InfoItem icon={FileText} label="Kurum Sicil No" value={member.institution_register_no} />
                                    <InfoItem icon={FileText} label="Emekli Sicil No" value={member.retirement_register_no} />
                                </div>
                            )}

                            {activeTab === 'membership' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <InfoItem icon={Hash} label="Üye No" value={member.membership_number} />
                                    <InfoItem icon={FileText} label="Karar No" value={member.decision_number} />
                                    <InfoItem icon={Calendar} label="Karar Tarihi" value={formatDateSafe(member.decision_date)} />
                                    <InfoItem icon={Calendar} label="Kayıt Tarihi" value={formatDateSafe(member.created_at)} />

                                    <div className="col-span-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <InfoItem
                                            icon={Activity}
                                            label="Üyelik Durumu"
                                            value={
                                                <div className="flex items-center justify-between">
                                                    <span>
                                                        {member.membership_status === 'active' ? 'Aktif' :
                                                            member.membership_status === 'pending' ? 'Beklemede' :
                                                                member.membership_status === 'inactive' ? 'Pasif' :
                                                                    member.membership_status === 'suspended' ? 'Askıda' :
                                                                        member.membership_status === 'resigned' ? 'İstifa Etti' :
                                                                            member.membership_status}
                                                    </span>
                                                    {member.is_active ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-xs">
                                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                            Sistemde Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-slate-400 text-xs">
                                                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                            Sistemde Pasif
                                                        </span>
                                                    )}
                                                </div>
                                            }
                                            className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'files' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                                            <Upload className="w-4 h-4 text-slate-500" />
                                            Yeni Belge Yükle
                                        </h3>
                                        <div className="flex items-center gap-4">
                                            <label className={`flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${fileError ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-blue-400 bg-white dark:bg-slate-900'}`}>
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    {uploading ? (
                                                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                                    ) : (
                                                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                                    )}
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                                        {uploading ? 'Yükleniyor...' : 'Dosya seçmek için tıklayın'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                                                </div>
                                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png" />
                                            </label>
                                        </div>
                                        {fileError && (
                                            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                {fileError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                            <Folder className="w-4 h-4 text-slate-500" />
                                            Mevcut Belgeler ({documents.length})
                                        </h3>

                                        {loadingDocuments ? (
                                            <div className="flex justify-center p-8">
                                                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                                            </div>
                                        ) : documents.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                                Yüklenmiş belge bulunmuyor.
                                            </div>
                                        ) : (
                                            <div className="grid gap-3">
                                                {documents.map((doc) => {
                                                    const docTypeLabels: Record<string, string> = {
                                                        resignation_petition: 'İstifa Dilekçesi',
                                                        personnel_file: 'Özlük Belgesi',
                                                        kimlik: 'Kimlik Belgesi',
                                                        diploma: 'Diploma',
                                                        sertifika: 'Sertifika',
                                                        cv: 'Özgeçmiş',
                                                        referans: 'Referans Mektubu',
                                                        saglik: 'Sağlık Raporu',
                                                        adli_sicil: 'Adli Sicil Belgesi',
                                                        diger: 'Diğer'
                                                    };

                                                    return (
                                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg group hover:shadow-sm transition-all">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-baseline gap-2">
                                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[150px] sm:max-w-xs">
                                                                            {doc.document_name}
                                                                        </p>
                                                                        {doc.document_type && (
                                                                            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                                                                                {docTypeLabels[doc.document_type] || doc.document_type}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-slate-500">
                                                                        {formatDateTimeSafe(doc.uploaded_at)} • {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={() => setPreviewDoc({ url: doc.file_url, name: doc.document_name })}
                                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                    title="Görüntüle"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <a
                                                                    href={doc.file_url}
                                                                    download={doc.document_name}
                                                                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                                    title="İndir"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </a>
                                                                <button
                                                                    onClick={() => handleDelete(doc)}
                                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                    title="Sil"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'actions' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Action Feedback Area */}
                                    {actionSuccess && (
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400">
                                            <Check className="w-5 h-5 flex-shrink-0" />
                                            <p className="text-sm font-medium">{actionSuccess}</p>
                                        </div>
                                    )}
                                    {actionError && (
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            <p className="text-sm font-medium">{actionError}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* SMS Sending Card */}
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                                    <MessageSquare className="w-4 h-4" />
                                                </div>
                                                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">SMS Gönder</h3>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                        Alıcı Telefon
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={member.phone || 'Telefon Yok'}
                                                        disabled
                                                        className="w-full h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-500"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                        Mesajınız
                                                    </label>
                                                    <textarea
                                                        value={smsMessage}
                                                        onChange={(e) => setSmsMessage(e.target.value)}
                                                        placeholder="Mesajınızı buraya yazın..."
                                                        className="w-full h-24 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors resize-none mb-2"
                                                    />

                                                    {/* Template Tags */}
                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                        {[
                                                            { label: '{ad}', value: '{ad}', title: 'Üye Adı' },
                                                            { label: '{soyad}', value: '{soyad}', title: 'Üye Soyadı' },
                                                            { label: '{tc}', value: '{tc}', title: 'TC Kimlik No' },
                                                            { label: '{uye_no}', value: '{uye_no}', title: 'Üye No' }
                                                        ].map(tag => (
                                                            <button
                                                                key={tag.value}
                                                                onClick={() => setSmsMessage(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + tag.value)}
                                                                className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-xs text-slate-600 dark:text-slate-300 transition-colors"
                                                                title={`${tag.title} ekle`}
                                                            >
                                                                {tag.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        let finalMessage = smsMessage;
                                                        finalMessage = finalMessage.replace(/{ad}/g, member.first_name);
                                                        finalMessage = finalMessage.replace(/{soyad}/g, member.last_name);
                                                        finalMessage = finalMessage.replace(/{tc}/g, member.tc_identity);
                                                        finalMessage = finalMessage.replace(/{uye_no}/g, member.membership_number || '');

                                                        handleSendSms(finalMessage);
                                                    }}
                                                    disabled={sendingSms || !member.phone}
                                                    className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {sendingSms ? (
                                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Send className="w-3 h-3" />
                                                    )}
                                                    {sendingSms ? 'Gönderiliyor...' : 'SMS Gönder'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mobile App Password Card */}
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                                                    <Key className="w-4 h-4" />
                                                </div>
                                                <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Mobil Uygulama Şifresi</h3>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                                    Üye için rastgele 6 haneli bir mobil uygulama giriş şifresi oluşturulur ve SMS olarak gönderilir.
                                                </p>

                                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                                                    {member.mobile_password && (
                                                        <div>
                                                            <span className="text-[10px] text-slate-500 uppercase font-medium block mb-1">Mevcut Şifre</span>
                                                            <div className="flex items-center justify-between">
                                                                <code className="text-base font-mono font-bold text-slate-900 dark:text-slate-100 tracking-wider">
                                                                    {member.mobile_password}
                                                                </code>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                                        <span className="text-[10px] text-slate-500 uppercase font-medium block mb-1">Son Giriş</span>
                                                        <div className="flex items-center gap-2">
                                                            {member.last_login_at ? (
                                                                <>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                                    <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                                                        {formatDateTimeSafe(member.last_login_at)}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                                    <span className="text-xs font-medium text-slate-500 italic">
                                                                        Hiç giriş yapmadı
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={handleGenerateMobilePassword}
                                                    disabled={generatingPassword || !member.phone}
                                                    className="w-full h-9 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                                                >
                                                    {generatingPassword ? (
                                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="w-3 h-3" />
                                                            <span>Yeni Şifre Oluştur & Gönder</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Member Resignation Card - Only show if active */}
                                        {onResign && member.membership_status === 'active' && (
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm md:col-span-2 border-l-4 border-l-red-500">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                                                            <Trash2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Üyelikten Ayrılma / İstifa</h3>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                Üyenin istifa işlemini başlatır. Dilekçe yüklenmesi zorunludur.
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={onResign}
                                                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        <span>İstifa Ettir</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {previewDoc && (
                <DocumentPreviewModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc.url}
                    fileName={previewDoc.name}
                />
            )}
        </div>
    );
}
