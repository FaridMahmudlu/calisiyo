import Storage from 'expo-sqlite/kv-store';
import { AlarmClock, BellRing, Camera, Mic } from 'lucide-react-native';
import { Dialog } from '@/components/ui';

type Kind = 'notifications' | 'camera' | 'microphone' | 'exactAlarms';

const COPY = {
  notifications: {
    icon: BellRing, confirmText: 'İzin ver', title: 'Bildirimleri açalım mı?',
    message: 'Kronometre bittiğinde haber verelim, günlük planını ve tekrarlarını zamanında hatırlatalım. İstediğin zaman Ayarlar’dan kapatabilirsin.',
  },
  camera: {
    icon: Camera, confirmText: 'Devam et', title: 'Kamera erişimi',
    message: 'Çözemediğin soruların fotoğrafını çekebilmen için kameraya erişmemiz gerekiyor. Fotoğraflar yalnızca senin hesabında saklanır.',
  },
  microphone: {
    icon: Mic, confirmText: 'Devam et', title: 'Mikrofon erişimi',
    message: 'Sınıf sohbetinde sesli mesaj kaydedebilmen için mikrofona erişmemiz gerekiyor. Kayıt yalnızca gönderdiğinde paylaşılır.',
  },
  exactAlarms: {
    icon: AlarmClock, confirmText: 'Ayarları aç', title: 'Tam zamanında haber verelim',
    message: 'Kronometre bittiğinde bildirimi saniyesi saniyesine alman için Android ayarlarında “Alarmlar ve hatırlatıcılar” iznini aç. Açmazsan bildirim birkaç dakika gecikebilir.',
  },
} as const;

const COOLDOWN = 3 * 86_400_000;

// Explains why before the one-time system prompt (which can't be styled).
// Returns false when the user postpones; automatic prompts then wait 3 days.
export async function explainPermission(kind: Kind, { force = false }: { force?: boolean } = {}) {
  const key = `planliyo-permission-primer:${kind}`;
  if (!force && Date.now() - Number(Storage.getItemSync(key) || 0) < COOLDOWN) return false;
  const accepted = await Dialog.confirm({ ...COPY[kind], cancelText: 'Şimdi değil', tone: 'primary' });
  if (!accepted) Storage.setItemSync(key, String(Date.now()));
  return accepted;
}
