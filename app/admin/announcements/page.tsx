'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import { AdminUser, Announcement } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AnnouncementManagement() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const currentUser = AdminAuth.getCurrentUser();
    if (!currentUser) {
      router.push('/admin/login');
      return;
    }
    setUser(currentUser);
    loadAnnouncements();
  }, [router]);

  const loadAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError('Duyurular yüklenirken hata oluştu');
        return;
      }

      setAnnouncements(data || []);
    } catch (error) {
      setError('Duyurular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu duyuruyu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        setError('Duyuru silinirken hata oluştu');
        return;
      }

      setAnnouncements(announcements.filter(item => item.id !== id));
    } catch (error) {
      setError('Duyuru silinirken hata oluştu');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) {
        setError('Duyuru durumu güncellenirken hata oluştu');
        return;
      }

      setAnnouncements(announcements.map(item => 
        item.id === id 
          ? { ...item, is_active: !currentStatus }
          : item
      ));
    } catch (error) {
      setError('Duyuru durumu güncellenirken hata oluştu');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'Acil';
      case 'warning':
        return 'Uyarı';
      case 'info':
        return 'Bilgi';
      default:
        return 'Genel';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duyuru Yönetimi</h1>
          <p className="text-gray-600 mt-1">Duyuruları görüntüleyin ve yönetin</p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Yeni Duyuru Ekle
        </Link>
      </div>

      {/* Main Content */}
      <div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Announcements List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Henüz duyuru bulunmuyor.</p>
                <Link
                  href="/admin/announcements/new"
                  className="mt-4 inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  İlk Duyuruyu Ekle
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {announcements.map((item) => (
                  <li key={item.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {item.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                            {getTypeText(item.type)}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.is_active ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500 truncate">
                          {item.content.length > 100 ? `${item.content.substring(0, 100)}...` : item.content}
                        </p>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span>
                            Oluşturulma: {new Date(item.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleActive(item.id, item.is_active)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            item.is_active
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {item.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                        </button>
                        <Link
                          href={`/admin/announcements/edit/${item.id}`}
                          className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-1 rounded text-sm font-medium"
                        >
                          Düzenle
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="bg-red-100 text-red-800 hover:bg-red-200 px-3 py-1 rounded text-sm font-medium"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
      </div>
    </div>
  );
}
