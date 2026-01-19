'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { ArrowLeft, Upload, FileText, Download, Trash2, Eye, X, Check, UserCheck, UserX, Clock } from 'lucide-react';

interface Member {
  id: string;
  membership_number: string;
  first_name: string;
  last_name: string;
  tc_identity: string;
  birth_date: string;
  gender: string;
  city: string;
  district: string;
  phone: string | null;
  email: string | null;
  address: string;
  workplace: string;
  position: string;
  region: number | null;
  membership_status: 'pending' | 'active' | 'inactive' | 'suspended';
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  education_level: string;
  marital_status: string;
  children_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
}

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const memberId = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  const loadMemberData = async () => {
    try {
      // Üye bilgilerini yükle
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single();

      if (memberError) throw memberError;

      const viewer = AdminAuth.getCurrentUser();
      if (viewer && !PermissionManager.canViewMembers(viewer, memberData?.region, memberData?.city)) {
        alert('Bu üyeyi görüntüleme yetkiniz bulunmuyor.');
        router.push('/admin/members');
        return;
      }

      setMember(memberData);

      // Üye belgelerini yükle
      const { data: docsData, error: docsError } = await supabase
        .from('member_documents')
        .select('*')
        .eq('member_id', memberId)
        .eq('is_active', true)
        .order('uploaded_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
      alert('Veri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !documentName || !documentType) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    setUploading(true);
    try {
      // Dosyayı storage'a yükle
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${memberId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('member-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Storage URL'ini al
      const { data: { publicUrl } } = supabase.storage
        .from('member-documents')
        .getPublicUrl(fileName);

      // Veritabanına kaydet
      const { error: dbError } = await supabase
        .from('member_documents')
        .insert({
          member_id: memberId,
          document_name: documentName,
          document_type: documentType,
          file_url: publicUrl,
          file_size: selectedFile.size
        });

      if (dbError) throw dbError;

      alert('Dosya başarıyla yüklendi.');
      setShowUploadModal(false);
      setDocumentName('');
      setDocumentType('');
      setSelectedFile(null);
      loadMemberData();
    } catch (error) {
      console.error('Dosya yüklenirken hata:', error);
      alert('Dosya yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId: string, fileUrl: string) => {
    if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;

    try {
      // Storage'dan dosyayı sil
      const filePath = fileUrl.split('/').slice(-2).join('/');
      await supabase.storage
        .from('member-documents')
        .remove([filePath]);

      // Veritabanından soft delete
      const { error } = await supabase
        .from('member_documents')
        .update({ is_active: false })
        .eq('id', docId);

      if (error) throw error;

      alert('Belge başarıyla silindi.');
      loadMemberData();
    } catch (error) {
      console.error('Belge silinirken hata:', error);
      alert('Belge silinirken bir hata oluştu.');
    }
  };

  const updateMemberStatus = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({
          membership_status: newStatus,
          is_active: newStatus === 'active'
        })
        .eq('id', memberId);

      if (error) throw error;

      alert('Üye durumu başarıyla güncellendi.');
      loadMemberData();
    } catch (error) {
      console.error('Üye durumu güncellenirken hata:', error);
      alert('Üye durumu güncellenirken bir hata oluştu.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Beklemede' },
      active: { color: 'bg-green-100 text-green-800', icon: UserCheck, text: 'Aktif' },
      inactive: { color: 'bg-gray-100 text-gray-800', icon: UserX, text: 'Pasif' },
      suspended: { color: 'bg-red-100 text-red-800', icon: X, text: 'Askıda' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Üye bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Başlık */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/admin/members')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {member.first_name} {member.last_name}
            </h1>
            <p className="text-gray-600 mt-1">Üye No: {member.membership_number || '-'}</p>
            {member.region && (
              <p className="text-sm text-gray-500 mt-1">{member.region}. Bölge</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {getStatusBadge(member.membership_status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol Kolon - Üye Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kişisel Bilgiler */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Kişisel Bilgiler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">TC Kimlik</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.tc_identity}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Doğum Tarihi</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {member.birth_date ? new Date(member.birth_date).toLocaleDateString('tr-TR') : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Cinsiyet</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.gender}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Medeni Durum</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.marital_status || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Çocuk Sayısı</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.children_count}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Eğitim Durumu</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.education_level || '-'}</dd>
              </div>
            </div>
          </div>

          {/* İletişim Bilgileri */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İletişim Bilgileri</h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefon</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">E-posta</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">İl / İlçe</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.city} / {member.district}</dd>
              </div>
              {member.region && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Bölge</dt>
                  <dd className="text-sm text-gray-900 mt-1">{member.region}. Bölge</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Adres</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.address || '-'}</dd>
              </div>
            </div>
          </div>

          {/* İş Bilgileri */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">İş Bilgileri</h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">İşyeri</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.workplace || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Pozisyon</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.position || '-'}</dd>
              </div>
            </div>
          </div>

          {/* Acil Durum */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acil Durum İletişim</h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Kişi</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.emergency_contact_name || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Telefon</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.emergency_contact_phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Yakınlık</dt>
                <dd className="text-sm text-gray-900 mt-1">{member.emergency_contact_relation || '-'}</dd>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Kolon - Özlük Dosyaları ve İşlemler */}
        <div className="space-y-6">
          {/* Durum İşlemleri */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Durum İşlemleri</h2>
            <div className="space-y-3">
              {member.membership_status === 'pending' && (
                <>
                  <button
                    onClick={() => updateMemberStatus('active')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Üyeliği Onayla
                  </button>
                  <button
                    onClick={() => updateMemberStatus('inactive')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reddet
                  </button>
                </>
              )}
              {member.membership_status === 'active' && (
                <button
                  onClick={() => updateMemberStatus('suspended')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Askıya Al
                </button>
              )}
              {member.membership_status === 'suspended' && (
                <button
                  onClick={() => updateMemberStatus('active')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Aktif Et
                </button>
              )}
            </div>
          </div>

          {/* Özlük Dosyaları */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Özlük Dosyaları</h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Dosya Yükle
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Henüz belge yüklenmemiş</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">{doc.document_name}</h4>
                      <p className="text-xs text-gray-500">
                        {doc.document_type} • {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(doc.file_url, '_blank')}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Görüntüle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = doc.file_url;
                          link.download = doc.document_name;
                          link.click();
                        }}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="İndir"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteDocument(doc.id, doc.file_url)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dosya Yükleme Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Dosya Yükle</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Belge Adı
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Belge adını girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Belge Türü
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Belge türü seçin</option>
                  <option value="kimlik">Kimlik Belgesi</option>
                  <option value="diploma">Diploma</option>
                  <option value="sertifika">Sertifika</option>
                  <option value="cv">Özgeçmiş</option>
                  <option value="referans">Referans Mektubu</option>
                  <option value="saglik">Sağlık Raporu</option>
                  <option value="adli_sicil">Adli Sicil Belgesi</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosya
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  PDF, Word, JPG, PNG dosyaları desteklenir
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  İptal
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={uploading || !selectedFile || !documentName || !documentType}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Yükleniyor...' : 'Yükle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
