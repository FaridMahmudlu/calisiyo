import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const stamp = Date.now();
const password = 'Isolation-QA!2027#Safe';
const users = [];

const createUser = async (label) => {
  const email = `qa-isolation-${label}-${stamp}@calisiyo.app`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `QA ${label} Öğrencisi`, alan_secimi: 'sayisal' },
  });
  if (error) throw error;
  users.push(data.user.id);

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;
  return { client, id: data.user.id };
};

try {
  const attacker = await createUser('A');
  const owner = await createUser('B');

  const { data: ownerResource, error: resourceError } = await owner.client
    .from('kaynaklarim')
    .insert({
      user_id: owner.id,
      custom_ad: 'RLS QA Kaynağı',
      custom_yayin: 'QA Yayınları',
      custom_sinav_turu: 'TYT',
      custom_kitap_turu: 'Soru Bankası',
    })
    .select('id')
    .single();
  if (resourceError) throw resourceError;

  const { data: leakedRows, error: readError } = await attacker.client
    .from('kaynaklarim')
    .select('id')
    .eq('id', ownerResource.id);
  if (readError) throw readError;
  if (leakedRows.length !== 0) throw new Error('RLS exposed another user\'s resource.');

  const { error: referenceError } = await attacker.client.from('gunluk_gorevler').insert({
    user_id: attacker.id,
    tarih: '2027-01-05',
    baslangic_saat: '09:00',
    bitis_saat: '10:00',
    kaynak_id: ownerResource.id,
    konu: 'Cross-tenant reference QA',
    soru_sayisi: 10,
  });
  if (!referenceError || referenceError.code !== '23503') {
    throw new Error(`Cross-tenant resource reference was not rejected by the owned FK (${referenceError?.code || 'accepted'}).`);
  }

  const { error: impersonationError } = await attacker.client.from('gunluk_gorevler').insert({
    user_id: owner.id,
    tarih: '2027-01-06',
    baslangic_saat: '09:00',
    bitis_saat: '10:00',
    konu: 'RLS impersonation QA',
    soru_sayisi: 10,
  });
  if (!impersonationError || impersonationError.code !== '42501') {
    throw new Error(`RLS user impersonation was not rejected (${impersonationError?.code || 'accepted'}).`);
  }

  const { data: topic, error: topicError } = await attacker.client
    .from('konular')
    .select('id')
    .limit(1)
    .single();
  if (topicError) throw topicError;

  const { error: trackingError } = await attacker.client.from('konu_takibi').insert({
    user_id: attacker.id,
    konu_id: topic.id,
    durum: 'tamamlandi',
  });
  if (trackingError) throw trackingError;

  const repeatCount = async () => {
    const { data, error } = await attacker.client
      .from('tekrarlar')
      .select('id, tekrar_tarihi')
      .eq('konu_id', topic.id)
      .eq('otomatik', true);
    if (error) throw error;
    return { count: data.length, uniqueDates: new Set(data.map((row) => row.tekrar_tarihi)).size };
  };

  const initialRepeats = await repeatCount();
  if (initialRepeats.count !== 3 || initialRepeats.uniqueDates !== 3) {
    throw new Error(`Expected 3 automatic repeats, received ${initialRepeats.count}.`);
  }

  const { error: downgradeError } = await attacker.client
    .from('konu_takibi')
    .update({ durum: 'baslanmadi' })
    .eq('konu_id', topic.id);
  if (downgradeError) throw downgradeError;
  const afterDowngrade = await repeatCount();
  if (afterDowngrade.count !== 0) throw new Error('Unfinished automatic repeats were orphaned after topic downgrade.');

  const { error: recompleteError } = await attacker.client
    .from('konu_takibi')
    .update({ durum: 'tamamlandi' })
    .eq('konu_id', topic.id);
  if (recompleteError) throw recompleteError;
  const afterRecomplete = await repeatCount();
  if (afterRecomplete.count !== 3 || afterRecomplete.uniqueDates !== 3) {
    throw new Error('Re-completing a topic created missing or duplicate repeat records.');
  }

  console.log(JSON.stringify({
    ok: true,
    checks: [
      'cross-user-read-blocked',
      'cross-user-resource-reference-blocked',
      'user-id-impersonation-blocked',
      'repeat-schedule-created',
      'repeat-schedule-cleaned',
      'repeat-schedule-idempotent',
    ],
  }));
} finally {
  for (const id of users.reverse()) {
    await admin.auth.admin.deleteUser(id);
  }
}
