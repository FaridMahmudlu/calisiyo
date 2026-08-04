const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;

export async function uploadStudyImage(supabase, userId, file, folder) {
  if (!file) return null;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('Yalnızca JPG, PNG veya WebP görselleri yükleyebilirsin.');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Görsel boyutu 6 MB sınırını aşamaz.');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('study-assets').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function createStudyImageUrls(supabase, paths) {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  if (!uniquePaths.length) return {};
  const { data, error } = await supabase.storage.from('study-assets').createSignedUrls(uniquePaths, 60 * 60);
  if (error) return {};
  return Object.fromEntries((data || []).map((item) => [item.path, item.signedUrl]));
}
