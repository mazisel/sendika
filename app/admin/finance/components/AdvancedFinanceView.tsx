import Link from 'next/link'
import {
    Wallet,
    FileText,
    CreditCard,
    PieChart,
    TrendingUp,
    Receipt
} from 'lucide-react'

export default function AdvancedFinanceView() {
    const modules = [
        {
            title: 'Hesap Planı',
            description: 'Tek düzen hesap planı ve alt hesap yönetimi',
            icon: <FileText className="w-8 h-8 text-blue-500" />,
            href: '/admin/finance/accounts',
            color: 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50'
        },
        {
            title: 'Kasa & Banka',
            description: 'Nakit, banka ve POS hesap tanımları',
            icon: <Wallet className="w-8 h-8 text-purple-500" />,
            href: '/admin/finance/banks',
            color: 'bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800/50'
        },
        {
            title: 'Muhasebe Fişleri',
            description: 'Tediye, tahsilat ve mahsup fişleri (Yevmiye)',
            icon: <Receipt className="w-8 h-8 text-green-500" />,
            href: '/admin/finance/transactions',
            color: 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800/50'
        },
        {
            title: 'Gider Talepleri',
            description: 'Personel ve satınalma harcama talepleri',
            icon: <CreditCard className="w-8 h-8 text-orange-500" />,
            href: '/admin/finance/expenses',
            color: 'bg-orange-50 border-orange-100 dark:bg-orange-900/20 dark:border-orange-800/50'
        },

        {
            title: 'Bütçe Planlama',
            description: 'Yıllık bütçe hedefleri ve sapma analizleri',
            icon: <TrendingUp className="w-8 h-8 text-indigo-500" />,
            href: '/admin/finance/budget',
            color: 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50'
        },
        {
            title: 'Raporlar',
            description: 'Gelir tablosu, mizan ve mali analizler',
            icon: <PieChart className="w-8 h-8 text-rose-500" />,
            href: '/admin/finance/reports',
            color: 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50'
        }
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {modules.map((module) => (
                <Link
                    key={module.href}
                    href={module.href}
                    className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 block ${module.color}`}
                >
                    <div className="mb-4 bg-white dark:bg-slate-800 w-14 h-14 rounded-xl flex items-center justify-center shadow-sm">
                        {module.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{module.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                        {module.description}
                    </p>
                </Link>
            ))}
        </div>
    )
}
