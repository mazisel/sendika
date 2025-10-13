'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AdminAuth } from '@/lib/auth';
import { PermissionManager } from '@/lib/permissions';
import { AdminUser } from '@/lib/types';
import { Search, Eye, Check, X, Filter, Download, UserCheck, UserX, Clock, FileText, MapPin, Plus, Edit } from 'lucide-react';

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
  phone: string;
  email: string;
  address: string;
  workplace: string;
  position: string;
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

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showDetails, setShowDetails] = useState(false);
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

      // Şube yöneticisi ise sadece kendi ilindeki üyeleri getir
      if (currentUser && currentUser.role_type === 'branch_manager' && currentUser.city) {
        query = query.eq('city', currentUser.city);
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
      filtered = filtered.filter(member => 
        member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.tc_identity.includes(searchTerm) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone.includes(searchTerm) ||
        (member.membership_number && member.membership_number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredMembers(filtered);
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
        member.phone,
        member.email,
        member.city,
        member.district,
        member.membership_status,
        new Date(member.created_at).toLocaleDateString('tr-TR')
      ].join(','))
    ].join('\
');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `uyeler_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Üyeler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Üye Yönetimi</h1>
        <p className="text-gray-600 mt-1">
          {currentUser?.role_type === 'branch_manager' && currentUser.city
            ? `${currentUser.city} şubesi üyelerini görüntüleyin ve yönetin`
            : 'Sendika üyelerini görüntüleyin ve yönetin'
          }
        </p>
        {currentUser?.role_type === 'branch_manager' && currentUser.city && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
            <MapPin className="w-4 h-4 mr-1" />
            {currentUser.city} Şubesi
          </div>
        )}
      </div>

      {/* Filtreler ve Arama */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ad, soyad, TC, e-posta veya telefon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending">Beklemede</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="suspended">Askıda</option>
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

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Toplam {filteredMembers.length} üye bulundu</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className="w-3 h-3 bg-yellow-100 rounded-full mr-1"></span>
              Beklemede: {members.filter(m => m.membership_status === 'pending').length}
            </span>
            <span className="flex items-center">
              <span className="w-3 h-3 bg-green-100 rounded-full mr-1"></span>
              Aktif: {members.filter(m => m.membership_status === 'active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Üye Listesi */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Üye No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ad Soyad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TC Kimlik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İletişim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Konum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kayıt Tarihi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.membership_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.gender} • {member.birth_date ? new Date(member.birth_date).toLocaleDateString('tr-TR') : '-'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.tc_identity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.phone}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.city}</div>
                    <div className="text-sm text-gray-500">{member.district}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(member.membership_status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedMember(member);
                        setShowDetails(true);
                      }}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                      title="Detayları Görüntüle"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => router.push(`/admin/members/edit/${member.id}`)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Düzenle"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => router.push(`/admin/members/${member.id}`)}
                      className="text-purple-600 hover:text-purple-900 mr-3"
                      title="Özlük Dosyaları"
                    >
                      <FileText className="w-5 h-5" />
                    </button>
                    {member.membership_status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateMemberStatus(member.id, 'active')}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => updateMemberStatus(member.id, 'inactive')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Üye Detay Modal */}
      {showDetails && selectedMember && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Üye Detayları</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kişisel Bilgiler */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Kişisel Bilgiler</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Üye No</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.membership_number || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ad Soyad</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.first_name} {selectedMember.last_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">TC Kimlik</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.tc_identity}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Doğum Tarihi</dt>
                    <dd className="text-sm text-gray-900">
                      {selectedMember.birth_date ? new Date(selectedMember.birth_date).toLocaleDateString('tr-TR') : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Cinsiyet</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.gender}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Medeni Durum</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.marital_status || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Çocuk Sayısı</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.children_count}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Eğitim Durumu</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.education_level || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* İletişim Bilgileri */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">İletişim Bilgileri</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Telefon</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">E-posta</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">İl / İlçe</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.city} / {selectedMember.district}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Adres</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.address || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* İş Bilgileri */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">İş Bilgileri</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">İşyeri</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.workplace || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Pozisyon</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.position || '-'}</dd>
                  </div>
                </dl>
              </div>

              {/* Acil Durum */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Acil Durum İletişim</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Kişi</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.emergency_contact_name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Telefon</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.emergency_contact_phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Yakınlık</dt>
                    <dd className="text-sm text-gray-900">{selectedMember.emergency_contact_relation || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Durum ve İşlemler */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-500 mr-2">Mevcut Durum:</span>
                  {getStatusBadge(selectedMember.membership_status)}
                </div>
                <div className="flex space-x-3">
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
