'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Plus, Check, X, FileText, Clock, AlertCircle, ChevronLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

interface ExpenseRequest {
    id: string
    amount: number
    description: string
    currency: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED'
    created_at: string
    requester?: { full_name: string }
    category?: { name: string; code: string }
    cost_center?: { name: string }
    rejection_reason?: string
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

export default function ExpensesPage() {
    const [requests, setRequests] = useState<ExpenseRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [accounts, setAccounts] = useState<Account[]>([])
    const [costCenters, setCostCenters] = useState<CostCenter[]>([])

    const [formData, setFormData] = useState({
        amount: '',
        currency: 'TRY',
        description: '',
        category_id: '',
        cost_center_id: ''
    })

    useEffect(() => {
        loadData()
        loadReferenceData()
    }, [])

    const loadData = async () => {
        try {
            const { data, error } = await supabase
                .from('payment_requests')
                .select(`
                    *,
                    requester:admin_users!requester_id(full_name),
                    category:accounting_accounts(name, code),
                    cost_center:cost_centers(name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setRequests(data || [])
        } catch (error) {
            console.error('Talepler yüklenirken hata:', error)
            toast.error('Talepler yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const loadReferenceData = async () => {
        // Load Expense Accounts (Class 7 or just type EXPENSE)
        const { data: accData } = await supabase
            .from('accounting_accounts')
            .select('id, code, name')
            .eq('type', 'EXPENSE')
            .order('code')
        if (accData) setAccounts(accData)

        // Load Cost Centers
        const { data: ccData } = await supabase
            .from('cost_centers')
            .select('id, name')
        if (ccData) setCostCenters(ccData)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('payment_requests')
                .insert({
                    requester_id: user?.id,
                    amount: parseFloat(formData.amount),
                    currency: formData.currency,
                    description: formData.description,
                    category_id: formData.category_id,
                    cost_center_id: formData.cost_center_id || null
                })

            if (error) throw error
            toast.success('Talep oluşturuldu')
            setShowForm(false)
            setFormData({ amount: '', currency: 'TRY', description: '', category_id: '', cost_center_id: '' })
            loadData()
        } catch (error: any) {
            console.error('Kaydetme hatası:', error)
            toast.error(error.message || 'İşlem başarısız')
        }
    }

    const handleStatusUpdate = async (id: string, newStatus: string, reason?: string) => {
        try {
            // Get current user for approver
            const { data: { user } } = await supabase.auth.getUser()

            const updateData: any = {
                status: newStatus,
                updated_at: new Date().toISOString()
            }

            if (newStatus === 'APPROVED' || newStatus === 'REJECTED') {
                updateData.approved_by = user?.id
            }

            if (reason) {
                updateData.rejection_reason = reason
            }

            const { error } = await supabase
                .from('payment_requests')
                .update(updateData)
                .eq('id', id)

            if (error) throw error
            toast.success(`Talep ${newStatus === 'APPROVED' ? 'onaylandı' : 'güncellendi'}`)
            loadData()
        } catch (error) {
            console.error('Güncelleme hatası:', error)
            toast.error('Durum güncellenemedi')
        }
    }

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'PENDING': 'bg-yellow-100 text-yellow-800',
            'APPROVED': 'bg-green-100 text-green-800',
            'REJECTED': 'bg-red-100 text-red-800',
            'PAID': 'bg-blue-100 text-blue-800',
            'CANCELLED': 'bg-gray-100 text-gray-800'
        }
        const labels: Record<string, string> = {
            'PENDING': 'Onay Bekliyor',
            'APPROVED': 'Onaylandı',
            'REJECTED': 'Reddedildi',
            'PAID': 'Ödendi',
            'CANCELLED': 'İptal'
        }
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles['CANCELLED']}`}>
                {labels[status] || status}
            </span>
        )
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/finance"
                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Geri
                    </Link>
                    <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gider Talepleri</h1>
                    <p className="text-gray-500">Satınalma, avans ve masraf taleplerini yönetin</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" />
                    Yeni Talep
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talep Eden</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tutar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {format(new Date(req.created_at), 'dd MMM yyyy', { locale: tr })}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {req.requester?.full_name || 'Bilinmiyor'}
                                    <div className="text-xs text-gray-500 font-normal mt-0.5">
                                        {req.cost_center?.name}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="font-medium text-gray-900">{req.category?.name}</div>
                                    {req.description}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: req.currency }).format(req.amount)}
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(req.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {req.status === 'PENDING' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                                className="p-1 px-2 text-green-700 bg-green-50 hover:bg-green-100 rounded text-xs font-medium flex items-center gap-1"
                                                title="Onayla"
                                            >
                                                <Check className="w-3 h-3" /> Onayla
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const reason = prompt('Red sebebini giriniz:')
                                                    if (reason) handleStatusUpdate(req.id, 'REJECTED', reason)
                                                }}
                                                className="p-1 px-2 text-red-700 bg-red-50 hover:bg-red-100 rounded text-xs font-medium flex items-center gap-1"
                                                title="Reddet"
                                            >
                                                <X className="w-3 h-3" /> Reddet
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Henüz talep yok
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Yeni Gider Talebi</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                    <select
                                        className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    >
                                        <option value="TRY">TRY</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gider Kategorisi</label>
                                <select
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.category_id}
                                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                >
                                    <option value="">Seçiniz...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.code} - {acc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Masraf Merkezi (Şube/Proje)</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.cost_center_id}
                                    onChange={e => setFormData({ ...formData, cost_center_id: e.target.value })}
                                >
                                    <option value="">Genel (Seçilmedi)</option>
                                    {costCenters.map(cc => (
                                        <option key={cc.id} value={cc.id}>
                                            {cc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Harcanan miktar ve gerekçe..."
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
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Talep Oluştur
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
