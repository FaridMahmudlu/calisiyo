import { createClient } from '@/lib/supabase/server';

const YOUTUBE_HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be',
]);
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,80}$/;
const MAX_ITEMS = 200;

function invalid(message, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function parseSource(rawUrl) {
  let parsed;
  try { parsed = new URL(String(rawUrl || '').trim()); } catch { return null; }
  if (parsed.protocol !== 'https:' || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) return null;

  const playlistId = parsed.searchParams.get('list');
  let videoId = parsed.searchParams.get('v');
  if (parsed.hostname.toLowerCase() === 'youtu.be') videoId = parsed.pathname.split('/').filter(Boolean)[0];
  if (!videoId) {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (['shorts', 'embed', 'live'].includes(parts[0])) videoId = parts[1];
  }

  if (playlistId && PLAYLIST_ID.test(playlistId)) {
    return { kind: 'youtube_playlist', externalId: playlistId, url: `https://www.youtube.com/playlist?list=${playlistId}` };
  }
  if (videoId && VIDEO_ID.test(videoId)) {
    return { kind: 'youtube_video', externalId: videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
  }
  return null;
}

function isoDurationSeconds(value) {
  const match = String(value || '').match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 86400 + Number(match[2] || 0) * 3600 + Number(match[3] || 0) * 60 + Number(match[4] || 0);
}

function clockDurationSeconds(value) {
  const parts = String(value || '').trim().split(':').map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part) || part < 0)) return 0;
  return parts.reduce((total, part) => total * 60 + part, 0);
}

async function fetchText(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CalisiyoLearningPlanner/1.0)' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`YouTube ${response.status}`);
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > 8_000_000) throw new Error('Response too large');
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

async function postJson(url, body, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'POST', signal: controller.signal, cache: 'no-store',
      headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; CalisiyoLearningPlanner/1.0)' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`YouTube ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function bestThumbnail(thumbnails) {
  const items = Array.isArray(thumbnails) ? thumbnails : [];
  return items.at(-1)?.url || items[0]?.url || null;
}

function deepValuesByKey(value, target, results = []) {
  if (!value || typeof value !== 'object') return results;
  if (Object.prototype.hasOwnProperty.call(value, target)) results.push(value[target]);
  for (const child of Object.values(value)) deepValuesByKey(child, target, results);
  return results;
}

let innertubeConfigPromise;
async function getInnertubeConfig() {
  if (!innertubeConfigPromise) {
    innertubeConfigPromise = fetchText('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
      .then((html) => {
        const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
        const version = html.match(/"INNERTUBE_CONTEXT_CLIENT_VERSION":"([^"]+)"/)?.[1];
        if (!key || !version) throw new Error('YouTube player configuration unavailable');
        return { key, version };
      })
      .catch((error) => { innertubeConfigPromise = null; throw error; });
  }
  return innertubeConfigPromise;
}

function innertubeContext(version) {
  return { client: { clientName: 'WEB', clientVersion: version, hl: 'tr', gl: 'TR' } };
}

async function innertubeRequest(endpoint, body) {
  const { key, version } = await getInnertubeConfig();
  return postJson(`https://www.youtube.com/youtubei/v1/${endpoint}?key=${encodeURIComponent(key)}`, {
    context: innertubeContext(version), ...body,
  });
}

async function metadataWithApi(source, apiKey) {
  if (source.kind === 'youtube_video') {
    const payload = await fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(source.externalId)}&key=${encodeURIComponent(apiKey)}`);
    const item = payload.items?.[0];
    if (!item) throw new Error('Video not found');
    const durationSeconds = isoDurationSeconds(item.contentDetails?.duration);
    return {
      resource: {
        ...source, title: item.snippet.title, channelTitle: item.snippet.channelTitle,
        thumbnailUrl: bestThumbnail(Object.values(item.snippet.thumbnails || {})),
        durationMinutes: Math.max(1, Math.ceil(durationSeconds / 60)), itemCount: 1, metadataProvider: 'youtube-data-api',
      },
      items: [{ videoId: item.id, title: item.snippet.title, channelTitle: item.snippet.channelTitle, thumbnailUrl: bestThumbnail(Object.values(item.snippet.thumbnails || {})), durationSeconds, position: 1 }],
    };
  }

  const playlistItems = [];
  let pageToken = '';
  do {
    const payload = await fetchJson(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${encodeURIComponent(source.externalId)}&pageToken=${encodeURIComponent(pageToken)}&key=${encodeURIComponent(apiKey)}`);
    playlistItems.push(...(payload.items || []));
    pageToken = payload.nextPageToken || '';
  } while (pageToken && playlistItems.length < MAX_ITEMS);
  const limited = playlistItems.slice(0, MAX_ITEMS);
  if (!limited.length) throw new Error('Playlist empty');

  const details = new Map();
  for (let index = 0; index < limited.length; index += 50) {
    const ids = limited.slice(index, index + 50).map((item) => item.contentDetails?.videoId).filter(VIDEO_ID.test.bind(VIDEO_ID));
    const payload = await fetchJson(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(ids.join(','))}&key=${encodeURIComponent(apiKey)}`);
    for (const item of payload.items || []) details.set(item.id, item);
  }
  const items = limited.map((playlistItem, index) => {
    const video = details.get(playlistItem.contentDetails?.videoId);
    const durationSeconds = isoDurationSeconds(video?.contentDetails?.duration);
    return video && durationSeconds > 0 ? {
      videoId: video.id, title: video.snippet.title, channelTitle: video.snippet.channelTitle,
      thumbnailUrl: bestThumbnail(Object.values(video.snippet.thumbnails || {})), durationSeconds, position: index + 1,
    } : null;
  }).filter(Boolean);
  if (!items.length) throw new Error('Playlist videos unavailable');
  const playlist = await fetchJson(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${encodeURIComponent(source.externalId)}&key=${encodeURIComponent(apiKey)}`);
  const snippet = playlist.items?.[0]?.snippet || limited[0].snippet || {};
  return {
    resource: {
      ...source, title: snippet.title || 'YouTube oynatma listesi', channelTitle: snippet.channelTitle || items[0].channelTitle,
      thumbnailUrl: bestThumbnail(Object.values(snippet.thumbnails || {})) || items[0].thumbnailUrl,
      durationMinutes: Math.ceil(items.reduce((sum, item) => sum + item.durationSeconds, 0) / 60), itemCount: items.length, metadataProvider: 'youtube-data-api',
    }, items,
  };
}

