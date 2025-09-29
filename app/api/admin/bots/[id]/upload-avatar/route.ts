import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const { id } = await context.params;
  
  try {
    const formData = await req.formData();
    const file = formData.get('avatar') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only PNG, JPG, and WebP are allowed.' 
      }, { status: 400 });
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 });
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Create filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'png';
    const filename = `avatar-${id}-${timestamp}.${extension}`;
    
    // Upload to Supabase storage
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from('bot-avatars')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('bot-avatars')
      .getPublicUrl(filename);
    
    // Update bot with new avatar URL
    const { error: updateError } = await supabase
      .from('bots')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', id);
    
    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: 'Failed to update bot avatar' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, avatarUrl: urlData.publicUrl });
    
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
  }
}
