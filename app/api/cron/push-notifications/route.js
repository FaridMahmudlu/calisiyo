import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(request) {
  const secret = String(process.env.CRON_SECRET || '');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ ok: false }, { status: 401 });
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '');
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '');
  if (!publicKey || !privateKey) return Response.json({ ok: false, message: 'VAPID yapılandırması eksik.' }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:calisiyo.destek@gmail.com', publicKey, privateKey);
  const admin = createAdminClient();
  const { data: notifications, error } = await admin.from('notifications')
    .select('id,user_id,title,body,action_url,created_at,profiles!inner(notifications_enabled)')
    .eq('profiles.notifications_enabled', true).is('push_dispatched_at', null)
    .order('created_at', { ascending: true }).limit(100);
  if (error) return Response.json({ ok: false, message: 'Bildirim kuyruğu okunamadı.' }, { status: 500 });
  const userIds = [...new Set((notifications || []).map((item) => item.user_id))];
  const { data: subscriptions } = userIds.length
    ? await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', userIds)
    : { data: [] };
  const byUser = new Map();
  for (const sub of subscriptions || []) byUser.set(sub.user_id, [...(byUser.get(sub.user_id) || []), sub]);
  let delivered = 0;
  for (const notification of notifications || []) {
    for (const sub of byUser.get(notification.user_id) || []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({
          title: notification.title, body: notification.body, url: notification.action_url || '/dashboard', tag: `notification-${notification.id}`,
        }), { TTL: 86400 });
        delivered += 1;
      } catch (sendError) {
        if ([404, 410].includes(sendError.statusCode)) await admin.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
    await admin.from('notifications').update({ push_dispatched_at: new Date().toISOString() }).eq('id', notification.id);
  }
  return Response.json({ ok: true, processed: notifications?.length || 0, delivered });
}
