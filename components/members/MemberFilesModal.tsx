
import { useState, useEffect } from 'react'
import { X, Upload, FileText, Trash2, Download, AlertCircle } from 'lucide-react'
import { MemberService, MemberDocument } from '@/lib/services/memberService'
import { AdminAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

interface MemberFilesModalProps {
    member: any
    onClose: () => void
}

export default function MemberFilesModal({ member, onClose }: MemberFilesModalProps) {
    const [documents, setDocuments] = useState<MemberDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const currentUser = AdminAuth.getCurrentUser()

    useEffect(() => {
        loadDocuments()
    }, [member.id])

    const loadDocuments = async () => {
        setLoading(true)
        try {
            const docs = await MemberService.getMemberDocuments(member.id)
            // Filter only personnel files or generic docs, exclude resignation petitions if needed, or show all
            // Here we show 'personnel_file' and 'other' mainly, but let's show all for now except resignation maybe? 
            // Or show all and badge them. Let's show all.
            setDocuments(docs)
        } catch (err) {
            console.error('Documents load error:', err)
            setError('Belgeler yüklenirken hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        // Max 10MB check
        if (file.size > 10 * 1024 * 1024) {
            alert('Dosya boyutu 10MB\'dan büyük olamaz.')
            return
        }

        setUploading(true)
        setError(null)

        try {
            const fileName = `personnel_${member.id}_${Date.now()}_${file.name}`
            const filePath = `${member.id}/${fileName}`

            // 1. Upload
            // path is returned directly
            const uploadedPath = await MemberService.uploadDocument(file, filePath)

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage.from('member-documents').getPublicUrl(uploadedPath || filePath)


            await MemberService.createDocumentRecord({
                member_id: member.id,
                document_type: 'personnel_file',
                file_name: file.name,
                file_url: publicUrl,
                file_size: file.size,
                mime_type: file.type,
                uploaded_by: currentUser?.id
            })

            loadDocuments()

        } catch (err) {
            console.error('Upload error:', err)
            setError('Dosya yüklenirken hata oluştu.')
        } finally {
            setUploading(false)
            // Clear input
            e.target.value = ''
        }
    }

    const handleDelete = async (doc: MemberDocument) => {
        if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return

        try {
            // Extract path from URL or use logic? 
            // URL: .../member-documents/member_id/filename
            // The service delete expects "filePath". 
            // We can reconstruct it or store path in DB. We didn't store path in DB, only URL.
            // Logic: splits after bucket name.
            const urlObj = new URL(doc.file_url)
            const pathParts = urlObj.pathname.split('/member-documents/')
            const filePath = pathParts[1] // member_id/filename

            if (filePath) {
                await MemberService.deleteDocument(doc.id, filePath)
                setDocuments(prev => prev.filter(d => d.id !== doc.id))
            } else {
                throw new Error('Dosya yolu bulunamadı.')
            }

        } catch (err) {
            console.error('Delete error:', err)
            alert('Silme işlemi başarısız.')
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-4 border border-gray-200 dark:border-slate-700 w-full max-w-2xl shadow-lg dark:shadow-slate-900/40 rounded-lg bg-white dark:bg-slate-900 h-[600px] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-primary-600" />
                        Üye Özlük Dosyası: {member.first_name} {member.last_name}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Upload Section */}
                <div className="mb-6 p-4 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg hover:border-blue-500 transition-colors bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex flex-col items-center justify-center">
                        {uploading ? (
                            <div className="flex items-center text-blue-600">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                                Yükleniyor...
                            </div>
                        ) : (
                            <>
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Yeni belge yüklemek için tıklayın</p>
                                <input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 cursor-pointer text-sm font-medium"
                                >
                                    Dosya Seç
                                </label>
                            </>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {/* File List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            Henüz yüklenmiş belge yok.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-slate-800">
                            {documents.map((doc) => (
                                <li key={doc.id} className="py-3 px-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-md transition-colors">
                                    <div className="flex items-center min-w-0">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3">
                                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate max-w-xs">{doc.file_name}</p>
                                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                                {new Date(doc.created_at).toLocaleDateString('tr-TR')} • {(doc.file_size / 1024).toFixed(1)} KB
                                                {doc.document_type === 'resignation_petition' && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] rounded-full">İstifa Dilekçesi</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <a
                                            href={doc.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors"
                                            title="İndir / Görüntüle"
                                            download
                                        >
                                            <Download className="w-5 h-5" />
                                        </a>
                                        <button
                                            onClick={() => handleDelete(doc)}
                                            className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"
                                            title="Sil"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
