'use client';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EditBranchPage;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var supabase_1 = require("@/lib/supabase");
var cities_1 = require("@/lib/cities");
function EditBranchPage(_a) {
    var _this = this;
    var params = _a.params;
    var _b = (0, react_1.useState)({
        city: '',
        city_code: '',
        branch_name: '',
        president_name: '',
        president_phone: '',
        president_email: '',
        address: '',
        coordinates_lat: '',
        coordinates_lng: '',
        is_active: true,
        region: ''
    }), formData = _b[0], setFormData = _b[1];
    var _c = (0, react_1.useState)(true), loading = _c[0], setLoading = _c[1];
    var _d = (0, react_1.useState)(false), saving = _d[0], setSaving = _d[1];
    var _e = (0, react_1.useState)(''), error = _e[0], setError = _e[1];
    var cityOptionsWithFallback = (0, react_1.useMemo)(function () {
        if (!formData.city) {
            return cities_1.cityOptions;
        }
        var exists = cities_1.cityOptions.some(function (option) { return option.name === formData.city; });
        if (exists) {
            return cities_1.cityOptions;
        }
        return __spreadArray([
            { name: formData.city, code: formData.city_code || '00' }
        ], cities_1.cityOptions, true);
    }, [formData.city, formData.city_code]);
    (0, react_1.useEffect)(function () {
        loadBranch();
    }, []);
    var loadBranch = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a, data, error_2, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, 3, 4]);
                    setLoading(true);
                    return [4 /*yield*/, supabase_1.supabase
                            .from('branches')
                            .select('*')
                            .eq('id', params.id)
                            .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error_2 = _a.error;
                    if (error_2)
                        throw error_2;
                    if (data) {
                        setFormData({
                            city: data.city || '',
                            city_code: data.city_code || '',
                            branch_name: data.branch_name || '',
                            president_name: data.president_name || '',
                            president_phone: data.president_phone || '',
                            president_email: data.president_email || '',
                            address: data.address || '',
                            coordinates_lat: data.coordinates_lat ? data.coordinates_lat.toString() : '',
                            coordinates_lng: data.coordinates_lng ? data.coordinates_lng.toString() : '',
                            is_active: data.is_active,
                            region: data.region ? data.region.toString() : ''
                        });
                    }
                    return [3 /*break*/, 4];
                case 2:
                    error_1 = _b.sent();
                    setError('Şube yüklenirken hata oluştu: ' + error_1.message);
                    return [3 /*break*/, 4];
                case 3:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var coordinates_lat, coordinates_lng, regionValue, payload, error_4, error_3;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    e.preventDefault();
                    setSaving(true);
                    setError('');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 5]);
                    coordinates_lat = formData.coordinates_lat ? parseFloat(formData.coordinates_lat) : null;
                    coordinates_lng = formData.coordinates_lng ? parseFloat(formData.coordinates_lng) : null;
                    regionValue = formData.region ? parseInt(formData.region, 10) : null;
                    if (!regionValue || regionValue < 1 || regionValue > 8) {
                        throw new Error('Lütfen geçerli bir bölge seçiniz.');
                    }
                    payload = __assign(__assign({}, formData), { coordinates_lat: coordinates_lat, coordinates_lng: coordinates_lng, city_code: formData.city_code || ((_a = (0, cities_1.findCityByName)(formData.city)) === null || _a === void 0 ? void 0 : _a.code) || '', region: regionValue });
                    if (!payload.city) {
                        throw new Error('Lütfen bir şehir seçiniz.');
                    }
                    if (!payload.city_code) {
                        throw new Error('Seçilen şehir için plaka kodu bulunamadı.');
                    }
                    return [4 /*yield*/, supabase_1.supabase
                            .from('branches')
                            .update(payload)
                            .eq('id', params.id)];
                case 2:
                    error_4 = (_b.sent()).error;
                    if (error_4)
                        throw error_4;
                    alert('Şube başarıyla güncellendi!');
                    window.location.href = '/admin/branches';
                    return [3 /*break*/, 5];
                case 3:
                    error_3 = _b.sent();
                    setError('Şube güncellenirken hata oluştu: ' + error_3.message);
                    return [3 /*break*/, 5];
                case 4:
                    setSaving(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleChange = function (e) {
        var _a = e.target, name = _a.name, value = _a.value, type = _a.type;
        setFormData(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[name] = type === 'checkbox' ? e.target.checked : value, _a)));
        });
    };
    var handleCitySelect = function (value) {
        if (!value) {
            setFormData(function (prev) { return (__assign(__assign({}, prev), { city: '', city_code: '' })); });
            return;
        }
        var selectedCity = (0, cities_1.findCityByName)(value);
        setFormData(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), { city: value, city_code: (_a = selectedCity === null || selectedCity === void 0 ? void 0 : selectedCity.code) !== null && _a !== void 0 ? _a : '' }));
        });
    };
    var handleRegionSelect = function (value) {
        setFormData(function (prev) { return (__assign(__assign({}, prev), { region: value })); });
    };
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Şube yükleniyor...</p>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <a href="/admin/branches" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
              <lucide_react_1.ArrowLeft className="w-5 h-5 mr-1"/>
              Geri
            </a>
            <h1 className="text-3xl font-bold text-gray-900">Şube Düzenle</h1>
          </div>
          <p className="text-gray-600">
            Şube bilgilerini güncelleyin
          </p>
        </div>

        {error && (<div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>)}

        <div className="bg-white shadow-lg rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Şehir Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Şehir Bilgileri
                </h3>
                
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    Şehir *
                  </label>
                  <select id="city" name="city" value={formData.city} onChange={function (e) { return handleCitySelect(e.target.value); }} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Şehir seçiniz</option>
                    {cityOptionsWithFallback.map(function (city) { return (<option key={city.code} value={city.name}>
                        {city.name}
                      </option>); })}
                  </select>
                </div>

                <div>
                  <label htmlFor="city_code" className="block text-sm font-medium text-gray-700 mb-1">
                    Plaka Kodu *
                  </label>
                  <input type="text" id="city_code" name="city_code" value={formData.city_code} readOnly required className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600" placeholder="34"/>
                  <p className="text-xs text-gray-500 mt-1">Plaka kodu seçilen şehre göre otomatik güncellenir.</p>
                </div>

                <div>
                  <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
                    Bölge *
                  </label>
                  <select id="region" name="region" value={formData.region} onChange={function (e) { return handleRegionSelect(e.target.value); }} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Bölge seçiniz</option>
                    {cities_1.regionOptions.map(function (region) { return (<option key={region.value} value={region.value}>
                        {region.label}
                      </option>); })}
                  </select>
                </div>

                <div>
                  <label htmlFor="branch_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Şube Adı *
                  </label>
                  <input type="text" id="branch_name" name="branch_name" value={formData.branch_name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="İstanbul Şubesi"/>
                </div>
              </div>

              {/* Başkan Bilgileri */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Başkan Bilgileri
                </h3>
                
                <div>
                  <label htmlFor="president_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Başkan Adı *
                  </label>
                  <input type="text" id="president_name" name="president_name" value={formData.president_name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ahmet Yılmaz"/>
                </div>

                <div>
                  <label htmlFor="president_phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input type="tel" id="president_phone" name="president_phone" value={formData.president_phone} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0212 555 0123"/>
                </div>

                <div>
                  <label htmlFor="president_email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta
                  </label>
                  <input type="email" id="president_email" name="president_email" value={formData.president_email} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ahmet@sendika.org.tr"/>
                </div>
              </div>
            </div>

            {/* Adres */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Adres
              </label>
              <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Fatih Mahallesi, Atatürk Caddesi No:45, Fatih/İstanbul"/>
            </div>

            {/* Koordinatlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="coordinates_lat" className="block text-sm font-medium text-gray-700 mb-1">
                  <lucide_react_1.MapPin className="w-4 h-4 inline mr-1"/>
                  Enlem (Latitude)
                </label>
                <input type="number" step="any" id="coordinates_lat" name="coordinates_lat" value={formData.coordinates_lat} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="41.0082"/>
              </div>

              <div>
                <label htmlFor="coordinates_lng" className="block text-sm font-medium text-gray-700 mb-1">
                  <lucide_react_1.MapPin className="w-4 h-4 inline mr-1"/>
                  Boylam (Longitude)
                </label>
                <input type="number" step="any" id="coordinates_lng" name="coordinates_lng" value={formData.coordinates_lng} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="28.9784"/>
              </div>
            </div>

            {/* Durum */}
            <div>
              <label className="flex items-center">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"/>
                <span className="ml-2 text-sm text-gray-700">Şube aktif</span>
              </label>
            </div>

            {/* Butonlar */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <a href="/admin/branches" className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                İptal
              </a>
              <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? (<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>) : (<lucide_react_1.Save className="w-4 h-4 mr-2"/>)}
                {saving ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </form>
        </div>

        {/* Yardım Metni */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 İpucu</h4>
          <p className="text-sm text-blue-700">
            Koordinatları bulmak için Google Maps'te şube konumuna sağ tıklayıp koordinatları kopyalayabilirsiniz.
            Koordinatlar harita üzerinde şube konumunu göstermek için kullanılır.
          </p>
        </div>
      </div>
    </div>);
}
