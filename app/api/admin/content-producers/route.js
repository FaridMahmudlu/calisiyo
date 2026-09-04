import { createClient } from '@/lib/supabase/server';
import { configuredShopierClient, getShopierConfiguration } from '@/lib/billing/providers/shopier';
import { validShopierProducerDiscount } from '@/lib/billing/content-producer.mjs';
import {
  deleteProducerPromo,
  provisionProducerPromo,
  safePromoErrorCode,
} from '@/lib/billing/content-producer-shopier';

async function syncProducerPromo(session, { userId, code, retry = false }) {
  const config = getShopierConfiguration();
  if (!config.promoScopeVerified) return { active: false, manualRequired: true, reason: 'scope_not_verified' };
  const { discount, created } = await provisionProducerPromo(code);
  const { data, error } = await session.supabase.rpc('admin_confirm_content_producer_code', {
    p_user_id: userId,
    p_provider_discount_id: String(discount.id),
    p_scope_confirmed: true,
    p_sync_action: retry ? 'retry' : (created ? 'created' : 'confirmed'),
  });
  if (error) throw error;
  return { active: true, producer: data, created, providerDiscountId: String(discount.id) };
}

async function auditPromoDisable(session, { userId, providerDiscountId, action, success, errorCode = null }) {
  const { error } = await session.supabase.rpc('admin_record_content_producer_promo_disable', {
    p_user_id: userId,
    p_provider_discount_id: providerDiscountId,
    p_action: action,
    p_success: success,
    p_error_code: errorCode,
  });
  if (error) console.error('Content producer promo disable audit failed', { action, code: error.code || 'unknown' });
}

async function disableProducerPromo(session, { userId, providerDiscountId, action }) {
  const discountId = String(providerDiscountId || '').trim();
  if (!discountId) return { required: false, disabled: true };
  try {
    const result = await deleteProducerPromo(discountId);
    await auditPromoDisable(session, {
      userId, providerDiscountId: discountId, action, success: true,
    });
    return result;
  } catch (error) {
    const errorCode = safePromoErrorCode(error);
    await auditPromoDisable(session, {
      userId, providerDiscountId: discountId, action, success: false, errorCode,
    });
    console.error('Content producer promo disable failed', { action, code: errorCode });
    return { required: true, disabled: false, errorCode };
  }
}

async function adminSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ ok: false, message: 'Oturum gerekli.' }, { status: 401 }) };
  const { data: role } = await supabase.rpc('current_admin_role');
  if (!['admin', 'super_admin'].includes(role)) return { error: Response.json({ ok: false, message: 'Yönetici yetkisi gerekli.' }, { status: 403 }) };
  return { supabase, user, role };
}

export async function GET(request) {
  const session = await adminSession();
  if (session.error) return session.error;
  const params = new URL(request.url).searchParams;
  const q = params.get('q')?.trim() || '';
  const ledgerUserId = params.get('ledgerUserId')?.trim() || '';
  const range = ['7d', '30d', 'all'].includes(params.get('range')) ? params.get('range') : '30d';
  if (ledgerUserId) {
    if (!/^[0-9a-f-]{36}$/i.test(ledgerUserId)) {
      return Response.json({ ok: false, message: 'Geçerli bir üretici seçmelisin.' }, { status: 400 });
    }
    const { data: ledger, error: ledgerError } = await session.supabase
      .rpc('admin_content_producer_ledger', { p_user_id: ledgerUserId });
    if (ledgerError) return Response.json({ ok: false, message: 'Üretici hareketleri yüklenemedi.' }, { status: 502 });
    return Response.json({ ok: true, ledger });
  }
  const [
    { data: producers, error },
    { data: applications, error: applicationError },
    { data: users, error: userError },
    { data: growth, error: growthError },
  ] = await Promise.all([
    session.supabase.rpc('admin_list_content_producers'),
    session.supabase.rpc('admin_list_content_producer_applications'),
    q.length >= 2 ? session.supabase.rpc('admin_list_users', { p_search: q, p_page: 1, p_page_size: 10 }) : Promise.resolve({ data: { items: [] }, error: null }),
    session.supabase.rpc('admin_content_producer_growth_overview', { p_range: range }),
  ]);
  if (error || applicationError || userError) return Response.json({ ok: false, message: 'Üretici yönetimi yüklenemedi.' }, { status: 502 });
  if (growthError) {
    console.error('Admin creator growth summary failed', {
      feature: 'creator_signup_attribution', stage: 'admin_growth', errorCode: growthError.code || 'unknown',
    });
  }
  return Response.json({
    ok: true,
    producers: (producers || []).map((producer) => ({
      ...producer,
      growth: (growth || []).find((item) => item.userId === producer.userId) || null,
    })),
    applications: applications || [],
    users: users?.items || [],
    growthError: growthError ? 'Üretici büyüme verileri şu anda yüklenemedi.' : null,
  });
}

