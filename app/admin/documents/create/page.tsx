'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Control } from 'react-hook-form';
import {
    ArrowLeft, Send, Save, Eye, FileText,
    Bold, Italic, AlignLeft, AlignCenter, AlignRight,
    Plus, Trash2, Calendar, GripVertical, Upload, X, Copy,
    ZoomIn, ZoomOut, RotateCcw, Monitor, Link2, Unlink2,
    Search, Users, Table, User, Check
} from 'lucide-react';
import Link from 'next/link';
import { DocumentService } from '@/lib/services/documentService';
import { toast } from 'react-hot-toast';
import { AdminAuth } from '@/lib/auth';
import { StorageService } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';


// --- Types ---

interface Signer {
    name: string;
    title: string;
    is_proxy?: boolean; // Vekil mi?
    user_id?: string; // Sistem kullanıcısı ise ID
    signature_url?: string; // Dijital imza URL'i
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
    logoUrl?: string; // Sol Logo (default/backward compat)
    rightLogoUrl?: string; // Sağ Logo
    // Footer Bilgileri
    footerOrgName?: string;
    footerAddress?: string;
    footerContact?: string;
    footerPhone?: string;
}

// Mention komutları
interface MentionCommand {
    trigger: string;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const MENTION_COMMANDS: MentionCommand[] = [
    { trigger: '@uye', label: 'Üye Bilgileri', icon: <User className="w-4 h-4" />, description: 'Üye bilgileri tablosu ekle' },
    { trigger: '@uyetablo', label: 'Üye Tablosu', icon: <Table className="w-4 h-4" />, description: 'Seçili üyelerin tablosunu ekle' },
];

export default function AdvancedDocumentCreator() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState(false); // Mobile toggle
    const [currentUser, setCurrentUser] = useState<any>(null); // AdminUser tipini tam import edemediğimiz için any bırakıyoruz veya Member ile değiştiriyoruz
    const [availableSigners, setAvailableSigners] = useState<any[]>([]); // İmzası olan yetkililer

    // Preview Settings
    const [zoom, setZoom] = useState(0.8);
    const [margins, setMargins] = useState({
        top: 25,
        right: 25,
        bottom: 25,
        left: 25
    });
    const [linkMargins, setLinkMargins] = useState(true); // Kenar boşluklarını birlikte değiştir

