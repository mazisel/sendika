import { supabase } from './supabase';

export const uploadFile = async (file: File, folder: string = 'images'): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const result = await StorageService.uploadImage(file, folder);
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || 'Dosya yükleme hatası' };
  }
};

export class StorageService {
  static async uploadImage(file: File, bucket: string = 'images'): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Dosya adını benzersiz yapmak için timestamp ekle
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Dosyayı Supabase Storage'a yükle
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        return { success: false, error: 'Dosya yüklenirken hata oluştu' };
      }

      // Public URL'yi al
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl };
    } catch (error) {
      return { success: false, error: 'Dosya yükleme işlemi başarısız' };
    }
  }

  static async deleteImage(url: string, bucket: string = 'images'): Promise<{ success: boolean; error?: string }> {
    try {
      // URL'den dosya yolunu çıkar
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      if (error) {
        return { success: false, error: 'Dosya silinirken hata oluştu' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Dosya silme işlemi başarısız' };
    }
  }

  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Dosya türü kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Sadece JPEG, PNG, GIF ve WebP formatları desteklenir' };
    }

    // Dosya boyutu kontrolü (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { valid: false, error: 'Dosya boyutu 5MB\'dan küçük olmalıdır' };
    }

    return { valid: true };
  }
}
