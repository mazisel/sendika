'use client'

import { useState } from 'react'
import { Building2, LayoutGrid, LayoutList } from 'lucide-react'
import AdvancedFinanceView from './components/AdvancedFinanceView'
import SimpleFinanceView from './components/SimpleFinanceView'

export default function FinanceDashboardPage() {
  const [activeTab, setActiveTab] = useState<'simple' | 'advanced'>('advanced')

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Finans Yönetimi</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-2">
            Tüm finansal süreçlerinizi yönetin.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center">
          <button
            onClick={() => setActiveTab('simple')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'simple'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
          >
            <LayoutList className="w-4 h-4" />
            Basit Görünüm
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'advanced'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Gelişmiş Görünüm
          </button>
        </div>
      </div>

      {activeTab === 'simple' ? <SimpleFinanceView /> : <AdvancedFinanceView />}

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

