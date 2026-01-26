'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Slider {
  id: string
  title: string
  description: string
  image_url: string
  link_url: string
  button_text: string
  is_active: boolean
  sort_order: number
}

export default function HeroSlider() {
  const [sliders, setSliders] = useState<Slider[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSliders()
  }, [])

  useEffect(() => {
    if (sliders.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % sliders.length)
      }, 5000) // 5 saniyede bir değiş

      return () => clearInterval(interval)
    }
  }, [sliders.length])

  const loadSliders = async () => {
    try {
      const { data, error } = await supabase
        .from('sliders')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (!error && data) {
        setSliders(data)
      }
    } catch (error) {
      console.error('Slider\'lar yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % sliders.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + sliders.length) % sliders.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  if (loading) {
    return (
      <section className="header-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-12 bg-white/20 rounded mb-6 mx-auto max-w-2xl"></div>
              <div className="h-6 bg-white/20 rounded mb-8 mx-auto max-w-3xl"></div>
              <div className="flex justify-center space-x-4">
                <div className="h-12 w-32 bg-white/20 rounded"></div>
                <div className="h-12 w-32 bg-white/20 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (sliders.length === 0) {
    return (
      <section className="header-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              İşçi Haklarını Koruyoruz
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Güçlü birliktelik, adil çalışma koşulları ve sosyal adalet için buradayız
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-white text-primary-600 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg transition-colors">
                Üye Ol
              </button>
              <button className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-3 px-8 rounded-lg transition-colors">
                Daha Fazla Bilgi
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const currentSliderData = sliders[currentSlide]

  return (
    <section className="relative overflow-hidden">
      {/* Slider Container */}
      <div className="relative h-[600px] md:h-[700px]">
        {sliders.map((slider, index) => (
          <div
            key={slider.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
          >
            {/* Background Image */}
            <div className="absolute inset-0">
              {slider.image_url ? (
                <img
                  src={slider.image_url}
                  alt={slider.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full header-gradient"></div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 h-full flex items-center justify-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="text-center">
                  <h1 className={`text-4xl md:text-6xl font-bold mb-6 animate-fade-in ${slider.image_url ? 'text-white' : 'text-gray-900'
                    }`}>
                    {slider.title}
                  </h1>
                  {slider.description && (
                    <p className={`text-xl md:text-2xl mb-8 max-w-4xl mx-auto animate-fade-in-delay ${slider.image_url ? 'text-gray-100' : 'text-gray-700'
                      }`}>
                      {slider.description}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-2">
                    {slider.button_text && slider.link_url && (
                      <a
                        href={slider.link_url}
                        className={`font-semibold py-3 px-8 rounded-lg transition-colors inline-block ${slider.image_url
                            ? 'bg-white text-primary-600 hover:bg-gray-100'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                      >
                        {slider.button_text}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {sliders.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-20"
            aria-label="Önceki slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-20"
            aria-label="Sonraki slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {sliders.length > 1 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {sliders.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${index === currentSlide ? 'bg-white' : 'bg-white/50'
                }`}
              aria-label={`Slide ${index + 1}'e git`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
