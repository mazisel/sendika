'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin, Phone, Mail, User } from 'lucide-react'
import TurkeyMapComponent from 'react-turkey-map'

interface Branch {
  id: string
  city: string
  city_code: string
  region?: number
  branch_name: string
  president_name: string
  president_phone?: string
  president_email?: string
  address?: string
  coordinates_lat?: number
  coordinates_lng?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface TurkeyMapProps {
  branches: Branch[]
  onBranchClick?: (branch: Branch) => void
}

export default function TurkeyMap({ branches, onBranchClick }: TurkeyMapProps) {
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [hoveredBranch, setHoveredBranch] = useState<Branch | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const mapRef = useRef<HTMLDivElement>(null)
  const getRegionLabel = (region?: number | null) => {
    if (!region) return null
    return `${region}. Bölge`
  }

  // Şube olan şehirlerin plaka kodlarını ve renklerini hazırla
  const colorData: { [key: string]: string } = {}

  branches.filter(branch => branch.is_active).forEach(branch => {
    colorData[branch.city_code] = '#3b82f6' // Mavi renk
  })


  const handleCityClick = (cityCode: string) => {
    // Önce plaka kodu ile eşleştirmeyi dene
    let branch = branches.find(b => b.city_code === cityCode && b.is_active)
    
    // Eğer bulamazsa, şehir adı ile eşleştirmeyi dene
    if (!branch) {
      branch = branches.find(b => b.city.toLowerCase() === cityCode.toLowerCase() && b.is_active)
    }
    
    // Eğer hala bulamazsa, şehir adının bir kısmı ile eşleştirmeyi dene
    if (!branch) {
      branch = branches.find(b => 
        (b.city.toLowerCase().includes(cityCode.toLowerCase()) || 
         cityCode.toLowerCase().includes(b.city.toLowerCase())) && 
        b.is_active
      )
    }
    
    if (branch) {
      setSelectedBranch(branch)
      setHoveredBranch(null) // Hover tooltip'ini gizle
      if (onBranchClick) {
        onBranchClick(branch)
      }
    }
  }

  // SVG elementlerine mouse event listener'ları ekle
  useEffect(() => {
    if (!mapRef.current) return

    const handleMouseMove = (event: MouseEvent) => {
      if (!mapRef.current) return
      
      const rect = mapRef.current.getBoundingClientRect()
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      })
    }

    const handleCityHover = (event: Event) => {
      const target = event.target as SVGElement
      
      // Parent element'i kontrol et (g elementi)
      const parent = target.parentNode as SVGElement
      const cityCode = parent?.getAttribute('data-plate') || 
                      parent?.getAttribute('id') ||
                      target.getAttribute('data-plate') ||
                      target.getAttribute('id')
      
      if (cityCode) {
        // Plaka kodu ile eşleştirmeyi dene
        const branch = branches.find(b => b.city_code === cityCode && b.is_active)
        
        if (branch) {
          setHoveredBranch(branch)
        }
      }
    }

    const handleCityClick = (event: Event) => {
      event.preventDefault()
      event.stopPropagation()
      
      const target = event.target as SVGElement
      
      // Parent element'i kontrol et (g elementi)
      const parent = target.parentNode as SVGElement
      const cityCode = parent?.getAttribute('data-plate') || 
                      parent?.getAttribute('id') ||
                      target.getAttribute('data-plate') ||
                      target.getAttribute('id')
      
      if (cityCode) {
        // Plaka kodu ile eşleştirmeyi dene
        const branch = branches.find(b => b.city_code === cityCode && b.is_active)
        
        if (branch) {
          setSelectedBranch(branch)
          setHoveredBranch(null) // Hover tooltip'ini gizle
          if (onBranchClick) {
            onBranchClick(branch)
          }
        }
      }
    }

    const handleMouseLeave = () => {
      setHoveredBranch(null)
    }

    // Timeout ile SVG elementlerinin yüklenmesini bekle
    const timeout = setTimeout(() => {
      // Sadece path elementlerini hedefle (şehirler)
      const pathElements = mapRef.current?.querySelectorAll('path')
      
      pathElements?.forEach((element) => {
        element.addEventListener('mouseenter', handleCityHover as EventListener)
        element.addEventListener('mouseleave', handleMouseLeave as EventListener)
        element.addEventListener('click', handleCityClick as EventListener)
        
        // Cursor pointer ekle
        element.style.cursor = 'pointer'
      })

      // Mouse move event'i için
      mapRef.current?.addEventListener('mousemove', handleMouseMove)
      mapRef.current?.addEventListener('mouseleave', handleMouseLeave)
    }, 1000)

    return () => {
      clearTimeout(timeout)
      const pathElements = mapRef.current?.querySelectorAll('path')
      pathElements?.forEach(element => {
        element.removeEventListener('mouseenter', handleCityHover as EventListener)
        element.removeEventListener('mouseleave', handleMouseLeave as EventListener)
        element.removeEventListener('click', handleCityClick as EventListener)
      })
      
      if (mapRef.current) {
        mapRef.current.removeEventListener('mousemove', handleMouseMove)
        mapRef.current.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [branches])

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-0">
      {/* Desktop: Türkiye Haritası */}
      <div 
        ref={mapRef}
        className="relative bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 md:p-8 shadow-lg hidden md:block"
      >
        <div className="w-full turkey-map-container overflow-hidden" style={{ minHeight: '300px' }}>
          <div className="w-full h-full" style={{ 
            minHeight: '300px',
            maxWidth: '100%',
            transform: 'scale(1)',
            transformOrigin: 'center center'
          }}>
            <TurkeyMapComponent
              showTooltip={false}
              colorData={colorData}
              onClick={(cityCode: string) => handleCityClick(cityCode)}
            />
          </div>
        </div>

        {/* Desktop Tooltip */}
        {hoveredBranch && (
          <div 
            className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none"
            style={{
              left: mousePosition.x + 10,
              top: mousePosition.y - 60,
              transform: mousePosition.x > 300 ? 'translateX(-100%)' : 'translateX(0)',
              maxWidth: '250px'
            }}
          >
            <div className="text-sm font-semibold text-gray-900 mb-1">
              {hoveredBranch.branch_name}
            </div>
            {hoveredBranch.region && (
              <div className="text-xs text-gray-500 mb-1">
                {getRegionLabel(hoveredBranch.region)}
              </div>
            )}
            <div className="text-xs text-gray-600">
              Başkan: {hoveredBranch.president_name}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Detaylar için tıklayın
            </div>
          </div>
        )}
      </div>

      {/* Mobil: Şube Listesi */}
      <div className="md:hidden space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 shadow-lg">
          <h3 className="text-lg font-bold text-blue-800 mb-4 text-center">
            Şubelerimiz
          </h3>
          <div className="space-y-3">
            {branches.filter(branch => branch.is_active).map((branch) => (
              <div 
                key={branch.id}
                className="bg-white rounded-lg p-4 shadow-md border border-gray-200"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {branch.branch_name}
                      </h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <span>{branch.city} ({branch.city_code})</span>
                        {branch.region && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            {getRegionLabel(branch.region)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-blue-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center mb-2">
                      <User className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium text-gray-900">Başkan:</span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium mb-2">
                      {branch.president_name}
                    </p>
                    
                    <div className="space-y-2">
                      {branch.president_phone && (
                        <div className="flex items-center">
                          <Phone className="w-3 h-3 mr-2 text-blue-600" />
                          <a 
                            href={`tel:${branch.president_phone}`}
                            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {branch.president_phone}
                          </a>
                        </div>
                      )}
                      
                      {branch.president_email && (
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-2 text-blue-600" />
                          <a 
                            href={`mailto:${branch.president_email}`}
                            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {branch.president_email}
                          </a>
                        </div>
                      )}
                      
                      {branch.address && (
                        <div className="flex items-start">
                          <MapPin className="w-3 h-3 mr-2 text-blue-600 mt-0.5" />
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {branch.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Seçili şube detayları */}
      {selectedBranch && (
        <div className="mt-6 bg-white rounded-lg shadow-lg border overflow-hidden hidden md:block">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <h3 className="text-xl font-bold mb-1">
              {selectedBranch.branch_name}
            </h3>
            <div className="flex items-center space-x-3 text-blue-100">
              <p>
                {selectedBranch.city} ({selectedBranch.city_code})
              </p>
              {selectedBranch.region && (
                <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold">
                  {getRegionLabel(selectedBranch.region)}
                </span>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Şube Başkanı
                </h4>
                <p className="text-lg font-medium text-gray-800 mb-2">
                  {selectedBranch.president_name}
                </p>
                
                <div className="space-y-2">
                  {selectedBranch.president_phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <a 
                        href={`tel:${selectedBranch.president_phone}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {selectedBranch.president_phone}
                      </a>
                    </div>
                  )}
                  
                  {selectedBranch.president_email && (
                    <div className="flex items-center text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <a 
                        href={`mailto:${selectedBranch.president_email}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {selectedBranch.president_email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {selectedBranch.address && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                    Adres
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {selectedBranch.address}
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => setSelectedBranch(null)}
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şube sayısı */}
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          <span className="font-semibold text-blue-600">
            {branches.filter(branch => branch.is_active).length}
          </span> aktif şube
        </p>
      </div>

      {/* Desktop: Harita açıklaması */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 hidden md:block">
        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Harita Kullanımı</h4>
        <p className="text-sm text-blue-700">
          Harita üzerinde mavi renkli illere tıklayarak şube detaylarını görüntüleyebilirsiniz. 
          Mavi renkteki iller şubemizin bulunduğu illeri göstermektedir.
        </p>
      </div>
    </div>
  )
}
