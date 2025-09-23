import { createClient } from '@/lib/supabase/server';

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const email = user.email?.toLowerCase();
  const envEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  if (email && envEmail && email === envEmail) return true;
  const { data } = await supabase.from('app_admins').select('email').eq('email', email).maybeSingle();
  return Boolean(data);
}


