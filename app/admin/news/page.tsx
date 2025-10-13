'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuth } from '@/lib/auth';
import { AdminUser, News } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function NewsManagement() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [news, setNews] = useState<News[]>([]);
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
    loadNews();
  }, [router]);

  const loadNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setError('Haberler yüklenirken hata oluştu');
        return;
      }

      setNews(data || []);
    } catch (error) {
      setError('Haberler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu haberi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);

      if (error) {
        setError('Haber silinirken hata oluştu');
        return;
      }

      setNews(news.filter(item => item.id !== id));
    } catch (error) {
      setError('Haber silinirken hata oluştu');
    }
  };

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('news')
        .update({ 
          is_published: !currentStatus,
          published_at: !currentStatus ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) {
        setError('Haber durumu güncellenirken hata oluştu');
        return;
      }

      setNews(news.map(item => 
        item.id === id 
          ? { 
              ...item, 
              is_published: !currentStatus,
              published_at: !currentStatus ? new Date().toISOString() : undefined
            }
          : item
      ));
    } catch (error) {
      setError('Haber durumu güncellenirken hata oluştu');
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
          <h1 className="text-2xl font-bold text-gray-900">Haber Yönetimi</h1>
          <p className="text-gray-600 mt-1">Haberleri görüntüleyin ve yönetin</p>
        </div>
        <Link
          href="/admin/news/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Yeni Haber Ekle
        </Link>
      </div>

      {/* Main Content */}
      <div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* News List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {news.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Henüz haber bulunmuyor.</p>
                <Link
                  href="/admin/news/new"
                  className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  İlk Haberi Ekle
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {news.map((item) => (
                  <li key={item.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {item.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.is_published 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.is_published ? 'Yayında' : 'Taslak'}
                          </span>
                        </div>
                        {item.excerpt && (
                          <p className="mt-1 text-sm text-gray-500 truncate">
                            {item.excerpt}
                          </p>
                        )}
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span>
                            Oluşturulma: {new Date(item.created_at).toLocaleDateString('tr-TR')}
                          </span>
                          {item.published_at && (
                            <span className="ml-4">
                              Yayın: {new Date(item.published_at).toLocaleDateString('tr-TR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => togglePublish(item.id, item.is_published)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            item.is_published
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {item.is_published ? 'Yayından Kaldır' : 'Yayınla'}
                        </button>
                        <Link
                          href={`/admin/news/edit/${item.id}`}
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
