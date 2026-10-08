import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Writes a text export to the cache and opens the native share sheet
// (save to Files, Drive, e-mail, etc.), replacing the web's file download.
export async function shareTextFile(fileName: string, content: string, mimeType: string) {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Bu cihazda paylaşım kullanılamıyor.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName, UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text' });
}
