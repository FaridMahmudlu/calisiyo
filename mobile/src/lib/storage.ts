import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_EDGE = 1920;

export type PickedImage = { uri: string; width: number; height: number; mimeType: string; name: string };

export async function pickImage({ camera = false, aspect }: { camera?: boolean; aspect?: [number, number] } = {}): Promise<PickedImage | null> {
  const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error(camera ? 'Kamera izni verilmedi. Ayarlar’dan izin verebilirsin.' : 'Fotoğraf erişim izni verilmedi.');
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9, allowsEditing: !!aspect, aspect };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType || 'image/jpeg', name: asset.fileName || 'gorsel.jpg' };
}

export async function pickImages(limit: number): Promise<PickedImage[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Fotoğraf erişim izni verilmedi.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: true, selectionLimit: limit, orderedSelection: true });
  if (result.canceled) return [];
  return result.assets.slice(0, limit).map((asset) => ({ uri: asset.uri, width: asset.width, height: asset.height, mimeType: asset.mimeType || 'image/jpeg', name: asset.fileName || 'gorsel.jpg' }));
}

// Resizes to the same 1920px edge the web client uses and re-encodes as WebP.
export async function optimizeImage(image: PickedImage): Promise<PickedImage> {
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const context = ImageManipulator.manipulate(image.uri);
  if (scale < 1) context.resize({ width: Math.round(image.width * scale), height: Math.round(image.height * scale) });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: 0.82, format: SaveFormat.WEBP });
  return { uri: saved.uri, width: saved.width, height: saved.height, mimeType: 'image/webp', name: image.name.replace(/\.[^.]+$/, '') + '.webp' };
}

export async function readFileBytes(uri: string) {
  const response = await fetch(uri);
  return response.arrayBuffer();
}

export async function uploadStudyImage(userId: string, image: PickedImage, folder: string) {
  const optimized = await optimizeImage(image);
  const bytes = await readFileBytes(optimized.uri);
  if (bytes.byteLength > MAX_IMAGE_SIZE) throw new Error('Görsel boyutu 6 MB sınırını aşamaz.');
  const path = `${userId}/${folder}/${Crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from('study-assets').upload(path, bytes, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error('Görsel yüklenemedi. Bağlantını kontrol edip tekrar dene.');
  return path;
}

export async function createStudyImageUrls(paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter(Boolean) as string[])];
  if (!unique.length) return {} as Record<string, string>;
  const { data, error } = await supabase.storage.from('study-assets').createSignedUrls(unique, 60 * 60);
  if (error) return {} as Record<string, string>;
  return Object.fromEntries((data || []).filter((item) => item.path && item.signedUrl).map((item) => [item.path as string, item.signedUrl as string])) as Record<string, string>;
}

export async function removeStudyImages(paths: string[]) {
  if (paths.length) await supabase.storage.from('study-assets').remove(paths);
}