async function fallbackSingle(source) {
  const player = await innertubeRequest('player', { videoId: source.externalId });
  const details = player.videoDetails || {};
  const durationSeconds = Number(details.lengthSeconds || 0);
  if (!durationSeconds) throw new Error('Video duration unavailable');
  const item = {
    videoId: source.externalId, title: String(details.title || 'YouTube videosu').slice(0, 200),
    channelTitle: String(details.author || 'YouTube').slice(0, 120),
    thumbnailUrl: bestThumbnail(details.thumbnail?.thumbnails) || `https://i.ytimg.com/vi/${source.externalId}/hqdefault.jpg`,
    durationSeconds, position: 1,
  };
  return { resource: { ...source, title: item.title, channelTitle: item.channelTitle, thumbnailUrl: item.thumbnailUrl, durationMinutes: Math.ceil(durationSeconds / 60), itemCount: 1, metadataProvider: 'youtube-public-player' }, items: [item] };
}

async function fallbackPlaylist(source) {
  const seen = new Set();
  const items = [];
  let title = 'YouTube oynatma listesi';
  let channelTitle = 'YouTube';
  let continuation = '';
  let page = 0;
  do {
    const payload = await innertubeRequest('browse', continuation ? { continuation } : { browseId: `VL${source.externalId}` });
    if (page === 0) {
      title = String(payload.header?.pageHeaderRenderer?.pageTitle || title).slice(0, 160);
      const headerText = payload.header?.pageHeaderRenderer?.content?.pageHeaderViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.avatarStack?.avatarStackViewModel?.text?.content;
      if (headerText) channelTitle = String(headerText).replace(/\s+tarafından$/i, '').slice(0, 120);
    }
    const lockups = deepValuesByKey(payload, 'lockupViewModel');
    for (const lockup of lockups) {
      const videoId = lockup.contentId;
      const titleText = lockup.metadata?.lockupMetadataViewModel?.title?.content;
      const itemChannel = lockup.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content;
      const durationText = deepValuesByKey(lockup.contentImage, 'text').find((entry) => typeof entry === 'string' && /^\d+(?::\d+){1,2}$/.test(entry));
      const durationSeconds = clockDurationSeconds(durationText);
      const thumbnailSources = lockup.contentImage?.thumbnailViewModel?.image?.sources;
      if (!VIDEO_ID.test(videoId || '') || !titleText || !durationSeconds || seen.has(videoId)) continue;
      seen.add(videoId);
      items.push({ videoId, title: String(titleText).slice(0, 200), channelTitle: String(itemChannel || channelTitle).slice(0, 120), thumbnailUrl: bestThumbnail(thumbnailSources), durationSeconds, position: items.length + 1 });
      if (items.length >= MAX_ITEMS) break;
    }
    const continuationItem = deepValuesByKey(payload, 'continuationItemViewModel')[0];
    const nextToken = continuationItem ? deepValuesByKey(continuationItem, 'token').find((entry) => typeof entry === 'string') : '';
    if (!nextToken || nextToken === continuation) continuation = '';
    else continuation = nextToken;
    page += 1;
  } while (continuation && items.length < MAX_ITEMS && page < 12);
  if (!items.length) throw new Error('Playlist metadata unavailable');
  return {
    resource: {
      ...source, title, channelTitle, thumbnailUrl: items[0].thumbnailUrl,
      durationMinutes: Math.ceil(items.reduce((sum, item) => sum + item.durationSeconds, 0) / 60), itemCount: items.length, metadataProvider: 'youtube-public-player',
    }, items,
  }
}

