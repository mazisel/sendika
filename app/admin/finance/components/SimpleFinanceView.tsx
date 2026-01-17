import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowUpRight, ArrowDownRight, Wallet, Plus, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

interface TransactionSummary {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    incomeGrowth: number;
    expenseGrowth: number;
    balanceGrowth: number;
}

interface Transaction {
    id: string;
    transaction_date: string;
    description: string;
    document_type: 'PAYMENT' | 'RECEIPT' | 'INVOICE' | 'SALARY' | 'TRANSFER';
    total_amount: number;
}

export default function SimpleFinanceView() {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<TransactionSummary>({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        incomeGrowth: 0,
        expenseGrowth: 0,
        balanceGrowth: 0
    });
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            const now = new Date();
            // Current month: 1st of current month to end of current month (handled by logic, just need start)
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            // Last month: 1st of last month to end of last month
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

            // Fetch transactions starting from last month to calculate growth
            const { data, error } = await supabase
                .from('financial_transactions')
                .select('*')
                .gte('transaction_date', startOfLastMonth)
                .order('transaction_date', { ascending: false });

            if (error) throw error;

            const transactions = data as Transaction[];

            const thisMonthTx = transactions.filter(t => t.transaction_date >= startOfMonth);
            const lastMonthTx = transactions.filter(t => t.transaction_date >= startOfLastMonth && t.transaction_date < startOfMonth);

            const calculateTotals = (txs: Transaction[]) => {
                let income = 0;
                let expense = 0;

                txs.forEach(t => {
                    if (t.document_type === 'RECEIPT') {
                        income += t.total_amount;
                    } else if (['PAYMENT', 'SALARY', 'INVOICE'].includes(t.document_type)) {
                        expense += t.total_amount;
                    }
                });
                return { income, expense };
            };

            const thisMonth = calculateTotals(thisMonthTx);
            const lastMonth = calculateTotals(lastMonthTx);

            const calculateGrowth = (current: number, previous: number) => {
                if (previous === 0) return current > 0 ? 100 : 0;
                return ((current - previous) / previous) * 100;
            };

            setSummary({
                totalIncome: thisMonth.income,
                totalExpense: thisMonth.expense,
                balance: thisMonth.income - thisMonth.expense,
                incomeGrowth: calculateGrowth(thisMonth.income, lastMonth.income),
                expenseGrowth: calculateGrowth(thisMonth.expense, lastMonth.expense),
                balanceGrowth: calculateGrowth(thisMonth.income - thisMonth.expense, lastMonth.income - lastMonth.expense)
            });

            setRecentTransactions(transactions.slice(0, 5));

        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Bu Ay Net Bakiye</p>
                            <h3 className={`text-2xl font-bold mt-1 ${summary.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600'}`}>
                                {formatCurrency(summary.balance)}
                            </h3>
                            <p className={`text-xs mt-1 flex items-center ${summary.balanceGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {summary.balanceGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                %{Math.abs(summary.balanceGrowth).toFixed(1)} geçen aya göre
                            </p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Bu Ay Gelir</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(summary.totalIncome)}</h3>
                            <p className={`text-xs mt-1 flex items-center ${summary.incomeGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {summary.incomeGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                %{Math.abs(summary.incomeGrowth).toFixed(1)} geçen aya göre
                            </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <ArrowUpRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Bu Ay Gider</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(summary.totalExpense)}</h3>
                            <p className={`text-xs mt-1 flex items-center ${summary.expenseGrowth <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {summary.expenseGrowth > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                                %{Math.abs(summary.expenseGrowth).toFixed(1)} geçen aya göre
                            </p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <ArrowDownRight className="w-6 h-6 text-red-600 dark:text-red-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Recent Transactions Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-fit">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Hızlı İşlemler</h3>
                    <div className="space-y-3">
                        <Link href="/admin/finance/transactions" className="w-full flex items-center justify-center space-x-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            <Plus className="w-5 h-5" />
                            <span>Gelir Ekle (Makbuz)</span>
                        </Link>
                        <Link href="/admin/finance/transactions" className="w-full flex items-center justify-center space-x-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                            <Plus className="w-5 h-5" />
                            <span>Gider Ekle (Fiş)</span>
                        </Link>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Son İşlemler</h3>
                        <Link href="/admin/finance/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
                            Tümünü Gör <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {recentTransactions.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">Henüz işlem bulunmuyor.</div>
                        ) : (
                            recentTransactions.map((tx) => {
                                const isIncome = tx.document_type === 'RECEIPT';
                                const isExpense = ['PAYMENT', 'SALARY', 'INVOICE'].includes(tx.document_type);

                                return (
                                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center space-x-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center 
                              ${isExpense ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                                                    isIncome ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                                                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                {isExpense ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{tx.description || 'İsimsiz İşlem'}</p>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <span>{format(new Date(tx.transaction_date), 'dd MMM yyyy', { locale: tr })}</span>
                                                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">{tx.document_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`font-semibold ${isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {isExpense ? '-' : '+'}{formatCurrency(tx.total_amount)}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
