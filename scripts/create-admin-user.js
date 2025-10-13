const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Supabase bağlantısı için environment variables'ları yükle
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL veya Service Role Key bulunamadı!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Mevcut' : 'Eksik');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    console.log('Admin kullanıcısı oluşturuluyor...');
    
    // Şifreyi hash'le
    const hashedPassword = await bcrypt.hash('12314387616', 10);
    
    // Admin kullanıcısını veritabanına ekle
    const { data: adminUser, error: dbError } = await supabase
      .from('admin_users')
      .insert([
        {
          email: 'oguzhanlyn@gmail.com',
          password_hash: hashedPassword,
          full_name: 'Oğuzhan Admin',
          role: 'super_admin',
          is_active: true
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Veritabanı hatası:', dbError);
      return;
    }

    console.log('Admin kullanıcısı başarıyla oluşturuldu:', adminUser);

    // Supabase Auth kullanıcısı da oluştur
    const authEmail = `admin.${adminUser.id}@internal.local`;
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: authEmail,
      password: 'admin123',
      email_confirm: true
    });

    if (authError) {
      console.error('Auth kullanıcısı oluşturma hatası:', authError);
    } else {
      console.log('Auth kullanıcısı başarıyla oluşturuldu:', authUser.user.email);
    }

    console.log('\
=== GİRİŞ BİLGİLERİ ===');
    console.log('Email: oguzhanlyn@gmail.com');
    console.log('Şifre: 12314387616');
    console.log('======================');

  } catch (error) {
    console.error('Hata:', error);
  }
}

createAdminUser();
