'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Upload, Loader2, Image as ImageIcon, MessageSquare, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Logger } from '@/lib/logger'

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState({
        id: '',
        site_title: '',
        primary_color: '#e3510f',
        secondary_color: '#20a9e0',
        logo_url: '',
        netgsm_usercode: '',
        netgsm_password: '',
        netgsm_header: ''
    })
    const [testingConnection, setTestingConnection] = useState(false)
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .single()

            if (error) {
                // If no row found, we'll just stick to defaults and insert on save
                if (error.code === 'PGRST116') {
                    console.log('Site ayarları bulunamadı, varsayılanlar kullanılacak.')
                    return
                }
                throw error
            }

            if (data) setSettings(data)
        } catch (error) {
            console.error('Ayarlar yüklenirken hata:', error)
            toast.error('Ayarlar yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Dosya kontrolü
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Dosya boyutu 2MB\'dan küçük olmalıdır')
            return
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Lütfen geçerli bir resim dosyası seçin')
            return
        }

        try {
            setSaving(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `logo-${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('site-assets')
                .getPublicUrl(fileName)

            setSettings(prev => ({ ...prev, logo_url: publicUrl }))
            toast.success('Logo yüklendi')
        } catch (error) {
            console.error('Logo yüklenirken hata:', error)
            toast.error('Logo yüklenirken hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        console.log('Saving settings with state:', settings)

        try {
            const settingData = {
                site_title: settings.site_title,
                primary_color: settings.primary_color,
                secondary_color: settings.secondary_color,
                logo_url: settings.logo_url,
                netgsm_usercode: settings.netgsm_usercode,
                netgsm_password: settings.netgsm_password,
                netgsm_header: settings.netgsm_header,
                updated_at: new Date().toISOString()
            }

            console.log('Payload:', settingData, 'ID:', settings.id)

            let error;

            if (settings.id) {
                // Update existing
                console.log('Updating existing settings with ID:', settings.id)
                const { error: updateError, data: updateData } = await supabase
                    .from('site_settings')
                    .update(settingData)
                    .eq('id', settings.id)
                    .select()
                    .single()

                console.log('Update result:', updateData, 'Error:', updateError)
                error = updateError
            } else {
                // Insert new
                console.log('Inserting new settings')
                const { error: insertError, data: insertData } = await supabase
                    .from('site_settings')
                    .insert(settingData)
                    .select()
                    .single()

                console.log('Insert result:', insertData, 'Error:', insertError)
                if (insertData) {
                    setSettings(prev => ({ ...prev, id: insertData.id }))
                }
                error = insertError
            }

            if (error) throw error

            toast.success('Ayarlar kaydedildi')

            await Logger.log({
                action: 'UPDATE',
                entityType: 'SETTINGS',
                entityId: settings.id || 'new',
                details: { updatedFields: Object.keys(settingData) },
                userId: (await supabase.auth.getUser()).data.user?.id
            });

            window.location.reload()
        } catch (error) {
            console.error('Kaydedilirken hata:', error)
            toast.error('Ayarlar kaydedilemedi')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Site Ayarları</h1>
                    <p className="text-gray-500 mt-1">
                        Site logosu, başlığı ve renk temasını buradan değiştirebilirsiniz.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
                {/* Logo Bölümü */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                        Logo ve Başlık
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Site Logosu
                            </label>
                            <div className="mt-1 flex items-center gap-6">
                                <div className="relative w-32 h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group hover:border-primary-500 transition-colors">
                                    {settings.logo_url ? (
                                        <img
                                            src={settings.logo_url}
                                            alt="Site Logo"
                                            className="w-full h-full object-contain p-2"
                                        />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Upload className="w-6 h-6 text-white" />
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <div className="text-sm text-gray-500">
                                    <p>PNG, JPG veya SVG</p>
                                    <p>Maksimum 2MB</p>
                                    <p>Önerilen boyut: 200x200px</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Site Başlığı
                            </label>
                            <input
                                type="text"
                                value={settings.site_title}
                                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                placeholder="Örn: Kamu Ulaşım Sen"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Tarayıcı sekmesinde ve header'da görünecek başlık.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Renkler Bölümü */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                        Renk Teması
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ana Renk (Primary)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={settings.primary_color}
                                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                    className="h-10 w-20 rounded p-1 cursor-pointer border border-gray-300"
                                />
                                <input
                                    type="text"
                                    value={settings.primary_color}
                                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                    className="w-32 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 uppercase"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Butonlar, linkler ve vurgulu alanlar için kullanılır.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                İkincil Renk (Secondary)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={settings.secondary_color}
                                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                                    className="h-10 w-20 rounded p-1 cursor-pointer border border-gray-300"
                                />
                                <input
                                    type="text"
                                    value={settings.secondary_color}
                                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                                    className="w-32 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 uppercase"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Alternatif butonlar ve arka planlar için kullanılır.
                            </p>
                        </div>
                    </div>
                </div>

                {/* NetGSM SMS API Bölümü */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-secondary-500" />
                        NetGSM SMS API
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Kullanıcı Kodu
                            </label>
                            <input
                                type="text"
                                value={settings.netgsm_usercode || ''}
                                onChange={(e) => setSettings({ ...settings, netgsm_usercode: e.target.value })}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                placeholder="850XXXXXXX"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                NetGSM müşteri numaranız
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                API Şifresi
                            </label>
                            <input
                                type="password"
                                value={settings.netgsm_password || ''}
                                onChange={(e) => setSettings({ ...settings, netgsm_password: e.target.value })}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                placeholder="••••••••"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                API kullanıcı şifreniz
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Gönderici Adı (Header)
                            </label>
                            <input
                                type="text"
                                value={settings.netgsm_header || ''}
                                onChange={(e) => setSettings({ ...settings, netgsm_header: e.target.value })}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                placeholder="KAMUULASIM"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                SMS başlığı (onaylı olmalı)
                            </p>
                        </div>
                    </div>

                    {connectionStatus !== 'idle' && (
                        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${connectionStatus === 'success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                            }`}>
                            {connectionStatus === 'success' ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    <span>Bağlantı başarılı!</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-5 h-5" />
                                    <span>Bağlantı başarısız. Bilgileri kontrol edin.</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5 mr-2" />
                                Ayarları Kaydet
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
