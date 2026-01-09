'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, Building2, Wallet, CreditCard, Save, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface BankAccount {
    id: string
    name: string
    type: 'BANK' | 'CASH' | 'POS'
    iban?: string
    currency: string
    account_id: string
    min_balance_limit: number
    is_active: boolean
    account?: {
        code: string
        name: string
    }
}

interface GLAccount {
    id: string
    code: string
    name: string
}

export default function BankAccountsPage() {
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [glAccounts, setGlAccounts] = useState<GLAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        type: 'BANK' as BankAccount['type'],
        iban: '',
        currency: 'TRY',
        account_id: '',
        min_balance_limit: 0
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            // Load Bank Accounts
            const { data: bankData, error: bankError } = await supabase
                .from('bank_accounts')
                .select('*, account:accounting_accounts(code, name)')
                .order('created_at', { ascending: false })

            if (bankError) throw bankError
            setAccounts(bankData || [])

            // Load relevant GL Accounts (Assets likely 100, 102 etc.)
            const { data: glData, error: glError } = await supabase
                .from('accounting_accounts')
                .select('id, code, name')
                .eq('type', 'ASSET') // Only assets make sense for linking
                .order('code')

            if (glError) throw glError
            setGlAccounts(glData || [])

        } catch (error) {
            console.error('Veriler yüklenirken hata:', error)
            toast.error('Veriler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payload = {
                name: formData.name,
                type: formData.type,
                iban: formData.iban || null,
                currency: formData.currency,
                account_id: formData.account_id || null,
                min_balance_limit: formData.min_balance_limit
            }

            if (editingId) {
                const { error } = await supabase
                    .from('bank_accounts')
                    .update(payload)
                    .eq('id', editingId)
                if (error) throw error
                toast.success('Hesap güncellendi')
            } else {
                const { error } = await supabase
                    .from('bank_accounts')
                    .insert(payload)
                if (error) throw error
                toast.success('Hesap oluşturuldu')
            }

            setShowForm(false)
            setEditingId(null)
            resetForm()
            loadData()
        } catch (error: any) {
            console.error('Kaydetme hatası:', error)
            toast.error(error.message || 'İşlem başarısız')
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            type: 'BANK',
            iban: '',
            currency: 'TRY',
            account_id: '',
            min_balance_limit: 0
        })
    }

    const handleEdit = (account: BankAccount) => {
        setEditingId(account.id)
        setFormData({
            name: account.name,
            type: account.type,
            iban: account.iban || '',
            currency: account.currency,
            account_id: account.account_id,
            min_balance_limit: account.min_balance_limit
        })
        setShowForm(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return

        try {
            const { error } = await supabase
                .from('bank_accounts')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Hesap silindi')
            loadData()
        } catch (error) {
            console.error('Silme hatası:', error)
            toast.error('Silinemedi')
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'BANK': return <Building2 className="w-5 h-5 text-blue-600" />
            case 'CASH': return <Wallet className="w-5 h-5 text-green-600" />
            case 'POS': return <CreditCard className="w-5 h-5 text-purple-600" />
            default: return <Building2 className="w-5 h-5 text-gray-600" />
        }
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kasa & Banka Tanımları</h1>
                    <p className="text-gray-500">Nakit ve banka hesaplarını yönetin</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null)
                        resetForm()
                        setShowForm(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Hesap Tanımla
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hesap Adı</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detaylar (IBAN)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Muhasebe Kodu</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Döviz</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {accounts.map((acc) => (
                                <tr key={acc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-gray-100 rounded-lg">
                                                {getIcon(acc.type)}
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                {acc.type === 'BANK' ? 'Banka' : acc.type === 'CASH' ? 'Kasa' : 'POS'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{acc.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                        {acc.iban || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {acc.account ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {acc.account.code} - {acc.account.name}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-red-500">Bağlanmamış</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{acc.currency}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(acc)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(acc.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {accounts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Henüz tanımlı hesap yok
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingId ? 'Hesabı Düzenle' : 'Yeni Tanım Ekle'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hesap Tipi</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="BANK">Banka Hesabı</option>
                                        <option value="CASH">Nakit Kasa</option>
                                        <option value="POS">POS / Sanal POS</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    >
                                        <option value="TRY">Türk Lirası (TRY)</option>
                                        <option value="USD">Amerikan Doları (USD)</option>
                                        <option value="EUR">Euro (EUR)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanım Adı</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Örn: Ziraat Bankası Ana Hesap"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {formData.type === 'BANK' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                                    <input
                                        type="text"
                                        placeholder="TR..."
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                                        value={formData.iban}
                                        onChange={e => setFormData({ ...formData, iban: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Muhasebe Hesabı Bağlantısı</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.account_id}
                                    onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                                >
                                    <option value="">Seçiniz...</option>
                                    {glAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.code} - {acc.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    İşlemlerin otomatik muhasebeleşmesi için hesap planından ilgili hesabı seçin (Örn: 100 Kasa, 102 Bankalar).
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min. Bakiye Limiti (Uyarı İçin)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.min_balance_limit}
                                    onChange={e => setFormData({ ...formData, min_balance_limit: Number(e.target.value) })}
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
