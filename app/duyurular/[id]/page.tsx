import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, ArrowLeft, User, AlertCircle, Info, Megaphone } from 'lucide-react';

interface Params {
  params: {
    id: string;
  };
}

export const revalidate = 0;

const typeMap = {
  urgent: {
    title: 'Acil Duyuru',
    icon: AlertCircle,
    badgeClass: 'bg-red-50 border border-red-200 text-red-700',
    headingClass: 'text-red-800',
  },
  info: {
    title: 'Bilgilendirme',
    icon: Info,
    badgeClass: 'bg-green-50 border border-green-200 text-green-700',
    headingClass: 'text-green-800',
  },
  general: {
    title: 'Genel Duyuru',
    icon: Megaphone,
    badgeClass: 'bg-blue-50 border border-blue-200 text-blue-700',
    headingClass: 'text-blue-800',
  },
} as const;

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

export default async function DuyuruDetay({ params }: Params) {
  const { id } = params;

  const { data: announcement, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !announcement) {
    notFound();
  }

  const { data: otherAnnouncementsData } = await supabase
    .from('announcements')
    .select('id, title, created_at')
    .eq('is_active', true)
    .neq('id', id)
    .order('created_at', { ascending: false })
    .limit(4);

  const otherAnnouncements = otherAnnouncementsData ?? [];

  const typeInfo =
    typeMap[(announcement.type as keyof typeof typeMap) || 'general'] ?? typeMap.general;
  const TypeIcon = typeInfo.icon;

  return (
    <>
      <section className="header-gradient text-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/duyurular"
            className="inline-flex items-center text-blue-100 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Duyurulara dön
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-white/10 border border-white/30 text-white">
            <TypeIcon className="w-4 h-4" />
            {typeInfo.title}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mt-4">{announcement.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-blue-100 mt-4">
            <span className="inline-flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {formatDate(announcement.created_at)}
            </span>
            {announcement.author && (
              <span className="inline-flex items-center">
                <User className="w-4 h-4 mr-2" />
                {announcement.author}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 md:p-10 space-y-6">
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${typeInfo.badgeClass}`}>
                <TypeIcon className="w-4 h-4" />
                {typeInfo.title}
              </span>
              <h2 className={`text-xl font-semibold mb-4 ${typeInfo.headingClass}`}>
                {typeInfo.title}
              </h2>
              <div className="text-lg text-slate-700 leading-relaxed whitespace-pre-wrap">
                {announcement.content}
              </div>
            </div>
          </article>

          {otherAnnouncements.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Diğer Duyurular</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {otherAnnouncements.map((item) => (
                  <Link
                    key={item.id}
                    href={`/duyurular/${item.id}`}
                    className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5"
                  >
                    <h3 className="text-lg font-semibold text-slate-900 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-3">
                      {formatDate(item.created_at)}
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
