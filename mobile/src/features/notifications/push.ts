import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const TOKEN_KEY = 'calisiyo-expo-push-token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Genel bildirimler',
    description: 'Plan, tekrar, seri ve deneme hatırlatmaları',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#00A870',
  });
  await Notifications.setNotificationChannelAsync('timer', {
    name: 'Kronometre',
    description: 'Çalışma ve mola bitiş bildirimleri',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#00A870',
  });
}

export async function notificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission() {
  await ensureNotificationChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (!current.canAskAgain) return current.status;
  const next = await Notifications.requestPermissionsAsync();
  return next.status;
}

// Registers this device for server-sent push (daily plan, repeats, admin
// broadcasts). Local Kronometre notifications work without a push token.
export async function registerDeviceForPush() {
  if (!Device.isDevice) return { ok: false as const, reason: 'Bildirimler yalnızca gerçek cihazda çalışır.' };
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') return { ok: false as const, reason: 'Bildirim izni verilmedi. Ayarlar’dan izin verebilirsin.' };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return { ok: false as const, reason: 'Cihaz bildirimleri bu sürümde henüz yapılandırılmadı.' };
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  const { error } = await supabase.rpc('register_mobile_push_token', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    p_device_name: Device.deviceName || Device.modelName || null,
  });
  if (error) return { ok: false as const, reason: 'Cihaz bildirimi hesabına bağlanamadı.' };
  Storage.setItemSync(TOKEN_KEY, token);
  return { ok: true as const, token };
}

export async function unregisterDeviceForPush() {
  const token = Storage.getItemSync(TOKEN_KEY);
  if (!token) return;
  await supabase.rpc('unregister_mobile_push_token', { p_token: token });
  Storage.removeItemSync(TOKEN_KEY);
}

export function isDeviceRegisteredForPush() {
  return Boolean(Storage.getItemSync(TOKEN_KEY));
}
