'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray, Control } from 'react-hook-form';
import {
    ArrowLeft, Send, Save, Eye, FileText,
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    Plus, Trash2, Calendar, GripVertical, Upload, X, Copy,
    ZoomIn, ZoomOut, RotateCcw, Monitor, Link2, Unlink2,
    Search, Users, Table, User, Check, Archive, Loader2, Printer
} from 'lucide-react';
import Link from 'next/link';
import { DocumentService } from '@/lib/services/documentService';
import { toast } from 'react-hot-toast';
import { AdminAuth } from '@/lib/auth';
import { StorageService } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/types';
import A4Preview from '@/components/ui/A4Preview';


// --- Types ---

interface Signer {
    name: string;
    title: string;
    is_proxy?: boolean; // Vekil mi?
    user_id?: string; // Sistem kullanıcısı ise ID
    signature_url?: string; // Dijital imza URL'i
    signature_size_mm?: number; // İmza yüksekliği (mm)
    signature_offset_x_mm?: number; // Sağa/Sola kaydırma (mm)
    signature_offset_y_mm?: number; // Yukarı/Aşağı kaydırma (mm)
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
    decision_number?: string; // Karar No
    textAlign: 'left' | 'center' | 'right' | 'justify';
    receiverTextAlign: 'left' | 'center' | 'right' | 'justify';
    logoUrl?: string; // Sol Logo (default/backward compat)
    rightLogoUrl?: string; // Sağ Logo
    // Header Bilgileri
    headerTitle?: string; // "T.C."
    headerOrgName?: string; // "SENDİKA YÖNETİM SİSTEMİ"
    // Footer Bilgileri
    footerOrgName?: string;
    footerAddress?: string;
    footerContact?: string;
    footerPhone?: string;
    // Görünürlük Ayarları
    showHeader?: boolean;
    showDate?: boolean;
    showSayi?: boolean;
    showKonu?: boolean;
    showKararNo?: boolean;
    showReceiver?: boolean;
    showSignatures?: boolean;
    showFooter?: boolean;
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
    const DEFAULT_SIGNATURE_SIZE_MM = 50;
    const router = useRouter();
    const searchParams = useSearchParams();
    const templateId = searchParams.get('template');

    const [loading, setLoading] = useState(false);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [templateIsPublic, setTemplateIsPublic] = useState(false);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [generatingEYP, setGeneratingEYP] = useState(false);
    const [previewMode, setPreviewMode] = useState(false); // Mobile toggle
    const [currentUser, setCurrentUser] = useState<any>(null); // AdminUser tipini tam import edemediğimiz için any bırakıyoruz veya Member ile değiştiriyoruz
    const [availableSigners, setAvailableSigners] = useState<any[]>([]); // İmzası olan yetkililer
    const [userTitle, setUserTitle] = useState<string>(''); // Kullanıcının tanımlı unvanı

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
    const [fontSizeSelection, setFontSizeSelection] = useState('');

