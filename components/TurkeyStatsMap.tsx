'use client'

import { useState, useRef, useEffect } from 'react'
import { Users, UserMinus, UserPlus, ClipboardList, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import TurkeyMapComponent from 'react-turkey-map'

interface CityStats {
    city: string
    city_code: string
    activeMembers: number
    resignedMembers: number
    registeredMembers: number
    onlineApplications: number
}

interface TurkeyStatsMapProps {
    cityStats: CityStats[]
    totalActiveMembers: number
    totalResigned: number
    totalRegistered: number
    totalOnlineApplications: number
    isLoading?: boolean
}

type ViewMode = 'active' | 'resigned' | 'registered' | 'online'

// Renk skalası için yardımcı fonksiyon
const getColorByValue = (value: number, maxValue: number, mode: ViewMode): string => {
    if (value === 0) return '#E2E8F0' // Gri - üye yok

    const ratio = maxValue > 0 ? value / maxValue : 0

    const colorScales = {
        active: ['#DBEAFE', '#93C5FD', '#60A5FA', '#3B82F6', '#1D4ED8'], // Mavi
        resigned: ['#FEE2E2', '#FCA5A5', '#F87171', '#EF4444', '#DC2626'], // Kırmızı
        registered: ['#D1FAE5', '#6EE7B7', '#34D399', '#10B981', '#059669'], // Yeşil
        online: ['#E0E7FF', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5']  // İndigo
    }

    const scale = colorScales[mode]
    const index = Math.min(Math.floor(ratio * scale.length), scale.length - 1)
    return scale[index]
}

export default function TurkeyStatsMap({
    cityStats,
    totalActiveMembers,
    totalResigned,
    totalRegistered,
    totalOnlineApplications,
    isLoading = false
}: TurkeyStatsMapProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('active')
    const [hoveredCity, setHoveredCity] = useState<CityStats | null>(null)
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(100)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const mapRef = useRef<HTMLDivElement>(null)
    const mapContainerRef = useRef<HTMLDivElement>(null)

    // Renk datasını oluştur
    const colorData: { [key: string]: string } = {}

    const maxValues = {
        active: Math.max(...cityStats.map(c => c.activeMembers), 1),
        resigned: Math.max(...cityStats.map(c => c.resignedMembers), 1),
        registered: Math.max(...cityStats.map(c => c.registeredMembers), 1),
        online: Math.max(...cityStats.map(c => c.onlineApplications), 1)
    }

    cityStats.forEach(city => {
        const value = viewMode === 'active' ? city.activeMembers :
            viewMode === 'resigned' ? city.resignedMembers :
                viewMode === 'registered' ? city.registeredMembers :
                    city.onlineApplications

        colorData[city.city_code] = getColorByValue(value, maxValues[viewMode], viewMode)
    })

    const viewModes = [
        {
            id: 'active' as ViewMode,
            label: 'AKTİF ÜYE SAYISI',
            icon: Users,
            color: 'bg-blue-600',
            hoverColor: 'hover:bg-blue-700',
            total: totalActiveMembers
        },
        {
            id: 'resigned' as ViewMode,
            label: 'İSTİFA EDEN ÜYE',
            icon: UserMinus,
            color: 'bg-red-500',
            hoverColor: 'hover:bg-red-600',
            total: totalResigned
        },
        {
            id: 'registered' as ViewMode,
            label: 'KAYITLI ÜYE',
            icon: UserPlus,
            color: 'bg-green-500',
            hoverColor: 'hover:bg-green-600',
            total: totalRegistered
        },
        {
            id: 'online' as ViewMode,
            label: 'ONLİNE BAŞVURU',
            icon: ClipboardList,
            color: 'bg-indigo-500',
            hoverColor: 'hover:bg-indigo-600',
            total: totalOnlineApplications
        }
    ]

    const currentMode = viewModes.find(m => m.id === viewMode)!

    // Renk göstergesi - Dinamik hesaplama
    const currentMax = maxValues[viewMode];
    const colorLegend = [
        { label: `${Math.floor(currentMax * 0.8)}+`, color: viewMode === 'active' ? '#1D4ED8' : viewMode === 'resigned' ? '#DC2626' : viewMode === 'registered' ? '#059669' : '#4F46E5' },
        { label: `${Math.floor(currentMax * 0.6)}+`, color: viewMode === 'active' ? '#3B82F6' : viewMode === 'resigned' ? '#EF4444' : viewMode === 'registered' ? '#10B981' : '#6366F1' },
        { label: `${Math.floor(currentMax * 0.4)}+`, color: viewMode === 'active' ? '#60A5FA' : viewMode === 'resigned' ? '#F87171' : viewMode === 'registered' ? '#34D399' : '#818CF8' },
        { label: `${Math.floor(currentMax * 0.2)}+`, color: viewMode === 'active' ? '#93C5FD' : viewMode === 'resigned' ? '#FCA5A5' : viewMode === 'registered' ? '#6EE7B7' : '#A5B4FC' },
        { label: `1-${Math.floor(currentMax * 0.2)}`, color: viewMode === 'active' ? '#DBEAFE' : viewMode === 'resigned' ? '#FEE2E2' : viewMode === 'registered' ? '#D1FAE5' : '#E0E7FF' },
    ]

    // Mouse event handlers
    const containerRect = useRef<DOMRect | null>(null)

    // viewMode değiştiğinde hoveredCity sıfırla
    useEffect(() => {
        setHoveredCity(null)
    }, [viewMode])

    useEffect(() => {
        const updateRect = () => {
            if (mapRef.current) containerRect.current = mapRef.current.getBoundingClientRect()
        }
        window.addEventListener('resize', updateRect)
        window.addEventListener('scroll', updateRect)
        // Her render'da güncelle
        updateRect()

        // Bir süre sonra tekrar güncelle (layout stabilize olduktan sonra)
        const timeout = setTimeout(updateRect, 100)
        return () => {
            window.removeEventListener('resize', updateRect)
            window.removeEventListener('scroll', updateRect)
            clearTimeout(timeout)
        }
    }, [])

    useEffect(() => {
        if (!mapContainerRef.current || cityStats.length === 0) return

        const container = mapContainerRef.current

        // Event delegation ile hover yönetimi
        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as SVGElement
            if (target.tagName !== 'path') return

            const parent = target.parentNode as SVGElement
            const cityCode = parent?.getAttribute('data-plate') ||
                parent?.getAttribute('id') ||
                target.getAttribute('data-plate') ||
                target.getAttribute('id')

            if (cityCode) {
                const numericCode = cityCode.replace(/\D/g, '')
                const city = cityStats.find(c =>
                    c.city_code === cityCode ||
                    c.city_code === numericCode ||
                    c.city_code === String(parseInt(numericCode))
                )
                if (city) {
                    setHoveredCity(city)
                }
            }
        }

        const handleMouseOut = (event: MouseEvent) => {
            const target = event.target as SVGElement
            if (target.tagName === 'path') {
                setHoveredCity(null)
            }
        }

        // Path'lere style ekle
        const setupStyles = () => {
            const pathElements = container.querySelectorAll('path')
            if (pathElements.length === 0) {
                requestAnimationFrame(setupStyles)
                return
            }
            pathElements.forEach((element) => {
                const existingStyle = element.getAttribute('style') || ''
                if (!existingStyle.includes('cursor')) {
                    element.setAttribute('style', existingStyle + '; cursor: pointer; transition: opacity 0.2s')
                }
            })
        }

        container.addEventListener('mouseover', handleMouseOver as EventListener)
        container.addEventListener('mouseout', handleMouseOut as EventListener)

        const rafId = requestAnimationFrame(setupStyles)

        return () => {
            cancelAnimationFrame(rafId)
            container.removeEventListener('mouseover', handleMouseOver as EventListener)
            container.removeEventListener('mouseout', handleMouseOut as EventListener)
        }
    }, [cityStats, viewMode])

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 50, 800))
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 50, 100))
    const handleZoomReset = () => {
        setZoom(100)
        setPosition({ x: 0, y: 0 })
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-slate-200 rounded w-64 mb-4"></div>
                    <div className="h-4 bg-slate-200 rounded w-96 mb-6"></div>
                    <div className="h-96 bg-slate-200 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                <div className="flex items-center space-x-3">
                    <div className="bg-white/20 rounded-lg p-2">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Türkiye İstatistik Haritası</h3>
                        <p className="text-blue-100 text-sm">
                            İllere göre üye dağılımı ve istatistikler • +/- butonları ile yakınlaştırın • Haritayı sürükleyerek konumlandırabilirsiniz
                        </p>
                    </div>
                </div>
            </div>

            {/* View Mode Tabs */}
            <div className="p-4 border-b border-slate-200">
                <p className="text-sm text-slate-600 mb-3">Görünüm Seçenekleri:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {viewModes.map((mode) => {
                        const Icon = mode.icon
                        const isActive = viewMode === mode.id
                        return (
                            <button
                                key={mode.id}
                                onClick={() => setViewMode(mode.id)}
                                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium text-sm transition-all ${isActive
                                    ? `${mode.color} text-white shadow-md`
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{mode.label}</span>
                                <span className="sm:hidden">{mode.label.split(' ')[0]}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Stats Summary */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                    <currentMode.icon className={`w-5 h-5 ${viewMode === 'active' ? 'text-blue-600' :
                        viewMode === 'resigned' ? 'text-red-500' :
                            viewMode === 'registered' ? 'text-green-500' : 'text-indigo-500'
                        }`} />
                    <span className="text-sm text-slate-600">Toplam {currentMode.label}:</span>
                    <span className={`font-bold text-lg ${viewMode === 'active' ? 'text-blue-600' :
                        viewMode === 'resigned' ? 'text-red-500' :
                            viewMode === 'registered' ? 'text-green-500' : 'text-indigo-500'
                        }`}>
                        {currentMode.total.toLocaleString('tr-TR')}
                    </span>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={handleZoomOut}
                        className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        title="Uzaklaştır"
                    >
                        <ZoomOut className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                        onClick={handleZoomIn}
                        className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        title="Yakınlaştır"
                    >
                        <ZoomIn className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                        onClick={handleZoomReset}
                        className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                        title="Sıfırla"
                    >
                        <RotateCcw className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="text-sm text-slate-500 min-w-[50px] text-center">{zoom}%</span>
                </div>
            </div>

            {/* Map Info */}
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
                <p className="text-xs text-blue-700 flex items-center">
                    <span className="mr-1">🖱️</span>
                    Haritayı sürükleyerek hareket ettirin • +/- butonları ile yakınlaştırın
                </p>
            </div>

            {/* Map Container */}
            <div
                ref={mapRef}
                className="relative bg-gradient-to-b from-slate-50 to-white overflow-hidden cursor-grab active:cursor-grabbing"
                style={{ height: '550px' }}
                onMouseDown={(e) => {
                    setIsDragging(true)
                    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
                }}
                onMouseMove={(e) => {
                    if (isDragging) {
                        const newX = e.clientX - dragStart.x
                        const newY = e.clientY - dragStart.y
                        setPosition({ x: newX, y: newY })
                    }

                    // containerRect null ise güncelle
                    if (!containerRect.current && mapRef.current) {
                        containerRect.current = mapRef.current.getBoundingClientRect()
                    }

                    setMousePosition({
                        x: e.clientX,
                        y: e.clientY
                    })
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => {
                    setIsDragging(false)
                    setHoveredCity(null)
                }}
            >
                <div
                    ref={mapContainerRef}
                    className="turkey-map-container"
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate3d(${position.x}px, ${position.y}px, 0)`,
                        width: `${zoom}%`,
                        minWidth: '100%',
                        transition: isDragging ? 'none' : 'width 0.3s ease-out, transform 0.1s linear',
                        willChange: isDragging ? 'transform' : 'auto'
                    }}
                >
                    <TurkeyMapComponent
                        showTooltip={false}
                        colorData={colorData}
                    />
                </div>

                {/* Hover Tooltip */}
                {hoveredCity && (
                    <div
                        className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl p-3 pointer-events-none"
                        style={{
                            left: Math.min(mousePosition.x + 20, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 220),
                            top: (typeof window !== 'undefined' && mousePosition.y > window.innerHeight - 250)
                                ? mousePosition.y - 180
                                : mousePosition.y + 20,
                        }}
                    >
                        <div className="text-sm font-bold text-slate-900 mb-2 border-b pb-1">
                            {hoveredCity.city}
                        </div>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Aktif Üye:</span>
                                <span className="font-semibold text-blue-600">{hoveredCity.activeMembers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">İstifa Eden:</span>
                                <span className="font-semibold text-red-500">{hoveredCity.resignedMembers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Kayıtlı Üye:</span>
                                <span className="font-semibold text-green-500">{hoveredCity.registeredMembers}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Online Başvuru:</span>
                                <span className="font-semibold text-indigo-500">{hoveredCity.onlineApplications}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Color Legend */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500 mb-2">Renk Göstergesi</p>
                <div className="flex items-center space-x-2">
                    {colorLegend.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: item.color }}
                        >
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>
        </div >
    )
}
