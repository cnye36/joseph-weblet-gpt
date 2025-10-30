import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { generateAvatarsForExistingBots } from '@/lib/avatar-generation';

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await generateAvatarsForExistingBots();
    return NextResponse.json({
      success: true,
      message: "Avatars generated successfully",
    });
  } catch (error) {
    console.error("Error generating avatars:", error);
    return NextResponse.json(
      { error: "Failed to generate avatars" },
      { status: 500 }
    );
  }
}
