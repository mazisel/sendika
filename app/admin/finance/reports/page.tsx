'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Filter, Download, FileSpreadsheet, FileText, File } from 'lucide-react'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
    const [exportOpen, setExportOpen] = useState(false)
    const [exporting, setExporting] = useState(false)

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

    // --- Export Functions ---

    const getExportData = () => {
        const typeMap: Record<string, string> = {
            'INCOME': 'GELİR',
            'EXPENSE': 'GİDER',
            'ASSET': 'VARLIK',
            'LIABILITY': 'YÜKÜMLÜLÜK',
            'EQUITY': 'ÖZKAYNAK'
        }

        return balances.map(b => {
            const row: any = {
                'Hesap Kodu': b.code,
                'Hesap Adı': b.name,
                'Hesap Tipi': typeMap[b.type] || b.type,
            }
            if (reportType === 'TRIAL_BALANCE') {
                row['Borç'] = b.debit
                row['Alacak'] = b.credit
            }
            row['Bakiye'] = b.balance
            return row
        })
    }

    const handleExport = async (type: 'excel' | 'pdf' | 'csv') => {
        if (balances.length === 0) {
            toast.error('Dışa aktarılacak veri bulunamadı')
            return
        }

        setExporting(true)
        const fileName = `Finansal_Rapor_${reportType}_${year}`

        try {
            if (type === 'excel') {
                const data = getExportData()
                const worksheet = XLSX.utils.json_to_sheet(data)
                const workbook = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor')
                XLSX.writeFile(workbook, `${fileName}.xlsx`)
                toast.success('Excel dosyası indirildi')
            } else if (type === 'csv') {
                const data = getExportData()
                const worksheet = XLSX.utils.json_to_sheet(data)
                const csv = XLSX.utils.sheet_to_csv(worksheet)
                // Add BOM for Turkish characters support in Excel
                const bom = '\uFEFF'
                const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `${fileName}.csv`
                link.click()
                toast.success('CSV dosyası indirildi')
            } else if (type === 'pdf') {
                const doc = new jsPDF()

                // Load Roboto font for Turkish character support
                try {
                    const fontUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf'
                    const response = await fetch(fontUrl)
                    const blob = await response.blob()
                    const reader = new FileReader()

                    reader.onloadend = () => {
                        const base64data = reader.result as string
                        const base64Clean = base64data.split(',')[1]

                        doc.addFileToVFS('Roboto-Regular.ttf', base64Clean)
                        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
                        doc.setFont('Roboto')

                        generatePDFContent(doc, fileName)
                    }

                    reader.readAsDataURL(blob)
                } catch (e) {
                    console.error('Font loading failed, falling back to default', e)
                    // Fallback to default font if loading fails (might have artifacts)
                    generatePDFContent(doc, fileName)
                }
            }
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Dışa aktarma sırasında bir hata oluştu')
        } finally {
            setExporting(false)
            setExportOpen(false)
        }
    }

    const generatePDFContent = (doc: jsPDF, fileName: string) => {
        doc.setFontSize(16)
        doc.text(`${year} Yılı ${reportType === 'INCOME_STATEMENT' ? 'Gelir Tablosu' : 'Mizan'}`, 14, 15)

        doc.setFontSize(10)
        doc.text(`Oluşturma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 14, 22)

        const tableBody = balances.map(b => {
            const row = [b.code, b.name];
            if (reportType === 'TRIAL_BALANCE') {
                row.push(formatCurrency(b.debit), formatCurrency(b.credit));
            }
            row.push(formatCurrency(b.balance));
            return row;
        });

        const head = reportType === 'TRIAL_BALANCE'
            ? [['Hesap Kodu', 'Hesap Adı', 'Borç', 'Alacak', 'Bakiye']]
            : [['Hesap Kodu', 'Hesap Adı', 'Bakiye']];

        autoTable(doc, {
            head: head,
            body: tableBody,
            startY: 25,
            styles: {
                font: 'Roboto', // Use the added font
                fontSize: 9,
                cellPadding: 2
            },
            headStyles: {
                fillColor: [66, 133, 244], // Blue
            }
        })

        doc.save(`${fileName}.pdf`)
        toast.success('PDF dosyası indirildi')
    }

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Finansal Raporlar</h1>
                    <p className="text-gray-500">Mizan ve Gelir Tablosu analizleri</p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setExportOpen(!exportOpen)}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        {exporting ? <span className="animate-spin">⌛</span> : <Download className="w-4 h-4" />}
                        <span>Dışa Aktar</span>
                    </button>

                    {exportOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-10 animate-in fade-in slide-in-from-top-2">
                            <div className="py-1">
                                <button
                                    onClick={() => handleExport('excel')}
                                    className="flex w-full items-center px-4 py-2text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                                    Excel (.xlsx)
                                </button>
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <FileText className="w-4 h-4 mr-2 text-slate-500" />
                                    CSV (.csv)
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    <File className="w-4 h-4 mr-2 text-red-500" />
                                    PDF (.pdf)
                                </button>
                            </div>
                        </div>
                    )}
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