    // Mention System States
    const [showMentionPopup, setShowMentionPopup] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionType, setMentionType] = useState<'command' | 'member' | 'fields'>('command');
    const [members, setMembers] = useState<Member[]>([]);
    const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
    const [memberSearchLoading, setMemberSearchLoading] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
    const [selectedMemberIndex, setSelectedMemberIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [mentionTriggerPos, setMentionTriggerPos] = useState(0);
    const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [selectedFields, setSelectedFields] = useState<string[]>(['membership_number', 'first_name', 'last_name', 'tc_identity', 'city']);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mentionPopupRef = useRef<HTMLDivElement>(null);
    const [isMultiSelect, setIsMultiSelect] = useState(false); // Çoklu seçim modu aktif mi?

    // Load User & Signers
    useEffect(() => {
        const loadInitialData = async () => {
            const user = AdminAuth.getCurrentUser();
            if (user) {
                setCurrentUser(user);

                // Yetki kontrolü: Başkaları adına imza atabiliyor mu?
                const canSignOthers = user.permissions?.includes('documents.sign.others') || user.role === 'super_admin'; // Fallback for super_admin

                if (canSignOthers) {
                    // İmzası olan tüm yöneticileri getir
                    const { data } = await supabase
                        .from('admin_users')
                        .select('id, full_name, role_type, city, signature_url')
                        .not('signature_url', 'is', null);

                    if (data) setAvailableSigners(data);
                }
            }
        };
        loadInitialData();
    }, []);

    const handleAddSelfSignature = () => {
        if (!currentUser || !currentUser.signature_url) {
            toast.error('Profilinizde tanımlı imza bulunamadı.');
            return;
        }

        // Ünvanı belirle
        let title = 'Yönetici';
        if (currentUser.role_type === 'branch_manager') title = 'Şube Başkanı';
        else if (currentUser.role === 'super_admin') title = 'Genel Başkan';

        appendSigner({
            name: currentUser.full_name,
            title: title,
            user_id: currentUser.id,
            signature_url: currentUser.signature_url
        });
    };

    const handleAddOtherSigner = (userId: string) => {
        const signer = availableSigners.find(s => s.id === userId);
        if (!signer) return;

        let title = 'Yönetici'; // Default
        // Basit ünvan tahmini (Geliştirilebilir)
        if (signer.role_type === 'general_manager') title = 'Genel Merkez Yöneticisi';

        appendSigner({
            name: signer.full_name,
            title: title,
            user_id: signer.id,
            signature_url: signer.signature_url
        });
    };

    // Tablo alanları
    const MEMBER_FIELDS = [
        { key: 'membership_number', label: 'Üye No' },
        { key: 'first_name', label: 'Adı' },
        { key: 'last_name', label: 'Soyadı' },
        { key: 'tc_identity', label: 'T.C Kimlik No' },
        { key: 'city', label: 'Şehir' },
        { key: 'district', label: 'İlçe' },
        { key: 'workplace', label: 'İş Yeri' },
        { key: 'position', label: 'Pozisyon' },
        { key: 'phone', label: 'Telefon' },
        { key: 'email', label: 'E-posta' },
    ];

    // Kenar boşluklarını değiştirme fonksiyonu
    const handleMarginChange = (key: 'top' | 'right' | 'bottom' | 'left', value: number) => {
        if (linkMargins) {
            // Tüm boşlukları aynı değere ayarla
            setMargins({ top: value, right: value, bottom: value, left: value });
        } else {
            // Sadece seçilen boşluğu değiştir
            setMargins(m => ({ ...m, [key]: value }));
        }
    };

    // Üye arama fonksiyonu
    const searchMembers = useCallback(async (query: string) => {
        if (query.length < 2) {
            setFilteredMembers([]);
            return;
        }

        setMemberSearchLoading(true);
        try {
            const { data, error } = await supabase
                .from('members')
                .select('id, first_name, last_name, membership_number, tc_identity, phone, email, workplace, position, city, district')
                .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,membership_number.ilike.%${query}%,tc_identity.ilike.%${query}%`)
                .eq('is_active', true)
                .limit(10);

            if (error) throw error;
            setFilteredMembers(data as Member[] || []);
        } catch (err) {
            console.error('Üye arama hatası:', err);
            setFilteredMembers([]);
        } finally {
            setMemberSearchLoading(false);
        }
    }, []);

    // Üye bilgisi etiketi oluşturma (Textarea'da kısa görünür, önizlemede tablo olur)
    // Artık çoklu üye destekliyor
    const generateMemberTable = (members: Member[], fields: string[]): string => {
        // Headers
        const headers = fields.map(f => {
            const field = MEMBER_FIELDS.find(mf => mf.key === f);
            return field?.label || f;
        });

        // Rows
        const rows = members.map(member => {
            return fields.map(f => {
                const value = (member as any)[f] || '-';
                return String(value).replace(/[|#;]/g, ' '); // Özel karakterleri temizle
            }).join('|');
        });

        // Format: [[TABLO:COLS=Ad|Soyad # ROWS=Ahmet|Yılmaz;Mehmet|Demir]]
        return `[[TABLO:COLS=${headers.join('|')} # ROWS=${rows.join(';')}]]`;
    };

    // Önizleme için içeriği formatla (Etiketleri tabloya, satırları br'ye çevir)
    const formatContentForPreview = (content: string) => {
        if (!content) return '[İçerik bekleniyor...]';

        let formatted = content;

        // XSS Koruması (Basit)
        formatted = formatted.replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // TABLO etiketlerini parse et
        // Format: [[TABLO:COLS=Ad|Soyad # ROWS=Ahmet|Yılmaz;Mehmet|Demir]]
        formatted = formatted.replace(/\[\[TABLO:(.*?)\]\]/g, (match, inner) => {
            try {
                // COLS ve ROWS kısmını ayır
                const [colsPart, rowsPart] = inner.split(' # ');
                if (!colsPart || !rowsPart) return match;

                const headers = colsPart.replace('COLS=', '').split('|');
                const rows = rowsPart.replace('ROWS=', '').split(';');

                const styles = {
                    table: 'width: 100%; border-collapse: collapse; margin: 1em 0; font-family: inherit;',
                    th: 'border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold; background-color: transparent;',
                    td: 'border: 1px solid #000; padding: 8px; text-align: left;'
                };

                const headerCells = headers.map((h: string) => `<th style="${styles.th}">${h}</th>`).join('');

                const tableRows = rows.map((rowStr: string) => {
                    const cells = rowStr.split('|');
                    const valueCells = cells.map((v: string) => `<td style="${styles.td}">${v}</td>`).join('');
                    return `<tr>${valueCells}</tr>`;
                }).join('');

                return `<table style="${styles.table}"><thead><tr>${headerCells}</tr></thead><tbody>${tableRows}</tbody></table>`;
            } catch (e) {
                console.error("Tablo parse hatası:", e);
                return match;
            }
        });

        // Satır sonlarını <br/> yap
        formatted = formatted.replace(/\n/g, '<br/>');

        return formatted;
    };
    // Üye seçimi
    const handleMemberSelect = (member: Member) => {
        if (isMultiSelect) {
            // Çoklu seçim modu: Listeye ekle/çıkar
            setSelectedMembers(prev => {
                const exists = prev.find(m => m.id === member.id);
                if (exists) {
                    return prev.filter(m => m.id !== member.id);
                }
                return [...prev, member];
            });
            // Popup'ı kapatma, aramayı sıfırla ki yeni arama yapılabilsin
            setMentionSearch('');
            // Ama member search modunda kal
        } else {
            // Tekli seçim modu: Direkt seç ve alanlara geç
            setSelectedMember(member);
            setMentionType('fields');
            setSelectedMemberIndex(0);
        }
    };

    // Çoklu seçimde "Tamam" butonuna basınca
    const finishMultiSelect = () => {
        if (selectedMembers.length === 0) return;
        setMentionType('fields');
        // Tekil seçimdeki gibi selectedMember'ı (belki ilkini) set etmek gerekebilir ama
        // alan seçimi ekranı selectedMembers'ı kullanmalı.
        // Uyumluluk için ilkini set edelim:
        setSelectedMember(selectedMembers[0]);
    };

    // Alanları seçip tabloyu ekle
    const insertMemberTable = () => {
        const membersToInsert = isMultiSelect ? selectedMembers : (selectedMember ? [selectedMember] : []);
        if (membersToInsert.length === 0) return;

        const content = formValues.content || '';
        const beforeMention = content.substring(0, mentionTriggerPos);
        const afterMention = content.substring(cursorPosition);

        const tableContent = generateMemberTable(membersToInsert, selectedFields);
        const newContent = beforeMention + tableContent + afterMention;

        setValue('content', newContent);
        setShowMentionPopup(false);
        setMentionSearch('');
        setMentionType('command');
        setSelectedMember(null);
        setSelectedMembers([]); // Çoklu seçim sonrası listeyi temizle
        setIsMultiSelect(false); // Modu sıfırla

        // Focus back to textarea
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newPos = beforeMention.length + tableContent.length;
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    // Alan toggle
    const toggleField = (fieldKey: string) => {
        setSelectedFields(prev =>
            prev.includes(fieldKey)
                ? prev.filter(f => f !== fieldKey)
                : [...prev, fieldKey]
        );
    };

    // Textarea input handler - mention detection
    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart || 0;
        setCursorPosition(cursorPos);

        // Form değerini güncelle
        setValue('content', value);

        // @ karakterini bul
        const textBeforeCursor = value.substring(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
            // Boşluk yoksa ve @ karakteri aktifse
            if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
                const searchTerm = textAfterAt.toLowerCase();

                // @uye komutu algılama
                if (searchTerm === 'uyetablo' || searchTerm === 'üyetablo') {
                    // @uyetablo: Çoklu seçim modu
                    setMentionTriggerPos(lastAtIndex);
                    setShowMentionPopup(true);
                    setMentionType('command');
                    setMentionSearch(searchTerm);
                    setIsMultiSelect(true); // Çoklu seçim aktif
                    setSelectedMembers([]); // Seçimleri sıfırla
                } else if (searchTerm.startsWith('uye') || searchTerm.startsWith('üye')) {
                    setMentionTriggerPos(lastAtIndex);
                    setShowMentionPopup(true);

                    // Normal @uye: Tekli seçim modu
                    if (searchTerm === 'uye' || searchTerm === 'üye' || searchTerm.length > 3) {
                        setIsMultiSelect(false); // Tekli seçim
                    }

                    // Eğer @uye yazılmışsa ve devamı varsa üye araması yap (ancak @uyetablo değilse)
                    const memberQuery = searchTerm.replace(/^(uye|üye)\s*/, '');
                    if (memberQuery.length > 0) {
                        setMentionType('member');
                        setMentionSearch(memberQuery);
                        searchMembers(memberQuery);
                    } else if (searchTerm === 'uye' || searchTerm === 'üye') {
                        // Tam olarak @uye yazıldıysa, boş arama yap
                        setMentionType('member');
                        setMentionSearch('');
                        searchMembers('');
                    } else {
                        // @uyeXYZ gibi bir şeyse ve XYZ tablo değilse
                        setMentionType('command');
                        setMentionSearch(searchTerm);
                    }
                } else if (searchTerm.length === 0) {
                    // Sadece @ yazıldıysa komutları göster
                    setMentionTriggerPos(lastAtIndex);
                    setShowMentionPopup(true);
                    setMentionType('command');
                    setMentionSearch('');
                } else {
                    setShowMentionPopup(false);
                }
            } else {
                setShowMentionPopup(false);
            }
        } else {
            setShowMentionPopup(false);
        }

        // Form değerini güncelle
        setValue('content', value);
    };

    // Keyboard navigation for mention popup
    const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showMentionPopup) return;

        const items = mentionType === 'member' ? filteredMembers : MENTION_COMMANDS;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedMemberIndex(prev => Math.min(prev + 1, items.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedMemberIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && showMentionPopup) {
            e.preventDefault();
            if (mentionType === 'member' && filteredMembers[selectedMemberIndex]) {
                handleMemberSelect(filteredMembers[selectedMemberIndex]);
            } else if (mentionType === 'command') {
                // Komut seçildi - üye aramasına geç
                setMentionType('member');
                setMentionSearch('');
            }
        } else if (e.key === 'Escape') {
            setShowMentionPopup(false);
        }
    };

    // Effect: üye araması
    useEffect(() => {
        if (mentionType === 'member' && mentionSearch.length >= 2) {
            const timer = setTimeout(() => {
                searchMembers(mentionSearch);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [mentionSearch, mentionType, searchMembers]);

    // Effect: popup dışı tıklama
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (mentionPopupRef.current && !mentionPopupRef.current.contains(e.target as Node)) {
                setShowMentionPopup(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            // Header bilgileri formda olmadığı için defaultValues'dan kaldırıldı
            footerOrgName: DEFAULT_HEADER.orgName,
            footerAddress: 'Genel Merkez Binası, Ankara',
            footerContact: 'Genel Sekreterlik',
            footerPhone: '0312 000 00 00',
            date: new Date().toISOString().split('T')[0],
            signers: [{ name: 'Ad Soyad', title: 'Genel Başkan' }],
            textAlign: 'justify',
            receiverTextAlign: 'left',
            logoUrl: '',
            rightLogoUrl: ''
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

                        <div className="grid grid-cols-2 gap-4">
                            {/* Left Logo */}
                            <div>
                                <div className="flex justify-between items-center min-h-[1.25rem]">
                                    <label className="text-xs font-medium text-slate-500">Sol Logo</label>
                                </div>
                                <div className="space-y-2 mt-1">
                                    <input type="hidden" {...register('logoUrl')} />

                                    <div className="flex items-start gap-3">
                                        {/* Preview or Placeholder */}
                                        {formValues.logoUrl ? (
                                            <div className="relative group">
                                                <img
                                                    src={formValues.logoUrl}
                                                    alt="Sol Logo"
                                                    className="h-20 w-20 object-contain bg-white border border-slate-200 rounded-lg p-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('logoUrl', '')}
                                                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors shadow-sm"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="h-20 w-20 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
                                                <span className="text-[10px] text-center px-1">Görsel Yok</span>
                                            </div>
                                        )}

                                        {/* Upload Button */}
                                        <div className="flex-1">
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id="logo-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        const validation = StorageService.validateImageFile(file);
                                                        if (!validation.valid) {
                                                            toast.error(validation.error || 'Geçersiz dosya');
                                                            return;
                                                        }

                                                        try {
                                                            const loadingToast = toast.loading('Yükleniyor...');
                                                            const result = await StorageService.uploadImage(file, 'images');
                                                            toast.dismiss(loadingToast);

                                                            if (result.success && result.url) {
                                                                setValue('logoUrl', result.url);
                                                                toast.success('Yüklendi');
                                                            } else {
                                                                toast.error(result.error || 'Hata');
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            toast.error('Hata');
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <label
                                                    htmlFor="logo-upload"
                                                    className="flex items-center justify-center w-full px-3 py-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50 cursor-pointer transition-colors text-xs font-medium text-slate-700 shadow-sm"
                                                >
                                                    <Upload className="w-3 h-3 mr-2" />
                                                    Logo Yükle
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                                Maksimum 5MB.<br />JPEG, PNG
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Logo */}
                            <div>
                                <div className="flex justify-between items-center min-h-[1.25rem]">
                                    <label className="text-xs font-medium text-slate-500">Sağ Logo</label>
                                    <button
                                        type="button"
                                        onClick={() => formValues.logoUrl && setValue('rightLogoUrl', formValues.logoUrl)}
                                        disabled={!formValues.logoUrl}
                                        className="text-[10px] text-violet-600 hover:text-violet-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                    >
                                        <Copy className="w-3 h-3 mr-1" />
                                        Soldakini Kullan
                                    </button>
                                </div>
                                <div className="space-y-2 mt-1">
                                    <input type="hidden" {...register('rightLogoUrl')} />

                                    <div className="flex items-start gap-3">
                                        {/* Preview or Placeholder */}
                                        {formValues.rightLogoUrl ? (
                                            <div className="relative group">
                                                <img
                                                    src={formValues.rightLogoUrl}
                                                    alt="Sağ Logo"
                                                    className="h-20 w-20 object-contain bg-white border border-slate-200 rounded-lg p-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setValue('rightLogoUrl', '')}
                                                    className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors shadow-sm"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="h-20 w-20 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
                                                <span className="text-[10px] text-center px-1">Görsel Yok</span>
                                            </div>
                                        )}

                                        {/* Upload Button */}
                                        <div className="flex-1">
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id="right-logo-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;

                                                        const validation = StorageService.validateImageFile(file);
                                                        if (!validation.valid) {
                                                            toast.error(validation.error || 'Geçersiz dosya');
                                                            return;
                                                        }

                                                        try {
                                                            const loadingToast = toast.loading('Yükleniyor...');
                                                            const result = await StorageService.uploadImage(file, 'images');
                                                            toast.dismiss(loadingToast);

                                                            if (result.success && result.url) {
                                                                setValue('rightLogoUrl', result.url);
                                                                toast.success('Yüklendi');
                                                            } else {
                                                                toast.error(result.error || 'Hata');
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            toast.error('Hata');
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                />
                                                <label
                                                    htmlFor="right-logo-upload"
                                                    className="flex items-center justify-center w-full px-3 py-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50 cursor-pointer transition-colors text-xs font-medium text-slate-700 shadow-sm"
                                                >
                                                    <Upload className="w-3 h-3 mr-2" />
                                                    Logo Yükle
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                                Maksimum 5MB.<br />JPEG, PNG
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
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

                        <div className="relative">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex items-center space-x-2">
                                    <label className="text-xs font-medium text-slate-500">Metin</label>
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                        💡 @uye yazarak üye bilgisi ekleyebilirsiniz
                                    </span>
                                </div>
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

                            {/* Textarea with Mention Support */}
                            <textarea
                                ref={textareaRef}
                                value={formValues.content || ''}
                                onChange={handleContentChange}
                                onKeyDown={handleContentKeyDown}
                                rows={10}
                                className="form-textarea w-full mt-1 text-sm border-slate-300 rounded-md p-3 leading-relaxed font-mono"
                                placeholder="Belge içeriğini buraya yazınız... (@uye yazarak üye bilgisi ekleyebilirsiniz)"
                            />

                            {/* Mention Popup */}
                            {showMentionPopup && (
                                <div
                                    ref={mentionPopupRef}
                                    className="absolute z-50 w-96 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
                                    style={{ bottom: 'calc(100% + 8px)', left: 0 }}
                                >
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-white">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                {mentionType === 'command' && (
                                                    <>
                                                        <Users className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Komutlar</span>
                                                    </>
                                                )}
                                                {mentionType === 'member' && (
                                                    <>
                                                        <Search className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Üye Ara</span>
                                                    </>
                                                )}
                                                {mentionType === 'fields' && (
                                                    <>
                                                        <Table className="w-4 h-4" />
                                                        <span className="text-sm font-medium">Tablo Alanları</span>
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowMentionPopup(false);
                                                    setMentionType('command');
                                                    setSelectedMember(null);
                                                }}
                                                className="text-white/80 hover:text-white"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {mentionType === 'command' ? (
                                        /* Komut Listesi */
                                        <div className="p-2">
                                            {MENTION_COMMANDS.filter(cmd =>
                                                cmd.trigger.includes(mentionSearch) || mentionSearch === ''
                                            ).map((cmd, idx) => (
                                                <button
                                                    key={cmd.trigger}
                                                    type="button"
                                                    onClick={() => {
                                                        if (cmd.trigger === '@uye') {
                                                            setIsMultiSelect(false);
                                                            setMentionType('member');
                                                            setMentionSearch('');
                                                        } else if (cmd.trigger === '@uyetablo') {
                                                            setIsMultiSelect(true);
                                                            setSelectedMembers([]);
                                                            setMentionType('member');
                                                            setMentionSearch('');
                                                        }
                                                    }}
                                                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${idx === selectedMemberIndex
                                                        ? 'bg-violet-50 text-violet-700'
                                                        : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="flex-shrink-0 w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                                                        {cmd.icon}
                                                    </div>
                                                    <div className="text-left flex-1">
                                                        <div className="text-sm font-medium text-slate-800">{cmd.label}</div>
                                                        <div className="text-xs text-slate-500">{cmd.description}</div>
                                                    </div>
                                                    <div className="flex-shrink-0 text-xs text-slate-400 font-mono">
                                                        {cmd.trigger}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : mentionType === 'member' ? (
                                        /* Üye Arama */
                                        <div>
                                            <div className="p-2 border-b border-slate-100">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        value={mentionSearch}
                                                        onChange={(e) => setMentionSearch(e.target.value)}
                                                        placeholder="Üye adı, sicil no veya TC ile ara..."
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            {isMultiSelect && (
                                                <div className="px-3 py-2 bg-violet-50 border-b border-violet-100 flex justify-between items-center transition-all animate-in slide-in-from-top-2">
                                                    <span className="text-xs font-medium text-violet-700">
                                                        {selectedMembers.length} üye seçildi
                                                    </span>
                                                    <button
                                                        onClick={finishMultiSelect}
                                                        disabled={selectedMembers.length === 0}
                                                        className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                                    >
                                                        Seçimi Tamamla
                                                    </button>
                                                </div>
                                            )}

                                            <div className="max-h-48 overflow-y-auto">
                                                {memberSearchLoading ? (
                                                    <div className="p-4 text-center text-slate-500">
                                                        <div className="animate-spin w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                                        <span className="text-sm">Aranıyor...</span>
                                                    </div>
                                                ) : filteredMembers.length > 0 ? (
                                                    <div className="p-2 space-y-1">
                                                        {filteredMembers.map((member, idx) => (
                                                            <button
                                                                key={member.id}
                                                                type="button"
                                                                onClick={() => handleMemberSelect(member)}
                                                                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${idx === selectedMemberIndex
                                                                    ? 'bg-violet-50 border border-violet-200'
                                                                    : 'hover:bg-slate-50'
                                                                    } ${isMultiSelect && selectedMembers.find(m => m.id === member.id) ? 'bg-violet-100' : ''}`}
                                                            >
                                                                <div className="flex-shrink-0 relative">
                                                                    <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-xs">
                                                                        {member.first_name?.[0]}{member.last_name?.[0]}
                                                                    </div>
                                                                    {isMultiSelect && selectedMembers.find(m => m.id === member.id) && (
                                                                        <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                                                                            <Check className="w-3 h-3" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-left flex-1 min-w-0">
                                                                    <div className="text-sm font-medium text-slate-800 truncate">
                                                                        {member.first_name} {member.last_name}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 truncate">
                                                                        {member.membership_number} • {member.city || '-'}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : mentionSearch.length >= 2 ? (
                                                    <div className="p-4 text-center text-slate-500">
                                                        <User className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                                                        <span className="text-sm">Üye bulunamadı</span>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center text-slate-500">
                                                        <Search className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                                                        <span className="text-sm">En az 2 karakter yazın</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Alan Seçimi */
                                        <div>
                                            {/* Seçilen Üye */}
                                            {selectedMember && (
                                                <div className="p-3 bg-violet-50 border-b border-violet-100">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                                                            {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-800">
                                                                {selectedMember.first_name} {selectedMember.last_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {selectedMember.membership_number}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setMentionType('member');
                                                                setSelectedMember(null);
                                                            }}
                                                            className="ml-auto text-xs text-violet-600 hover:text-violet-700"
                                                        >
                                                            Değiştir
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Alan Seçimi */}
                                            <div className="p-3">
                                                <div className="text-xs font-medium text-slate-500 mb-2">Tabloya eklenecek alanları seçin:</div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {MEMBER_FIELDS.map((field) => (
                                                        <label
                                                            key={field.key}
                                                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedFields.includes(field.key)
                                                                ? 'bg-violet-50 border-violet-300 text-violet-700'
                                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedFields.includes(field.key)}
                                                                onChange={() => toggleField(field.key)}
                                                                className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                                                            />
                                                            <span className="text-sm">{field.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Önizleme */}
                                            {selectedMember && selectedFields.length > 0 && (
                                                <div className="p-3 border-t border-slate-100 bg-slate-50">
                                                    <div className="text-xs font-medium text-slate-500 mb-2">Önizleme:</div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs border border-slate-300">
                                                            <thead>
                                                                <tr className="bg-slate-100">
                                                                    {selectedFields.map(f => {
                                                                        const field = MEMBER_FIELDS.find(mf => mf.key === f);
                                                                        return (
                                                                            <th key={f} className="px-2 py-1 border-r border-slate-300 text-left font-medium">
                                                                                {field?.label}
                                                                            </th>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr>
                                                                    {selectedFields.map(f => (
                                                                        <td key={f} className="px-2 py-1 border-r border-t border-slate-300">
                                                                            {(selectedMember as any)[f] || '-'}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Ekle Butonu */}
                                            <div className="p-3 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={insertMemberTable}
                                                    disabled={selectedFields.length === 0}
                                                    className="w-full py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                                                >
                                                    Tabloya Ekle ({selectedFields.length} alan)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section: İmzacılar */}
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center border-b pb-2 mb-2">
                            <h3 className="text-sm font-semibold text-slate-900">İmzacılar</h3>
                            <div className="flex space-x-2">
                                {/* Kendi İmzasını Ekle Butonu */}
                                {(currentUser?.permissions?.includes('documents.sign.own') || currentUser?.role === 'super_admin') && currentUser?.signature_url && (
                                    <button
                                        type="button"
                                        onClick={handleAddSelfSignature}
                                        className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center"
                                    >
                                        <User className="w-3 h-3 mr-1" />
                                        Kendimi Ekle
                                    </button>
                                )}

                                {/* Başkasını Ekle Dropdown (Basit versiyon) */}
                                {(currentUser?.permissions?.includes('documents.sign.others') || currentUser?.role === 'super_admin') && availableSigners.length > 0 && (
                                    <select
                                        className="text-xs border-slate-200 rounded px-2 py-1 w-32"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleAddOtherSigner(e.target.value);
                                                e.target.value = ''; // Reset
                                            }
                                        }}
                                    >
                                        <option value="">Yetkili Seç...</option>
                                        {availableSigners.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}</option>
                                        ))}
                                    </select>
                                )}

                                <button type="button" onClick={() => appendSigner({ name: '', title: '' })} className="text-violet-600 hover:bg-violet-50 p-1 rounded" title="Manuel Ekle">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
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
                    {/* Section: Alt Bilgi (Footer) */}
                    <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 border-b pb-2">Alt Bilgi Ayarları</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Kurum Adı</label>
                                <input
                                    {...register('footerOrgName')}
                                    className="w-full text-sm border-slate-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="Kurum Adı"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Adres/Lokasyon</label>
                                <input
                                    {...register('footerAddress')}
                                    className="w-full text-sm border-slate-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="Adres Bilgisi"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Bilgi İçin</label>
                                <input
                                    {...register('footerContact')}
                                    className="w-full text-sm border-slate-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="Birim/Kişi"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Telefon</label>
                                <input
                                    {...register('footerPhone')}
                                    className="w-full text-sm border-slate-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                                    placeholder="Telefon No"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Preview Pane (Right) */}
                <div className={`flex-1 bg-slate-200/50 flex flex-col overflow-hidden border-l border-slate-200 ${!previewMode ? 'hidden md:flex' : 'flex'}`}>

                    {/* Preview Toolbar */}
                    <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-[0_1px_3px_rgb(0,0,0,0.05)] z-10">

                        {/* Zoom Controls */}
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-slate-500 mr-1 flex items-center">
                                <Monitor className="w-3 h-3 mr-1" />
                                Görünüm:
                            </span>
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                                <button
                                    onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
                                    className="p-1 hover:bg-white rounded-md transition-all text-slate-600 active:scale-95 disabled:opacity-50"
                                    title="Uzaklaştır"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-medium w-12 text-center text-slate-700 select-none">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}
                                    className="p-1 hover:bg-white rounded-md transition-all text-slate-600 active:scale-95 disabled:opacity-50"
                                    title="Yakınlaştır"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => setZoom(0.8)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                                title="Sıfırla"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Margin Controls */}
                        <div className="flex items-center space-x-3 overflow-x-auto">
                            <span className="text-xs font-medium text-slate-500 flex items-center whitespace-nowrap">
                                <GripVertical className="w-3 h-3 mr-1" />
                                Kenar Boşlukları (mm):
                            </span>

                            {/* Link/Unlink Toggle */}
                            <button
                                type="button"
                                onClick={() => setLinkMargins(!linkMargins)}
                                className={`p-1.5 rounded-lg transition-all ${linkMargins
                                    ? 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                title={linkMargins ? 'Ayrı ayrı değiştir' : 'Hepsini birlikte değiştir'}
                            >
                                {linkMargins ? <Link2 className="w-4 h-4" /> : <Unlink2 className="w-4 h-4" />}
                            </button>

                            {linkMargins ? (
                                /* Tek input - tüm boşlukları birlikte değiştir */
                                <div className="flex flex-col">
                                    <label className="text-[9px] text-slate-400 text-center">Tümü</label>
                                    <input
                                        type="number"
                                        value={margins.top}
                                        onChange={(e) => handleMarginChange('top', Number(e.target.value))}
                                        className="w-14 h-7 text-xs text-center border-slate-300 rounded focus:ring-1 focus:ring-violet-500"
                                    />
                                </div>
                            ) : (
                                /* Ayrı inputlar */
                                <div className="flex gap-2">
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-slate-400 text-center">Üst</label>
                                        <input
                                            type="number"
                                            value={margins.top}
                                            onChange={(e) => handleMarginChange('top', Number(e.target.value))}
                                            className="w-12 h-7 text-xs text-center border-slate-300 rounded focus:ring-1 focus:ring-violet-500"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-slate-400 text-center">Alt</label>
                                        <input
                                            type="number"
                                            value={margins.bottom}
                                            onChange={(e) => handleMarginChange('bottom', Number(e.target.value))}
                                            className="w-12 h-7 text-xs text-center border-slate-300 rounded focus:ring-1 focus:ring-violet-500"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-slate-400 text-center">Sol</label>
                                        <input
                                            type="number"
                                            value={margins.left}
                                            onChange={(e) => handleMarginChange('left', Number(e.target.value))}
                                            className="w-12 h-7 text-xs text-center border-slate-300 rounded focus:ring-1 focus:ring-violet-500"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-slate-400 text-center">Sağ</label>
                                        <input
                                            type="number"
                                            value={margins.right}
                                            onChange={(e) => handleMarginChange('right', Number(e.target.value))}
                                            className="w-12 h-7 text-xs text-center border-slate-300 rounded focus:ring-1 focus:ring-violet-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Area */}
                    <div className="flex-1 overflow-auto p-8 relative flex justify-center bg-[#e5e7eb]">
                        {/* A4 Page Container */}
                        <div
                            style={{
                                backgroundColor: 'white',
                                color: 'black',
                                transform: `scale(${zoom})`,
                                transformOrigin: 'top center',
                                paddingTop: `${margins.top}mm`,
                                paddingBottom: `${margins.bottom}mm`,
                                paddingLeft: `${margins.left}mm`,
                                paddingRight: `${margins.right}mm`,
                                height: 'max-content'
                            }}
                            className="w-[210mm] min-h-[297mm] shadow-[0_4px_24px_rgba(0,0,0,0.1)] text-[12pt] font-serif leading-normal relative transition-all duration-200 printable-content"
                        >

                            {/* Header */}
                            <div className="text-center mb-8 border-b-2 border-black pb-4 relative min-h-[100px] flex items-center justify-center">
                                {/* Left Logo */}
                                {formValues.logoUrl && (
                                    <img src={formValues.logoUrl} alt="Sol Logo" className="absolute left-0 top-0 h-24 w-auto object-contain" />
                                )}

                                {/* Title Block */}
                                <div className="z-10 px-4">
                                    <h2 className="text-black font-bold text-lg uppercase">{DEFAULT_HEADER.title}</h2>
                                    <h3 style={{ color: 'black' }} className="font-bold text-xl uppercase">{DEFAULT_HEADER.orgName}</h3>
                                    <p style={{ color: 'black' }} className="text-sm mt-1 uppercase">{formValues.sender_unit || DEFAULT_HEADER.subUnit}</p>
                                </div>

                                {/* Right Logo */}
                                {formValues.rightLogoUrl && (
                                    <img src={formValues.rightLogoUrl} alt="Sağ Logo" className="absolute right-0 top-0 h-24 w-auto object-contain" />
                                )}
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
                            <div
                                style={{ color: 'black', textAlign: formValues.receiverTextAlign || 'left' }}
                                className={`mb-10 font-bold uppercase tracking-wide ${formValues.receiverTextAlign === 'center' || formValues.receiverTextAlign === 'right'
                                    ? 'pl-0'
                                    : 'pl-16'
                                    }`}
                            >
                                {formValues.receiver || '[ALICI BİLGİSİ BURAYA GELECEK]'}
                            </div>

                            {/* Content */}
                            <div
                                style={{ color: 'black', textAlign: formValues.textAlign || 'justify' }}
                                className="mb-16 indent-12 min-h-[200px]"
                                dangerouslySetInnerHTML={{
                                    __html: formatContentForPreview(formValues.content)
                                }}
                            />

                            {/* Signatures */}
                            <div style={{ color: 'black' }} className="flex justify-end space-x-12 mt-auto pt-12 pr-4">
                                {formValues.signers?.map((signer: Signer, idx: number) => (
                                    <div key={idx} className="text-center min-w-[200px] relative">
                                        <div className="relative z-10">
                                            <p className="font-bold whitespace-nowrap">{signer.name}</p>
                                            <p className="text-[10pt]">{signer.title}</p>
                                        </div>
                                        {/* Signature Image or Space */}
                                        <div className="h-60 flex items-start justify-center -mt-[82px] relative z-0">
                                            {signer.signature_url ? (
                                                <img
                                                    src={supabase.storage.from('official-documents').getPublicUrl(signer.signature_url).data.publicUrl}
                                                    alt="İmza"
                                                    className="h-full w-auto max-w-[400px] object-contain mix-blend-multiply"
                                                />
                                            ) : (
                                                <div className="h-full w-full"></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer Info */}
                            <div className="absolute bottom-10 left-[25mm] right-[25mm] border-t border-slate-300 pt-2 text-[8pt] text-slate-500 font-sans flex justify-between">
                                <div>
                                    <p>{formValues.footerOrgName || DEFAULT_HEADER.orgName}</p>
                                    <p>Adres: {formValues.footerAddress || 'Genel Merkez Binası, Ankara'}</p>
                                </div>
                                <div className='text-right'>
                                    <p>Bilgi İçin: {formValues.footerContact || 'Genel Sekreterlik'}</p>
                                    <p>Tel: {formValues.footerPhone || '0312 000 00 00'}</p>
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
        </div>
    );
}
