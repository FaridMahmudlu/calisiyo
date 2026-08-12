import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminShell from '@/components/admin/AdminShell';
import './admin.css';

export const metadata = {
  title: 'Admin Paneli · calisiyo',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/giris');

  const [{ data: role }, { data: profile }] = await Promise.all([
    supabase.rpc('current_admin_role'),
    supabase.from('profiles').select('full_name,avatar_url,account_status').eq('id', user.id).maybeSingle(),
  ]);

  if (!role || profile?.account_status === 'suspended') redirect('/dashboard');

  return <AdminShell user={{ id: user.id, email: user.email }} profile={profile} role={role}>{children}</AdminShell>;
}
