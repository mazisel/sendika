
import { useState } from 'react'
import { X, AlertTriangle, FileUp } from 'lucide-react'
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

    const currentUser = AdminAuth.getCurrentUser()
    const fullName = `${member.first_name} ${member.last_name}`

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

        setLoading(true)
        setError(null)

        try {
            await MemberService.resignMember(member.id, file, currentUser?.id || '')
            onSuccess()
            onClose()
        } catch (err) {
            console.error('Resignation error:', err)
            setError('İşlem sırasında bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-4 border border-red-200 dark:border-red-900 w-full max-w-lg shadow-xl dark:shadow-slate-900/40 rounded-lg bg-white dark:bg-slate-900">
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
                    Bu işlem <strong>{fullName}</strong> isimli üyeyi <strong>İstifa (Resigned)</strong> durumuna getirecek ve istifa dilekçesini sisteme kaydedecektir.
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            İstifa Dilekçesi (Zorunlu)
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-slate-700 border-dashed rounded-md hover:border-red-400 transition-colors">
                            <div className="space-y-1 text-center">
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <FileUp className="mx-auto h-12 w-12 text-green-500" />
                                        <div className="flex text-sm text-gray-600 dark:text-slate-400 mt-2">
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
                                        <FileUp className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600 dark:text-slate-400">
                                            <label
                                                htmlFor="petition-upload"
                                                className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none"
                                            >
                                                <span>Dosya Yükle</span>
                                                <input id="petition-upload" name="petition-upload" type="file" className="sr-only" onChange={(e) => e.target.files && setFile(e.target.files[0])} accept=".pdf,.jpg,.jpeg,.png" />
                                            </label>
                                            <p className="pl-1">veya sürükleyip bırakın</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-slate-500">
                                            PDF, PNG, JPG (Max 10MB)
                                        </p>
                                    </>
                                )}
                            </div>
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
                            disabled={loading || !file || confirmName !== fullName}
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
