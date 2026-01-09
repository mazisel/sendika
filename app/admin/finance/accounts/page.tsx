'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, Folder, FileText, ChevronRight, ChevronDown, Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Account {
    id: string
    code: string
    name: string
    type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
    parent_id: string | null
    description?: string
    is_active: boolean
    children?: Account[]
    level?: number
}

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingAccount, setEditingAccount] = useState<Account | null>(null)
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'ASSET' as Account['type'],
        parent_id: '',
        description: ''
    })

    useEffect(() => {
        loadAccounts()
    }, [])

    const loadAccounts = async () => {
        try {
            const { data, error } = await supabase
                .from('accounting_accounts')
                .select('*')
                .order('code')

            if (error) throw error

            if (data) {
                const hierarchy = buildHierarchy(data)
                setAccounts(hierarchy)
                // Expand root nodes by default
                const rootIds = data.filter(a => !a.parent_id).map(a => a.id)
                setExpandedNodes(new Set(rootIds))
            }
        } catch (error) {
            console.error('Hesap planı yüklenirken hata:', error)
            toast.error('Hesap planı yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const buildHierarchy = (flatAccounts: any[]): Account[] => {
        const accountMap = new Map<string, Account>()
        const roots: Account[] = []

        // First pass: create nodes
        flatAccounts.forEach(acc => {
            accountMap.set(acc.id, { ...acc, children: [] })
        })

        // Second pass: link children
        flatAccounts.forEach(acc => {
            const node = accountMap.get(acc.id)!
            if (acc.parent_id) {
                const parent = accountMap.get(acc.parent_id)
                if (parent) {
                    parent.children?.push(node)
                } else {
                    roots.push(node) // Parent not found/loaded, treat as root
                }
            } else {
                roots.push(node)
            }
        })

        return roots
    }

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedNodes)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedNodes(newExpanded)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payload = {
                code: formData.code,
                name: formData.name,
                type: formData.type,
                parent_id: formData.parent_id || null,
                description: formData.description
            }

            if (editingAccount) {
                const { error } = await supabase
                    .from('accounting_accounts')
                    .update(payload)
                    .eq('id', editingAccount.id)
                if (error) throw error
                toast.success('Hesap güncellendi')
            } else {
                const { error } = await supabase
                    .from('accounting_accounts')
                    .insert(payload)
                if (error) throw error
                toast.success('Hesap oluşturuldu')
            }

            setShowForm(false)
            setEditingAccount(null)
            setFormData({ code: '', name: '', type: 'ASSET', parent_id: '', description: '' })
            loadAccounts()
        } catch (error: any) {
            console.error('Kaydetme hatası:', error)
            toast.error(error.message || 'İşlem başarısız')
        }
    }

    const handleEdit = (account: Account) => {
        setEditingAccount(account)
        setFormData({
            code: account.code,
            name: account.name,
            type: account.type,
            parent_id: account.parent_id || '',
            description: account.description || ''
        })
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu hesabı silmek istediğinize emin misiniz? Alt hesaplar da etkilenebilir.')) return

        try {
            const { error } = await supabase
                .from('accounting_accounts')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Hesap silindi')
            loadAccounts()
        } catch (error) {
            console.error('Silme hatası:', error)
            toast.error('Silinemedi (Alt hesapları veya işlem kayıtları olabilir)')
        }
    }

    // Flatten list for parent selection dropdown
    const getAllAccounts = (nodes: Account[]): Account[] => {
        let list: Account[] = []
        nodes.forEach(node => {
            list.push(node)
            if (node.children) {
                list = list.concat(getAllAccounts(node.children))
            }
        })
        return list.sort((a, b) => a.code.localeCompare(b.code))
    }

    const renderTree = (nodes: Account[], level = 0) => {
        return nodes.map(node => (
            <div key={node.id} className="relative">
                <div
                    className={`
                        flex items-center justify-between p-3 border-b hover:bg-gray-50 transition-colors
                        ${level === 0 ? 'bg-gray-50 font-semibold' : ''}
                    `}
                    style={{ paddingLeft: `${level * 24 + 12}px` }}
                >
                    <div className="flex items-center gap-3">
                        {node.children && node.children.length > 0 ? (
                            <button onClick={() => toggleExpand(node.id)} className="text-gray-500 hover:text-gray-700">
                                {expandedNodes.has(node.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                        ) : (
                            <span className="w-4" />
                        )}

                        <div className="flex items-center gap-2">
                            {node.children && node.children.length > 0 ? (
                                <Folder className="w-4 h-4 text-yellow-500" />
                            ) : (
                                <FileText className="w-4 h-4 text-blue-500" />
                            )}
                            <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                {node.code}
                            </span>
                            <span className="text-gray-900">{node.name}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(node.type)}`}>
                            {getTypeLabel(node.type)}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleEdit(node)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(node.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {expandedNodes.has(node.id) && node.children && (
                    <div className="ml-0 border-l border-gray-100">
                        {renderTree(node.children, level + 1)}
                    </div>
                )}
            </div>
        ))
    }

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'ASSET': 'Varlık (Aktif)',
            'LIABILITY': 'Yükümlülük (Pasif)',
            'EQUITY': 'Özkaynak',
            'INCOME': 'Gelir',
            'EXPENSE': 'Gider'
        }
        return labels[type] || type
    }

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'ASSET': 'bg-green-100 text-green-700',
            'LIABILITY': 'bg-red-100 text-red-700',
            'EQUITY': 'bg-purple-100 text-purple-700',
            'INCOME': 'bg-blue-100 text-blue-700',
            'EXPENSE': 'bg-orange-100 text-orange-700'
        }
        return colors[type] || 'bg-gray-100 text-gray-700'
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Hesap Planı</h1>
                    <p className="text-gray-500">Muhasebe hesaplarını yönetin</p>
                </div>
                <button
                    onClick={() => {
                        setEditingAccount(null)
                        setFormData({ code: '', name: '', type: 'ASSET', parent_id: '', description: '' })
                        setShowForm(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Hesap
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                ) : (
                    <div className="min-w-full">
                        {renderTree(accounts)}
                        {accounts.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                Henüz hesap tanımlanmamış
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hesap Kodu</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Örn: 100"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                        disabled={!!editingAccount} // Prevent changing code on edit to avoid breaking hierarchy logic easily
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hesap Tipi</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        disabled={!!editingAccount} // Type change might break ledger integrity
                                    >
                                        <option value="ASSET">Varlık (Aktif)</option>
                                        <option value="LIABILITY">Yükümlülük (Pasif)</option>
                                        <option value="EQUITY">Özkaynak</option>
                                        <option value="INCOME">Gelir</option>
                                        <option value="EXPENSE">Gider</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hesap Adı</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Örn: Merkez Kasa"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Üst Hesap</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.parent_id}
                                    onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                >
                                    <option value="">(Ana Hesap)</option>
                                    {getAllAccounts(accounts)
                                        .filter(a => a.id !== editingAccount?.id) // Prevent self-parenting
                                        .map(acc => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.code} - {acc.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                <textarea
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
