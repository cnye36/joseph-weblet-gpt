import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { generateAvatarForBot } from '@/lib/avatar-generation';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const { id } = await context.params;
  
  try {
    const avatarUrl = await generateAvatarForBot(id);
    
    if (avatarUrl) {
      return NextResponse.json({ success: true, avatarUrl });
    } else {
      return NextResponse.json({ error: 'Failed to generate avatar' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error generating avatar:', error);
    return NextResponse.json({ error: 'Failed to generate avatar' }, { status: 500 });
  }
}
