import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

export const googleSignInAvailable = Boolean(env.googleWebClientId);

let googleConfigured = false;
async function googleModule() {
  const module = await import('@react-native-google-signin/google-signin');
  if (!googleConfigured) {
    module.GoogleSignin.configure({
      webClientId: env.googleWebClientId,
      iosClientId: env.googleIosClientId || undefined,
      scopes: ['email', 'profile'],
    });
    googleConfigured = true;
  }
  return module;
}

export class SocialCancelled extends Error {}

// Native Google account picker → Supabase session (same Google provider the web uses).
export async function signInWithGoogle() {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await googleModule();
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new SocialCancelled();
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google kimlik bilgisi alınamadı.');
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error) throw error;
    return data;
  } catch (error) {
    if (error instanceof SocialCancelled) throw error;
    if (isErrorWithCode(error) && [statusCodes.SIGN_IN_CANCELLED, statusCodes.IN_PROGRESS].includes(error.code as never)) throw new SocialCancelled();
    throw error;
  }
}

export async function signOutGoogle() {
  if (!googleSignInAvailable) return;
  const { GoogleSignin } = await googleModule();
  await GoogleSignin.signOut().catch(() => undefined);
}

export async function appleSignInAvailable() {
  return Platform.OS === 'ios' && AppleAuthentication.isAvailableAsync();
}

// Sign in with Apple is required on iOS whenever Google sign-in is offered.
export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashedNonce,
    });
    if (!credential.identityToken) throw new Error('Apple kimlik bilgisi alınamadı.');
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken, nonce: rawNonce });
    if (error) throw error;
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
    if (fullName && !data.user?.user_metadata?.full_name) await supabase.auth.updateUser({ data: { full_name: fullName } });
    return data;
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED') throw new SocialCancelled();
    throw error;
  }
}
