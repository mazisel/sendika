export interface CityOption {
  name: string;
  code: string;
}

export const cityOptions: CityOption[] = [
  { name: 'Adana', code: '01' },
  { name: 'Adıyaman', code: '02' },
  { name: 'Afyonkarahisar', code: '03' },
  { name: 'Ağrı', code: '04' },
  { name: 'Aksaray', code: '68' },
  { name: 'Amasya', code: '05' },
  { name: 'Ankara', code: '06' },
  { name: 'Antalya', code: '07' },
  { name: 'Ardahan', code: '75' },
  { name: 'Artvin', code: '08' },
  { name: 'Aydın', code: '09' },
  { name: 'Balıkesir', code: '10' },
  { name: 'Bartın', code: '74' },
  { name: 'Batman', code: '72' },
  { name: 'Bayburt', code: '69' },
  { name: 'Bilecik', code: '11' },
  { name: 'Bingöl', code: '12' },
  { name: 'Bitlis', code: '13' },
  { name: 'Bolu', code: '14' },
  { name: 'Burdur', code: '15' },
  { name: 'Bursa', code: '16' },
  { name: 'Çanakkale', code: '17' },
  { name: 'Çankırı', code: '18' },
  { name: 'Çorum', code: '19' },
  { name: 'Denizli', code: '20' },
  { name: 'Diyarbakır', code: '21' },
  { name: 'Düzce', code: '81' },
  { name: 'Edirne', code: '22' },
  { name: 'Elazığ', code: '23' },
  { name: 'Erzincan', code: '24' },
  { name: 'Erzurum', code: '25' },
  { name: 'Eskişehir', code: '26' },
  { name: 'Gaziantep', code: '27' },
  { name: 'Giresun', code: '28' },
  { name: 'Gümüşhane', code: '29' },
  { name: 'Hakkari', code: '30' },
  { name: 'Hatay', code: '31' },
  { name: 'Iğdır', code: '76' },
  { name: 'Isparta', code: '32' },
  { name: 'İstanbul', code: '34' },
  { name: 'İzmir', code: '35' },
  { name: 'Kahramanmaraş', code: '46' },
  { name: 'Karabük', code: '78' },
  { name: 'Karaman', code: '70' },
  { name: 'Kars', code: '36' },
  { name: 'Kastamonu', code: '37' },
  { name: 'Kayseri', code: '38' },
  { name: 'Kilis', code: '79' },
  { name: 'Kırıkkale', code: '71' },
  { name: 'Kırklareli', code: '39' },
  { name: 'Kırşehir', code: '40' },
  { name: 'Kocaeli', code: '41' },
  { name: 'Konya', code: '42' },
  { name: 'Kütahya', code: '43' },
  { name: 'Malatya', code: '44' },
  { name: 'Manisa', code: '45' },
  { name: 'Mardin', code: '47' },
  { name: 'Mersin', code: '33' },
  { name: 'Muğla', code: '48' },
  { name: 'Muş', code: '49' },
  { name: 'Nevşehir', code: '50' },
  { name: 'Niğde', code: '51' },
  { name: 'Ordu', code: '52' },
  { name: 'Osmaniye', code: '80' },
  { name: 'Rize', code: '53' },
  { name: 'Sakarya', code: '54' },
  { name: 'Samsun', code: '55' },
  { name: 'Şanlıurfa', code: '63' },
  { name: 'Siirt', code: '56' },
  { name: 'Sinop', code: '57' },
  { name: 'Şırnak', code: '73' },
  { name: 'Sivas', code: '58' },
  { name: 'Tekirdağ', code: '59' },
  { name: 'Tokat', code: '60' },
  { name: 'Trabzon', code: '61' },
  { name: 'Tunceli', code: '62' },
  { name: 'Uşak', code: '64' },
  { name: 'Van', code: '65' },
  { name: 'Yalova', code: '77' },
  { name: 'Yozgat', code: '66' },
  { name: 'Zonguldak', code: '67' }
]

export const regionOptions = Array.from({ length: 8 }, (_, index) => ({
  value: (index + 1).toString(),
  label: `${index + 1}. Bölge`
}))

export const findCityByName = (name?: string | null) => {
  if (!name) return undefined
  return cityOptions.find(city => city.name.toLowerCase() === name.toLowerCase())
}

export const findCityByCode = (code?: string | null) => {
  if (!code) return undefined
  const normalized = code.padStart(2, '0')
  return cityOptions.find(city => city.code === normalized)
}
