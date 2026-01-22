
import { useState } from 'react'
import { X, AlertTriangle, FileUp, Mail, MessageSquare, Check } from 'lucide-react'
import { MemberService } from '@/lib/services/memberService'
import { AdminAuth } from '@/lib/auth'

interface ResignationModalProps {
    member: any
    onClose: () => void
    onSuccess: () => void
}

export default function ResignationModal({ member, onClose, onSuccess }: ResignationModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [confirmName, setConfirmName] = useState('')
    const [resignationReason, setResignationReason] = useState('')
    const [resignationDate, setResignationDate] = useState(new Date().toISOString().split('T')[0])
    const [sendSms, setSendSms] = useState(false)
    const [sendEmail, setSendEmail] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const maxFileSizeBytes = 10 * 1024 * 1024

    const currentUser = AdminAuth.getCurrentUser()
    const fullName = `${member.first_name} ${member.last_name}`

    const resignationReasons = [
        { value: 'Disiplin Kurulu Kararı', label: 'Disiplin Kurulu Kararı' },
        { value: 'İş Kolu Değişikliği', label: 'İş Kolu Değişikliği' },
        { value: 'Kendi İsteğiyle İstifa', label: 'Kendi İsteğiyle İstifa' },
        { value: 'Hatalı, Geçersiz Üyelik', label: 'Hatalı, Geçersiz Üyelik' },
        { value: 'Başka Sendika Üyesi', label: 'Başka Sendika Üyesi' },
        { value: 'Memurluktan İstifa Etti', label: 'Memurluktan İstifa Etti' },
        { value: 'Emeklilik', label: 'Emeklilik' },
        { value: 'Ölüm', label: 'Ölüm' },
        { value: 'Ücretsiz İzin (Pasif Üye)', label: 'Ücretsiz İzin (Pasif Üye)' },
    ]

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        if (selectedFile.size > maxFileSizeBytes) {
            setError('Dosya boyutu 10MB\'dan büyük olamaz.')
            e.target.value = ''
            return
        }

        setError(null)
        setFile(selectedFile)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (confirmName !== fullName) {
            setError('Lütfen üyenin tam adını doğru yazın.');
            return;
        }

        if (!file) {
            setError('Lütfen istifa dilekçesini yükleyin.');
            return;
        }

        if (!resignationReason) {
            setError('Lütfen istifa nedenini seçin.');
            return;
        }

        if (!resignationDate) {
            setError('Lütfen istifa tarihini seçin.');
            return;
        }

        setLoading(true)
        setError(null)

        try {
            await MemberService.resignMember(
                member.id,
                file,
                currentUser?.id || '',
                resignationReason,
                resignationDate,
                sendSms,
                sendEmail
            )
            setIsSuccess(true)
        } catch (err) {
            console.error('Resignation error:', err)
            setError(err instanceof Error ? err.message : 'İşlem sırasında bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                <div className="relative mx-auto p-8 border border-green-200 dark:border-green-900 w-full max-w-md shadow-xl dark:shadow-slate-900/40 rounded-lg bg-white dark:bg-slate-900 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                            <Check className="w-12 h-12 text-green-600 dark:text-green-500" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">İşlem Başarılı</h3>
                    <p className="text-gray-600 dark:text-slate-400 mb-6">
                        <strong>{fullName}</strong> isimli üyenin istifa işlemi tamamlanmış ve statüsü <strong>İstifa (Pasif)</strong> olarak güncellenmiştir.
                    </p>
                    <button
                        onClick={() => {
                            onSuccess()
                            onClose()
                        }}
                        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Tamam
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-4 border border-red-200 dark:border-red-900 w-full max-w-lg shadow-xl dark:shadow-slate-900/40 rounded-lg bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-slate-800 pb-3">
                    <h3 className="text-lg font-bold text-red-600 dark:text-red-500 flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-2" />
                        Üye İstifa İşlemi
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md text-sm">
                    Bu işlem <strong>{fullName}</strong> isimli üyeyi <strong>İstifa</strong> durumuna getirecek ve istifa dilekçesini sisteme kaydedecektir.
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Resignation Reason & Date Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                İstifa Nedeni (Zorunlu)
                            </label>
                            <select
                                value={resignationReason}
                                onChange={(e) => setResignationReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-red-500 focus:border-red-500 dark:bg-slate-800 text-sm"
                                required
                            >
                                <option value="">Seçiniz</option>
                                {resignationReasons.map(reason => (
                                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                İstifa Tarihi (Zorunlu)
                            </label>
                            <input
                                type="date"
                                value={resignationDate}
                                onChange={(e) => setResignationDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-red-500 focus:border-red-500 dark:bg-slate-800 text-sm"
                                required
                            />
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            İstifa Dilekçesi (Zorunlu)
                        </label>
                        <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-gray-300 dark:border-slate-700 border-dashed rounded-md hover:border-red-400 transition-colors">
                            <div className="space-y-1 text-center">
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <FileUp className="mx-auto h-8 w-8 text-green-500" />
                                        <div className="flex text-sm text-gray-600 dark:text-slate-400 mt-1">
                                            <span className="font-medium text-green-600">{file.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFile(null)}
                                            className="text-xs text-red-500 mt-1 hover:underline"
                                        >
                                            Dosyayı Kaldır
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <FileUp className="mx-auto h-8 w-8 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 dark:text-slate-400">
                                            <label
                                                htmlFor="petition-upload"
                                                className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none"
                                            >
                                                <span>Dosya Yükle</span>
                                                <input id="petition-upload" name="petition-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                                            </label>
                                            <p className="pl-1">veya sürükle</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-500">
                                            PDF, PNG, JPG (Max 10MB)
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notification Options */}
                    <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-md">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Bildirim Seçenekleri
                        </label>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sendSms}
                                    onChange={(e) => setSendSms(e.target.checked)}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <MessageSquare className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700 dark:text-slate-300">SMS ile Bildir</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.checked)}
                                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                />
                                <Mail className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-700 dark:text-slate-300">E-posta ile Bildir</span>
                            </label>
                        </div>
                    </div>

                    {/* Confirmation Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Onaylamak için üyenin tam adını yazın: <span className="font-bold select-none">{fullName}</span>
                        </label>
                        <input
                            type="text"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-red-500 focus:border-red-500 dark:bg-slate-800"
                            placeholder={fullName}
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !file || confirmName !== fullName || !resignationReason || !resignationDate}
                            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                            İstifayı Onayla
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
