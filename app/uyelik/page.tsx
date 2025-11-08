'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function UyelikPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    tc_identity: '',
    birth_date: '',
    gender: '',
    city: '',
    district: '',
    phone: '',
    email: '',
    address: '',
    workplace: '',
    position: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: '',
    education_level: '',
    marital_status: '',
    children_count: 0,
  });
  const [workplaceOptions, setWorkplaceOptions] = useState<string[]>([]);
  const [positionOptions, setPositionOptions] = useState<string[]>([]);
  const [useCustomWorkplace, setUseCustomWorkplace] = useState(false);
  const [useCustomPosition, setUseCustomPosition] = useState(false);
  const CUSTOM_OPTION_VALUE = '__custom__';

  useEffect(() => {
    const fetchDefinitions = async () => {
      try {
        const { data, error } = await supabase
          .from('general_definitions')
          .select('type, label, sort_order')
          .in('type', ['workplace', 'position'])
          .eq('is_active', true)
          .order('type')
          .order('sort_order', { ascending: true })
          .order('label', { ascending: true });

        if (error) throw error;

        const grouped = {
          workplace: [] as string[],
          position: [] as string[]
        };

        const definitions = (data || []) as { type: string; label: string }[];

        definitions.forEach((item) => {
          if (item.type === 'workplace') {
            grouped.workplace.push(item.label);
          } else if (item.type === 'position') {
            grouped.position.push(item.label);
          }
        });

        setWorkplaceOptions(grouped.workplace);
        setPositionOptions(grouped.position);
      } catch (error) {
        console.error('Tanımlamalar alınamadı:', error);
      }
    };

    fetchDefinitions();
  }, []);

  useEffect(() => {
    if (workplaceOptions.length === 0) {
      setUseCustomWorkplace(true);
    }
  }, [workplaceOptions.length]);

  useEffect(() => {
    if (
      formData.workplace &&
      workplaceOptions.length > 0 &&
      !workplaceOptions.includes(formData.workplace)
    ) {
      setUseCustomWorkplace(true);
    }
  }, [formData.workplace, workplaceOptions]);

  useEffect(() => {
    if (positionOptions.length === 0) {
      setUseCustomPosition(true);
    }
  }, [positionOptions.length]);

  useEffect(() => {
    if (
      formData.position &&
      positionOptions.length > 0 &&
      !positionOptions.includes(formData.position)
    ) {
      setUseCustomPosition(true);
    }
  }, [formData.position, positionOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleWorkplaceSelect = (value: string) => {
    if (value === CUSTOM_OPTION_VALUE) {
      setUseCustomWorkplace(true);
      setFormData(prev => ({ ...prev, workplace: '' }));
    } else {
      setUseCustomWorkplace(false);
      setFormData(prev => ({ ...prev, workplace: value }));
    }
  };

  const handlePositionSelect = (value: string) => {
    if (value === CUSTOM_OPTION_VALUE) {
      setUseCustomPosition(true);
      setFormData(prev => ({ ...prev, position: '' }));
    } else {
      setUseCustomPosition(false);
      setFormData(prev => ({ ...prev, position: value }));
    }
  };

  const resetWorkplaceToSelect = () => {
    setUseCustomWorkplace(false);
    setFormData(prev => ({
      ...prev,
      workplace: workplaceOptions.includes(prev.workplace) ? prev.workplace : ''
    }));
  };

  const resetPositionToSelect = () => {
    setUseCustomPosition(false);
    setFormData(prev => ({
      ...prev,
      position: positionOptions.includes(prev.position) ? prev.position : ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TC Kimlik kontrolü
      if (formData.tc_identity.length !== 11) {
        alert('TC Kimlik numarası 11 haneli olmalıdır.');
        setLoading(false);
        return;
      }

      // Email formatı kontrolü (opsiyonel alan)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmedEmail = formData.email.trim();
      if (trimmedEmail && !emailRegex.test(trimmedEmail)) {
        alert('Geçerli bir email adresi giriniz.');
        setLoading(false);
        return;
      }

      // Telefon formatı kontrolü (opsiyonel alan)
      const phoneRegex = /^[0-9]{10,11}$/;
      const trimmedPhone = formData.phone.trim();
      const digitsOnlyPhone = trimmedPhone.replace(/\s/g, '');
      if (digitsOnlyPhone && !phoneRegex.test(digitsOnlyPhone)) {
        alert('Geçerli bir telefon numarası giriniz.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('members')
        .insert([{
          ...formData,
          phone: trimmedPhone || null,
          email: trimmedEmail || null,
          membership_status: 'pending',
          is_active: true
        }]);

      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('tc_identity')) {
            alert('Bu TC Kimlik numarası ile kayıtlı bir üye bulunmaktadır.');
          } else if (error.message.includes('email')) {
            alert('Bu email adresi ile kayıtlı bir üye bulunmaktadır.');
          } else {
            alert('Bu bilgilerle kayıtlı bir üye bulunmaktadır.');
          }
        } else {
          throw error;
        }
      } else {
        alert('Üyelik başvurunuz başarıyla alındı. En kısa sürede size dönüş yapılacaktır.');
        router.push('/');
      }
    } catch (error) {
      console.error('Üyelik başvurusu hatası:', error);
      alert('Üyelik başvurusu sırasında bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Üyelik Başvuru Formu
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kişisel Bilgiler */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Kişisel Bilgiler</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Ad *
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Soyad *
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="tc_identity" className="block text-sm font-medium text-gray-700 mb-1">
                    TC Kimlik No *
                  </label>
                  <input
                    type="text"
                    id="tc_identity"
                    name="tc_identity"
                    value={formData.tc_identity}
                    onChange={handleChange}
                    required
                    maxLength={11}
                    pattern="[0-9]{11}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="birth_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Doğum Tarihi *
                  </label>
                  <input
                    type="date"
                    id="birth_date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Cinsiyet *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Erkek">Erkek</option>
                    <option value="Kadın">Kadın</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="marital_status" className="block text-sm font-medium text-gray-700 mb-1">
                    Medeni Durum
                  </label>
                  <select
                    id="marital_status"
                    name="marital_status"
                    value={formData.marital_status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Bekar">Bekar</option>
                    <option value="Evli">Evli</option>
                    <option value="Boşanmış">Boşanmış</option>
                    <option value="Dul">Dul</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="children_count" className="block text-sm font-medium text-gray-700 mb-1">
                    Çocuk Sayısı
                  </label>
                  <input
                    type="number"
                    id="children_count"
                    name="children_count"
                    value={formData.children_count}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="education_level" className="block text-sm font-medium text-gray-700 mb-1">
                    Eğitim Durumu
                  </label>
                  <select
                    id="education_level"
                    name="education_level"
                    value={formData.education_level}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seçiniz</option>
                    <option value="İlkokul">İlkokul</option>
                    <option value="Ortaokul">Ortaokul</option>
                    <option value="Lise">Lise</option>
                    <option value="Ön Lisans">Ön Lisans</option>
                    <option value="Lisans">Lisans</option>
                    <option value="Yüksek Lisans">Yüksek Lisans</option>
                    <option value="Doktora">Doktora</option>
                  </select>
                </div>
              </div>
            </div>

            {/* İletişim Bilgileri */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">İletişim Bilgileri</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    İl *
                  </label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">İl seçiniz</option>
                    <option value="Adana">Adana</option>
                    <option value="Adıyaman">Adıyaman</option>
                    <option value="Afyonkarahisar">Afyonkarahisar</option>
                    <option value="Ağrı">Ağrı</option>
                    <option value="Amasya">Amasya</option>
                    <option value="Ankara">Ankara</option>
                    <option value="Antalya">Antalya</option>
                    <option value="Artvin">Artvin</option>
                    <option value="Aydın">Aydın</option>
                    <option value="Balıkesir">Balıkesir</option>
                    <option value="Bilecik">Bilecik</option>
                    <option value="Bingöl">Bingöl</option>
                    <option value="Bitlis">Bitlis</option>
                    <option value="Bolu">Bolu</option>
                    <option value="Burdur">Burdur</option>
                    <option value="Bursa">Bursa</option>
                    <option value="Çanakkale">Çanakkale</option>
                    <option value="Çankırı">Çankırı</option>
                    <option value="Çorum">Çorum</option>
                    <option value="Denizli">Denizli</option>
                    <option value="Diyarbakır">Diyarbakır</option>
                    <option value="Edirne">Edirne</option>
                    <option value="Elazığ">Elazığ</option>
                    <option value="Erzincan">Erzincan</option>
                    <option value="Erzurum">Erzurum</option>
                    <option value="Eskişehir">Eskişehir</option>
                    <option value="Gaziantep">Gaziantep</option>
                    <option value="Giresun">Giresun</option>
                    <option value="Gümüşhane">Gümüşhane</option>
                    <option value="Hakkâri">Hakkâri</option>
                    <option value="Hatay">Hatay</option>
                    <option value="Isparta">Isparta</option>
                    <option value="Mersin">Mersin</option>
                    <option value="İstanbul">İstanbul</option>
                    <option value="İzmir">İzmir</option>
                    <option value="Kars">Kars</option>
                    <option value="Kastamonu">Kastamonu</option>
                    <option value="Kayseri">Kayseri</option>
                    <option value="Kırklareli">Kırklareli</option>
                    <option value="Kırşehir">Kırşehir</option>
                    <option value="Kocaeli">Kocaeli</option>
                    <option value="Konya">Konya</option>
                    <option value="Kütahya">Kütahya</option>
                    <option value="Malatya">Malatya</option>
                    <option value="Manisa">Manisa</option>
                    <option value="Kahramanmaraş">Kahramanmaraş</option>
                    <option value="Mardin">Mardin</option>
                    <option value="Muğla">Muğla</option>
                    <option value="Muş">Muş</option>
                    <option value="Nevşehir">Nevşehir</option>
                    <option value="Niğde">Niğde</option>
                    <option value="Ordu">Ordu</option>
                    <option value="Rize">Rize</option>
                    <option value="Sakarya">Sakarya</option>
                    <option value="Samsun">Samsun</option>
                    <option value="Siirt">Siirt</option>
                    <option value="Sinop">Sinop</option>
                    <option value="Sivas">Sivas</option>
                    <option value="Tekirdağ">Tekirdağ</option>
                    <option value="Tokat">Tokat</option>
                    <option value="Trabzon">Trabzon</option>
                    <option value="Tunceli">Tunceli</option>
                    <option value="Şanlıurfa">Şanlıurfa</option>
                    <option value="Uşak">Uşak</option>
                    <option value="Van">Van</option>
                    <option value="Yozgat">Yozgat</option>
                    <option value="Zonguldak">Zonguldak</option>
                    <option value="Aksaray">Aksaray</option>
                    <option value="Bayburt">Bayburt</option>
                    <option value="Karaman">Karaman</option>
                    <option value="Kırıkkale">Kırıkkale</option>
                    <option value="Batman">Batman</option>
                    <option value="Şırnak">Şırnak</option>
                    <option value="Bartın">Bartın</option>
                    <option value="Ardahan">Ardahan</option>
                    <option value="Iğdır">Iğdır</option>
                    <option value="Yalova">Yalova</option>
                    <option value="Karabük">Karabük</option>
                    <option value="Kilis">Kilis</option>
                    <option value="Osmaniye">Osmaniye</option>
                    <option value="Düzce">Düzce</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                    İlçe *
                  </label>
                  <input
                    type="text"
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon <span className="text-sm text-gray-500">(opsiyonel)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="5XX XXX XX XX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta <span className="text-sm text-gray-500">(opsiyonel)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Adres
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* İş Bilgileri */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">İş Bilgileri</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="workplace" className="block text-sm font-medium text-gray-700 mb-1">
                    İşyeri
                  </label>
                  {!useCustomWorkplace && workplaceOptions.length > 0 ? (
                    <select
                      id="workplace"
                      value={formData.workplace || ''}
                      onChange={(e) => handleWorkplaceSelect(e.target.value || '')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">İşyeri seçiniz</option>
                      {workplaceOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      <option value={CUSTOM_OPTION_VALUE}>Diğer (elle gir)</option>
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        id="workplace"
                        name="workplace"
                        value={formData.workplace}
                        onChange={handleChange}
                        placeholder="Çalıştığınız kurum"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {workplaceOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={resetWorkplaceToSelect}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                        >
                          Listeden seç
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                    Pozisyon/Görev
                  </label>
                  {!useCustomPosition && positionOptions.length > 0 ? (
                    <select
                      id="position"
                      value={formData.position || ''}
                      onChange={(e) => handlePositionSelect(e.target.value || '')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Pozisyon seçiniz</option>
                      {positionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                      <option value={CUSTOM_OPTION_VALUE}>Diğer (elle gir)</option>
                    </select>
                  ) : (
                    <>
                      <input
                        type="text"
                        id="position"
                        name="position"
                        value={formData.position}
                        onChange={handleChange}
                        placeholder="Göreviniz"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {positionOptions.length > 0 && (
                        <button
                          type="button"
                          onClick={resetPositionToSelect}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                        >
                          Listeden seç
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Acil Durum İletişim */}
            <div className="pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Acil Durum İletişim</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Acil Durum Kişisi
                  </label>
                  <input
                    type="text"
                    id="emergency_contact_name"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Acil Durum Telefonu
                  </label>
                  <input
                    type="tel"
                    id="emergency_contact_phone"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    placeholder="5XX XXX XX XX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="emergency_contact_relation" className="block text-sm font-medium text-gray-700 mb-1">
                    Yakınlık Derecesi
                  </label>
                  <input
                    type="text"
                    id="emergency_contact_relation"
                    name="emergency_contact_relation"
                    value={formData.emergency_contact_relation}
                    onChange={handleChange}
                    placeholder="Anne, Baba, Eş, vb."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Gönder Butonu */}
            <div className="flex justify-center pt-6">
              <button
                type="submit"
                disabled={loading}
                className={`px-8 py-3 text-white font-semibold rounded-md transition-colors ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
