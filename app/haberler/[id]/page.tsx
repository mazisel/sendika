import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, User, ArrowLeft, Tag } from 'lucide-react';

interface NewsDetailParams {
  params: {
    id: string;
  };
}

export const revalidate = 0;

const formatDate = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default async function HaberDetay({ params }: NewsDetailParams) {
  const { id } = params;

  const { data: newsItem, error } = await supabase
    .from('news')
    .select(
      `
        *,
        category:categories(
          id,
          name,
          slug,
          color
        )
      `
    )
    .eq('id', id)
    .eq('is_published', true)
    .maybeSingle();

  if (error || !newsItem) {
    notFound();
  }

  const { data: otherNewsData } = await supabase
    .from('news')
    .select('id, title, published_at, created_at')
    .eq('is_published', true)
    .neq('id', id)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(3);

  const otherNews = otherNewsData ?? [];

  return (
    <>
      <section className="header-gradient text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/haberler"
            className="inline-flex items-center text-blue-100 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Haberler listesine dön
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold mb-3">
            {newsItem.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-blue-100">
            <div className="inline-flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDate(newsItem.published_at || newsItem.created_at)}
            </div>
            {newsItem.author && (
              <div className="inline-flex items-center">
                <User className="w-4 h-4 mr-2" />
                {newsItem.author}
              </div>
            )}
            {newsItem.category && (
              <div className="inline-flex items-center">
                <Tag className="w-4 h-4 mr-2" />
                {newsItem.category.name}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {newsItem.image_url && (
              <div className="w-full h-72 md:h-96 overflow-hidden">
                <img
                  src={newsItem.image_url}
                  alt={newsItem.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 md:p-10">
              {newsItem.excerpt && (
                <p className="text-lg text-primary-700 font-semibold mb-6">
                  {newsItem.excerpt}
                </p>
              )}

              <div className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                {newsItem.content}
              </div>
            </div>
          </article>

          {otherNews && otherNews.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                Diğer Haberler
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {otherNews.map((item) => (
                  <Link
                    key={item.id}
                    href={`/haberler/${item.id}`}
                    className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5"
                  >
                    <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-3">
                      {formatDate(item.published_at || item.created_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
