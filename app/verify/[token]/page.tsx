import { Metadata } from 'next';
import Link from 'next/link';

import { supabaseAdmin } from '@/lib/supabase-admin';

type Params = {
  token: string;
};

type VerifyPayload = {
  id?: string;
  timestamp?: string;
};

type VerifiedMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  membership_number: string | null;
  tc_identity: string | null;
  city: string | null;
  district: string | null;
  workplace: string | null;
  position: string | null;
  membership_status: string | null;
  is_active: boolean | null;
  updated_at: string | null;
};

function decodePayload(token: string): VerifyPayload | null {
  try {
    const buffer = Buffer.from(token, 'base64url');
    const json = buffer.toString('utf8');
    const data = JSON.parse(json);
    if (typeof data !== 'object' || data === null) return null;
    return {
      id: typeof data.id === 'string' ? data.id : undefined,
      timestamp: typeof data.timestamp === 'string' ? data.timestamp : undefined,
    };
  } catch (error) {
    console.error('QR token decode failed:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const payload = decodePayload(params.token);
  return {
    title: payload?.id ? 'Üyelik Doğrulaması' : 'Geçersiz QR Kodu',
  };
}

export default async function VerifyMemberPage({ params }: { params: Params }) {
  const payload = decodePayload(params.token);

  if (!payload?.id) {
    return <InvalidState title="Geçersiz QR Kodu" description="Kod çözümlenemedi veya bozulmuş görünüyor." />;
  }

  const { data: member, error } = await supabaseAdmin
    .from('members')
    .select(
      [
        'id',
        'first_name',
        'last_name',
        'membership_number',
        'tc_identity',
        'city',
        'district',
        'workplace',
        'position',
        'membership_status',
        'is_active',
        'updated_at',
      ].join(','),
    )
    .eq('id', payload.id)
    .maybeSingle<VerifiedMember>();

  if (error) {
    console.error('Üye doğrulama sorgusu başarısız:', error);
    return <InvalidState title="Doğrulama başarısız" description="Sunucu hatası nedeniyle doğrulama gerçekleştirilemedi. Lütfen daha sonra tekrar deneyin." />;
  }

  if (!member) {
    return <InvalidState title="Üye bulunamadı" description="Bu QR kodu için herhangi bir üye kaydı bulunamadı." />;
  }

  const issuedAt = payload.timestamp ? new Date(payload.timestamp) : null;
  const codeAgeMinutes =
    issuedAt && Number.isFinite(issuedAt.getTime())
      ? Math.floor((Date.now() - issuedAt.getTime()) / 1000 / 60)
      : null;

  const isActive = Boolean(member.is_active) && member.membership_status !== 'inactive';
  const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || 'İsim bilgisi bulunamadı';
  const statusLabel = member.membership_status ?? (isActive ? 'active' : 'inactive');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-3xl">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm shadow-2xl shadow-slate-900/40 overflow-hidden">
          <header className="border-b border-slate-800 bg-gradient-to-r from-blue-600/40 to-indigo-600/30 px-8 py-6">
            <p className="text-sm uppercase tracking-widest text-blue-200/80 mb-2">Üyelik doğrulaması</p>
            <h1 className="text-3xl font-bold text-white">{fullName}</h1>
            <p className="text-sm text-blue-100/70 mt-3">
              Bu sayfa yalnızca sendika yetkilileri tarafından kullanılmak üzere hazırlanmıştır.
            </p>
          </header>

          <div className="px-8 py-6 grid gap-6 md:grid-cols-2">
            <InfoTile label="Üyelik Numarası" value={member.membership_number ?? 'Belirtilmemiş'} />
            <InfoTile label="TC Kimlik" value={member.tc_identity ?? 'Belirtilmemiş'} />
            <InfoTile label="Durum" value={isActive ? 'Aktif' : 'Pasif'} accent={isActive ? 'success' : 'danger'} />
            <InfoTile label="Üyelik Statüsü" value={statusLabel} />
            <InfoTile label="Pozisyon" value={member.position ?? 'Belirtilmemiş'} />
            <InfoTile label="Şehir" value={member.city ?? 'Belirtilmemiş'} />
            <InfoTile label="İlçe" value={member.district ?? 'Belirtilmemiş'} />
            <InfoTile label="Çalıştığı Kurum" value={member.workplace ?? 'Belirtilmemiş'} className="md:col-span-2" />
          </div>

          <footer className="px-8 py-6 border-t border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-xs text-slate-400 space-y-1">
              <p>
                QR oluşturulma zamanı:{' '}
                <span className="text-slate-200">{issuedAt ? issuedAt.toLocaleString('tr-TR') : 'Belirtilmemiş'}</span>
              </p>
              {codeAgeMinutes !== null && (
                <p>
                  Kod yaşı: <span className="text-slate-200">{codeAgeMinutes} dakika</span>
                </p>
              )}
              <p className="text-slate-500">
                Üye bilgileri Supabase veritabanından gerçek zamanlı olarak doğrulanmıştır.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Ana sayfaya dön
            </Link>
          </footer>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: string;
  accent?: 'success' | 'danger';
  className?: string;
}) {
  const accentClasses =
    accent === 'success'
      ? 'border-green-500/40 bg-green-500/10 text-green-200'
      : accent === 'danger'
        ? 'border-red-500/40 bg-red-500/10 text-red-200'
        : 'border-slate-700 bg-slate-900/80 text-slate-100';

  return (
    <div className={`rounded-2xl border px-5 py-4 shadow-sm shadow-black/20 ${accentClasses} ${className ?? ''}`}>
      <p className="text-xs uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function InvalidState({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full rounded-3xl border border-red-500/30 bg-red-500/10 px-8 py-10 text-center shadow-2xl shadow-red-900/30">
        <h1 className="text-3xl font-bold text-red-200">{title}</h1>
        <p className="mt-4 text-sm text-red-100/80">{description}</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-red-300/40 bg-red-500/20 px-4 py-2 text-sm font-medium text-red-50 hover:bg-red-500/30 transition-colors"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
