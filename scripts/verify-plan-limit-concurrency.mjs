import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;

if (!url || !key || !email || !password) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, QA_EMAIL and QA_PASSWORD are required.');
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const marker = `security-concurrency-${crypto.randomUUID()}`;
const createdIds = [];

try {
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError || !auth.user) throw authError || new Error('QA user could not sign in.');

  const { count: initialCount, error: countError } = await supabase
    .from('notlar')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id);
  if (countError) throw countError;
  if (initialCount > 99) throw new Error(`QA account already has ${initialCount} notes; safe limit test requires at most 99.`);

  for (let index = initialCount; index < 99; index += 1) {
    const { data, error } = await supabase
      .from('notlar')
      .insert({ user_id: auth.user.id, klasor: marker, baslik: `${marker}-${index}`, icerik: 'Temporary security regression row.' })
      .select('id')
      .single();
    if (error) throw error;
    createdIds.push(data.id);
  }

  const insertOne = (suffix) => supabase
    .from('notlar')
    .insert({ user_id: auth.user.id, klasor: marker, baslik: `${marker}-${suffix}`, icerik: 'Concurrent boundary probe.' })
    .select('id')
    .single();
  const [first, second] = await Promise.all([insertOne('a'), insertOne('b')]);
  const successes = [first, second].filter((result) => !result.error);
  const failures = [first, second].filter((result) => result.error);
  for (const result of successes) createdIds.push(result.data.id);

  const { count: finalCount, error: finalCountError } = await supabase
    .from('notlar')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id);
  if (finalCountError) throw finalCountError;
  if (successes.length !== 1 || failures.length !== 1 || finalCount !== 100) {
    throw new Error(`Concurrency invariant failed: successes=${successes.length}, failures=${failures.length}, total=${finalCount}.`);
  }
  console.log(JSON.stringify({ ok: true, initialCount, finalCount, successes: 1, rejected: 1 }));
} finally {
  if (createdIds.length) {
    const { error } = await supabase.from('notlar').delete().in('id', createdIds);
    if (error) console.error(`Cleanup failed: ${error.message}`);
  }
  await supabase.auth.signOut();
}
