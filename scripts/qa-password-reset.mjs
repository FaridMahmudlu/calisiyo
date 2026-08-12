import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const email = `qa-reset-${Date.now()}@calisiyo.app`;
const oldPassword = 'Reset-QA!2027-Old';
const newPassword = 'Reset-QA!2027-New';
let userId;
let browser;

try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: oldPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Şifre QA Öğrencisi', alan_secimi: 'sayisal' },
  });
  if (createError) throw createError;
  userId = created.user.id;

  const redirectTo = new URL('/auth/callback', baseUrl);
  redirectTo.searchParams.set('next', '/sifre-yenile');
  const { data: recovery, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: redirectTo.toString() },
  });
  if (linkError || !recovery?.properties?.hashed_token) throw linkError || new Error('Recovery token missing.');

  const recoveryClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: verifyError } = await recoveryClient.auth.verifyOtp({
    type: 'recovery',
    token_hash: recovery.properties.hashed_token,
  });
  if (verifyError) throw verifyError;
  const { error: updateError } = await recoveryClient.auth.updateUser({ password: newPassword });
  if (updateError) throw updateError;

  const reuseClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: reuseError } = await reuseClient.auth.verifyOtp({
    type: 'recovery',
    token_hash: recovery.properties.hashed_token,
  });
  if (!reuseError) throw new Error('Consumed recovery token was accepted a second time.');

  const loginClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: loginError } = await loginClient.auth.signInWithPassword({ email, password: newPassword });
  if (loginError) throw loginError;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/sifre-yenile`);
  await page.waitForURL(/\/giris$/, { timeout: 30000 });
  await context.close();

  console.log(JSON.stringify({ ok: true, checks: ['recovery-token', 'single-use', 'new-password-login', 'protected-reset-route'] }));
} finally {
  if (browser) await browser.close();
  if (userId) await admin.auth.admin.deleteUser(userId);
}
