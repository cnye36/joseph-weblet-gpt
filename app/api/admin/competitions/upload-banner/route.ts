import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('banner') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Create filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'png';
    const randomSuffix = Math.random().toString(36).slice(2);
    const filename = `competition-banner-${timestamp}-${randomSuffix}.${extension}`;

    // Upload to Supabase storage
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from('competition-banners')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload banner image' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('competition-banners')
      .getPublicUrl(filename);

    return NextResponse.json({
      success: true,
      bannerUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Error uploading competition banner:', error);
    return NextResponse.json({ error: 'Failed to upload banner image' }, { status: 500 });
  }
}