    // Load User & Signers
    useEffect(() => {
        const loadInitialData = async () => {
            const user = AdminAuth.getCurrentUser();
            if (user) {
                setCurrentUser(user);

                setLoading(true);
                try {
                    // 1. Yetkili İmzacıları Getir (Yeni Sistem)
                    const { data: authorizedSignersData } = await DocumentService.getAuthorizedSigners();
                    let signersList: any[] = [];

                    if (authorizedSignersData && authorizedSignersData.length > 0) {
                        // Normalize to simple structure
                        signersList = authorizedSignersData.map((item: any) => ({
                            id: item.user.id,
                            name: item.user.full_name,
                            title: item.title || item.user.role || 'Yönetici',
                            signature_url: item.user.signature_url
                        }));
                    } else {
                        // Fallback: Eski yöntem
                        const canSignOthers = user.permissions?.includes('documents.sign.others') || user.role === 'super_admin';
                        if (canSignOthers) {
                            const { data } = await supabase
                                .from('admin_users')
                                .select('id, full_name, role, city, signature_url')
                                .not('signature_url', 'is', null);

                            if (data) {
                                signersList = data.map((u: any) => ({
                                    id: u.id,
                                    name: u.full_name,
                                    title: 'Yönetici', // Basit fallback
                                    signature_url: u.signature_url
                                }));
                            }
                        }
                    }
                    setAvailableSigners(signersList);

                    // 2. Kullanıcının tanımlı unvanını getir (Definition tablosundan)
                    const { data: userDef } = await supabase
                        .from('general_definitions')
                        .select('label')
                        .eq('type', 'title')
                        .eq('user_id', user.id)
                        .eq('is_active', true)
                        .single();

                    if (userDef) {
                        setUserTitle(userDef.label);
                    }

                    // 3. Varsayılan Ayarları Getir (Eğer template yoksa)
                    if (!templateId) {
                        const { data: defaults } = await DocumentService.getDocumentDefaults();
                        if (defaults) {
                            setValue('headerTitle', defaults.header_title || 'T.C.');
                            setValue('headerOrgName', defaults.header_org_name || 'SENDİKA YÖNETİM SİSTEMİ');
                            setValue('sender_unit', defaults.sender_unit || 'GENEL MERKEZ YÖNETİM KURULU');
                            setValue('logoUrl', defaults.logo_url || '');
                            setValue('rightLogoUrl', defaults.right_logo_url || '');
                            setValue('footerOrgName', defaults.footer_org_name || '');
                            setValue('footerAddress', defaults.footer_address || '');
                            setValue('footerContact', defaults.footer_contact || '');
                            setValue('footerPhone', defaults.footer_phone || '');
                            setValue('textAlign', (defaults.text_align as any) || 'justify');
                            setValue('receiverTextAlign', (defaults.receiver_text_align as any) || 'left');


                        }
                    }
                } catch (error) {
                    console.error('Başlangıç verileri yüklenirken hata:', error);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadInitialData();
    }, []);

    const withSignatureDefaults = (signer: Signer): Signer => ({
        ...signer,
        signature_size_mm: Number.isFinite(signer.signature_size_mm) ? signer.signature_size_mm : DEFAULT_SIGNATURE_SIZE_MM
    });

    // Özel yazdırma fonksiyonu - yeni pencerede yazdırır
    const handlePrint = () => {
        const printContainer = document.querySelector('.print-pages-container');
        if (!printContainer) {
            toast.error('Yazdırılacak içerik bulunamadı');
            return;
        }

        // Yeni pencere aç
        const printWindow = window.open('', '_blank', 'width=794,height=1123');
        if (!printWindow) {
            toast.error('Yazdırma penceresi açılamadı. Pop-up engelleyicinizi kontrol edin.');
            return;
        }

        // Mevcut sayfanın tüm stylesheet linklerini al
        const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
        let stylesHTML = '';
        styleSheets.forEach(el => {
            stylesHTML += el.outerHTML;
        });

        // Sayfaları kopyala ve son sayfaya özel class ekle
        const pages = printContainer.querySelectorAll('.printable-content');
        let pagesHTML = '';
        pages.forEach((page, index) => {
            const clone = page.cloneNode(true) as HTMLElement;
            // Son sayfa ise class ekle
            if (index === pages.length - 1) {
                clone.classList.add('last-page');
            }
            pagesHTML += clone.outerHTML;
        });

        // Yazdırma penceresi HTML'i
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Belge Yazdır</title>
                ${stylesHTML}
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    html, body {
                        width: 210mm;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body {
                        font-family: 'Times New Roman', serif;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .printable-content {
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding-top: ${margins.top}mm !important;
                        padding-right: ${margins.right}mm !important;
                        padding-bottom: ${margins.bottom}mm !important;
                        padding-left: ${margins.left}mm !important;
                        background: white !important;
                        color: black !important;
                        position: relative !important;
                        overflow: hidden !important;
                        box-shadow: none !important;
                        /* Varsayılan: sayfa kesmesi YOK */
                        page-break-after: auto !important;
                        break-after: auto !important;
                    }
                    /* Sadece son sayfa HARİCİ sayfalara sayfa kesmesi uygula */
                    .printable-content:not(.last-page):not(:last-of-type) {
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    /* Transform iptal */
                    .print-pages-container {
                        transform: none !important;
                        gap: 0 !important;
                    }
                    /* Ghost container gizle */
                    .no-print {
                        display: none !important;
                    }
                </style>
            </head>
            <body>
                ${pagesHTML}
            </body>
            </html>
        `);

        printWindow.document.close();

        // Yazdırma dialogunu aç (stillerin yüklenmesi için biraz bekle)
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 1000);
    };



    const handleAddOtherSigner = (userId: string) => {
        const signer = availableSigners.find(s => s.id === userId);
        if (!signer) return;

        // Uyarı: İmzası yoksa eklemesine izin verelim ama uyaralım
        if (!signer.signature_url) {
            toast('Dikkat: Bu kullanıcının tanımlı bir imzası yok.', { icon: '⚠️' });
        }

        appendSigner(withSignatureDefaults({
            name: signer.name,
            title: signer.title,
            user_id: signer.id,
            signature_url: signer.signature_url
        }));
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
        setSelectedFields(prev => {
            const isSelected = prev.includes(fieldKey);

            if (!isSelected && prev.length >= 5) {
                toast.error('En fazla 5 alan seçebilirsiniz.');
                return prev;
            }

            return isSelected
                ? prev.filter(f => f !== fieldKey)
                : [...prev, fieldKey];
        });
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
                // @uyetablo komutu (prefix olarak - çoklu seçim)
                if (searchTerm.startsWith('uyetablo') || searchTerm.startsWith('üyetablo')) {
                    setMentionTriggerPos(lastAtIndex);
                    setShowMentionPopup(true);
                    setIsMultiSelect(true);

                    // Komutun kendisini ve boşlukları temizle
                    const memberQuery = searchTerm.replace(/^(uyetablo|üyetablo)\s*/, '');

                    if (memberQuery.length > 0) {
                        setMentionType('member');
                        setMentionSearch(memberQuery);
                        searchMembers(memberQuery);
                    } else {
                        // Sadece komut (@uyetablo)
                        setMentionType('command');
                        setMentionSearch(searchTerm);
                    }
                }
                // @uye komutu (tekli seçim)
                else if (searchTerm.startsWith('uye') || searchTerm.startsWith('üye')) {
                    setMentionTriggerPos(lastAtIndex);
                    setShowMentionPopup(true);

                    // Sadece tam eşleşme veya boşluksuz başlangıçta tekli moda zorla
                    // (uyetablo yukarıda yakalandığı için buraya düşmez)
                    setIsMultiSelect(false);

                    const memberQuery = searchTerm.replace(/^(uye|üye)\s*/, '');
                    if (memberQuery.length > 0) {
                        setMentionType('member');
                        setMentionSearch(memberQuery);
                        searchMembers(memberQuery);
                    } else {
                        // Tam olarak @uye yazıldıysa
                        setMentionType('member'); // Direkt member moduna geç (veya command kalabilir)
                        // Kullanıcı deneyimi: @uye yazınca liste gelsin mi? 
                        // Orijinal kodda boş arama yapılmış:
                        setMentionSearch('');
                        searchMembers('');
                    }
                } else if (searchTerm.length === 0) {
                    // Sadece @ yazıldıysa komutları göster
                    setMentionTriggerPos(lastAtIndex);
                    setShowMentionPopup(true);
                    setMentionType('command');
                    setMentionSearch('');
                } else {
                    // Eşleşmeyen başka bir şey (@deneme) -> Pop-up kapa
                    // Ancak: Komut listesinde filtreleme yapmak istiyorsak kapatmamalıyız?
                    // Mevcut mantık: Sadece bilinen komutları destekliyor.
                    setMentionType('command');
                    setMentionSearch(searchTerm); // Belki başka komut vardır?
                    // showMentionPopup(true) kalmalı mı?
                    // Orijinal kodda kapatıyordu, biz de filtreye bırakalım veya kapatalım.
                    // Orijinalde else -> setShowMentionPopup(false) yoktu, sadece check bitiyordu.
                    // Ama burada explicit else var.
                    // MENTION_COMMANDS içinde arayalım.
                    const anyCommandMatch = MENTION_COMMANDS.some(cmd => cmd.trigger.includes(searchTerm));
                    if (anyCommandMatch) {
                        setMentionTriggerPos(lastAtIndex);
                        setShowMentionPopup(true);
                        setMentionType('command');
                        setMentionSearch(searchTerm);
                    } else {
                        setShowMentionPopup(false);
                    }
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

    const applyContentMarkup = (startTag: string, endTag: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const value = formValues.content || '';
        const selectionStart = textarea.selectionStart ?? 0;
        const selectionEnd = textarea.selectionEnd ?? 0;
        const hasSelection = selectionStart !== selectionEnd;
        const selectedText = value.slice(selectionStart, selectionEnd);
        const wrapped = `${startTag}${hasSelection ? selectedText : ''}${endTag}`;
        const newValue = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);

        setValue('content', newValue);

        setTimeout(() => {
            textarea.focus();
            const cursorPos = hasSelection ? selectionStart + wrapped.length : selectionStart + startTag.length;
            textarea.setSelectionRange(cursorPos, cursorPos);
        }, 0);
    };

    const handleApplyFormat = (type: 'bold' | 'italic' | 'underline') => {
        if (type === 'bold') applyContentMarkup('[[B]]', '[[/B]]');
        if (type === 'italic') applyContentMarkup('[[I]]', '[[/I]]');
        if (type === 'underline') applyContentMarkup('[[U]]', '[[/U]]');
    };

    const handleApplyFontSize = (sizeValue: string) => {
        if (!sizeValue) return;
        const size = Number.parseInt(sizeValue, 10);
        if (Number.isNaN(size)) return;
        applyContentMarkup(`[[SIZE=${size}]]`, '[[/SIZE]]');
        setFontSizeSelection('');
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
            headerTitle: DEFAULT_HEADER.title,
            headerOrgName: DEFAULT_HEADER.orgName,
            footerOrgName: DEFAULT_HEADER.orgName,
            footerAddress: 'Genel Merkez Binası, Ankara',
            footerContact: 'Genel Sekreterlik',
            footerPhone: '0312 000 00 00',
            date: new Date().toISOString().split('T')[0],
            signers: [],
            textAlign: 'justify',
            receiverTextAlign: 'left',
            logoUrl: '',
            rightLogoUrl: '',
            // Görünürlük varsayılanları
            showHeader: true,
            showDate: true,
            showSayi: true,
            showKonu: true,
            showKararNo: true,
            showReceiver: true,
            showSignatures: true,
            showFooter: true
        }
    });

    // Valid values for preview
    const formValues = watch();

    // Signers Field Array
    const { fields: signerFields, append: appendSigner, remove: removeSigner } = useFieldArray({
        control,
        name: "signers"
    });

    // Template yükleme (form hook'ları tanımlandıktan sonra)
    useEffect(() => {
        const loadTemplate = async () => {
            if (!templateId) return;

            try {
                const { data, error } = await DocumentService.getTemplateById(templateId);
                if (error) throw error;
                if (!data) return;

                // Form değerlerini şablondan yükle
                setValue('category_code', data.category_code || '');
                setValue('subject', data.subject || '');
                setValue('receiver', data.receiver || '');
                setValue('content', data.content || '');
                setValue('sender_unit', data.sender_unit || '');
                setValue('textAlign', data.text_align || 'justify');
                setValue('receiverTextAlign', data.receiver_text_align || 'left');
                setValue('logoUrl', data.logo_url || '');
                setValue('rightLogoUrl', data.right_logo_url || '');
                setValue('footerOrgName', data.footer_org_name || '');
                setValue('footerAddress', data.footer_address || '');
                setValue('footerContact', data.footer_contact || '');
                setValue('footerPhone', data.footer_phone || '');
                setValue('decision_number', data.decision_number || '');
                setValue('headerTitle', data.header_title || 'T.C.');
                setValue('headerOrgName', data.header_org_name || 'SENDİKA YÖNETİM SİSTEMİ');

                // Görünürlük ayarları
                setValue('showHeader', data.show_header !== undefined ? data.show_header : true);
                setValue('showDate', data.show_date !== undefined ? data.show_date : true);
                setValue('showSayi', data.show_sayi !== undefined ? data.show_sayi : true);
                setValue('showKonu', data.show_konu !== undefined ? data.show_konu : true);
                setValue('showKararNo', data.show_karar_no !== undefined ? data.show_karar_no : true);
                setValue('showReceiver', data.show_receiver !== undefined ? data.show_receiver : true);
                setValue('showSignatures', data.show_signatures !== undefined ? data.show_signatures : true);
                setValue('showFooter', data.show_footer !== undefined ? data.show_footer : true);

                if (data.signers && Array.isArray(data.signers)) {
                    // Clear existing signers and add from template
                    for (let i = signerFields.length - 1; i >= 0; i--) {
                        removeSigner(i);
                    }
                    data.signers.forEach((signer: any) => {
                        appendSigner(withSignatureDefaults(signer));
                    });
                }

                toast.success('Şablon yüklendi');
            } catch (err) {
                console.error('Şablon yüklenirken hata:', err);
                toast.error('Şablon yüklenemedi');
            }
        };

        loadTemplate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId]);

    // Havuza kaydet
    const handleSaveAsTemplate = async () => {
        if (!templateName.trim()) {
            toast.error('Şablon adı zorunludur');
            return;
        }

        setSavingTemplate(true);
        try {
            const formData = watch();
            const normalizedSigners = (formData.signers || []).map(withSignatureDefaults);

            const { error } = await DocumentService.saveAsTemplate({
                name: templateName.trim(),
                description: templateDescription.trim() || undefined,
                category_code: formData.category_code || undefined,
                subject: formData.subject || undefined,
                receiver: formData.receiver || undefined,
                content: formData.content || undefined,
                sender_unit: formData.sender_unit || undefined,
                text_align: formData.textAlign,
                receiver_text_align: formData.receiverTextAlign,
                logo_url: formData.logoUrl || undefined,
                right_logo_url: formData.rightLogoUrl || undefined,
                footer_org_name: formData.footerOrgName || undefined,
                footer_address: formData.footerAddress || undefined,
                footer_contact: formData.footerContact || undefined,
                footer_phone: formData.footerPhone || undefined,
                decision_number: formData.decision_number || undefined,
                header_title: formData.headerTitle || undefined,
                header_org_name: formData.headerOrgName || undefined,
                show_header: formData.showHeader,
                show_date: formData.showDate,
                show_sayi: formData.showSayi,
                show_konu: formData.showKonu,
                show_karar_no: formData.showKararNo,
                show_receiver: formData.showReceiver,
                show_signatures: formData.showSignatures,
                show_footer: formData.showFooter,
                signers: normalizedSigners,
                is_public: templateIsPublic
            });

            if (error) throw error;

            toast.success('Şablon havuza kaydedildi');
            setShowSaveTemplateModal(false);
            setTemplateName('');
            setTemplateDescription('');
            setTemplateIsPublic(false);
        } catch (err) {
            console.error('Şablon kaydedilirken hata:', err);
            toast.error('Şablon kaydedilemedi');
        } finally {
            setSavingTemplate(false);
        }
    };

    // EYP Paketi Oluştur ve Storage'a Kaydet
    const handleCreateEYP = async (data: DocFormData) => {
        setGeneratingEYP(true);
        const user = AdminAuth.getCurrentUser();

        if (!user) {
            toast.error('Oturum hatası.');
            setGeneratingEYP(false);
            return;
        }

        try {
            const normalizedSigners = (data.signers || []).map(withSignatureDefaults);
            const { EYPBuilder } = await import('@/lib/eyp/package-builder');
            const { generateDocumentPDF } = await import('@/lib/pdf-generator');
            const { EYPService } = await import('@/lib/services/eypService');

            // Belge numarası oluştur
            const year = new Date().getFullYear();
            const docNumber = await DocumentService.generateNextSequence(data.type, year);

            // 1. Önce belgeyi veritabanına kaydet (EYP oluşturuldu ama henüz imzalanmadı)
            const { data: savedDoc, error: docError } = await DocumentService.createDocument({
                type: data.type,
                status: 'pending_approval', // İmza bekliyor
                document_number: docNumber,
                reference_date: new Date(data.date).toISOString(),
                sender: data.sender_unit,
                receiver: data.receiver,
                subject: data.subject,
                description: data.content,
                category_code: data.category_code,
                created_by: user.id,

                // Presentation Fields
                header_title: data.headerTitle,
                header_org_name: data.headerOrgName,
                sender_unit: data.sender_unit,
                footer_org_name: data.footerOrgName,
                footer_address: data.footerAddress,
                footer_contact: data.footerContact,
                footer_phone: data.footerPhone,
                decision_number: data.decision_number,
                logo_url: data.logoUrl,
                right_logo_url: data.rightLogoUrl,

                text_align: data.textAlign,
                receiver_text_align: data.receiverTextAlign,

                // Visibility
                show_header: data.showHeader,
                show_date: data.showDate,
                show_sayi: data.showSayi,
                show_konu: data.showKonu,
                show_karar_no: data.showKararNo,
                show_receiver: data.showReceiver,
                show_signatures: data.showSignatures,
                show_footer: data.showFooter,

                // Signers (save as JSONB)
                signers: normalizedSigners
            });

            if (docError || !savedDoc) {
                throw new Error('Belge kaydedilemedi: ' + (docError?.message || 'Bilinmeyen hata'));
            }

            // 2. PDF Oluştur
            const pdfBlob = await generateDocumentPDF(savedDoc);

            // 3. Hash hesapla
            const pdfBuffer = await pdfBlob.arrayBuffer();
            let hashHex: string;

            // crypto.subtle is only available in secure contexts (HTTPS or localhost)
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                // Fallback for non-secure contexts (development only)
                console.warn('crypto.subtle not available. Using fallback hash.');
                const bytes = new Uint8Array(pdfBuffer);
                let hash = 0x811c9dc5;
                for (let i = 0; i < bytes.length; i++) {
                    hash ^= bytes[i];
                    hash = Math.imul(hash, 0x01000193);
                }
                hashHex = Math.abs(hash).toString(16).padStart(64, '0');
            }

            // 4. EYP Paketi oluştur
            const eypBlob = await EYPBuilder.buildPackage({
                ustYaziPdf: pdfBlob,
                ustVeri: {
                    senaryo: 'e-Yazışma Paketi',
                    bellesikDosya: {
                        dosyaAdi: 'UstYazi.pdf',
                        dosyaImzaliAdi: 'UstYazi_imzali.pdf',
                        mimeTuru: 'application/pdf',
                        boyut: pdfBlob.size,
                        ozet: {
                            algoritma: 'SHA-256',
                            deger: hashHex
                        }
                    },
                    ustveriDili: 'TR',
                    belgeNo: docNumber,
                    tarih: data.date,
                    konu: data.subject,
                    gonderen: {
                        id: '1234567890', // TODO: Kurum ID'si settings'den alınmalı
                        adi: data.sender_unit || 'Sendika Yönetim',
                        rol: 'Gonderen'
                    },
                    alici: [{
                        id: '0000000000',
                        adi: data.receiver || 'İlgili Makama',
                        rol: 'Alici'
                    }]
                },
                belgeHedef: {
                    hedefler: [
                        { hedef: 'urn:mail:alim@kurum.gov.tr', amac: 'Gereği' }
                    ]
                }
            });

            // 5. EYP'yi Storage'a yükle ve metadata kaydet
            const uploadResult = await EYPService.uploadPackage(
                savedDoc.id,
                docNumber,
                eypBlob,
                hashHex,
                user.id
            );

            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'EYP yüklenemedi');
            }

            toast.success(`EYP paketi oluşturuldu ve kaydedildi: ${docNumber}`);
            router.push(`/admin/documents/outgoing/${savedDoc.id}`);

        } catch (err: any) {
            console.error('EYP oluşturma hatası:', err);
            toast.error('EYP oluşturulurken hata: ' + err.message);
        } finally {
            setGeneratingEYP(false);
        }
    };

    const onSubmit = async (data: DocFormData, status: 'draft' | 'sent') => {
        setLoading(true);
        const user = AdminAuth.getCurrentUser();

        if (!user) {
            toast.error('Oturum hatası.');
            setLoading(false);
            return;
        }

        try {
            const normalizedSigners = (data.signers || []).map(withSignatureDefaults);
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
                created_by: user.id,

                // Presentation Fields
                header_title: data.headerTitle,
                header_org_name: data.headerOrgName,
                sender_unit: data.sender_unit,
                footer_org_name: data.footerOrgName,
                footer_address: data.footerAddress,
                footer_contact: data.footerContact,
                footer_phone: data.footerPhone,
                decision_number: data.decision_number,
                logo_url: data.logoUrl,
                right_logo_url: data.rightLogoUrl,

                // Visibility
                show_header: data.showHeader,
                show_date: data.showDate,
                show_sayi: data.showSayi,
                show_konu: data.showKonu,
                show_karar_no: data.showKararNo,
                show_receiver: data.showReceiver,
                show_signatures: data.showSignatures,
                show_footer: data.showFooter,

                // Signers (save as JSONB)
                signers: normalizedSigners
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
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex justify-between items-center shrink-0 z-10">
                <div className="flex items-center space-x-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-violet-600 dark:text-violet-400" />
                            Yeni Resmi Yazı
                        </h1>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Mevcut Durum: Yeni Kayıt</span>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleSubmit((d) => onSubmit(d, 'draft'))}
                        disabled={loading || generatingEYP}
                        className="px-4 py-2 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium"
                    >
                        <Save className="w-4 h-4 inline-block mr-2" />
                        Taslak Kaydet
                    </button>
                    <button
                        onClick={() => setShowSaveTemplateModal(true)}
                        disabled={loading || generatingEYP}
                        className="px-4 py-2 text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 text-sm font-medium"
                    >
                        <Archive className="w-4 h-4 inline-block mr-2" />
                        Havuza Kaydet
                    </button>
                    <button
                        onClick={handleSubmit(handleCreateEYP)}
                        disabled={loading || generatingEYP}
                        className="px-4 py-2 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 text-sm font-medium shadow-sm disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4 inline-block mr-2" />
                        {generatingEYP ? 'Paket Oluşturuluyor...' : 'EYP Oluştur'}
                    </button>
                    <button
                        onClick={handleSubmit((d) => onSubmit(d, 'sent'))}
                        disabled={loading || generatingEYP}
                        className="px-4 py-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700 text-sm font-medium shadow-sm"
                    >
                        <Send className="w-4 h-4 inline-block mr-2" />
                        İmzala
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium"
                    >
                        <Printer className="w-4 h-4 inline-block mr-2" />
                        Yazdır
                    </button>
                </div>
            </header>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden">

                {/* Editor Pane (Left) */}
                <div className={`w-full md:w-1/2 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-6 space-y-6 ${previewMode ? 'hidden md:block' : 'block'}`}>

                    {/* Section: Künye */}
                    <div className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">Belge Künyesi</h3>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Left Logo */}
                            <div>
                                <div className="flex justify-between items-center min-h-[1.25rem]">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Sol Logo</label>
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
                                                    className="h-20 w-20 object-contain bg-white border border-slate-200 dark:border-slate-700 rounded-lg p-1"
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
                                            <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
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
                                                    className="flex items-center justify-center w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm"
                                                >
                                                    <Upload className="w-3 h-3 mr-2" />
                                                    Logo Yükle
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                                Maksimum 5MB.<br />JPEG, PNG
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Logo */}
                            <div>
                                <div className="flex justify-between items-center min-h-[1.25rem]">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Sağ Logo</label>
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
                                                    className="h-20 w-20 object-contain bg-white border border-slate-200 dark:border-slate-700 rounded-lg p-1"
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
                                            <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500">
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
                                                    className="flex items-center justify-center w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm"
                                                >
                                                    <Upload className="w-3 h-3 mr-2" />
                                                    Logo Yükle
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                                                Maksimum 5MB.<br />JPEG, PNG
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Başlık (T.C.)</label>
                                <input {...register('headerTitle')} placeholder="T.C." className="form-input w-full mt-1 text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-900 dark:text-slate-100" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Kurum Adı</label>
                                <textarea
                                    {...register('headerOrgName')}
                                    placeholder="Kurum Adı"
                                    rows={2}
                                    className="form-textarea w-full mt-1 text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-900 dark:text-slate-100 resize-y"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Gönderen Birim</label>
                            <textarea
                                {...register('sender_unit')}
                                rows={2}
                                className="form-textarea w-full mt-1 text-sm bg-slate-50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-600 rounded-md dark:text-slate-100 resize-y"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tarih</label>
                                <input type="date" {...register('date')} className="form-input w-full mt-1 text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-900 dark:text-slate-100" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Dosya Kodu</label>
                                <input placeholder="302.01" {...register('category_code')} className="form-input w-full mt-1 text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-900 dark:text-slate-100" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Karar No</label>
                                <input placeholder="2024/001" {...register('decision_number')} className="form-input w-full mt-1 text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-900 dark:text-slate-100" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Konu</label>
                            <input {...register('subject', { required: true })} placeholder="Toplantı hk." className="form-input w-full mt-1 text-sm border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-900 dark:text-slate-100" />
                            {errors.subject && <span className="text-red-500 text-xs">Zorunlu alan</span>}
                        </div>
                    </div>

                    {/* Section: İçerik */}
                    <div className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">İçerik</h3>

                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Alıcı (Hitap)</label>
                                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-md border border-transparent dark:border-slate-700">
                                    <button type="button" onClick={() => setValue('receiverTextAlign', 'left')} className={`p-1 rounded ${formValues.receiverTextAlign === 'left' ? 'bg-white dark:bg-slate-900 shadow text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                        <AlignLeft className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('receiverTextAlign', 'center')} className={`p-1 rounded ${formValues.receiverTextAlign === 'center' ? 'bg-white dark:bg-slate-900 shadow text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                        <AlignCenter className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('receiverTextAlign', 'right')} className={`p-1 rounded ${formValues.receiverTextAlign === 'right' ? 'bg-white dark:bg-slate-900 shadow text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                        <AlignRight className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('receiverTextAlign', 'justify')} className={`p-1 rounded ${formValues.receiverTextAlign === 'justify' ? 'bg-white dark:bg-slate-900 shadow text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-justify"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
                                    </button>
                                </div>
                            </div>
                            <input {...register('receiver', { required: true })} placeholder="ANKARA VALİLİĞİNE" className="form-input w-full mt-1 text-sm border-slate-300 dark:border-slate-600 rounded-md font-bold dark:bg-slate-900 dark:text-slate-100" />
                        </div>

                        <div className="relative">
                            <div className="flex justify-between items-end mb-1">
                                <div className="flex items-center space-x-2">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Metin</label>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        💡 @uye yazarak üye bilgisi ekleyebilirsiniz
                                    </span>
                                </div>
                                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-md border border-transparent dark:border-slate-700">
                                    <button type="button" onClick={() => setValue('textAlign', 'left')} className={`p-1 rounded ${formValues.textAlign === 'left' ? 'bg-white dark:bg-slate-900 shadow text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                        <AlignLeft className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('textAlign', 'center')} className={`p-1 rounded ${formValues.textAlign === 'center' ? 'bg-white dark:bg-slate-900 shadow text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                        <AlignCenter className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('textAlign', 'right')} className={`p-1 rounded ${formValues.textAlign === 'right' ? 'bg-white dark:bg-slate-900 shadow text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                        <AlignRight className="w-4 h-4" />
                                    </button>
                                    <button type="button" onClick={() => setValue('textAlign', 'justify')} className={`p-1 rounded ${formValues.textAlign === 'justify' ? 'bg-white dark:bg-slate-900 shadow text-violet-600 dark:text-violet-300' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-align-justify"><line x1="3" x2="21" y1="6" y2="6" /><line x1="3" x2="21" y1="12" y2="12" /><line x1="3" x2="21" y1="18" y2="18" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-md border border-transparent dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => handleApplyFormat('bold')}
                                        className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        title="Kalın"
                                    >
                                        <Bold className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyFormat('italic')}
                                        className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        title="İtalik"
                                    >
                                        <Italic className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleApplyFormat('underline')}
                                        className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        title="Altı çizili"
                                    >
                                        <Underline className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span>Yazı Boyutu</span>
                                    <select
                                        value={fontSizeSelection}
                                        onChange={(e) => {
                                            setFontSizeSelection(e.target.value);
                                            handleApplyFontSize(e.target.value);
                                        }}
                                        className="form-select rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="">Seç</option>
                                        {[10, 11, 12, 13, 14, 16, 18, 20].map(size => (
                                            <option key={size} value={size}>{size} pt</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Textarea with Mention Support */}
                            <textarea
                                ref={textareaRef}
                                value={formValues.content || ''}
                                onChange={handleContentChange}
                                onKeyDown={handleContentKeyDown}
                                rows={10}
                                className="form-textarea w-full mt-1 text-sm border-slate-300 dark:border-slate-600 rounded-md p-3 leading-relaxed font-mono dark:bg-slate-900 dark:text-slate-100"
                                placeholder="Belge içeriğini buraya yazınız... (@uye yazarak üye bilgisi ekleyebilirsiniz)"
                            />

                            {/* Mention Popup */}
                            {showMentionPopup && (
                                <div
                                    ref={mentionPopupRef}
                                    className="absolute z-50 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden"
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
                                                        ? 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-200'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                >
                                                    <div className="flex-shrink-0 w-8 h-8 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-200 rounded-lg flex items-center justify-center">
                                                        {cmd.icon}
                                                    </div>
                                                    <div className="text-left flex-1">
                                                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{cmd.label}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{cmd.description}</div>
                                                    </div>
                                                    <div className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 font-mono">
                                                        {cmd.trigger}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : mentionType === 'member' ? (
                                        /* Üye Arama */
                                        <div>
                                            <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                    <input
                                                        type="text"
                                                        value={mentionSearch}
                                                        onChange={(e) => setMentionSearch(e.target.value)}
                                                        placeholder="Üye adı, sicil no veya TC ile ara..."
                                                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 dark:text-slate-100"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            {isMultiSelect && (
                                                <div className="px-3 py-2 bg-violet-50 dark:bg-violet-900/30 border-b border-violet-100 dark:border-violet-800/40 flex justify-between items-center transition-all animate-in slide-in-from-top-2">
                                                    <span className="text-xs font-medium text-violet-700 dark:text-violet-200">
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
                                                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
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
                                                                    ? 'bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/60'
                                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                                                    } ${isMultiSelect && selectedMembers.find(m => m.id === member.id) ? 'bg-violet-100 dark:bg-violet-900/40' : ''}`}
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
                                                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                                                        {member.first_name} {member.last_name}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                        {member.membership_number} • {member.city || '-'}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : mentionSearch.length >= 2 ? (
                                                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                                        <User className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                                        <span className="text-sm">Üye bulunamadı</span>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                                                        <Search className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
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
                                                <div className="p-3 bg-violet-50 dark:bg-violet-900/30 border-b border-violet-100 dark:border-violet-800/40">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                                                            {selectedMember.first_name?.[0]}{selectedMember.last_name?.[0]}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                                {selectedMember.first_name} {selectedMember.last_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">
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
                                                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Tabloya eklenecek alanları seçin:</div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {MEMBER_FIELDS.map((field) => (
                                                        <label
                                                            key={field.key}
                                                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${selectedFields.includes(field.key)
                                                                ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-300 dark:border-violet-800/60 text-violet-700 dark:text-violet-200'
                                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedFields.includes(field.key)}
                                                                onChange={() => toggleField(field.key)}
                                                                className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600 focus:ring-violet-500"
                                                            />
                                                            <span className="text-sm text-slate-700 dark:text-slate-300">{field.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Önizleme */}
                                            {selectedMember && selectedFields.length > 0 && (
                                                <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                                                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Önizleme:</div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs border border-slate-300 dark:border-slate-700">
                                                            <thead>
                                                                <tr className="bg-slate-100 dark:bg-slate-900/60">
                                                                    {selectedFields.map(f => {
                                                                        const field = MEMBER_FIELDS.find(mf => mf.key === f);
                                                                        return (
                                                                            <th key={f} className="px-2 py-1 border-r border-slate-300 dark:border-slate-700 text-left font-medium text-slate-700 dark:text-slate-300">
                                                                                {field?.label}
                                                                            </th>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr className="text-slate-700 dark:text-slate-300">
                                                                    {selectedFields.map(f => (
                                                                        <td key={f} className="px-2 py-1 border-r border-t border-slate-300 dark:border-slate-700">
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
                                            <div className="p-3 border-t border-slate-100 dark:border-slate-700">
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
                    <div className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">İmzacılar</h3>
                            <div className="flex space-x-2">


                                {/* Başkasını Ekle Dropdown (Basit versiyon) */}
                                {(currentUser?.permissions?.includes('documents.sign.others') || currentUser?.role === 'super_admin') && availableSigners.length > 0 && (
                                    <select
                                        className="text-xs border-slate-200 dark:border-slate-600 rounded px-2 py-1 w-32 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleAddOtherSigner(e.target.value);
                                                e.target.value = ''; // Reset
                                            }
                                        }}
                                    >
                                        <option value="">Yetkili Seç...</option>
                                        {availableSigners.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.title})</option>
                                        ))}
                                    </select>
                                )}

                                <button type="button" onClick={() => appendSigner(withSignatureDefaults({ name: '', title: '' }))} className="text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 p-1 rounded" title="Manuel Ekle">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {signerFields.map((field, index) => (
                                <div key={field.id} className="flex items-start space-x-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-md border border-transparent dark:border-slate-700">
                                    <div className="grid gap-2 flex-1">
                                        <input
                                            placeholder="Ad Soyad"
                                            {...register(`signers.${index}.name` as const)}
                                            className="text-xs border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 dark:text-slate-100"
                                        />
                                        <input
                                            placeholder="Ünvan (Örn: Başkan)"
                                            {...register(`signers.${index}.title` as const)}
                                            className="text-xs border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 dark:text-slate-100"
                                        />
                                        <div className="grid grid-cols-1 gap-2">
                                            <div>
                                                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-1">İmza Boyutu (mm)</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="range"
                                                        min={6}
                                                        max={100}
                                                        step={1}
                                                        defaultValue={(field as any).signature_size_mm ?? DEFAULT_SIGNATURE_SIZE_MM}
                                                        {...register(`signers.${index}.signature_size_mm` as const, { valueAsNumber: true })}
                                                        className="w-full accent-violet-600 dark:accent-violet-400"
                                                    />
                                                    <span className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums w-10 text-right">
                                                        {Math.round(Number(formValues.signers?.[index]?.signature_size_mm ?? DEFAULT_SIGNATURE_SIZE_MM))}mm
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeSigner(index)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 mt-2">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Section: Alt Bilgi (Footer) */}
                    <div className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Alt Bilgi Ayarları</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Kurum Adı</label>
                                <input
                                    {...register('footerOrgName')}
                                    className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                    placeholder="Kurum Adı"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Adres/Lokasyon</label>
                                <input
                                    {...register('footerAddress')}
                                    className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                    placeholder="Adres Bilgisi"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Bilgi İçin</label>
                                <input
                                    {...register('footerContact')}
                                    className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                    placeholder="Birim/Kişi"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                <input
                                    {...register('footerPhone')}
                                    className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                    placeholder="Telefon No"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Görünürlük Ayarları */}
                    <div className="space-y-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Görünürlük Ayarları</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Belgede görmek istemediğiniz alanları kapatabilirsiniz.</p>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formValues.showHeader !== false}
                                    onChange={(e) => setValue('showHeader', e.target.checked)}
                                    className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Üst Başlık</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formValues.showDate !== false}
                                    onChange={(e) => setValue('showDate', e.target.checked)}
                                    className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Tarih</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formValues.showSayi !== false}
                                    onChange={(e) => setValue('showSayi', e.target.checked)}
                                    className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Sayı</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formValues.showKonu !== false}
                                    onChange={(e) => setValue('showKonu', e.target.checked)}
                                    className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Konu</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formValues.showKararNo !== false}
                                    onChange={(e) => setValue('showKararNo', e.target.checked)}
                                    className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Karar No</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formValues.showReceiver !== false}
                                    onChange={(e) => setValue('showReceiver', e.target.checked)}
                                    className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Alıcı</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formValues.showSignatures !== false}
                                    onChange={(e) => setValue('showSignatures', e.target.checked)}
                                    className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">İmzalar</span>
                            </label>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formValues.showFooter !== false}
                                    onChange={(e) => setValue('showFooter', e.target.checked)}
                                    className="w-4 h-4 text-violet-600 rounded border-slate-300 dark:border-slate-600"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Alt Bilgi</span>
                            </label>
                        </div>
                    </div>

                </div>

                {/* Preview Pane (Right) */}
                <div className={`flex-1 bg-slate-200/50 dark:bg-slate-900/60 flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800 ${!previewMode ? 'hidden md:flex' : 'flex'}`}>

                    {/* Preview Toolbar */}
                    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-[0_1px_3px_rgb(0,0,0,0.05)] z-10">

                        {/* Zoom Controls */}
                        <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 flex items-center">
                                <Monitor className="w-3 h-3 mr-1" />
                                Görünüm:
                            </span>
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
                                    className="p-1 hover:bg-white dark:hover:bg-slate-900 rounded-md transition-all text-slate-600 dark:text-slate-300 active:scale-95 disabled:opacity-50"
                                    title="Uzaklaştır"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-medium w-12 text-center text-slate-700 dark:text-slate-300 select-none">
                                    {Math.round(zoom * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}
                                    className="p-1 hover:bg-white dark:hover:bg-slate-900 rounded-md transition-all text-slate-600 dark:text-slate-300 active:scale-95 disabled:opacity-50"
                                    title="Yakınlaştır"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => setZoom(0.8)}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                                title="Sıfırla"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Margin Controls */}
                        <div className="flex items-center space-x-3 overflow-x-auto">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center whitespace-nowrap">
                                <GripVertical className="w-3 h-3 mr-1" />
                                Kenar Boşlukları (mm):
                            </span>

                            {/* Link/Unlink Toggle */}
                            <button
                                type="button"
                                onClick={() => setLinkMargins(!linkMargins)}
                                className={`p-1.5 rounded-lg transition-all ${linkMargins
                                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-900/60'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                title={linkMargins ? 'Ayrı ayrı değiştir' : 'Hepsini birlikte değiştir'}
                            >
                                {linkMargins ? <Link2 className="w-4 h-4" /> : <Unlink2 className="w-4 h-4" />}
                            </button>

                            {linkMargins ? (
                                /* Tek input - tüm boşlukları birlikte değiştir */
                                <div className="flex flex-col">
                                    <label className="text-[9px] text-slate-400 dark:text-slate-500 text-center">Tümü</label>
                                    <input
                                        type="number"
                                        value={margins.top}
                                        onChange={(e) => handleMarginChange('top', Number(e.target.value))}
                                        onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                        className="w-14 h-7 text-xs text-center border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            ) : (
                                /* Ayrı inputlar */
                                <div className="flex gap-2">
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-slate-400 dark:text-slate-500 text-center">Üst</label>
                                        <input
                                            type="number"
                                            value={margins.top}
                                            onChange={(e) => handleMarginChange('top', Number(e.target.value))}
                                            onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                            className="w-12 h-7 text-xs text-center border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-slate-400 dark:text-slate-500 text-center">Alt</label>
                                        <input
                                            type="number"
                                            value={margins.bottom}
                                            onChange={(e) => handleMarginChange('bottom', Number(e.target.value))}
                                            onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                            className="w-12 h-7 text-xs text-center border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-slate-400 dark:text-slate-500 text-center">Sol</label>
                                        <input
                                            type="number"
                                            value={margins.left}
                                            onChange={(e) => handleMarginChange('left', Number(e.target.value))}
                                            onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                            className="w-12 h-7 text-xs text-center border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-slate-400 dark:text-slate-500 text-center">Sağ</label>
                                        <input
                                            type="number"
                                            value={margins.right}
                                            onChange={(e) => handleMarginChange('right', Number(e.target.value))}
                                            onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                            className="w-12 h-7 text-xs text-center border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-violet-500 bg-white dark:bg-slate-900 dark:text-slate-100"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Area */}
                    <div className="flex-1 overflow-auto p-8 relative flex justify-center bg-[#e5e7eb] dark:bg-slate-950">
                        <div className="relative transition-all duration-200 printable-content mx-auto">
                            <A4Preview
                                document={{
                                    ...formValues,
                                    signers: formValues.signers?.map((s: any) => ({
                                        ...s,
                                        signature_url: s.signature_url
                                            ? supabase.storage.from('official-documents').getPublicUrl(s.signature_url).data.publicUrl
                                            : undefined
                                    })),
                                    document_number: formValues.category_code ? `${formValues.category_code}-TASLAK` : 'TASLAK'
                                }}
                                zoom={zoom}
                                margins={margins}
                                readonly={true}
                            />
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

            {/* Save Template Modal */}
            {showSaveTemplateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center">
                                <Archive className="w-5 h-5 mr-2 text-indigo-600" />
                                Havuza Kaydet
                            </h3>
                            <button
                                onClick={() => setShowSaveTemplateModal(false)}
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Bu belgeyi şablon olarak kaydedin. İleride aynı formatta belge oluşturmak için kullanabilirsiniz.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Şablon Adı *
                                </label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="Örn: Resmi Yazışma Şablonu"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Açıklama (İsteğe bağlı)
                                </label>
                                <textarea
                                    value={templateDescription}
                                    onChange={(e) => setTemplateDescription(e.target.value)}
                                    placeholder="Bu şablon ne için kullanılır?"
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-700"
                                />
                            </div>

                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={templateIsPublic}
                                    onChange={(e) => setTemplateIsPublic(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">
                                    Herkese açık şablon (diğer kullanıcılar da görebilir)
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowSaveTemplateModal(false)}
                                disabled={savingTemplate}
                                className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSaveAsTemplate}
                                disabled={savingTemplate || !templateName.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingTemplate && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
