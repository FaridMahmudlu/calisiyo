import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getShopierConfiguration } from '@/lib/billing/providers/shopier';
import {
  deleteProducerPromo,
  provisionProducerPromo,
  safePromoErrorCode,
} from '@/lib/billing/content-producer-shopier';

export const dynamic = 'force-dynamic';

async function syncSelfCode({ supabase, userId, code, oldProviderDiscountId = null }) {
  if (oldProviderDiscountId) await deleteProducerPromo(oldProviderDiscountId);
  const { discount } = await provisionProducerPromo(code);
  const admin = createAdminClient();
  const { error: confirmError } = await admin.rpc('service_confirm_self_content_producer_code', {
    p_user_id: userId,
    p_provider_discount_id: String(discount.id),
  });
  if (confirmError) throw confirmError;
  const { data: producer, error: producerError } = await supabase.rpc('current_content_producer_summary');
  if (producerError) throw producerError;
  return producer;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });
  const [producerResult, applicationResult] = await Promise.all([
    supabase.rpc('current_content_producer_summary'),
    supabase.rpc('current_content_producer_application'),
  ]);
  if (producerResult.error || applicationResult.error) {
    console.error('Content producer summary failed', {
      producerCode: producerResult.error?.code,
      applicationCode: applicationResult.error?.code,
    });
    return Response.json({ ok: false, message: 'Üretici bilgilerin şu anda yüklenemedi.' }, { status: 502 });
  }
  return Response.json({
    ok: true,
    producer: producerResult.data,
    application: applicationResult.data,
  });
}

export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}
  const action = String(body.action || 'submit');

  try {
    if (action === 'change_code' || action === 'retry_code_sync') {
      const config = getShopierConfiguration();
      if (!config.accessToken || !config.promoScopeVerified) {
        return Response.json({ ok: false, message: 'Kod değişikliği şu anda hazırlanıyor. Lütfen daha sonra tekrar dene.' }, { status: 503 });
      }
      if (action === 'retry_code_sync') {
        const { data: current, error: currentError } = await supabase.rpc('current_content_producer_summary');
        if (currentError) throw currentError;
        if (!current?.selfCodeChangeUsed || current?.promoStatus !== 'manual_required' || !current?.codePreview) {
          return Response.json({ ok: false, message: 'Yeniden etkinleştirilecek bir indirim kodu bulunamadı.' }, { status: 409 });
        }
        try {
          const producer = await syncSelfCode({ supabase, userId: user.id, code: current.codePreview });
          return Response.json({ ok: true, producer, message: 'İndirim kodun etkinleştirildi.' });
        } catch (syncError) {
          console.error('Content producer self code retry failed', {
            code: safePromoErrorCode(syncError, 'self_code_retry_failed'),
          });
          return Response.json({ ok: false, producer: current, message: 'Kodun henüz etkinleştirilemedi. Biraz sonra tekrar dene.' }, { status: 502 });
        }
      }
      const { data, error } = await supabase.rpc('self_rotate_content_producer_code', {
        p_requested_code: String(body.code || ''),
      });
      if (error) throw error;
      try {
        const producer = await syncSelfCode({
          supabase,
          userId: user.id,
          code: data.code,
          oldProviderDiscountId: data.externalDisableRequired ? data.oldProviderDiscountId : null,
        });
        return Response.json({ ok: true, producer, message: 'Yeni indirim kodun etkinleştirildi.' });
      } catch (syncError) {
        console.error('Content producer self code sync failed', {
          code: safePromoErrorCode(syncError, 'self_code_sync_failed'),
        });
        const { data: producer } = await supabase.rpc('current_content_producer_summary');
        return Response.json({
          ok: true,
          producer: producer || data,
          message: 'Yeni kodun kaydedildi. Shopier etkinleştirmesi güvenli biçimde tamamlanıyor.',
        }, { status: 202 });
      }
    }
    if (action === 'withdraw') {
      const { data, error } = await supabase.rpc('withdraw_content_producer_application');
      if (error) throw error;
      return Response.json({ ok: true, application: data, message: 'Başvurun geri çekildi.' });
    }
    if (action !== 'submit') {
      return Response.json({ ok: false, message: 'Geçersiz işlem.' }, { status: 400 });
    }

    const audienceSize = Number(body.audienceSize);
    if (!Number.isSafeInteger(audienceSize)) {
      return Response.json({ ok: false, message: 'Geçerli bir takipçi/abone sayısı girmelisin.' }, { status: 400 });
    }
    const { data, error } = await supabase.rpc('submit_content_producer_application', {
      p_platform: String(body.platform || ''),
      p_profile_url: String(body.profileUrl || ''),
      p_audience_size: audienceSize,
      p_content_focus: String(body.contentFocus || ''),
      p_motivation: String(body.motivation || ''),
      p_preferred_plan_code: String(body.preferredPlanCode || ''),
    });
    if (error) throw error;
    return Response.json({
      ok: true,
      application: data,
      message: 'Başvurun alındı. İnceleme sonucunu bu sayfadan ve bildirimlerinden takip edebilirsin.',
    });
  } catch (error) {
    console.error('Content producer application action failed', { action, code: error?.code || 'unknown' });
    const messages = {
      '42501': 'Başvuru için aktif bir hesapla giriş yapmalısın.',
      '22023': error?.message?.includes('zaten')
        ? 'Hesabın zaten İçerik Üretici Programı kapsamında.'
        : 'Başvuru bilgilerini kontrol edip tekrar dene.',
      'P0002': 'Bekleyen bir başvuru bulunamadı.',
      '23505': 'Bu indirim kodu başka bir üretici tarafından kullanılıyor.',
      'P0001': error?.message?.includes('yalnızca bir kez')
        ? 'İndirim kodunu yalnızca bir kez değiştirebilirsin.'
        : 'İndirim kodu değişikliği tamamlanamadı.',
    };
    return Response.json({ ok: false, message: messages[error?.code] || 'Başvuru işlemi şu anda tamamlanamadı.' }, { status: 400 });
  }
}