export async function POST(request) {
  const session = await adminSession();
  if (session.error) return session.error;
  let body = {};
  try { body = await request.json(); } catch {}
  const userId = String(body.userId || '');
  const action = String(body.action || '');
  try {
    if (action === 'activate') {
      const { data, error } = await session.supabase.rpc('admin_activate_content_producer_with_application', { p_user_id: userId, p_plan_code: body.planCode || 'plus_2027' });
      if (error) throw error;
      try {
        const promo = await syncProducerPromo(session, { userId, code: data.code });
        return Response.json({
          ok: true, producer: promo.producer || data,
          message: promo.active
            ? 'İçerik üreticisi, ücretsiz Plus grant’i ve %20 Shopier kodu etkinleştirildi.'
            : 'İçerik üreticisi ve ücretsiz Plus grant’i etkinleştirildi. Shopier kodu manuel kapsam doğrulaması bekliyor.',
        });
      } catch (promoError) {
        await session.supabase.rpc('admin_record_content_producer_promo_failure', {
          p_user_id: userId,
          p_code: data.code,
          p_error_code: String(promoError.safeCode || promoError.code || 'shopier_sync_failed').toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80),
          p_review_required: Boolean(promoError.reviewRequired),
          p_retry: false,
        });
        console.error('Content producer promo activation sync failed', { code: promoError?.code || promoError?.safeCode || 'unknown' });
        return Response.json({ ok: true, producer: data, message: 'Üretici ve ücretsiz Plus etkinleştirildi. İndirim kodu hazırlanıyor; admin panelinden güvenle tekrar denenebilir.' });
      }
    }
    if (action === 'approve_application') {
      const { data, error } = await session.supabase.rpc('admin_approve_content_producer_application', {
        p_application_id: body.applicationId,
        p_plan_code: body.planCode || 'plus_2027',
      });
      if (error) throw error;
      const approvedUserId = data.userId;
      try {
        const promo = await syncProducerPromo(session, { userId: approvedUserId, code: data.code });
        return Response.json({
          ok: true,
          producer: promo.producer || data,
          message: promo.active
            ? 'Başvuru onaylandı; ücretsiz Plus ve %20 Shopier kodu etkinleştirildi.'
            : 'Başvuru onaylandı ve ücretsiz Plus etkinleştirildi. Shopier kodu kapsam doğrulamasını bekliyor.',
        });
      } catch (promoError) {
        await session.supabase.rpc('admin_record_content_producer_promo_failure', {
          p_user_id: approvedUserId,
          p_code: data.code,
          p_error_code: safePromoErrorCode(promoError, 'shopier_application_sync_failed'),
          p_review_required: Boolean(promoError.reviewRequired),
          p_retry: false,
        });
        console.error('Approved producer application promo sync failed', { code: promoError?.code || promoError?.safeCode || 'unknown' });
        return Response.json({ ok: true, producer: data, message: 'Başvuru onaylandı ve ücretsiz Plus açıldı. İndirim kodu hazırlanıyor.' });
      }
    }
    if (action === 'reject_application') {
      const { data, error } = await session.supabase.rpc('admin_reject_content_producer_application', {
        p_application_id: body.applicationId,
        p_note: String(body.note || ''),
      });
      if (error) throw error;
      return Response.json({ ok: true, application: data, message: 'Başvuru gerekçesiyle birlikte reddedildi.' });
    }
    if (action === 'confirm_code') {
      if (body.scopeConfirmed !== true) return Response.json({ ok: false, message: 'Kodun yalnızca iki calisiyo ürününe uygulandığını Shopier panelinde doğrulamalısın.' }, { status: 400 });
      const providerDiscountId = String(body.providerDiscountId || '').trim();
      const { data: producerRows, error: producerError } = await session.supabase.rpc('admin_list_content_producers');
      if (producerError) throw producerError;
      const expectedProducer = (producerRows || []).find((item) => item.userId === userId);
      if (!expectedProducer?.code || expectedProducer.code !== String(body.code || '').trim()) {
        return Response.json({ ok: false, message: 'Üretici kodu güncel kayıtla eşleşmiyor. Sayfayı yenileyip tekrar dene.' }, { status: 409 });
      }
      const shopier = configuredShopierClient({ timeoutMs: 10_000 });
      const discount = await shopier.getDiscountCode(providerDiscountId);
      const percent = Number(discount?.percentOff);
      if (!validShopierProducerDiscount(discount, String(body.code || '').toUpperCase()) || percent !== 20) {
        return Response.json({ ok: false, message: 'Shopier indirim kaydı kod, oran veya para birimiyle eşleşmiyor.' }, { status: 400 });
      }
      const { data, error } = await session.supabase.rpc('admin_confirm_content_producer_code', {
        p_user_id: userId, p_provider_discount_id: providerDiscountId, p_scope_confirmed: true, p_sync_action: 'confirmed',
      });
      if (error) throw error;
      return Response.json({ ok: true, producer: data, message: 'İndirim kodu doğrulandı ve etkinleştirildi.' });
    }
    if (action === 'sync_code') {
      const code = String(body.code || '').trim().toUpperCase();
      try {
        const promo = await syncProducerPromo(session, { userId, code, retry: true });
        if (!promo.active) return Response.json({ ok: false, message: 'Shopier ürün kapsamı henüz güvenli biçimde doğrulanmadı.' }, { status: 409 });
        return Response.json({ ok: true, producer: promo.producer, message: 'Shopier indirim kodu güvenle senkronize edildi.' });
      } catch (promoError) {
        await session.supabase.rpc('admin_record_content_producer_promo_failure', {
          p_user_id: userId,
          p_code: code,
          p_error_code: String(promoError.safeCode || promoError.code || 'shopier_sync_failed').toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80),
          p_review_required: Boolean(promoError.reviewRequired),
          p_retry: true,
        });
        throw promoError;
      }
    }
    if (action === 'suspend') {
      const { data, error } = await session.supabase.rpc('admin_suspend_content_producer', { p_user_id: userId, p_reason: String(body.reason || '') });
      if (error) throw error;
      const disabled = await disableProducerPromo(session, {
        userId, providerDiscountId: data?.providerDiscountId, action: 'suspend',
      });
      return Response.json({
        ok: true,
        producer: data,
        promoDisabled: disabled.disabled,
        manualRequired: !disabled.disabled,
        message: disabled.disabled
          ? 'Program askıya alındı; Shopier indirim kodu da otomatik olarak kapatıldı.'
          : 'Program güvenli biçimde askıya alındı. Shopier bağlantısı tamamlanamadığı için eski kodu Shopier panelinden de silmelisin.',
      });
    }
    if (action === 'rotate_code') {
      const { data, error } = await session.supabase.rpc('admin_rotate_content_producer_code', {
        p_user_id: userId, p_reason: String(body.reason || ''),
      });
      if (error) throw error;
      const disabled = await disableProducerPromo(session, {
        userId, providerDiscountId: data?.oldProviderDiscountId, action: 'rotate',
      });
      if (!disabled.disabled) {
        return Response.json({
          ok: true, producer: data, promoDisabled: false, manualRequired: true,
          message: 'Yeni kod oluşturuldu ancak eski Shopier kodu otomatik kapatılamadı. Yeni kodu etkinleştirmeden önce eski kodu Shopier panelinden silmelisin.',
        });
      }
      try {
        const promo = await syncProducerPromo(session, { userId, code: data.code });
        return Response.json({
          ok: true,
          producer: promo.producer || data,
          promoDisabled: true,
          message: promo.active
            ? 'Eski kod kapatıldı; yeni %20 Shopier kodu oluşturulup etkinleştirildi.'
            : 'Eski kod kapatıldı. Yeni kod, Shopier kapsam doğrulamasını bekliyor.',
        });
      } catch (promoError) {
        await session.supabase.rpc('admin_record_content_producer_promo_failure', {
          p_user_id: userId,
          p_code: data.code,
          p_error_code: safePromoErrorCode(promoError, 'shopier_rotation_sync_failed'),
          p_review_required: Boolean(promoError.reviewRequired),
          p_retry: false,
        });
        console.error('Content producer rotated promo sync failed', { code: promoError?.code || promoError?.safeCode || 'unknown' });
        return Response.json({
          ok: true, producer: data, promoDisabled: true,
          message: 'Eski kod kapatıldı. Yeni indirim kodu hazırlanıyor; admin panelinden güvenle tekrar deneyebilirsin.',
        });
      }
    }
    if (action === 'create_payout') {
      const { data, error } = await session.supabase.rpc('admin_create_content_producer_payout', { p_user_id: userId, p_note: body.note || null });
      if (error) throw error;
      return Response.json({ ok: true, payout: data, message: 'Ödenebilir kazançlar payout için ayrıldı.' });
    }
    if (action === 'mark_paid') {
      const { data, error } = await session.supabase.rpc('admin_mark_content_producer_payout_paid', { p_payout_id: body.payoutId, p_reference: String(body.reference || '') });
      if (error) throw error;
      return Response.json({ ok: true, payout: data, message: 'Banka transferi ödendi olarak kaydedildi.' });
    }
    if (action === 'adjustment') {
      const amountMinor = Number(body.amountMinor);
      if (!Number.isSafeInteger(amountMinor)) {
        return Response.json({ ok: false, message: 'Geçerli bir düzeltme tutarı girmelisin.' }, { status: 400 });
      }
      const { data, error } = await session.supabase.rpc('admin_create_content_producer_adjustment', {
        p_user_id: userId, p_amount_minor: amountMinor, p_reason: String(body.reason || ''),
      });
      if (error) throw error;
      return Response.json({ ok: true, adjustment: data, message: 'Finansal düzeltme audit kaydıyla eklendi.' });
    }
    return Response.json({ ok: false, message: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error) {
    console.error('Content producer admin action failed', { action, code: error?.code || 'unknown' });
    const safeMessages = {
      '42501': 'Bu işlem için yönetici yetkisi gerekli.',
      'P0002': 'İçerik üreticisi veya ilgili kayıt bulunamadı.',
      '22023': 'İşlem bilgileri geçersiz veya mevcut durumla uyumsuz.',
      '23505': 'Bu işlem daha önce tamamlanmış.',
    };
    return Response.json({ ok: false, message: safeMessages[error?.code] || 'İşlem şu anda tamamlanamadı. Lütfen tekrar dene.' }, { status: 400 });
  }
}
