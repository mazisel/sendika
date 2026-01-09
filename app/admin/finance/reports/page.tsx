'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Filter, Download, PieChart, BarChart3, List } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AccountBalance {
    id: string
    code: string
    name: string
    type: string
    debit: number
    credit: number
    balance: number
}

export default function ReportsPage() {
    const [reportType, setReportType] = useState<'TRIAL_BALANCE' | 'INCOME_STATEMENT'>('INCOME_STATEMENT')
    const [balances, setBalances] = useState<AccountBalance[]>([])
    const [loading, setLoading] = useState(true)
    const [year, setYear] = useState(new Date().getFullYear())

    useEffect(() => {
        loadData()
    }, [year, reportType])

    const loadData = async () => {
        setLoading(true)
        try {
            // 1. Get Accounts
            const { data: accounts, error: accError } = await supabase
                .from('accounting_accounts')
                .select('id, code, name, type')
                .order('code')

            if (accError) throw accError

            // Filter accounts based on report type
            const filteredAccounts = reportType === 'INCOME_STATEMENT'
                ? accounts.filter(a => ['INCOME', 'EXPENSE'].includes(a.type))
                : accounts

            // 2. Get Ledger Data (Aggregated Client Side for MVP)
            const startDate = `${year}-01-01`
            const endDate = `${year}-12-31`

            // Get valid transactions for year
            const { data: txs } = await supabase
                .from('financial_transactions')
                .select('id')
                .gte('transaction_date', startDate)
                .lte('transaction_date', endDate)

            const txIds = txs?.map(t => t.id) || []

            let ledgerData: any[] = []
            if (txIds.length > 0) {
                const { data } = await supabase
                    .from('financial_ledger')
                    .select('account_id, debit, credit')
                    .in('transaction_id', txIds)
                ledgerData = data || []
            }

            // Aggregate
            const balanceMap = new Map<string, { debit: number, credit: number }>()
            ledgerData.forEach(entry => {
                const current = balanceMap.get(entry.account_id) || { debit: 0, credit: 0 }
                balanceMap.set(entry.account_id, {
                    debit: current.debit + (entry.debit || 0),
                    credit: current.credit + (entry.credit || 0)
                })
            })

            // Map back to accounts
            const result: AccountBalance[] = filteredAccounts.map(acc => {
                const totals = balanceMap.get(acc.id) || { debit: 0, credit: 0 }
                let balance = 0

                if (['ASSET', 'EXPENSE'].includes(acc.type)) {
                    balance = totals.debit - totals.credit
                } else {
                    balance = totals.credit - totals.debit
                }

                return {
                    id: acc.id,
                    code: acc.code,
                    name: acc.name,
                    type: acc.type,
                    debit: totals.debit,
                    credit: totals.credit,
                    balance
                }
            })

            setBalances(result)

        } catch (error) {
            console.error('Rapor yüklenirken hata:', error)
            toast.error('Rapor verisi alınamadı')
        } finally {
            setLoading(false)
        }
    }

    const getTotal = (field: 'debit' | 'credit' | 'balance') => {
        return balances.reduce((sum, item) => sum + item[field], 0)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amount)
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Finansal Raporlar</h1>
                    <p className="text-gray-500">Mizan ve Gelir Tablosu analizleri</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                        <Download className="w-4 h-4" /> Excel İndir
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Rapor Tipi:</span>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setReportType('INCOME_STATEMENT')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${reportType === 'INCOME_STATEMENT' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Gelir Tablosu
                    </button>
                    <button
                        onClick={() => setReportType('TRIAL_BALANCE')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${reportType === 'TRIAL_BALANCE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Mizan
                    </button>
                </div>
                <div className="ml-auto">
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
            </div>

            {/* Stats Summary for Income Statement */}
            {reportType === 'INCOME_STATEMENT' && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                        <p className="text-sm text-green-600 font-medium">Toplam Gelir</p>
                        <h3 className="text-2xl font-bold text-green-900 mt-1">
                            ₺{formatCurrency(balances.filter(b => b.type === 'INCOME').reduce((s, i) => s + i.balance, 0))}
                        </h3>
                    </div>
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                        <p className="text-sm text-red-600 font-medium">Toplam Gider</p>
                        <h3 className="text-2xl font-bold text-red-900 mt-1">
                            ₺{formatCurrency(balances.filter(b => b.type === 'EXPENSE').reduce((s, i) => s + i.balance, 0))}
                        </h3>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <p className="text-sm text-blue-600 font-medium">Net Kar/Zarar</p>
                        <h3 className="text-2xl font-bold text-blue-900 mt-1">
                            ₺{formatCurrency(
                                balances.filter(b => b.type === 'INCOME').reduce((s, i) => s + i.balance, 0) -
                                balances.filter(b => b.type === 'EXPENSE').reduce((s, i) => s + i.balance, 0)
                            )}
                        </h3>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hesap Kodu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hesap Adı</th>
                            {reportType === 'TRIAL_BALANCE' && (
                                <>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Borç Toplam</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Alacak Toplam</th>
                                </>
                            )}
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bakiye</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {balances.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-mono text-gray-600 w-32">{row.code}</td>
                                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                    {row.name}
                                </td>
                                {reportType === 'TRIAL_BALANCE' && (
                                    <>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono">
                                            {formatCurrency(row.debit)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono">
                                            {formatCurrency(row.credit)}
                                        </td>
                                    </>
                                )}
                                <td className={`px-6 py-4 text-right text-sm font-bold font-mono ${row.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    {formatCurrency(row.balance)}
                                </td>
                            </tr>
                        ))}
                        {balances.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    Veri bulunamadı
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {balances.length > 0 && reportType === 'TRIAL_BALANCE' && (
                        <tfoot className="bg-gray-50 border-t font-bold">
                            <tr>
                                <td colSpan={2} className="px-6 py-4 text-right">GENEL TOPLAM</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(getTotal('debit'))}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(getTotal('credit'))}</td>
                                <td className="px-6 py-4 text-right text-gray-400">-</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    )
}
