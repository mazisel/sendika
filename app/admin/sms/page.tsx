'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, FileText, History, Loader2, Users, Search, Plus, Edit, Trash2, CheckCircle, XCircle, Clock, Filter, UsersRound, Zap, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { sendSms, logSms, SmsTemplateService, SmsLogService, SmsGroupService, MemberFilterService, SmsAutomationService } from '@/lib/netgsm'

type Tab = 'send' | 'templates' | 'groups' | 'automations' | 'logs'

interface SmsAutomation {
    id: string
    name: string
    trigger_column: 'birth_date' | 'membership_date' | 'created_at'
    trigger_days_before: number
    automation_type?: string // kept for legacy reference or icons
    is_enabled: boolean
    template_id: string | null
    days_before: number // Deprecated, use trigger_days_before
    send_time: string
    custom_message: string | null
    template?: {
        id: string
        name: string
        content: string
    } | null
}

interface SmsGroup {
    id: string
    name: string
    description?: string
    is_active: boolean
    member_count?: { count: number }[]
}

// SMS placeholder labels that can be replaced with member data
const SMS_LABELS = [
    { label: '{AD}', description: 'Üye adı', key: 'first_name' },
    { label: '{SOYAD}', description: 'Üye soyadı', key: 'last_name' },
    { label: '{AD_SOYAD}', description: 'Ad Soyad', key: 'full_name' },
    { label: '{TELEFON}', description: 'Telefon', key: 'phone' },
]

interface Member {
    id: string
    full_name: string
    first_name?: string
    last_name?: string
    phone: string
}

interface SmsTemplate {
    id: string
    name: string
    content: string
    description?: string
    is_active: boolean
}

interface SmsLog {
    id: string
    phone: string
    message: string
    status: string
    sent_at: string
    member?: { first_name: string; last_name: string; phone: string }
    template?: { name: string }
    sender?: { full_name: string }
}

