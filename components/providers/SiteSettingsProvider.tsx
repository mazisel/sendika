'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, REALTIME_DISABLED } from '@/lib/supabase'

interface SiteSettings {
    id: string
    site_title: string
    logo_url: string
    primary_color: string
    secondary_color: string
}

interface SiteSettingsContextType {
    settings: SiteSettings | null
    loading: boolean
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
    settings: null,
    loading: true
})

export const useSiteSettings = () => useContext(SiteSettingsContext)

// Rengi koyulaştırma/açma fonksiyonu
const adjustColor = (color: string, amount: number) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

// Hex rengini RGB'ye çevirme
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<SiteSettings | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchSettings()

        if (REALTIME_DISABLED) return

        // Subscribe to changes
        const channel = supabase
            .channel('site_settings_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'site_settings'
                },
                (payload) => {
                    console.log('Ayarlar güncellendi:', payload)
                    fetchSettings()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    useEffect(() => {
        if (settings) {
            applyTheme(settings)
        }
    }, [settings])

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .single()

            if (data) {
                // Renkler null gelirse varsayılanları kullan
                const cleanSettings = {
                    ...data,
                    primary_color: data.primary_color || '#e3510f',
                    secondary_color: data.secondary_color || '#20a9e0'
                }
                setSettings(cleanSettings)
                applyTheme(cleanSettings)
            }
        } catch (error) {
            console.error('Ayarlar yüklenirken hata:', error)
        } finally {
            setLoading(false)
        }
    }

    const applyTheme = (settings: SiteSettings) => {
        if (!settings?.primary_color || !settings?.secondary_color) return;

        const root = document.documentElement;
        const { primary_color, secondary_color } = settings;

        // Helper to generate shades
        const generateShades = (hex: string, name: string) => {
            const rgb = hexToRgb(hex);
            if (!rgb) return;

            const shades = {
                50: 0.95,
                100: 0.9,
                200: 0.8,
                300: 0.6,
                400: 0.4,
                500: 0,
                600: -0.1,
                700: -0.2,
                800: -0.3,
                900: -0.4,
            };

            Object.entries(shades).forEach(([shade, percent]) => {
                const r = Math.min(255, Math.max(0, Math.round(rgb.r + (percent > 0 ? (255 - rgb.r) * percent : rgb.r * percent))));
                const g = Math.min(255, Math.max(0, Math.round(rgb.g + (percent > 0 ? (255 - rgb.g) * percent : rgb.g * percent))));
                const b = Math.min(255, Math.max(0, Math.round(rgb.b + (percent > 0 ? (255 - rgb.b) * percent : rgb.b * percent))));

                const colorValue = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                root.style.setProperty(`--color-${name}-${shade}`, colorValue);
            });
        }

        try {
            generateShades(primary_color, 'primary');
            generateShades(secondary_color, 'secondary');
        } catch (e) {
            console.error('Renk teması uygulanırken hata:', e);
        }

        if (settings.site_title && document.title !== settings.site_title) {
            document.title = settings.site_title;
        }
    }

    return (
        <SiteSettingsContext.Provider value={{ settings, loading }}>
            <style jsx global>{`
          :root {
            --color-primary-500: #e3510f;
            --color-secondary-500: #20a9e0;
          }
        `}</style>
            {children}
        </SiteSettingsContext.Provider>
    )
}
