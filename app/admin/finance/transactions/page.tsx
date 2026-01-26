'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Edit, Trash2, FileText, Check, X, Eye, Filter, Download, Save } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface Transaction {
    id: string
    transaction_date: string
    description: string
    document_no: string
    document_type: string
    status: string
    total_amount: number
    created_at: string
    ledger_entries?: LedgerEntry[]
}

interface LedgerEntry {
    id?: string
    account_id: string
    description: string
    debit: number
    credit: number
    cost_center_id?: string | null
    account?: { code: string; name: string }
}

interface Account {
    id: string
    code: string
    name: string
}

interface CostCenter {
    id: string
    name: string
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [costCenters, setCostCenters] = useState<CostCenter[]>([])

    // View/Edit state
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
    const [showDetail, setShowDetail] = useState(false)

    // Form state defaults
    const defaultEntry: LedgerEntry = {
        account_id: '',
        description: '',
        debit: 0,
        credit: 0,
        cost_center_id: ''
    }

    const [formData, setFormData] = useState<{
        date: string
        description: string
        document_no: string
        document_type: string
        entries: LedgerEntry[]
    }>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        document_no: '',
        document_type: 'PAYMENT',
        entries: [{ ...defaultEntry }, { ...defaultEntry }] // Start with 2 lines for debit/credit
    })

    useEffect(() => {
        loadData()
        loadReferenceData()
    }, [])

    const loadData = async () => {
        try {
            const { data, error } = await supabase
                .from('financial_transactions')
                .select('*')
                .order('transaction_date', { ascending: false })
                .limit(50) // Pagination later

            if (error) throw error
            setTransactions(data || [])
        } catch (error) {
            console.error('İşlemler yüklenirken hata:', error)
            toast.error('İşlemler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const loadReferenceData = async () => {
        // Load Accounts
        const { data: accData } = await supabase
            .from('accounting_accounts')
            .select('id, code, name')
            .order('code')
        if (accData) setAccounts(accData)

        // Load Cost Centers
        const { data: ccData } = await supabase
            .from('cost_centers')
            .select('id, name')
        if (ccData) setCostCenters(ccData)
    }

    const handleEntryChange = (index: number, field: keyof LedgerEntry, value: any) => {
        const newEntries = [...formData.entries]
        newEntries[index] = { ...newEntries[index], [field]: value }
        setFormData({ ...formData, entries: newEntries })
    }

    const addEntryLine = () => {
        setFormData({
            ...formData,
            entries: [...formData.entries, { ...defaultEntry }]
        })
    }

    const removeEntryLine = (index: number) => {
        if (formData.entries.length <= 2) {
            toast.error('En az 2 satır olmalıdır')
            return
        }
        const newEntries = formData.entries.filter((_, i) => i !== index)
        setFormData({ ...formData, entries: newEntries })
    }

    const calculateTotals = () => {
        return formData.entries.reduce(
            (acc, curr) => ({
                debit: acc.debit + (Number(curr.debit) || 0),
                credit: acc.credit + (Number(curr.credit) || 0)
            }),
            { debit: 0, credit: 0 }
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const totals = calculateTotals()
        if (Math.abs(totals.debit - totals.credit) > 0.01) {
            toast.error(`Borç ve Alacak eşit olmalıdır. Fark: ${Math.abs(totals.debit - totals.credit).toFixed(2)}`)
            return
        }

        if (totals.debit === 0) {
            toast.error('Tutar girmelisiniz')
            return
        }

        try {
            // 1. Create Transaction Header
            const { data: txData, error: txError } = await supabase
                .from('financial_transactions')
                .insert({
                    transaction_date: formData.date,
                    description: formData.description,
                    document_no: formData.document_no,
                    document_type: formData.document_type,
                    status: 'APPROVED', // Direct approval for manual entry for now
                    total_amount: totals.debit
                })
                .select()
                .single()

            if (txError) throw txError

            // 2. Create Ledger Entries
            const ledgerEntries = formData.entries.map(entry => ({
                transaction_id: txData.id,
                account_id: entry.account_id,
                description: entry.description || formData.description,
                debit: entry.debit || 0,
                credit: entry.credit || 0,
                cost_center_id: entry.cost_center_id || null
            }))

            const { error: ledgerError } = await supabase
                .from('financial_ledger')
                .insert(ledgerEntries)

            if (ledgerError) throw ledgerError

            toast.success('Fiş kaydedildi')
            setShowForm(false)
            resetForm()
            loadData()

        } catch (error: any) {
            console.error('Kaydetme hatası:', error)
            toast.error(error.message || 'İşlem başarısız')
        }
    }

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            description: '',
            document_no: '',
            document_type: 'PAYMENT',
            entries: [{ ...defaultEntry }, { ...defaultEntry }]
        })
    }

    const handleViewDetail = async (tx: Transaction) => {
        // Load ledger entries for this tx
        const { data, error } = await supabase
            .from('financial_ledger')
            .select('*, account:accounting_accounts(code, name)')
            .eq('transaction_id', tx.id)

        if (data) {
            setSelectedTx({ ...tx, ledger_entries: data })
            setShowDetail(true)
        }
    }

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            'PAYMENT': 'bg-red-100 text-red-800',
            'RECEIPT': 'bg-green-100 text-green-800',
            'INVOICE': 'bg-blue-100 text-blue-800',
            'SALARY': 'bg-purple-100 text-purple-800',
            'TRANSFER': 'bg-gray-100 text-gray-800'
        }
        return colors[type] || 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Muhasebe Fişleri</h1>
                    <p className="text-gray-500">Yevmiye fişleri ve finansal işlemler</p>
                </div>
                <button
                    onClick={() => {
                        resetForm()
                        setShowForm(true)
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Fiş Ekle
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Belge No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutar</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetail(tx)}>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {format(new Date(tx.transaction_date), 'dd MMM yyyy', { locale: tr })}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(tx.document_type)}`}>
                                        {tx.document_type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-gray-600">{tx.document_no || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-900">{tx.description}</td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(tx.total_amount)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-blue-600 hover:text-blue-800">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Henüz işlem kaydı yok
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Transaction Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
                            <h3 className="text-lg font-semibold text-gray-900">Yeni Muhasebe Fişi</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Header Fields */}
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fiş Tipi</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.document_type}
                                        onChange={e => setFormData({ ...formData, document_type: e.target.value })}
                                    >
                                        <option value="PAYMENT">Ödeme (Tediye)</option>
                                        <option value="RECEIPT">Tahsilat (Mahsup)</option>
                                        <option value="INVOICE">Fatura</option>
                                        <option value="SALARY">Maaş/Bordro</option>
                                        <option value="TRANSFER">Virman</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Belge No</label>
                                    <input
                                        type="text"
                                        placeholder="Fatura No / Makbuz No"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.document_no}
                                        onChange={e => setFormData({ ...formData, document_no: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Genel Açıklama</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Fiş genel açıklaması..."
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Ledger Lines */}
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2 text-left w-1/3">Hesap Kodu / Adı</th>
                                            <th className="px-4 py-2 text-left">Açıklama</th>
                                            <th className="px-4 py-2 text-right w-32">Borç</th>
                                            <th className="px-4 py-2 text-right w-32">Alacak</th>
                                            <th className="px-4 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {formData.entries.map((entry, index) => (
                                            <tr key={index}>
                                                <td className="p-2">
                                                    <select
                                                        required
                                                        className="w-full px-2 py-1 border rounded outline-none"
                                                        value={entry.account_id}
                                                        onChange={e => handleEntryChange(index, 'account_id', e.target.value)}
                                                    >
                                                        <option value="">Seçiniz...</option>
                                                        {accounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>
                                                                {acc.code} - {acc.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 border rounded outline-none"
                                                        value={entry.description}
                                                        onChange={e => handleEntryChange(index, 'description', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                                        className="w-full px-2 py-1 border rounded outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        value={entry.debit}
                                                        onChange={e => handleEntryChange(index, 'debit', parseFloat(e.target.value) || 0)}
                                                        disabled={entry.credit > 0}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                                        className="w-full px-2 py-1 border rounded outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        value={entry.credit}
                                                        onChange={e => handleEntryChange(index, 'credit', parseFloat(e.target.value) || 0)}
                                                        disabled={entry.debit > 0}
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEntryLine(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t font-medium">
                                        <tr>
                                            <td colSpan={2} className="px-4 py-2">
                                                <button
                                                    type="button"
                                                    onClick={addEntryLine}
                                                    className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                                >
                                                    <Plus className="w-4 h-4" /> Satır Ekle
                                                </button>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(calculateTotals().debit)}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(calculateTotals().credit)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
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

            {/* View Detail Modal */}
            {showDetail && selectedTx && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl">
                        <div className="flex justify-between items-center p-6 border-b">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Fiş Detayı</h3>
                                <p className="text-sm text-gray-500">#{selectedTx.document_no} - {format(new Date(selectedTx.transaction_date), 'dd MMM yyyy', { locale: tr })}</p>
                            </div>
                            <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 block">Açıklama</span>
                                    <span className="font-medium">{selectedTx.description}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block">Fiş Tipi</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedTx.document_type)}`}>
                                        {selectedTx.document_type}
                                    </span>
                                </div>
                            </div>

                            <table className="w-full text-sm border-t">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Hesap</th>
                                        <th className="px-4 py-2 text-left">Açıklama</th>
                                        <th className="px-4 py-2 text-right">Borç</th>
                                        <th className="px-4 py-2 text-right">Alacak</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedTx.ledger_entries?.map((entry) => (
                                        <tr key={entry.id}>
                                            <td className="px-4 py-2">
                                                <span className="font-mono text-gray-600 mr-2">{entry.account?.code}</span>
                                                {entry.account?.name}
                                            </td>
                                            <td className="px-4 py-2 text-gray-600">{entry.description}</td>
                                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                {entry.debit > 0 ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(entry.debit) : '-'}
                                            </td>
                                            <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                {entry.credit > 0 ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(entry.credit) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-semibold border-t">
                                    <tr>
                                        <td colSpan={2} className="px-4 py-2 text-right">Toplam</td>
                                        <td className="px-4 py-2 text-right">
                                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(selectedTx.total_amount)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(selectedTx.total_amount)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