export default function SmsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('send')
    const [loading, setLoading] = useState(false)

    // Send SMS state
    const [selectedMembers, setSelectedMembers] = useState<Member[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Member[]>([])
    const [message, setMessage] = useState('')
    const [selectedTemplateId, setSelectedTemplateId] = useState('')
    const [sending, setSending] = useState(false)
    const [scheduledDate, setScheduledDate] = useState('')

    // Templates state
    const [templates, setTemplates] = useState<SmsTemplate[]>([])
    const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null)
    const [newTemplate, setNewTemplate] = useState({ name: '', content: '', description: '' })
    const [showTemplateForm, setShowTemplateForm] = useState(false)

    // AI Generation state
    const [aiPrompt, setAiPrompt] = useState('')
    const [aiTone, setAiTone] = useState('formal')
    const [isGeneratingAi, setIsGeneratingAi] = useState(false)
    const [showAiModal, setShowAiModal] = useState(false)

    // Logs state
    const [logs, setLogs] = useState<SmsLog[]>([])

    // Groups state
    const [groups, setGroups] = useState<SmsGroup[]>([])
    const [editingGroup, setEditingGroup] = useState<SmsGroup | null>(null)
    const [newGroup, setNewGroup] = useState({ name: '', description: '' })
    const [showGroupForm, setShowGroupForm] = useState(false)
    const [selectedGroupId, setSelectedGroupId] = useState('')
    const [groupMembers, setGroupMembers] = useState<Member[]>([])
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
    const [groupSearchQuery, setGroupSearchQuery] = useState('')
    const [groupSearchResults, setGroupSearchResults] = useState<Member[]>([])

    // Filter state
    const [filterOptions, setFilterOptions] = useState<{ cities: string[]; workplaces: string[]; positions: string[]; genders: string[] }>({ cities: [], workplaces: [], positions: [], genders: [] })
    const [filters, setFilters] = useState({ city: '', workplace: '', position: '', gender: '' })
    const [showFilters, setShowFilters] = useState(false)

    // Automations state
    const [automations, setAutomations] = useState<SmsAutomation[]>([])
    const [showAutomationForm, setShowAutomationForm] = useState(false)
    const [editingAutomation, setEditingAutomation] = useState<SmsAutomation | null>(null)
    const [newAutomation, setNewAutomation] = useState({
        name: '',
        trigger_column: 'birth_date',
        trigger_days_before: 0,
        send_time: '09:00',
        template_id: ''
    })

    useEffect(() => {
        if (activeTab === 'templates') {
            loadTemplates()
        } else if (activeTab === 'logs') {
            loadLogs()
        } else if (activeTab === 'groups') {
            loadGroups()
        } else if (activeTab === 'automations') {
            loadAutomations()
            loadTemplates() // Ensure templates are loaded for selection
        }
    }, [activeTab])

    useEffect(() => {
        loadTemplates()
        loadGroups()
        loadFilterOptions()
    }, [])

    // Search members
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length >= 2) {
                searchMembers()
            } else {
                setSearchResults([])
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery])

    const searchMembers = async () => {
        console.log('Searching for:', searchQuery)
        const { data, error } = await supabase
            .from('members')
            .select('id, first_name, last_name, phone')
            .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
            .limit(10)

        console.log('Search results:', data, 'Error:', error)

        if (!error && data) {
            // Map to include computed full_name
            const mappedData = data.map(m => ({
                id: m.id,
                full_name: `${m.first_name} ${m.last_name}`,
                first_name: m.first_name,
                last_name: m.last_name,
                phone: m.phone || ''
            }))
            setSearchResults(mappedData.filter(m => !selectedMembers.find(sm => sm.id === m.id)))
        }
    }

    const loadTemplates = async () => {
        try {
            const data = await SmsTemplateService.getAll()
            setTemplates(data || [])
        } catch (error) {
            console.error('Şablonlar yüklenirken hata:', error)
        }
    }

    const loadLogs = async () => {
        setLoading(true)
        try {
            const data = await SmsLogService.getRecent(100)
            setLogs(data || [])
        } catch (error) {
            console.error('Loglar yüklenirken hata:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadGroups = async () => {
        try {
            const data = await SmsGroupService.getAll()
            setGroups(data || [])
        } catch (error) {
            console.error('Gruplar yüklenirken hata:', error)
        }
    }

    const loadAutomations = async () => {
        try {
            const data = await SmsAutomationService.getAll()
            setAutomations((data as unknown as SmsAutomation[]) || [])
        } catch (error) {
            console.error('Otomasyonlar yüklenirken hata:', error)
        }
    }

    const handleUpdateAutomation = async (id: string, settings: { is_enabled?: boolean; template_id?: string | null }) => {
        try {
            await SmsAutomationService.update(id, settings)
            toast.success('Otomasyon ayarları güncellendi')
            loadAutomations()
        } catch (error) {
            console.error('Otomasyon güncelleme hatası:', error)
            toast.error('Ayarlar güncellenemedi')
        }
    }

    const handleSaveAutomation = async () => {
        if (!newAutomation.name) {
            toast.error('Lütfen otomasyon ismini girin')
            return
        }

        try {
            if (editingAutomation) {
                await SmsAutomationService.update(editingAutomation.id, {
                    name: newAutomation.name,
                    trigger_column: newAutomation.trigger_column,
                    trigger_days_before: newAutomation.trigger_days_before,
                    send_time: newAutomation.send_time,
                    template_id: newAutomation.template_id || null
                })
                toast.success('Otomasyon güncellendi')
            } else {
                await SmsAutomationService.create({
                    name: newAutomation.name,
                    trigger_column: newAutomation.trigger_column,
                    trigger_days_before: newAutomation.trigger_days_before,
                    send_time: newAutomation.send_time,
                    template_id: newAutomation.template_id || null
                })
                toast.success('Otomasyon oluşturuldu')
            }
            setShowAutomationForm(false)
            setEditingAutomation(null)
            loadAutomations()
        } catch (error) {
            console.error('Otomasyon kaydedilirken hata:', error)
            toast.error('Otomasyon kaydedilemedi')
        }
    }

    const handleDeleteAutomation = async (id: string) => {
        if (!confirm('Bu otomasyonu silmek istediğinize emin misiniz?')) return

        try {
            await SmsAutomationService.delete(id)
            toast.success('Otomasyon silindi')
            loadAutomations()
        } catch (error) {
            console.error('Otomasyon silinirken hata:', error)
            toast.error('Otomasyon silinemedi')
        }
    }

    const getTriggerLabel = (column: string) => {
        switch (column) {
            case 'birth_date': return 'Doğum Günü'
            case 'membership_date': return 'Üyelik Tarihi'
            case 'created_at': return 'Kayıt Tarihi'

            default: return column
        }
    }

    const getTriggerTimeLabel = (daysBefore: number) => {
        if (daysBefore === 0) return 'Gününde'
        if (daysBefore === 1) return '1 gün önce'
        return `${daysBefore} gün önce`
    }

    const getAutomationLabel = (type: string): { title: string; description: string } => {
        switch (type) {
            case 'birthday':
                return { title: 'Doğum Günü Mesajı', description: 'Üyelere doğum günlerinde otomatik SMS gönder' }
            case 'membership_anniversary':
                return { title: 'Üyelik Yıldönümü', description: 'Üyelik yıldönümünde kutlama mesajı gönder' }
            case 'welcome':
                return { title: 'Hoş Geldin Mesajı', description: 'Yeni üyelere kayıt olduğunda hoş geldin mesajı gönder' }
            default:
                return { title: type, description: '' }
        }
    }

    const loadFilterOptions = async () => {
        try {
            const options = await MemberFilterService.getFilterOptions()
            setFilterOptions(options)
        } catch (error) {
            console.error('Filtre seçenekleri yüklenirken hata:', error)
        }
    }

    const applyFilters = async () => {
        if (!filters.city && !filters.workplace && !filters.position && !filters.gender) {
            toast.error('En az bir filtre seçmelisiniz')
            return
        }
        try {
            const members = await MemberFilterService.filterMembers(filters)
            setSelectedMembers(prev => {
                const newMembers = members.filter(m => !prev.find(p => p.id === m.id))
                return [...prev, ...newMembers]
            })
            toast.success(`${members.length} üye eklendi`)
            setShowFilters(false)
            setFilters({ city: '', workplace: '', position: '', gender: '' })
        } catch (error) {
            console.error('Filtre uygulama hatası:', error)
            toast.error('Üyeler yüklenemedi')
        }
    }

    const loadGroupMembers = async (groupId: string) => {
        try {
            const members = await SmsGroupService.getMembers(groupId)
            setSelectedMembers(prev => {
                const newMembers = members.filter(m => !prev.find(p => p.id === m.id))
                return [...prev, ...newMembers]
            })
            toast.success(`${members.length} üye eklendi`)
        } catch (error) {
            console.error('Grup üyeleri yüklenirken hata:', error)
        }
    }

    const handleSaveGroup = async () => {
        if (!newGroup.name.trim()) {
            toast.error('Grup adı zorunludur')
            return
        }
        try {
            if (editingGroup) {
                await SmsGroupService.update(editingGroup.id, newGroup)
                toast.success('Grup güncellendi')
            } else {
                await SmsGroupService.create(newGroup)
                toast.success('Grup oluşturuldu')
            }
            setNewGroup({ name: '', description: '' })
            setEditingGroup(null)
            setShowGroupForm(false)
            loadGroups()
        } catch (error) {
            console.error('Grup kaydetme hatası:', error)
            toast.error('Grup kaydedilemedi')
        }
    }

    const handleDeleteGroup = async (id: string) => {
        if (!confirm('Bu grubu silmek istediğinizden emin misiniz?')) return
        try {
            await SmsGroupService.delete(id)
            toast.success('Grup silindi')
            loadGroups()
        } catch (error) {
            console.error('Grup silme hatası:', error)
            toast.error('Grup silinemedi')
        }
    }

    const handleAddMembersToGroup = async (groupId: string) => {
        if (selectedMembers.length === 0) {
            toast.error('Önce üye seçmelisiniz')
            return
        }
        try {
            await SmsGroupService.addMembers(groupId, selectedMembers.map(m => m.id))
            toast.success(`${selectedMembers.length} üye gruba eklendi`)
            loadGroups()
        } catch (error) {
            console.error('Gruba üye ekleme hatası:', error)
            toast.error('Üyeler gruba eklenemedi')
        }
    }

    const searchMembersForGroup = async (query: string) => {
        if (query.length < 2) {
            setGroupSearchResults([])
            return
        }
        const { data, error } = await supabase
            .from('members')
            .select('id, first_name, last_name, phone')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
            .limit(10)

        if (!error && data) {
            const mappedData = data.map(m => ({
                id: m.id,
                full_name: `${m.first_name} ${m.last_name}`,
                first_name: m.first_name,
                last_name: m.last_name,
                phone: m.phone || ''
            }))
            setGroupSearchResults(mappedData)
        }
    }

    const addMemberToGroup = async (groupId: string, member: Member) => {
        try {
            await SmsGroupService.addMembers(groupId, [member.id])
            toast.success(`${member.full_name} gruba eklendi`)
            loadGroups()
            setGroupSearchQuery('')
            setGroupSearchResults([])
        } catch (error) {
            console.error('Gruba üye ekleme hatası:', error)
            toast.error('Üye gruba eklenemedi')
        }
    }

    const addMember = (member: Member) => {
        setSelectedMembers([...selectedMembers, member])
        setSearchQuery('')
        setSearchResults([])
    }

    const removeMember = (memberId: string) => {
        setSelectedMembers(selectedMembers.filter(m => m.id !== memberId))
    }

    const applyTemplate = (templateId: string) => {
        const template = templates.find(t => t.id === templateId)
        if (template) {
            setMessage(template.content)
            setSelectedTemplateId(templateId)
        }
    }
    // Replace placeholders in message with member data
    const replacePlaceholders = (text: string, member: Member): string => {
        return text
            .replace(/{AD}/g, member.first_name || '')
            .replace(/{SOYAD}/g, member.last_name || '')
            .replace(/{AD_SOYAD}/g, member.full_name || '')
            .replace(/{TELEFON}/g, member.phone || '')
    }

    // Insert label at cursor position in message
    const insertLabel = (label: string) => {
        setMessage(prev => prev + label)
    }

    const handleSendSms = async () => {
        if (selectedMembers.length === 0) {
            toast.error('En az bir üye seçmelisiniz')
            return
        }

        if (!message.trim()) {
            toast.error('Mesaj içeriği boş olamaz')
            return
        }

        setSending(true)
        let successCount = 0
        let failCount = 0

        for (const member of selectedMembers) {
            // Replace placeholders with actual member data
            const personalizedMessage = replacePlaceholders(message, member)
            const result = await sendSms(member.phone, personalizedMessage, scheduledDate || undefined)

            // Get current user for logging
            const { data: { user } } = await supabase.auth.getUser()

            await logSms({
                templateId: selectedTemplateId || undefined,
                memberId: member.id,
                phone: member.phone,
                message: personalizedMessage,
                status: result.success ? 'sent' : 'failed',
                jobId: result.jobId,
                errorMessage: result.error,
                sentBy: user?.id
            })

            if (result.success) {
                successCount++
            } else {
                failCount++
            }
        }

        setSending(false)

        if (failCount === 0) {
            toast.success(`${successCount} SMS başarıyla gönderildi`)
            setSelectedMembers([])
            setMessage('')
            setSelectedTemplateId('')
        } else {
            toast.error(`${successCount} başarılı, ${failCount} başarısız`)
        }
    }

    const handleSaveTemplate = async () => {
        if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
            toast.error('Şablon adı ve içeriği zorunludur')
            return
        }

        try {
            if (editingTemplate) {
                await SmsTemplateService.update(editingTemplate.id, newTemplate)
                toast.success('Şablon güncellendi')
            } else {
                await SmsTemplateService.create(newTemplate)
                toast.success('Şablon oluşturuldu')
            }

            setNewTemplate({ name: '', content: '', description: '' })
            setEditingTemplate(null)
            setShowTemplateForm(false)
            loadTemplates()
        } catch (error) {
            console.error('Şablon kaydetme hatası:', error)
            toast.error('Şablon kaydedilemedi')
        }
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Bu şablonu silmek istediğinizden emin misiniz?')) return

        try {
            await SmsTemplateService.delete(id)
            toast.success('Şablon silindi')
            loadTemplates()
        } catch (error) {
            console.error('Şablon silme hatası:', error)
            toast.error('Şablon silinemedi')
        }
    }

    const handleGenerateAiSms = async () => {
        if (!aiPrompt.trim()) {
            toast.error('Lütfen bir konu veya açıklama girin')
            return
        }

        setIsGeneratingAi(true)
        try {
            const response = await fetch('/api/ai/generate-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    tone: aiTone
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Bir hata oluştu')
            }

            setNewTemplate(prev => ({
                ...prev,
                content: data.content
            }))

            setShowAiModal(false)
            setAiPrompt('')
            toast.success('SMS metni oluşturuldu')
        } catch (error: any) {
            console.error('AI Generation Error:', error)
            toast.error(error.message || 'SMS oluşturulamadı')
        } finally {
            setIsGeneratingAi(false)
        }
    }

    const tabs = [
        { id: 'send' as Tab, label: 'SMS Gönder', icon: Send },
        { id: 'templates' as Tab, label: 'Şablonlar', icon: FileText },
        { id: 'groups' as Tab, label: 'Gruplar', icon: UsersRound },
        { id: 'automations' as Tab, label: 'Otomasyon', icon: Zap },
        { id: 'logs' as Tab, label: 'Geçmiş', icon: History }
    ]

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">SMS Yönetimi</h1>
                <p className="text-gray-500 mt-1">Üyelere SMS gönder, grupları ve şablonları yönet</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                `}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </nav>
            </div>

            {/* Send SMS Tab */}
            {activeTab === 'send' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Member Selection */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Alıcılar
                            </h3>

                            {/* Quick Actions: Filter & Group */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Filter className="w-4 h-4" />
                                    Filtreye Göre Ekle
                                </button>
                                <select
                                    onChange={(e) => e.target.value && loadGroupMembers(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    value=""
                                >
                                    <option value="">Gruptan Ekle</option>
                                    {groups.filter(g => g.is_active).map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.name} ({g.member_count?.[0]?.count || 0})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Filter Panel */}
                            {showFilters && (
                                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-gray-500">Şehir</label>
                                            <select
                                                value={filters.city}
                                                onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                                                className="w-full mt-1 text-sm border-gray-300 rounded-lg"
                                            >
                                                <option value="">Tümü</option>
                                                {filterOptions.cities.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">İş Yeri</label>
                                            <select
                                                value={filters.workplace}
                                                onChange={(e) => setFilters(f => ({ ...f, workplace: e.target.value }))}
                                                className="w-full mt-1 text-sm border-gray-300 rounded-lg"
                                            >
                                                <option value="">Tümü</option>
                                                {filterOptions.workplaces.map(w => <option key={w} value={w}>{w}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Pozisyon</label>
                                            <select
                                                value={filters.position}
                                                onChange={(e) => setFilters(f => ({ ...f, position: e.target.value }))}
                                                className="w-full mt-1 text-sm border-gray-300 rounded-lg"
                                            >
                                                <option value="">Tümü</option>
                                                {filterOptions.positions.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">Cinsiyet</label>
                                            <select
                                                value={filters.gender}
                                                onChange={(e) => setFilters(f => ({ ...f, gender: e.target.value }))}
                                                className="w-full mt-1 text-sm border-gray-300 rounded-lg"
                                            >
                                                <option value="">Tümü</option>
                                                {filterOptions.genders.map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={applyFilters}
                                        className="mt-3 w-full bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-lg text-sm font-medium"
                                    >
                                        Filtreyi Uygula
                                    </button>
                                </div>
                            )}

                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Üye ara (isim veya telefon)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                />

                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {searchResults.map((member) => (
                                            <button
                                                key={member.id}
                                                onClick={() => addMember(member)}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                                            >
                                                <span className="font-medium">{member.full_name}</span>
                                                <span className="text-sm text-gray-500">{member.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Members */}
                            <div className="border border-gray-200 rounded-lg p-4 min-h-[200px]">
                                {selectedMembers.length === 0 ? (
                                    <p className="text-gray-400 text-center py-8">Henüz üye seçilmedi</p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedMembers.map((member) => (
                                            <div
                                                key={member.id}
                                                className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                                            >
                                                <div>
                                                    <span className="font-medium">{member.full_name}</span>
                                                    <span className="text-sm text-gray-500 ml-2">{member.phone}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeMember(member.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-gray-500 mt-2">
                                {selectedMembers.length} üye seçildi
                            </p>
                        </div>

                        {/* Right: Message */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mesaj</h3>

                            {/* Template Selection */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Şablon Seç (opsiyonel)
                                </label>
                                <select
                                    value={selectedTemplateId}
                                    onChange={(e) => applyTemplate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                >
                                    <option value="">-- Şablon seçin --</option>
                                    {templates.filter(t => t.is_active).map((template) => (
                                        <option key={template.id} value={template.id}>
                                            {template.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Message Textarea */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    SMS Metni
                                </label>

                                {/* Available Labels */}
                                <div className="mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs text-gray-500 mb-2">
                                        Kişiselleştirme etiketleri (tıklayarak ekleyin):
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {SMS_LABELS.map((item) => (
                                            <button
                                                key={item.label}
                                                type="button"
                                                onClick={() => insertLabel(item.label)}
                                                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono hover:bg-primary-50 hover:border-primary-300 transition-colors"
                                                title={item.description}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={6}
                                    maxLength={918}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                                    placeholder="SMS içeriğini yazın..."
                                />
                                <div className="flex justify-between text-sm text-gray-500 mt-1">
                                    <span>{message.length} / 918 karakter</span>
                                    <span>{Math.ceil(message.length / 160)} SMS</span>
                                </div>
                            </div>

                            {/* Schedule Time */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gönderim Zamanı
                                </label>
                                <div className="flex gap-3 items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={!scheduledDate}
                                            onChange={() => setScheduledDate('')}
                                            className="text-primary-600"
                                        />
                                        <span className="text-sm">Hemen gönder</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={!!scheduledDate}
                                            onChange={() => {
                                                // Set default to tomorrow same hour
                                                const tomorrow = new Date()
                                                tomorrow.setDate(tomorrow.getDate() + 1)
                                                tomorrow.setMinutes(0, 0, 0)
                                                setScheduledDate(tomorrow.toISOString().slice(0, 16))
                                            }}
                                            className="text-primary-600"
                                        />
                                        <span className="text-sm">Zamanla</span>
                                    </label>
                                </div>
                                {scheduledDate && (
                                    <input
                                        type="datetime-local"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                        className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2"
                                    />
                                )}
                            </div>

                            {/* Send Button */}
                            <button
                                onClick={handleSendSms}
                                disabled={sending || selectedMembers.length === 0 || !message.trim()}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {scheduledDate ? 'Zamanlanıyor...' : 'Gönderiliyor...'}
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        {scheduledDate ? `SMS Zamanla (${selectedMembers.length} kişi)` : `SMS Gönder (${selectedMembers.length} kişi)`}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">SMS Şablonları</h3>
                        <button
                            onClick={() => {
                                setNewTemplate({ name: '', content: '', description: '' })
                                setEditingTemplate(null)
                                setShowTemplateForm(true)
                            }}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Yeni Şablon
                        </button>
                    </div>

                    {/* Template Form */}
                    {showTemplateForm && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium mb-4">
                                {editingTemplate ? 'Şablonu Düzenle' : 'Yeni Şablon'}
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Şablon Adı
                                    </label>
                                    <input
                                        type="text"
                                        value={newTemplate.name}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        placeholder="Örn: Aidat Hatırlatma"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Açıklama
                                    </label>
                                    <input
                                        type="text"
                                        value={newTemplate.description}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        placeholder="Şablon hakkında kısa açıklama"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Mesaj İçeriği
                                    </label>

                                    {/* Available Labels for Templates */}
                                    <div className="mb-2 p-2 bg-white rounded border border-gray-200">
                                        <p className="text-xs text-gray-500 mb-1">
                                            Kişiselleştirme etiketleri:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {SMS_LABELS.map((item) => (
                                                <button
                                                    key={item.label}
                                                    type="button"
                                                    onClick={() => setNewTemplate(prev => ({ ...prev, content: prev.content + item.label }))}
                                                    className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs font-mono hover:bg-primary-50 hover:border-primary-300 transition-colors"
                                                    title={item.description}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <textarea
                                        value={newTemplate.content}
                                        onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                        rows={5}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        placeholder="SMS içeriğini yazın..."
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setShowAiModal(true)}
                                            className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors border border-dashed border-purple-200"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Yapay Zeka ile Oluştur
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveTemplate}
                                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
                                    >
                                        Kaydet
                                    </button>

                                    {/* AI Generator Modal */}
                                    {showAiModal && (
                                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                                        Yapay Zeka Asistanı
                                                    </h3>
                                                    <button
                                                        onClick={() => setShowAiModal(false)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <XCircle className="w-6 h-6" />
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Ne hakkında bir mesaj yazmak istiyorsunuz?
                                                        </label>
                                                        <textarea
                                                            value={aiPrompt}
                                                            onChange={(e) => setAiPrompt(e.target.value)}
                                                            rows={3}
                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                            placeholder="Örn: Kurban bayramı kutlaması, aidat ödeme hatırlatması..."
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Mesajın tonu nasıl olsun?
                                                        </label>
                                                        <select
                                                            value={aiTone}
                                                            onChange={(e) => setAiTone(e.target.value)}
                                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                        >
                                                            <option value="formal">Resmi ve Saygılı</option>
                                                            <option value="enthusiastic">Coşkulu ve Heyecanlı</option>
                                                            <option value="informative">Bilgilendirici ve Net</option>
                                                        </select>
                                                    </div>

                                                    <div className="bg-purple-50 p-3 rounded-lg text-xs text-purple-700 border border-purple-100">
                                                        <p className="font-medium mb-1">💡 İpucu:</p>
                                                        Yapay zeka {`{AD_SOYAD}`} gibi etiketleri otomatik olarak kullanabilir.
                                                    </div>

                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <button
                                                            onClick={() => setShowAiModal(false)}
                                                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium"
                                                        >
                                                            İptal
                                                        </button>
                                                        <button
                                                            onClick={handleGenerateAiSms}
                                                            disabled={isGeneratingAi || !aiPrompt.trim()}
                                                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isGeneratingAi ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                    Oluşturuluyor...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="w-4 h-4" />
                                                                    Oluştur
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowTemplateForm(false)
                                            setEditingTemplate(null)
                                        }}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
                                    >
                                        İptal
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Templates List */}
                    <div className="space-y-3">
                        {templates.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Henüz şablon oluşturulmamış</p>
                        ) : (
                            templates.map((template) => (
                                <div
                                    key={template.id}
                                    className={`border rounded-lg p-4 ${template.is_active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                                            {template.description && (
                                                <p className="text-sm text-gray-500">{template.description}</p>
                                            )}
                                            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                                                {template.content}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setNewTemplate({
                                                        name: template.name,
                                                        content: template.content,
                                                        description: template.description || ''
                                                    })
                                                    setEditingTemplate(template)
                                                    setShowTemplateForm(true)
                                                }}
                                                className="text-gray-500 hover:text-primary-600"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTemplate(template.id)}
                                                className="text-gray-500 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Groups Tab */}
            {activeTab === 'groups' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">SMS Grupları</h3>
                        <button
                            onClick={() => {
                                setNewGroup({ name: '', description: '' })
                                setEditingGroup(null)
                                setShowGroupForm(true)
                            }}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Yeni Grup
                        </button>
                    </div>

                    {/* Group Form */}
                    {showGroupForm && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium mb-4">
                                {editingGroup ? 'Grubu Düzenle' : 'Yeni Grup'}
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Grup Adı
                                    </label>
                                    <input
                                        type="text"
                                        value={newGroup.name}
                                        onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        placeholder="Örn: Ankara Üyeleri"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Açıklama
                                    </label>
                                    <input
                                        type="text"
                                        value={newGroup.description}
                                        onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        placeholder="Grup hakkında kısa açıklama"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveGroup}
                                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
                                    >
                                        Kaydet
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowGroupForm(false)
                                            setEditingGroup(null)
                                        }}
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
                                    >
                                        İptal
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Groups List */}
                    <div className="space-y-3">
                        {groups.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Henüz grup oluşturulmamış</p>
                        ) : (
                            groups.map((group) => (
                                <div
                                    key={group.id}
                                    className={`border rounded-lg p-4 ${group.is_active ? 'border-gray-200' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                                <UsersRound className="w-4 h-4 text-gray-400" />
                                                {group.name}
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                    {group.member_count?.[0]?.count || 0} üye
                                                </span>
                                            </h4>
                                            {group.description && (
                                                <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setNewGroup({
                                                        name: group.name,
                                                        description: group.description || ''
                                                    })
                                                    setEditingGroup(group)
                                                    setShowGroupForm(true)
                                                }}
                                                className="text-gray-500 hover:text-primary-600"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGroup(group.id)}
                                                className="text-gray-500 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Add selected members to group */}
                                    {selectedMembers.length > 0 && (
                                        <button
                                            onClick={() => handleAddMembersToGroup(group.id)}
                                            className="mt-3 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Seçili {selectedMembers.length} üyeyi bu gruba ekle
                                        </button>
                                    )}

                                    {/* Expand/Collapse Add Member */}
                                    <button
                                        onClick={() => {
                                            setExpandedGroupId(expandedGroupId === group.id ? null : group.id)
                                            setGroupSearchQuery('')
                                            setGroupSearchResults([])
                                        }}
                                        className="mt-3 text-sm text-gray-600 hover:text-primary-600 flex items-center gap-1"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Üye Ekle
                                    </button>

                                    {/* Inline Member Search */}
                                    {expandedGroupId === group.id && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Üye ara (isim veya telefon)"
                                                    value={groupSearchQuery}
                                                    onChange={(e) => {
                                                        setGroupSearchQuery(e.target.value)
                                                        searchMembersForGroup(e.target.value)
                                                    }}
                                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                            {groupSearchResults.length > 0 && (
                                                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                                                    {groupSearchResults.map((member) => (
                                                        <button
                                                            key={member.id}
                                                            onClick={() => addMemberToGroup(group.id, member)}
                                                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex justify-between items-center text-sm border-b border-gray-100 last:border-0"
                                                        >
                                                            <span className="font-medium">{member.full_name}</span>
                                                            <span className="text-gray-500">{member.phone}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Automations Tab */}
            {activeTab === 'automations' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" />
                            SMS Otomasyonları
                        </h3>
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-sm text-gray-500">
                                Otomatik SMS veritabanı üzerinden günlük kontrol edilir ve tanımlı kurallara göre gönderim yapılır.
                            </p>
                            <button
                                onClick={() => {
                                    setNewAutomation({
                                        name: '',
                                        trigger_column: 'birth_date',
                                        trigger_days_before: 0,
                                        send_time: '09:00',
                                        template_id: ''
                                    })
                                    setEditingAutomation(null)
                                    setShowAutomationForm(true)
                                }}
                                className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-700 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Yeni Otomasyon
                            </button>
                        </div>
                    </div>

                    {/* Automation Form Modal */}
                    {showAutomationForm && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                                <h3 className="text-lg font-semibold mb-4">
                                    {editingAutomation ? 'Otomasyonu Düzenle' : 'Yeni Otomasyon'}
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Otomasyon İsmi
                                        </label>
                                        <input
                                            type="text"
                                            value={newAutomation.name}
                                            onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                            placeholder="Örn: Doğum Günü Kutlaması"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Tetikleyici
                                            </label>
                                            <select
                                                value={newAutomation.trigger_column}
                                                onChange={(e) => setNewAutomation({ ...newAutomation, trigger_column: e.target.value as any })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                            >
                                                <option value="birth_date">Doğum Günü</option>
                                                <option value="membership_date">Üyelik Tarihi</option>
                                                <option value="created_at">Kayıt Tarihi</option>

                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Zamanlama
                                            </label>
                                            <select
                                                value={newAutomation.trigger_days_before}
                                                onChange={(e) => setNewAutomation({ ...newAutomation, trigger_days_before: Number(e.target.value) })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                            >
                                                <option value={0}>Gününde</option>
                                                <option value={1}>1 gün önce</option>
                                                <option value={2}>2 gün önce</option>
                                                <option value={3}>3 gün önce</option>
                                                <option value={7}>1 hafta önce</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Gönderim Saati
                                        </label>
                                        <input
                                            type="time"
                                            value={newAutomation.send_time}
                                            onChange={(e) => setNewAutomation({ ...newAutomation, send_time: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            SMS Şablonu
                                        </label>
                                        <select
                                            value={newAutomation.template_id}
                                            onChange={(e) => setNewAutomation({ ...newAutomation, template_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            <option value="">Şablon Seçin</option>
                                            {templates.filter(t => t.is_active).map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setShowAutomationForm(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleSaveAutomation}
                                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
                                    >
                                        Kaydet
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {automations.map((automation) => (
                            <div key={automation.id} className="border border-gray-200 rounded-lg p-5 flex items-start justify-between bg-gray-50/50">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-semibold text-gray-900">{automation.name}</h4>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${automation.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                            {automation.is_enabled ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                                        <span className="font-medium text-gray-700">{getTriggerLabel(automation.trigger_column)}</span>
                                        <span className="text-gray-400">•</span>
                                        <span>{getTriggerTimeLabel(automation.trigger_days_before)}</span>
                                        <span className="text-gray-400">•</span>
                                        <span>Saat {automation.send_time}</span>
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {automation.template
                                            ? `Seçili şablon: ${automation.template.name}`
                                            : 'Şablon seçilmemiş (Gönderim yapılmaz)'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => handleUpdateAutomation(automation.id, { is_enabled: !automation.is_enabled })}
                                        className={`p-2 rounded-lg transition-colors ${automation.is_enabled
                                            ? 'text-green-600 hover:bg-green-50'
                                            : 'text-gray-400 hover:bg-gray-100'
                                            }`}
                                        title={automation.is_enabled ? 'Pasifleştir' : 'Aktifleştir'}
                                    >
                                        {automation.is_enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNewAutomation({
                                                name: automation.name,
                                                trigger_column: automation.trigger_column,
                                                trigger_days_before: automation.trigger_days_before,
                                                send_time: automation.send_time,
                                                template_id: automation.template_id || ''
                                            })
                                            setEditingAutomation(automation)
                                            setShowAutomationForm(true)
                                        }}
                                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                                        title="Düzenle"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAutomation(automation.id)}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {automations.length === 0 && (
                            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                                <Zap className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                                <p>Henüz tanımlanmış otomasyon yok</p>
                                <button
                                    onClick={() => setShowAutomationForm(true)}
                                    className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    İlk otomasyonu oluştur
                                </button>
                            </div>
                        )}
                    </div>


                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Nasıl Çalışır?</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            <li>• Otomasyonu aktifleştirin ve bir SMS şablonu seçin</li>
                            <li>• Sistem günlük olarak ilgili üyeleri kontrol eder</li>
                            <li>• Koşullar sağlandığında etiketler değiştirilerek SMS gönderilir</li>
                            <li>• Her üyeye yılda bir kez gönderim yapılır</li>
                        </ul>
                    </div>
                </div>
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                        </div>
                    ) : logs.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Henüz SMS gönderilmemiş</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alıcı</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesaj</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Şablon</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gönderen</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {new Date(log.sent_at).toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {log.member ? `${log.member.first_name} ${log.member.last_name}` : '-'}
                                                </div>
                                                <div className="text-sm text-gray-500">{log.phone}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                                                {log.message}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {log.template?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {log.sender?.full_name || 'Sistem'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`
                          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                          ${log.status === 'sent' ? 'bg-green-100 text-green-700' : ''}
                          ${log.status === 'failed' ? 'bg-red-100 text-red-700' : ''}
                          ${log.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                        `}>
                                                    {log.status === 'sent' && <CheckCircle className="w-3 h-3" />}
                                                    {log.status === 'failed' && <XCircle className="w-3 h-3" />}
                                                    {log.status === 'pending' && <Clock className="w-3 h-3" />}
                                                    {log.status === 'sent' ? 'Gönderildi' : log.status === 'failed' ? 'Başarısız' : 'Bekliyor'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