async function getMetadata(source) {
  if (process.env.YOUTUBE_API_KEY) {
    try { return await metadataWithApi(source, process.env.YOUTUBE_API_KEY); } catch (error) { console.warn('YouTube Data API fallback used', { message: error.message }); }
  }
  return source.kind === 'youtube_video' ? fallbackSingle(source) : fallbackPlaylist(source);
}

function scheduleItems(items, startDate, cadence, targetMinutes) {
  const allowedDays = cadence === 'weekly' ? new Set([1, 3, 6]) : null;
  const date = new Date(`${startDate}T12:00:00Z`);
  const nextAllowedDate = () => {
    while (allowedDays && !allowedDays.has(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  };
  nextAllowedDate();
  let usedMinutes = 0;
  return items.map((item) => {
    const durationMinutes = Math.max(1, Math.ceil(item.durationSeconds / 60));
    if (usedMinutes > 0 && usedMinutes + durationMinutes > targetMinutes) {
      date.setUTCDate(date.getUTCDate() + 1);
      nextAllowedDate();
      usedMinutes = 0;
    }
    const scheduledDate = date.toISOString().slice(0, 10);
    usedMinutes += durationMinutes;
    return { ...item, scheduledDate };
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return invalid('Oturumunun süresi doldu. Lütfen yeniden giriş yap.', 401);

  let body;
  try { body = await request.json(); } catch { return invalid('Gönderilen bilgiler okunamadı.'); }
  const source = parseSource(body.url);
  if (!source) return invalid('Geçerli bir YouTube video veya oynatma listesi bağlantısı gir.');

  let metadata;
  try { metadata = await getMetadata(source); } catch (error) {
    console.error('YouTube metadata could not be loaded', { kind: source.kind, message: error.message });
    return invalid('YouTube içeriği okunamadı. Bağlantının herkese açık olduğundan emin olup tekrar dene.', 422);
  }
  if (!metadata.items.length || metadata.items.length > MAX_ITEMS) return invalid('Bu içerik planlanabilecek video sınırının dışında.', 422);
  if (body.action !== 'import') return Response.json({ ok: true, ...metadata });

  const startDate = String(body.startDate || '');
  const cadence = body.cadence === 'weekly' ? 'weekly' : 'daily';
  const dailyMinutes = Number(body.dailyMinutes);
  const courseId = body.courseId ? String(body.courseId) : null;
  const examType = ['TYT', 'AYT', 'YDT'].includes(body.examType) ? body.examType : 'TYT';
  const startItem = Number(body.startItem || 1);
  const startOffsetMinutes = Number(body.startOffsetMinutes || 0);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(dailyMinutes) || dailyMinutes < 15 || dailyMinutes > 360) {
    return invalid('Başlangıç tarihi ve günlük süre ayarlarını kontrol et.');
  }
  if (!Number.isInteger(startItem) || startItem < 1 || startItem > metadata.items.length
    || !Number.isInteger(startOffsetMinutes) || startOffsetMinutes < 0) {
    return invalid('Devam noktası içerik sırasıyla eşleşmiyor.');
  }
  const remainingItems = metadata.items.slice(startItem - 1).map((item, index) => ({ ...item, position: index + 1 }));
  const offsetSeconds = startOffsetMinutes * 60;
  if (offsetSeconds >= remainingItems[0].durationSeconds) return invalid('Devam dakikası seçilen videonun süresinden kısa olmalı.');
  if (offsetSeconds) {
    remainingItems[0] = { ...remainingItems[0], durationSeconds: remainingItems[0].durationSeconds - offsetSeconds, startOffsetSeconds: offsetSeconds };
  }
  const remainingDurationMinutes = Math.max(1, Math.ceil(remainingItems.reduce((sum, item) => sum + item.durationSeconds, 0) / 60));
  const selectedResource = {
    ...metadata.resource,
    durationMinutes: remainingDurationMinutes,
    itemCount: remainingItems.length,
    startItem,
    startOffsetSeconds: offsetSeconds,
    originalItemCount: metadata.items.length,
  };
  const scheduledItems = scheduleItems(remainingItems, startDate, cadence, dailyMinutes);
  const { data, error } = await supabase.rpc('import_youtube_learning_plan', {
    p_resource: { ...selectedResource, examType },
    p_items: scheduledItems,
    p_start_date: startDate,
    p_cadence: cadence,
    p_daily_minutes: dailyMinutes,
    p_ders_id: courseId,
  });
  if (error) {
    console.error('YouTube learning plan import failed', { code: error.code });
    return invalid('Plan kaydedilemedi. Tarih ve ders ayarlarını kontrol edip tekrar dene.', 422);
  }
  return Response.json({ ok: true, result: data, resource: selectedResource, items: scheduledItems });
}
