'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Save, Filter, PieChart, TrendingUp, AlertTriangle, ChevronLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface BudgetRow {
    account_id: string
    code: string
    name: string
    type: string
    budget_amount: number
    actual_amount: number
    budget_id?: string // If exists
}

interface CostCenter {
    id: string
    name: string
}

export default function BudgetPage() {
    const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([])
    const [loading, setLoading] = useState(true)
    const [costCenters, setCostCenters] = useState<CostCenter[]>([])

    // Filters
    const [year, setYear] = useState(new Date().getFullYear())
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [year, selectedCostCenter])

    const loadData = async () => {
        setLoading(true)
        try {
            // 1. Load Accounts (Income/Expense only usually)
            const { data: accounts, error: accError } = await supabase
                .from('accounting_accounts')
                .select('id, code, name, type')
                .in('type', ['INCOME', 'EXPENSE'])
                .order('code')

            if (accError) throw accError

            // 2. Load Existing Budgets
            let budgetQuery = supabase
                .from('budgets')
                .select('id, account_id, amount')
                .eq('year', year)

            if (selectedCostCenter) {
                budgetQuery = budgetQuery.eq('cost_center_id', selectedCostCenter)
            } else {
                budgetQuery = budgetQuery.is('cost_center_id', null) // HQ/General budget
            }

            const { data: budgets, error: budgetError } = await budgetQuery
            if (budgetError) throw budgetError

            // 3. Load Actuals (Ledger)
            // This is complex on client side for large data. Ideally use an RPC or View.
            // For now, doing a simplified aggregation via query if valid.
            // Or fetch all ledger entries for the year? That's too heavy.
            // Let's assume we fetch a "monthly_balances" view or similar.
            // Creating a dynamic aggregate on client for prototype:

            // Fetch ledger sums grouped by account_id
            // WORKAROUND: Client-side aggregation of all ledger entries for the year (Risky for scale, but OK for MVP)
            const startDate = `${year}-01-01`
            const endDate = `${year}-12-31`

            let ledgerQuery = supabase
                .from('financial_ledger')
                .select('account_id, debit, credit, transaction_id, cost_center_id')
                // We need transaction details to filter by date!
                // Supabase doesn't support deep filtring easily on joins for agg.
                // We'll filter via transaction relation
                .not('transaction_id', 'is', null)

            // Filtering by date requires join logic or 2-step.
            // Step 3a: Get Transaction IDs for the year
            const { data: txIds } = await supabase
                .from('financial_transactions')
                .select('id')
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate)

            const validTxIds = txIds?.map(t => t.id) || []

            let actualsMap = new Map<string, number>()

            if (validTxIds.length > 0) {
                let lQuery = supabase
                    .from('financial_ledger')
                    .select('account_id, debit, credit, cost_center_id')
                    .in('transaction_id', validTxIds)

                if (selectedCostCenter) {
                    lQuery = lQuery.eq('cost_center_id', selectedCostCenter)
                }

                const { data: ledgerData } = await lQuery

                ledgerData?.forEach(entry => {
                    const net = (entry.credit || 0) - (entry.debit || 0) // Income is Credit normal, Expense is Debit normal.
                    // Let's absolute value it based on account type later.
                    const current = actualsMap.get(entry.account_id) || 0
                    actualsMap.set(entry.account_id, current + net)
                })
            }

            // 4. Load Cost Centers (for filter dropdown)
            const { data: ccData } = await supabase.from('cost_centers').select('id, name')
            setCostCenters(ccData || [])


            // Merge Data
            const rows: BudgetRow[] = accounts.map(acc => {
                const budget = budgets?.find(b => b.account_id === acc.id)
                let actual = actualsMap.get(acc.id) || 0

                // Adjustment: expenses are typically debit, so net is negative if credit-debit. Flip sign for display.
                if (acc.type === 'EXPENSE') actual = -actual // Logic: Expense 100 debit -> (0 - 100) = -100. Display as 100.

                return {
                    account_id: acc.id,
                    code: acc.code,
                    name: acc.name,
                    type: acc.type,
                    budget_amount: budget?.amount || 0,
                    actual_amount: actual,
                    budget_id: budget?.id
                }
            })

            setBudgetRows(rows)

        } catch (error) {
            console.error('Veriler yüklenirken hata:', error)
            toast.error('Bütçe verileri yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const handleBudgetChange = (accountId: string, value: number) => {
        setBudgetRows(prev => prev.map(row =>
            row.account_id === accountId ? { ...row, budget_amount: value } : row
        ))
    }

    const saveBudgets = async () => {
        setSaving(true)
        try {
            // Split records into updates (existing IDs) and inserts (new items)
            const updates = budgetRows
                .filter(row => row.budget_id)
                .map(row => ({
                    id: row.budget_id,
                    year,
                    account_id: row.account_id,
                    cost_center_id: selectedCostCenter || null,
                    amount: row.budget_amount,
                    updated_at: new Date().toISOString()
                }))

            const inserts = budgetRows
                .filter(row => !row.budget_id && row.budget_amount !== 0) // Only insert new if amount is set (optional optimization, but good practice. Or insert 0 is fine too?)
                // Let's match user intent: if they see 0, they might want to save 0. But usually 0 means "no budget".
                // However, previous logic was saving everything. Let's stick to saving everything or at least modified ones.
                // To be safe and simple: save everything that doesn't have an ID.
                // Wait, if I reload, I want to see 0s if I didn't set them? No, 0 is default.
                .filter(row => !row.budget_id)
                .map(row => ({
                    year,
                    account_id: row.account_id,
                    cost_center_id: selectedCostCenter || null,
                    amount: row.budget_amount,
                    updated_at: new Date().toISOString()
                }))

            const promises = []

            if (updates.length > 0) {
                promises.push(
                    supabase.from('budgets').upsert(updates)
                )
            }

            if (inserts.length > 0) {
                promises.push(
                    supabase.from('budgets').insert(inserts)
                )
            }

            if (promises.length > 0) {
                const results = await Promise.all(promises)
                for (const res of results) {
                    if (res.error) throw res.error
                }
                toast.success('Bütçe başarıyla kaydedildi')
                loadData() // Refresh to get new IDs
            } else {
                toast('Değişiklik yok', { icon: 'ℹ️' })
            }

        } catch (error: any) {
            console.error('Kaydetme hatası:', error)
            toast.error('Kaydedilemedi: ' + (error.message || 'Bilinmeyen hata'))
        } finally {
            setSaving(false)
        }
    }

    const calculateVariance = (budget: number, actual: number, type: string) => {
        const diff = budget - actual
        const percent = budget !== 0 ? (Math.abs(diff) / budget) * 100 : actual !== 0 ? 100 : 0
        return { diff, percent }
    }

    // Totals
    const totalBudget = budgetRows.reduce((sum, row) => sum + row.budget_amount, 0)
    const totalActual = budgetRows.reduce((sum, row) => sum + row.actual_amount, 0)

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
                    <h1 className="text-2xl font-bold text-gray-900">Bütçe Planlama</h1>
                    <p className="text-gray-500">Yıllık bütçe hedefleri ve gerçekleşen analizleri</p>
                    </div>
                </div>
                <button
                    onClick={saveBudgets}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Filtrele:</span>
                </div>
                <div>
                    <select
                        className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y} Yılı</option>
                        ))}
                    </select>
                </div>
                <div>
                    <select
                        className="px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedCostCenter}
                        onChange={e => setSelectedCostCenter(e.target.value)}
                    >
                        <option value="">Genel Merkez (Tümü)</option>
                        {costCenters.map(cc => (
                            <option key={cc.id} value={cc.id}>{cc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-600 font-medium">Toplam Bütçelenen</p>
                    <h3 className="text-2xl font-bold text-blue-900 mt-1">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalBudget)}
                    </h3>
                </div>
                <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                    <p className="text-sm text-purple-600 font-medium">Toplam Gerçekleşen</p>
                    <h3 className="text-2xl font-bold text-purple-900 mt-1">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalActual)}
                    </h3>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-600 font-medium">Kalan Bütçe</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalBudget - totalActual)}
                    </h3>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hesap Kodu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hesap Adı</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase w-48">Hedef Bütçe</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gerçekleşen</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fark</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Durum</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {budgetRows.map((row) => {
                            const { diff, percent } = calculateVariance(row.budget_amount, row.actual_amount, row.type)
                            const isOverBudget = row.type === 'EXPENSE' && row.actual_amount > row.budget_amount

                            return (
                                <tr key={row.account_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{row.code}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 font-medium tracking-wide">
                                        {row.name}
                                        <span className="ml-2 text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                            {row.type === 'INCOME' ? 'GELİR' : 'GİDER'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <input
                                            type="number"
                                            min="0"
                                            onKeyDown={(e) => ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault()}
                                            className="w-full text-right px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none hover:border-blue-300 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={row.budget_amount}
                                            onChange={(e) => handleBudgetChange(row.account_id, Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                                        {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(row.actual_amount)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-mono text-gray-500">
                                        {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(diff)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {isOverBudget ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                <TrendingUp className="w-3 h-3 mr-1" /> %{percent.toFixed(1)} Aştı
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                %{row.budget_amount > 0 ? ((row.actual_amount / row.budget_amount) * 100).toFixed(1) : 0} Gerçekleşme
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {budgetRows.length === 0 && !loading && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Veri bulunamadı</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
