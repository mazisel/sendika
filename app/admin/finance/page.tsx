'use client'

import Link from 'next/link'
import {
  Wallet,
  Building2,
  FileText,
  CreditCard,
  PieChart,
  TrendingUp,
  Receipt,
  Banknote
} from 'lucide-react'

export default function FinanceDashboardPage() {
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finans Yönetimi</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-2">
          Yeni nesil finansal yönetim modülü ile tüm muhasebe süreçlerinizi tek yerden yönetin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <div className="mt-12 p-6 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-700 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">Hızlı Başlangıç Rehberi</h4>
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
              Sistemi kullanmaya başlamadan önce sırasıyla:
              <span className="font-medium text-gray-900 dark:text-white mx-1">1. Hesap Planını Düzenleyin</span>,
              <span className="font-medium text-gray-900 dark:text-white mx-1">2. Banka/Kasa Hesaplarını Tanımlayın</span> ve
              <span className="font-medium text-gray-900 dark:text-white mx-1">3. Açılış Fişi (Mahsup)</span> ile devir bakiyelerini girin.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
