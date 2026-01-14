
import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { MemberService } from '@/lib/services/memberService'
import { AdminAuth } from '@/lib/auth'
import { cityOptions as cities } from '@/lib/cities'

interface EditMemberModalProps {
    member: any
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function EditMemberModal({ member, isOpen, onClose, onSuccess }: EditMemberModalProps) {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        tc_identity: '',
        phone: '',
        email: '',
        city: '',
        district: '',
        address: '',
        workplace: '',
        position: '',
        education_level: '',
        marital_status: '',
        children_count: 0,
        birth_date: '',
        gender: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [workplaces, setWorkplaces] = useState<any[]>([])
    const [positions, setPositions] = useState<any[]>([])

    const currentUser = AdminAuth.getCurrentUser()
    const canEditBranch = currentUser?.role_type !== 'branch_manager'

    useEffect(() => {
        if (member) {
            setFormData({
                first_name: member.first_name || '',
                last_name: member.last_name || '',
                tc_identity: member.tc_identity || '',
                phone: member.phone || '',
                email: member.email || '',
                city: member.city || '',
                district: member.district || '',
                address: member.address || '',
                workplace: member.workplace || '',
                position: member.position || '',
                education_level: member.education_level || '',
                marital_status: member.marital_status || '',
                children_count: member.children_count || 0,
                birth_date: member.birth_date ? member.birth_date.split('T')[0] : '',
                gender: member.gender || ''
            })
        }
    }, [member])

    useEffect(() => {
        const fetchDefinitions = async () => {
            try {
                const [workplaceData, positionData] = await Promise.all([
                    MemberService.getDefinitions('workplace'),
                    MemberService.getDefinitions('position')
                ])
                setWorkplaces(workplaceData)
                setPositions(positionData)
            } catch (error) {
                console.error('Tanımlar yüklenirken hata:', error)
            }
        }

        if (isOpen) {
            fetchDefinitions()
        }
    }, [isOpen])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value) : value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            await MemberService.updateMember(member.id, formData)
            onSuccess()
            onClose()
        } catch (err) {
            console.error('Update error:', err)
            setError('Güncelleme sırasında bir hata oluştu.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-4 border border-gray-200 dark:border-slate-700 w-full max-w-2xl shadow-lg dark:shadow-slate-900/40 rounded-lg bg-white dark:bg-slate-900">
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Üye Düzenle</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Ad</label>
                            <input
                                type="text"
                                name="first_name"
                                required
                                value={formData.first_name || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Soyad</label>
                            <input
                                type="text"
                                name="last_name"
                                required
                                value={formData.last_name || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">TC Kimlik</label>
                            <input
                                type="text"
                                name="tc_identity"
                                maxLength={11}
                                value={formData.tc_identity || ''}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Doğum Tarihi</label>
                            <input
                                type="date"
                                value={formData.birth_date || ''}
                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telefon</label>
                            <input
                                type="tel"
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-posta</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">İl</label>
                            <select
                                value={formData.city || ''}
                                onChange={e => setFormData({ ...formData, city: e.target.value })}
                                disabled={!canEditBranch}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700 disabled:opacity-50"
                            >
                                <option value="">Seçiniz</option>
                                {cities.map(city => (
                                    <option key={city.code} value={city.name}>{city.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">İlçe</label>
                            <input
                                type="text"
                                value={formData.district || ''}
                                onChange={e => setFormData({ ...formData, district: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                                placeholder="İlçe giriniz"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Adres</label>
                        <textarea
                            value={formData.address || ''}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">İşyeri</label>
                            <input
                                type="text"
                                value={formData.workplace || ''}
                                onChange={e => setFormData({ ...formData, workplace: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pozisyon / Unvan</label>
                            <input
                                type="text"
                                value={formData.position || ''}
                                onChange={e => setFormData({ ...formData, position: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Eğitim</label>
                            <select
                                value={formData.education_level || ''}
                                onChange={e => setFormData({ ...formData, education_level: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            >
                                <option value="">Seçiniz</option>
                                <option value="İlköğretim">İlköğretim</option>
                                <option value="Lise">Lise</option>
                                <option value="Önlisans">Önlisans</option>
                                <option value="Lisans">Lisans</option>
                                <option value="Yüksek Lisans">Yüksek Lisans</option>
                                <option value="Doktora">Doktora</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Medeni Durum</label>
                            <select
                                value={formData.marital_status || ''}
                                onChange={e => setFormData({ ...formData, marital_status: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            >
                                <option value="">Seçiniz</option>
                                <option value="Evli">Evli</option>
                                <option value="Bekar">Bekar</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Çocuk Sayısı</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.children_count || 0}
                                onChange={e => setFormData({ ...formData, children_count: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                            <Save className="w-4 h-4 mr-2" />
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
