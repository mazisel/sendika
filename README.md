# Sendika Web Sitesi ve Admin Paneli

Bu proje, sendika için modern bir web sitesi ve kapsamlı admin panel sistemi içermektedir.

## Teknoloji Stack

- **Frontend**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **Veritabanı**: Supabase (PostgreSQL)
- **Authentication**: Custom admin auth sistemi
- **TypeScript**: Tip güvenliği için

## Özellikler

### Ana Web Sitesi
- Responsive tasarım
- Haberler slider'ı
- Duyurular bölümü
- Hizmetler ve hakkımızda sayfaları
- İletişim formu

### Admin Panel
- Güvenli giriş sistemi
- Haber yönetimi (CRUD)
- Duyuru yönetimi (CRUD)
- Üye yönetimi
- Admin kullanıcı yönetimi

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Environment variables dosyasını oluşturun:
```bash
cp .env.local.example .env.local
```

3. Supabase bilgilerini `.env.local` dosyasına ekleyin:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

## Veritabanı Kurulumu

Supabase projenizde aşağıdaki SQL komutlarını çalıştırın:

```sql
-- migrations/001_create_admin_tables.sql dosyasındaki SQL komutlarını çalıştırın
```

## Admin Panel Erişimi

Admin paneline erişim için:
- URL: `http://localhost:3000/admin/login`
- Test hesabı: `admin@sendika.com` / `admin123`

## Proje Yapısı

```
├── app/
│   ├── admin/           # Admin panel sayfaları
│   │   ├── login/       # Giriş sayfası
│   │   ├── dashboard/   # Ana dashboard
│   │   ├── news/        # Haber yönetimi
│   │   └── announcements/ # Duyuru yönetimi
│   ├── globals.css      # Global stiller
│   ├── layout.tsx       # Ana layout
│   └── page.tsx         # Ana sayfa
├── lib/
│   ├── auth.ts          # Authentication sistemi
│   ├── supabase.ts      # Supabase client
│   └── types.ts         # TypeScript tipleri
├── migrations/          # Veritabanı migration'ları
└── tailwind.config.js   # Tailwind yapılandırması
```

## Geliştirme

- Ana web sitesi: `http://localhost:3000`
- Admin panel: `http://localhost:3000/admin/login`

## Deployment

1. Supabase projesini oluşturun
2. Environment variables'ları production'a ekleyin
3. Veritabanı migration'larını çalıştırın
4. Uygulamayı deploy edin

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
