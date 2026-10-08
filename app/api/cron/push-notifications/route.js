import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoMessages(messages) {
  const results = [];
  for (let index = 0; index < messages.length; index += 100) {
    const batch = messages.slice(index, index + 100);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(batch.map(({ tokenId, ...message }) => message)),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    batch.forEach((message, offset) => results.push({ tokenId: message.tokenId, ticket: payload?.data?.[offset] || null }));
  }
  return results;
}

export async function GET(request) {
  const secret = String(process.env.CRON_SECRET || '');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ ok: false }, { status: 401 });
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '');
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '');
  const webPushReady = Boolean(publicKey && privateKey);
  if (webPushReady) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:calisiyo.destek@gmail.com', publicKey, privateKey);
  const admin = createAdminClient();
  const { data: notifications, error } = await admin.from('notifications')
    .select('id,user_id,title,body,action_url,created_at,profiles!inner(notifications_enabled)')
    .eq('profiles.notifications_enabled', true).is('push_dispatched_at', null)
    .order('created_at', { ascending: true }).limit(100);
  if (error) return Response.json({ ok: false, message: 'Bildirim kuyruğu okunamadı.' }, { status: 500 });
  const userIds = [...new Set((notifications || []).map((item) => item.user_id))];
  const [{ data: subscriptions }, { data: mobileTokens }] = userIds.length
    ? await Promise.all([
      webPushReady
        ? admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', userIds)
        : Promise.resolve({ data: [] }),
      admin.from('mobile_push_tokens').select('id,user_id,token').in('user_id', userIds),
    ])
    : [{ data: [] }, { data: [] }];
  const groupByUser = (rows) => {
    const map = new Map();
    for (const row of rows || []) map.set(row.user_id, [...(map.get(row.user_id) || []), row]);
    return map;
  };
  const webByUser = groupByUser(subscriptions);
  const mobileByUser = groupByUser(mobileTokens);
  let delivered = 0;
  const expoMessages = [];
  for (const notification of notifications || []) {
    for (const sub of webByUser.get(notification.user_id) || []) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({
          title: notification.title, body: notification.body, url: notification.action_url || '/dashboard', tag: `notification-${notification.id}`,
        }), { TTL: 86400 });
        delivered += 1;
      } catch (sendError) {
        if ([404, 410].includes(sendError.statusCode)) await admin.from('push_subscriptions').delete().eq('id', sub.id);
      }
    }
    for (const device of mobileByUser.get(notification.user_id) || []) {
      expoMessages.push({
        tokenId: device.id,
        to: device.token,
        title: notification.title,
        body: notification.body,
        sound: 'default',
        channelId: 'default',
        ttl: 86400,
        data: { url: notification.action_url || '/dashboard', notificationId: notification.id },
      });
    }
  }
  const staleTokenIds = new Set();
  for (const { tokenId, ticket } of await sendExpoMessages(expoMessages)) {
    if (ticket?.status === 'ok') delivered += 1;
    if (ticket?.details?.error === 'DeviceNotRegistered') staleTokenIds.add(tokenId);
  }
  if (staleTokenIds.size) await admin.from('mobile_push_tokens').delete().in('id', [...staleTokenIds]);
  const notificationIds = (notifications || []).map((item) => item.id);
  if (notificationIds.length) await admin.from('notifications').update({ push_dispatched_at: new Date().toISOString() }).in('id', notificationIds);
  return Response.json({ ok: true, processed: notificationIds.length, delivered });
}
