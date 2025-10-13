'use client'

import { Phone, Mail, MapPin, Target, Eye, Users, Award, Shield, Handshake } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="header-gradient text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Hakkımızda
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto">
            Ulaştırma sektöründeki kamu çalışanlarının haklarını korumak ve geliştirmek için kurulduk
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Kimiz?
              </h2>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Ulaştırma Kamu Çalışanları Sendikası (Kamu Ulaşım Sen) olarak, Aralık 2024'te, ulaştırma hizmet kolunda görev yapan kamu çalışanlarının haklarını korumak ve geliştirmek amacıyla kurulduk.
              </p>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Temel amacımız, üyelerimizin özlük haklarını iyileştirmek, mesleki gelişimlerini destekleyici eğitimler düzenlemek ve kurumlarımızdaki kronikleşmiş sorunlarla etkin bir şekilde mücadele etmektir.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Şeffaflık, katılımcılık ve adaleti ilke edinerek, tüm üyelerimizin sesi olmayı ve çalışma koşullarını daha iyi bir seviyeye taşımayı hedefliyoruz. Kamu Ulaşım Sen, ulaştırma sektöründeki kamu çalışanlarının hak ettiği saygın ve adil çalışma ortamını oluşturmak için var gücüyle çalışacaktır.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">Temel Değerlerimiz</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Shield className="w-6 h-6 mr-3 flex-shrink-0" />
                  <span className="text-lg">Şeffaflık ve Hesap Verebilirlik</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-6 h-6 mr-3 flex-shrink-0" />
                  <span className="text-lg">Katılımcı Yönetim</span>
                </div>
                <div className="flex items-center">
                  <Award className="w-6 h-6 mr-3 flex-shrink-0" />
                  <span className="text-lg">Adalet ve Eşitlik</span>
                </div>
                <div className="flex items-center">
                  <Handshake className="w-6 h-6 mr-3 flex-shrink-0" />
                  <span className="text-lg">Dayanışma ve İş Birliği</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-6">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Misyonumuz
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ulaştırma Kamu Çalışanları Sendikası olarak misyonumuz, ulaştırma hizmet kolunda görev yapan kamu çalışanlarının özlük haklarını eksiksiz bir şekilde savunmak ve iyileştirmektir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Çalışma Koşullarını Geliştirmek
              </h3>
              <p className="text-gray-600">
                Üyelerimizin daha güvenli, adil ve verimli ortamlarda çalışmasını sağlamak için aktif rol alıyoruz.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Mesleki Gelişimi Desteklemek
              </h3>
              <p className="text-gray-600">
                Personelin bilgi ve becerilerini artıracak, kariyer yollarını açacak nitelikli eğitimler ve gelişim programları düzenliyoruz.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Kurumsal Sorunlara Çözüm Bulmak
              </h3>
              <p className="text-gray-600">
                Ulaştırma kurumlarında yıllardır süregelen yapısal ve idari sorunları tespit ederek, kalıcı çözümler üretmek için ilgili mercilerle iş birliği yapıyoruz.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Hukuki Destek Sağlamak
              </h3>
              <p className="text-gray-600">
                Üyelerimizin karşılaştığı hukuki süreçlerde rehberlik ve destek sunarak hak kayıplarının önüne geçiyoruz.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Handshake className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Diyalog ve İş Birliğini Teşvik Etmek
              </h3>
              <p className="text-gray-600">
                Kurum yöneticileri ve diğer paydaşlarla yapıcı bir diyalog kurarak, ortak akılla hareket etmeyi ve uzlaşmacı çözümler üretmeyi benimsiyoruz.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Üye Refahını Artırmak
              </h3>
              <p className="text-gray-600">
                Kamu Ulaşım Sen olarak, her bir üyemizin refahını ve mesleki tatminini artırmayı kendimize görev biliyoruz.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 max-w-4xl mx-auto">
              Bu doğrultuda çalışmalarımızı sürdürürken, üyelerimizin beklentilerini karşılamak ve onların çalışma hayatını daha iyi bir seviyeye taşımak için var gücümüzle çalışıyoruz.
            </p>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-6">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Vizyonumuz
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Ulaştırma Kamu Çalışanları Sendikası'nın vizyonu, Türkiye'deki ulaştırma hizmet kolunda çalışan kamu personelinin hak ve menfaatleri açısından en önde gelen, etkin ve örnek sendika olmaktır.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Öncü Sendikacılık
              </h3>
              <p className="text-gray-600">
                Sendikacılık anlayışında yenilikçi yaklaşımları benimseyerek, üyelerimizin beklentilerini en üst düzeyde karşılayan ve sektöre yön veren bir konuma ulaşmak.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Sürdürülebilir Gelişim
              </h3>
              <p className="text-gray-600">
                Sadece özlük hakları değil, aynı zamanda personelin sosyal, kültürel ve mesleki gelişimine sürekli katkı sağlayan sürdürülebilir programlar oluşturmak.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Kurumsal Saygınlık
              </h3>
              <p className="text-gray-600">
                Ulaştırma kurumları nezdinde ve kamuoyunda yüksek bir saygınlık ve güvenilirlik kazanarak, alınan kararlarda etkin bir söz sahibi olmak.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Güçlü Temsil
              </h3>
              <p className="text-gray-600">
                Üyelerimizin tamamını kapsayıcı bir şekilde temsil ederek, farklı unvan ve statülerdeki çalışanların sorunlarına özel çözümler üretebilen bir yapıya kavuşmak.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Model Teşkil Etmek
              </h3>
              <p className="text-gray-600">
                Diğer hizmet kollarındaki sendikalara örnek teşkil eden, şeffaf, katılımcı ve sonuç odaklı bir sendikacılık anlayışı sergilemek.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-lg text-gray-600 max-w-4xl mx-auto">
              Ulaştırma Kamu Sen, ulaştırma hizmet kolundaki kamu çalışanlarının çalışma hayatını ve geleceğini şekillendiren, onların sesi ve güvencesi olan bir kuruluş olmayı hedeflemektedir.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Kamu Ulaşım Sen</h3>
              <p className="text-gray-300">
                Ulaştırma sektöründeki kamu çalışanlarının haklarını korumak ve geliştirmek için Aralık 2024'te kurulduk.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Hızlı Linkler</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-300 hover:text-white">Ana Sayfa</Link></li>
                <li><Link href="/hakkimizda" className="text-gray-300 hover:text-white">Hakkımızda</Link></li>
                <li><Link href="/yonetim" className="text-gray-300 hover:text-white">Yönetim</Link></li>
                <li><Link href="/subelerimiz" className="text-gray-300 hover:text-white">Şubelerimiz</Link></li>
                <li><Link href="/haberler" className="text-gray-300 hover:text-white">Haberler</Link></li>
                <li><Link href="/duyurular" className="text-gray-300 hover:text-white">Duyurular</Link></li>
                <li><Link href="/#iletisim" className="text-gray-300 hover:text-white">İletişim</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">İletişim</h4>
              <div className="space-y-2 text-gray-300">
                <p>Fidanlık Mahallesi Adakale Sokak No:25/24</p>
                <p>Çankaya/Ankara, Türkiye</p>
                <p>Tel: 0850 840 0674</p>
                <p>E-posta: bilgi@kamuulasimsen.org</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-gray-300">
              © 2024 Kamu Ulaşım Sen. Tüm hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
