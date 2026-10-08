import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { BadgePercent, Check, Lock, Mail, MailCheck, UserRound } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PASSWORD_MIN_LENGTH, passwordValidationMessage } from '@shared/utils/password';
import { Button, Notice, Text, TextField } from '@/components/ui';
import { AlanPicker, YearPicker } from '@/features/auth/AlanPicker';
import { AuthScaffold } from '@/features/auth/AuthScaffold';
import { claimPendingCreatorCode, issueCreatorClaim, rememberPendingClaim, validateCreatorCode, type CreatorCodeState } from '@/features/auth/creatorCode';
import { SocialButtons } from '@/features/auth/SocialButtons';
import { openWebPage } from '@/lib/browser';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const CODE_MESSAGES: Record<Exclude<CreatorCodeState, 'idle'>, string> = {
  checking: 'Kod kontrol ediliyor…',
  valid: '✓ Kod doğrulandı. İçerik üretici indirimin hesabına tanımlanacak.',
  limited: 'Kod doğrulama hizmeti kısa süreliğine yoğun. Bir dakika sonra tekrar dene.',
  invalid: 'Bu kod geçerli değil veya şu anda kullanılamıyor.',
};

export default function SignupScreen() {
  const { colors } = useTheme();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', alanSecimi: '', yksYear: 2027, creatorCode: '', consent: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [codeState, setCodeState] = useState<CreatorCodeState>('idle');
  const claimRef = useRef<string | null>(null);
  const validationId = useRef(0);

  const resetCode = (creatorCode: string) => {
    validationId.current += 1;
    claimRef.current = null;
    setCodeState('idle');
    setForm((current) => ({ ...current, creatorCode: creatorCode.toUpperCase() }));
  };

  const checkCode = async () => {
    const code = form.creatorCode.trim();
    if (!code) { setCodeState('idle'); return true; }
    if (codeState === 'valid') return true;
    const id = ++validationId.current;
    setCodeState('checking');
    const result = await validateCreatorCode(code);
    if (id !== validationId.current) return false;
    if (result.retryable) { setCodeState('limited'); return false; }
    if (!result.valid) { setCodeState('invalid'); return false; }
    setForm((current) => ({ ...current, creatorCode: result.code || code }));
    setCodeState('valid');
    return true;
  };

  const issueClaim = async () => {
    const code = form.creatorCode.trim();
    if (!code) return { ok: true, token: null as string | null };
    if (claimRef.current) return { ok: true, token: claimRef.current };
    setCodeState('checking');
    const result = await issueCreatorClaim(code);
    if (result.retryable) { setCodeState('limited'); return { ok: false, token: null }; }
    if (!result.valid || !result.claimToken) { setCodeState('invalid'); return { ok: false, token: null }; }
    claimRef.current = result.claimToken;
    setCodeState('valid');
    return { ok: true, token: result.claimToken };
  };

  const beforeOAuth = async () => {
    if (!form.consent) { setError('Devam etmek için üyelik şartlarını kabul etmelisin.'); return false; }
    const claim = await issueClaim();
    if (!claim.ok) { setError(CODE_MESSAGES.invalid); return false; }
    rememberPendingClaim(claim.token);
    return true;
  };

  const next = async () => {
    setError('');
    if (form.fullName.trim().length < 2) return setError('Ad soyad alanını doldurmalısın.');
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError('Geçerli bir e-posta adresi gir.');
    const passwordError = passwordValidationMessage(form.password);
    if (passwordError) return setError(passwordError);
    if (form.password !== form.confirmPassword) return setError('Şifreler birbiriyle eşleşmiyor.');
    if (!form.consent) return setError('Devam etmek için üyelik şartlarını kabul etmelisin.');
    if (!(await checkCode())) return setError(codeState === 'limited' ? CODE_MESSAGES.limited : CODE_MESSAGES.invalid);
    setStep(2);
  };

  const submit = async () => {
    setError('');
    if (!form.alanSecimi) return setError('Devam etmek için bir alan seçmelisin.');
    setLoading(true);
    const claim = await issueClaim();
    if (!claim.ok) {
      setLoading(false);
      setStep(1);
      return setError(CODE_MESSAGES.invalid);
    }
    rememberPendingClaim(claim.token);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: Linking.createURL('/auth/callback'),
        data: { full_name: form.fullName.trim(), alan_secimi: form.alanSecimi, yks_year: form.yksYear },
      },
    });
    setLoading(false);
    if (signUpError) {
      return setError(/already|registered/i.test(signUpError.message)
        ? 'Bu e-posta ile daha önce hesap oluşturulmuş. Giriş yapmayı dene.'
        : /rate limit/i.test(signUpError.message)
          ? 'Çok fazla doğrulama e-postası istendi. Birkaç dakika sonra tekrar dene.'
          : signUpError.message);
    }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setStep(1);
      return setError('Bu e-posta ile daha önce hesap oluşturulmuş. Giriş yapmayı veya şifreni yenilemeyi dene.');
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (!data.session) setConfirmationSent(true);
    else await claimPendingCreatorCode(claim.token);
  };

  if (confirmationSent) {
    return (
      <AuthScaffold title="E-postanı kontrol et" subtitle={`Hesabını etkinleştirmek için ${form.email} adresine gönderilen bağlantıya dokun.`} back={false}>
        <Notice tone="success" icon={MailCheck}>Bağlantıyı bu telefonda açarsan Calisiyo otomatik olarak giriş yapar.</Notice>
        <Button title="Giriş sayfasına dön" variant="secondary" size="lg" onPress={() => router.replace('/giris')} />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Hesap oluştur"
      subtitle={step === 1 ? 'E-posta veya sosyal hesabınla ücretsiz başla.' : 'Hazırlandığın sınav yılını ve alanı seç.'}
      error={error}
      footer={step === 1 ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text variant="body" color="textMuted">Zaten hesabın var mı?</Text>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/giris')}><Text variant="bodyStrong" color="primary">Giriş yap</Text></Pressable>
        </View>
      ) : undefined}
    >
      <View style={styles.steps} accessibilityLabel={`Adım ${step} / 2`}>
        {[1, 2].map((item) => <View key={item} style={[styles.step, { backgroundColor: item <= step ? colors.primary : colors.border }]} />)}
      </View>

      {step === 1 ? (
        <>
          <SocialButtons onError={setError} beforeSignIn={beforeOAuth} afterSignIn={async () => { await claimPendingCreatorCode(); }} />
          <TextField label="Ad Soyad" icon={UserRound} value={form.fullName} onChangeText={(fullName) => setForm({ ...form, fullName })} autoComplete="name" textContentType="name" />
          <TextField label="E-posta" icon={Mail} value={form.email} onChangeText={(email) => setForm({ ...form, email })} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
          <TextField label="Şifre" icon={Lock} secure value={form.password} onChangeText={(password) => setForm({ ...form, password })} autoComplete="new-password" textContentType="newPassword" hint={`En az ${PASSWORD_MIN_LENGTH} karakter; büyük/küçük harf, rakam ve özel karakter kullan.`} />
          <TextField label="Şifreyi doğrula" icon={Lock} secure value={form.confirmPassword} onChangeText={(confirmPassword) => setForm({ ...form, confirmPassword })} autoComplete="new-password" textContentType="newPassword" />
          <TextField
            label="İçerik üretici kodun var mı? (İsteğe bağlı)"
            icon={BadgePercent}
            value={form.creatorCode}
            onChangeText={resetCode}
            onBlur={checkCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={64}
            placeholder="Örn. MELIKE20"
            error={codeState === 'invalid' || codeState === 'limited' ? CODE_MESSAGES[codeState] : undefined}
            hint={codeState === 'valid' || codeState === 'checking' ? CODE_MESSAGES[codeState] : 'Varsa içerik üreticisinin sana özel kodunu girebilirsin.'}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.consent }}
            onPress={() => setForm({ ...form, consent: !form.consent })}
            style={styles.consent}
          >
            <View style={[styles.checkbox, { borderColor: form.consent ? colors.primary : colors.borderStrong, backgroundColor: form.consent ? colors.primary : 'transparent' }]}>
              {form.consent ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
            </View>
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
              <Text variant="captionStrong" color="primary" onPress={() => openWebPage('/kullanim-sartlari')}>Kullanım Şartları</Text>’nı,{' '}
              <Text variant="captionStrong" color="primary" onPress={() => openWebPage('/gizlilik')}>Gizlilik Politikası</Text>’nı ve{' '}
              <Text variant="captionStrong" color="primary" onPress={() => openWebPage('/kvkk')}>KVKK Aydınlatma Metni</Text>’ni okudum, kabul ediyorum.
            </Text>
          </Pressable>
          <Button title="Devam Et" size="lg" onPress={next} loading={codeState === 'checking'} />
        </>
      ) : (
        <>
          <Text variant="label" color="textMuted">YKS yılı</Text>
          <YearPicker value={form.yksYear} onChange={(yksYear) => setForm({ ...form, yksYear })} />
          <Text variant="label" color="textMuted" style={{ marginTop: space.sm }}>Alan</Text>
          <AlanPicker value={form.alanSecimi} onChange={(alanSecimi) => setForm({ ...form, alanSecimi })} />
          <View style={styles.actions}>
            <Button title="Geri" variant="secondary" size="lg" onPress={() => setStep(1)} style={{ flex: 1 }} />
            <Button title={loading ? 'Oluşturuluyor…' : 'Hesabı Oluştur'} size="lg" loading={loading} onPress={submit} style={{ flex: 2 }} />
          </View>
        </>
      )}
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: space.sm },
  step: { flex: 1, height: 4, borderRadius: 2 },
  consent: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  checkbox: { width: 22, height: 22, borderRadius: radius.xs - 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
});
