'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { AdminUser } from '@/lib/types';
import { Search, Eye, Check, X, Filter, Download, UserCheck, UserX, Clock, FileText, MapPin, Plus, Edit, AlertTriangle, FileUp, LogOut } from 'lucide-react';
import EditMemberModal from '@/components/members/EditMemberModal';
import MemberFilesModal from '@/components/members/MemberFilesModal';
import ResignationModal from '@/components/members/ResignationModal';

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
  region: number | null;
  address: string;
  workplace: string;
  position: string;
  membership_status: 'pending' | 'active' | 'inactive' | 'suspended' | 'resigned';
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

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showResignationModal, setShowResignationModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // Kullanıcı bilgilerini al
    const user = AdminAuth.getCurrentUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    // Kullanıcı bilgileri yüklendikten sonra üyeleri getir
    if (currentUser) {
      loadMembers();
    }
  }, [currentUser]);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, statusFilter]);

  const loadMembers = async () => {
    try {
      let query = supabase
        .from('members')
        .select('*');

      if (currentUser && currentUser.role_type === 'branch_manager' && currentUser.city) {
        query = query.eq('city', currentUser.city);
      } else if (currentUser && currentUser.role_type === 'regional_manager' && currentUser.region) {
        query = query.eq('region', currentUser.region);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Üyeler yüklenirken hata:', error);
      alert('Üyeler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = [...members];

    // Durum filtresi
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member.membership_status === statusFilter);
    }

    // Arama filtresi
    if (searchTerm) {
      const lowered = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        member.first_name.toLowerCase().includes(lowered) ||
        member.last_name.toLowerCase().includes(lowered) ||
        member.tc_identity.includes(searchTerm) ||
        (member.email?.toLowerCase().includes(lowered) ?? false) ||
        (member.phone?.includes(searchTerm) ?? false) ||
        (member.membership_number?.toLowerCase().includes(lowered) ?? false)
      );
    }

    setFilteredMembers(filtered);
  };

  const getMissingContactFields = (member: Member) => {
    const missing: string[] = [];
    if (!member.phone) missing.push('Telefon');
    if (!member.email) missing.push('E-posta');
    return missing;
  };

  const updateMemberStatus = async (memberId: string, newStatus: string) => {
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
      loadMembers();
      setShowDetails(false);
    } catch (error) {
      console.error('Üye durumu güncellenirken hata:', error);
      alert('Üye durumu güncellenirken bir hata oluştu.');
    }
  };

  const exportToCSV = () => {
    const headers = ['Üye No', 'Ad', 'Soyad', 'TC Kimlik', 'Telefon', 'E-posta', 'İl', 'İlçe', 'Durum', 'Kayıt Tarihi'];
    const csvContent = [
      headers.join(','),
      ...filteredMembers.map(member => [
        member.membership_number || '',
        member.first_name,
        member.last_name,
        member.tc_identity,
        member.phone ?? '',
        member.email ?? '',
        member.city,
        member.district,
        member.membership_status,
        new Date(member.created_at).toLocaleDateString('tr-TR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uyeler_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300', icon: Clock, text: 'Beklemede' },
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300', icon: UserCheck, text: 'Aktif' },
      inactive: { color: 'bg-gray-100 text-gray-800 dark:bg-slate-700/40 dark:text-slate-200', icon: UserX, text: 'Pasif' },
      suspended: { color: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300', icon: X, text: 'Askıda' },
      resigned: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300', icon: LogOut, text: 'İstifa' }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">Üyeler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 text-slate-900 dark:text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Üye Yönetimi</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-1">
          {currentUser?.role_type === 'branch_manager' && currentUser.city
            ? `${currentUser.city} şubesi üyelerini görüntüleyin ve yönetin`
            : 'Sendika üyelerini görüntüleyin ve yönetin'
          }
        </p>
        {currentUser?.role_type === 'branch_manager' && currentUser.city && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
            <MapPin className="w-4 h-4 mr-1 text-blue-600 dark:text-blue-300" />
            {currentUser.city} Şubesi
          </div>
        )}
      </div>

      {/* Filtreler ve Arama */}
      <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Ad, soyad, TC, e-posta veya telefon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="text-gray-400 dark:text-slate-500 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-900/60 text-gray-900 dark:text-slate-100"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="suspended">Askıda</option>
              <option value="resigned">İstifa</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => router.push('/admin/members/new')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Üye
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV İndir
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
          <span>Toplam {filteredMembers.length} üye bulundu</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="w-3 h-3 bg-yellow-100 dark:bg-yellow-500/40 rounded-full mr-1"></span>
              Beklemede: {members.filter(m => m.membership_status === 'pending').length}
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-green-100 dark:bg-green-500/40 rounded-full mr-1"></span>
              Aktif: {members.filter(m => m.membership_status === 'active').length}
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-orange-100 dark:bg-orange-500/40 rounded-full mr-1"></span>
              İstifa: {members.filter(m => m.membership_status === 'resigned').length}
            </span>
          </div>
        </div>
      </div>

      {/* Üye Listesi */}
      <div className="bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm dark:shadow-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-900/60">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Üye No
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  TC Kimlik
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  İletişim
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Konum
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-slate-800">
              {filteredMembers.map((member) => {
                const missingFields = getMissingContactFields(member);
                return (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                      {member.membership_number || '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          {member.first_name} {member.last_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {member.gender} • {member.birth_date ? new Date(member.birth_date).toLocaleDateString('tr-TR') : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {member.tc_identity}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-slate-100">{member.phone || '-'}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{member.email || '-'}</div>
                      {missingFields.length > 0 && (
                        <div
                          className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] dark:bg-amber-500/20 dark:text-amber-200"
                          title={`Eksik alanlar: ${missingFields.join(', ')}`}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Eksik bilgi
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-slate-100">{member.city}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{member.district}</div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getStatusBadge(member.membership_status)}
                      {member.membership_status === 'resigned' && (
                        <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-1">İstifa etti</div>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {new Date(member.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowDetails(true);
                          }}
                          className="text-primary-600 hover:text-primary-900"
                          title="Detayları Görüntüle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMember(member)
                            setShowEditModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Düzenle"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMember(member)
                            setShowFilesModal(true)
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="Özlük Dosyaları"
                        >
                          <FileText className="w-5 h-5" />
                        </button>

                        {member.membership_status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedMember(member)
                              setShowResignationModal(true)
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="İstifa İşlemi"
                          >
                            <LogOut className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showEditModal && selectedMember && (
        <EditMemberModal
          member={selectedMember}
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadMembers()
            setShowEditModal(false)
          }}
        />
      )}

      {showFilesModal && selectedMember && (
        <MemberFilesModal
          member={selectedMember}
          onClose={() => setShowFilesModal(false)}
        />
      )}

      {showResignationModal && selectedMember && (
        <ResignationModal
          member={selectedMember}
          onClose={() => setShowResignationModal(false)}
          onSuccess={() => {
            loadMembers()
            setShowResignationModal(false)
          }}
        />
      )}

      {/* Üye Detay Modal */}
      {showDetails && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-4 border border-gray-200 dark:border-slate-700 w-full max-w-4xl shadow-lg dark:shadow-slate-900/40 rounded-md bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">Üye Detayları</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-500 dark:hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-900 dark:text-slate-100">
              {/* Kişisel Bilgiler */}
              <div className="col-span-1 md:col-span-2 bg-gray-50 dark:bg-slate-900/60 p-4 rounded-lg border border-gray-100 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-4 border-b border-gray-200 dark:border-slate-700 pb-2">Kişisel Bilgiler</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Üye No</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100 font-medium">{selectedMember.membership_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Ad Soyad</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100 font-medium">{selectedMember.first_name} {selectedMember.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">TC Kimlik No</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">{selectedMember.tc_identity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Doğum Tarihi</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">
                      {selectedMember.birth_date ? new Date(selectedMember.birth_date).toLocaleDateString('tr-TR') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Cinsiyet</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">{selectedMember.gender}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Medeni Durum / Çocuk</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">
                      {selectedMember.marital_status || '-'} / {selectedMember.children_count}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Eğitim Durumu</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">{selectedMember.education_level || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Acil Durum Kişisi</p>
                    <p className="mt-1 text-slate-900 dark:text-slate-100">
                      {selectedMember.emergency_contact_name} ({selectedMember.emergency_contact_relation})
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMember.emergency_contact_phone}</p>
                  </div>
                </div>
              </div>

              {/* İletişim Bilgileri */}
              <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">İletişim Bilgileri</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Telefon</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">E-posta</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.email || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">İl / İlçe</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.city} / {selectedMember.district}</dd>
                  </div>
                  {selectedMember.region && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Bölge</dt>
                      <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.region}. Bölge</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Adres</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.address || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* İş Bilgileri */}
              <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">İş Bilgileri</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">İşyeri</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.workplace || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Pozisyon</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.position || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Acil Durum */}
              <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-lg border border-gray-100 dark:border-slate-800">
                <h4 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">Acil Durum İletişim</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Kişi</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.emergency_contact_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Telefon</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.emergency_contact_phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Yakınlık</dt>
                    <dd className="text-sm text-gray-900 dark:text-slate-100">{selectedMember.emergency_contact_relation || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Durum ve İşlemler */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400 mr-2">Mevcut Durum:</span>
                  {getStatusBadge(selectedMember.membership_status)}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => setShowFilesModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Özlük Dosyaları
                  </button>
                  {selectedMember.membership_status === 'active' && (
                    <button
                      onClick={() => setShowResignationModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      İstifa İşlemi
                    </button>
                  )}
                  {selectedMember.membership_status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateMemberStatus(selectedMember.id, 'active')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        Üyeliği Onayla
                      </button>
                      <button
                        onClick={() => updateMemberStatus(selectedMember.id, 'inactive')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Reddet
                      </button>
                    </>
                  )}
                  {selectedMember.membership_status === 'active' && (
                    <button
                      onClick={() => updateMemberStatus(selectedMember.id, 'suspended')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                    >
                      Askıya Al
                    </button>
                  )}
                  {selectedMember.membership_status === 'suspended' && (
                    <button
                      onClick={() => updateMemberStatus(selectedMember.id, 'active')}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Aktif Et
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
