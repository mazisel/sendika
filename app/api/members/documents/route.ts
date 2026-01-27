import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedAdmin } from '@/lib/api-admin-auth';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const BUCKET_NAME = 'member-documents';

const isValidPath = (path: string) =>
  typeof path === 'string' && path.trim() !== '' && !path.includes('..') && !path.startsWith('/');

export async function POST(request: NextRequest) {
  const authResult = await getAuthenticatedAdmin(request);

  if (!authResult.admin) {
    return NextResponse.json(
      { message: authResult.error ?? 'Unauthorized.' },
      { status: authResult.status ?? 401 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error('Upload form data parse error:', error);
    return NextResponse.json({ message: 'Invalid upload payload.' }, { status: 400 });
  }

  const file = formData.get('file');
  const path = formData.get('path');

  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Missing file.' }, { status: 400 });
  }

  if (typeof path !== 'string' || !isValidPath(path)) {
    return NextResponse.json({ message: 'Invalid file path.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ message: 'Dosya boyutu 10MB sınırını aşıyor.' }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);

      // Altyapı (Nginx/Proxy) limiti hatasını yakala (Unexpected token '<' / HTML response)
      const errorMsg = uploadError.message || '';
      if (errorMsg.includes('Unexpected token') && errorMsg.includes('<')) {
        return NextResponse.json({
          message: 'Dosya boyutu sunucu altyapı limitini (1MB) aşıyor. Lütfen daha küçük bir dosya yükleyin veya sistem yöneticisine danışın.'
        }, { status: 413 });
      }

      return NextResponse.json({ message: 'Yükleme başarısız. Dosya boyutu sunucu limitini aşıyor olabilir.' }, { status: 400 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return NextResponse.json({ path, publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ message: 'Upload failed.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await getAuthenticatedAdmin(request);

  if (!authResult.admin) {
    return NextResponse.json(
      { message: authResult.error ?? 'Unauthorized.' },
      { status: authResult.status ?? 401 }
    );
  }

  let body: { path?: string } = {};
  try {
    body = await request.json();
  } catch (error) {
    console.error('Delete payload parse error:', error);
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  const path = body.path;
  if (typeof path !== 'string' || !isValidPath(path)) {
    return NextResponse.json({ message: 'Invalid file path.' }, { status: 400 });
  }

  try {
    const { error: deleteError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (deleteError) {
      console.error('Storage delete error:', deleteError);
      return NextResponse.json({ message: 'Delete failed.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ message: 'Delete failed.' }, { status: 500 });
  }
}
