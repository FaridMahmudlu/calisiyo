const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const dismissCookies = async (page) => {
  const button = page.getByRole('button', { name: 'Yalnızca zorunlu' });
  await button.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  if (await button.isVisible().catch(() => false)) await button.click();
};

test.describe('Signup-only content producer attribution', () => {
  test('signup field validates intentionally on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    let issuedClaims = 0;
    await page.route('**/api/auth/content-producer-code', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: true, code: 'MELIKE20', discountPercent: 20 }),
      });
    });
    await page.route('**/api/auth/content-producer-code/issue', (route) => {
      issuedClaims += 1;
      return route.fulfill({ status: 500, body: '{}' });
    });
    await page.goto('/kayit');
    await dismissCookies(page);
    const input = page.locator('#creator-code');
    await input.scrollIntoViewIfNeeded();
    await expect(input).toBeVisible();
    await input.fill('melike20');
    await input.blur();
    await expect(page.getByText(/Kod doğrulandı/)).toBeVisible();
    await expect(input).toHaveValue('MELIKE20');
    expect(issuedClaims).toBe(0);
  });

  test('issues a durable claim only when the user proceeds with signup', async ({ page }) => {
    let issuedClaims = 0;
    await page.route('**/api/auth/content-producer-code', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ valid: true, code: 'MELIKE20', discountPercent: 20 }),
    }));
    await page.route('**/api/auth/content-producer-code/issue', (route) => {
      issuedClaims += 1;
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ valid: true, code: 'MELIKE20', discountPercent: 20, claimToken: 'a'.repeat(43) }),
      });
    });
    await page.goto('/kayit');
    await dismissCookies(page);
    await page.getByLabel('Ad Soyad').fill('Test Öğrenci');
    await page.getByLabel('E-posta').fill('new.student@example.com');
    await page.locator('input[type="password"]').nth(0).fill('StrongPass1!');
    await page.locator('input[type="password"]').nth(1).fill('StrongPass1!');
    await page.locator('#creator-code').fill('melike20');
    await page.locator('#creator-code').blur();
    expect(issuedClaims).toBe(0);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
    await expect(page.getByText('Hazırlandığın alanı seç.')).toBeVisible();
    expect(issuedClaims).toBe(0);
    await page.getByRole('button', { name: /Sayısal/ }).click();
    await page.route('**/auth/v1/signup**', (route) => route.fulfill({
      status: 400, contentType: 'application/json', body: JSON.stringify({ msg: 'test_signup_stopped' }),
    }));
    await page.getByRole('button', { name: 'Hesabı Oluştur', exact: true }).click();
    await expect.poll(() => issuedClaims).toBe(1);
  });

  test('an invalid optional code blocks the next signup step truthfully', async ({ page }) => {
    await page.route('**/api/auth/content-producer-code', (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false }),
    }));
    await page.route('**/api/auth/content-producer-code/issue', (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false }),
    }));
    await page.goto('/kayit');
    await dismissCookies(page);
    await page.getByLabel('Ad Soyad').fill('Test Öğrenci');
    await page.getByLabel('E-posta').fill('new.student@example.com');
    await page.locator('input[type="password"]').nth(0).fill('StrongPass1!');
    await page.locator('input[type="password"]').nth(1).fill('StrongPass1!');
    await page.locator('#creator-code').fill('YANLIS20');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
    await expect(page.locator('#creator-code-status')).toContainText('Bu kod geçerli değil');
    await expect(page.getByRole('button', { name: 'Devam Et', exact: true })).toBeVisible();
  });

  test('a throttled code check is retryable and never shown as an invalid code', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/auth/content-producer-code', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ valid: true, code: 'MELIKE20', discountPercent: 20 }),
    }));
    await page.route('**/api/auth/content-producer-code/issue', (route) => route.fulfill({
      status: 429,
      contentType: 'application/json',
      headers: { 'Retry-After': '60' },
      body: JSON.stringify({ valid: false, retryable: true, message: 'Kod doğrulama hizmeti kısa süreliğine yoğun. Bir dakika sonra tekrar dene.' }),
    }));
    await page.goto('/kayit');
    await dismissCookies(page);
    await page.getByLabel('Ad Soyad').fill('Test Öğrenci');
    await page.getByLabel('E-posta').fill('new.student@example.com');
    await page.locator('input[type="password"]').nth(0).fill('StrongPass1!');
    await page.locator('input[type="password"]').nth(1).fill('StrongPass1!');
    await page.locator('#creator-code').fill('MELIKE20');
    await page.locator('#creator-code').blur();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Devam Et', exact: true }).click();
    await page.getByRole('button', { name: /Sayısal/ }).click();
    await page.getByRole('button', { name: 'Hesabı Oluştur', exact: true }).click();
    await expect(page.locator('#creator-code-status')).toContainText('Bir dakika sonra tekrar dene');
    await expect(page.locator('#creator-code-status')).not.toContainText('geçerli değil');
  });

  test('uses a random one-time token and persists only its hash', () => {
    const helper = read('lib/auth/content-producer-signup.js');
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(helper).toContain("randomBytes(32).toString('base64url')");
    expect(helper).toContain("createHash('sha256')");
    expect(helper).toContain('CLAIM_TOKEN_PATTERN');
    expect(migration).toContain("token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$')");
    expect(migration).toContain("now() + interval '7 days'");
    expect(migration).not.toMatch(/\btoken\s+text\b/i);
    expect(migration).not.toMatch(/claim.*(?:email|full_name)/i);
    expect(migration).not.toContain('consumed_by_user_id');
  });

  test('allows immutable new-account attribution and rejects old or self accounts', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(migration).toContain('user_id uuid not null unique references auth.users(id)');
    expect(migration).toContain('content_producer_signup_attribution_not_self');
    expect(migration).toContain('if claim_row.producer_id = p_user_id then');
    expect(migration).toContain("user_created_at < claim_row.created_at - interval '5 seconds'");
    expect(migration).toContain('existing_row.claim_id = claim_row.id');
    expect(migration).not.toMatch(/update\s+public\.content_producer_signup_attributions\s+set/i);
  });

  test('keeps privileged claim and checkout functions service-role only', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    const serviceFunctions = [
      'service_create_content_producer_signup_claim(text,text)',
      'service_validate_content_producer_signup_code(text)',
      'service_claim_content_producer_signup_attribution(uuid,text)',
      'service_content_producer_checkout_context(uuid)',
      'create_shopier_billing_order_v2(uuid,text,text,text,text,text,jsonb,text,boolean,boolean,text,uuid,numeric,numeric)',
    ];
    for (const signature of serviceFunctions) {
      expect(migration).toContain(`grant execute on function public.${signature}`);
      expect(migration).toMatch(new RegExp(`revoke all on function public\\.${signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]{0,100}authenticated`));
    }
    expect(migration).not.toMatch(/grant execute on function public\.service_[^;]+authenticated/i);
    expect(migration).toContain("auth.jwt() ->> 'role'");
  });

  test('bounds public signup claim issuance without storing visitor PII', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    const route = read('app/api/auth/content-producer-code/route.js');
    const issueRoute = read('app/api/auth/content-producer-code/issue/route.js');
    expect(migration).toContain('pg_catalog.pg_advisory_xact_lock');
    expect(migration).toContain('recent_claims >= 600');
    expect(migration).toContain('outstanding_claims >= 50000');
    expect(migration).toContain("errcode = 'P4290'");
    expect(migration).toContain("c.expires_at < now() - interval '14 days'");
    expect(migration).toContain('limit 500');
    expect(migration).toContain('content_producer_signup_attributions_claim_id_fkey');
    expect(migration).toContain('on delete set null');
    expect(migration).not.toMatch(/ip_address|user_agent|visitor_id/i);
    expect(route).toContain('validateContentProducerSignupCode');
    expect(route).not.toContain('createContentProducerSignupClaim');
    expect(route).not.toContain('claimToken');
    expect(issueRoute).toContain("String(error?.code || '') === 'P4290'");
    expect(issueRoute).toContain("'Retry-After': '60'");
  });

  test('supports email session, email confirmation and Google signup without referral tracking', () => {
    const signup = read('app/kayit/page.js');
    const social = read('components/auth/SocialAuthButtons.js');
    const callback = read('app/auth/callback/route.js');
    const claimRoute = read('app/api/auth/content-producer-code/claim/route.js');
    const claimErrorPage = read('app/auth/kod-hatasi/page.js');
    const joined = [signup, social, callback, claimRoute].join('\n');
    expect(signup).toContain('İçerik üretici kodun var mı?');
    expect(signup).toContain("fetch('/api/auth/content-producer-code/issue'");
    expect(signup).toContain("callback.searchParams.set('creator_claim', signupClaim)");
    expect(signup).toContain("fetch('/api/auth/content-producer-code/claim'");
    expect(social).toContain("intent === 'signup' && beforeOAuth");
    expect(callback).toContain("url.searchParams.get('creator_claim')");
    expect(callback).toContain('claimContentProducerSignupAttribution(user.id, creatorClaim)');
    expect(signup).toContain("if (!claimResponse.ok)");
    expect(callback).toContain('if (creatorClaimFailed)');
    expect(claimErrorPage).toContain('Hesabın hazır');
    expect(claimErrorPage).toContain('Tam fiyatlı ödeme başlatılmadı');
    expect(joined).not.toMatch(/utm_|referral|affiliate|document\.cookie|localStorage/i);
  });

  test('prevents stale code-validation responses from changing the selected claim', () => {
    const signup = read('app/kayit/page.js');
    expect(signup).toContain('const creatorValidationId = useRef(0)');
    expect(signup).toContain('const validationId = ++creatorValidationId.current');
    expect(signup).toContain('if (validationId !== creatorValidationId.current) return null');
    expect(signup).toContain('creatorValidationId.current += 1');
  });
});

test.describe('Creator-priced Shopier checkout', () => {
  test('uses dedicated 20 percent products and fails closed for attributed users', () => {
    const plans = read('lib/billing/plans.js');
    const pricing = read('lib/billing/pricing-catalog.mjs');
    const provider = read('lib/billing/providers/shopier.js');
    const config = read('lib/billing/config.js');
    const route = read('app/api/billing/orders/route.js');
    expect(pricing).toContain('plus_2027: 250000');
    expect(pricing).toContain('plus_2028: 450000');
    expect(plans).toContain("price: planPriceTry('plus_2027')");
    expect(plans).toContain("price: planPriceTry('plus_2028')");
    expect(provider).toContain('SHOPIER_CREATOR_PRODUCT_ID_');
    expect(provider).toContain('SHOPIER_CREATOR_PRODUCT_URL_');
    expect(provider).toContain('producerDiscountMinor(listMinor)');
    expect(config).toContain('creatorDiscountCheckoutReady');
    expect(route).toContain("creatorContext?.attributed ? 'signup_creator_code' : 'standard'");
    expect(route).toContain('creator_discount_not_ready');
    expect(route).not.toMatch(/creatorContext\?\.attributed[\s\S]{0,250}pricingSource\s*=\s*'standard'/);
  });

  test('server and database reject client pricing, stacked discounts and duplicate rewards', () => {
    const route = read('app/api/billing/orders/route.js');
    const service = read('lib/billing/shopier-service.js');
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(route).not.toMatch(/body\.(?:amount|price|discount|creator|userId)/);
    expect(route).toContain('producerDiscountMinor(listAmountMinor)');
    expect(migration).toContain('p_expected_paid_amount is distinct from expected_paid');
    expect(migration).toContain("provider_discount_total<>0 or provider_discount is not null or discount_method is not null");
    expect(service).toContain("internalOrder.pricing_source === 'signup_creator_code'");
    expect(service).toContain("reason: 'creator_discount_stacking'");
    expect(migration).toContain('where r.order_id=order_row.id');
    expect(read('supabase/migrations/20260825131940_pricing_and_content_producer_program.sql'))
      .toMatch(/order_id uuid not null unique\s+references public\.billing_orders\(id\)/);
  });

  test('keeps an attributed student discount after creator suspension but blocks new rewards', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(migration).toContain("'eligible', a.discount_bps_snapshot = 2000");
    expect(migration).not.toMatch(/service_content_producer_checkout_context[\s\S]{0,800}'eligible',\s*p\.status = 'active'/);
    expect(migration).toContain("case when producer_id=order_row.user_id then 'self_purchase' else 'producer_suspended' end");
    expect(migration).toContain("producer_id=order_row.user_id or not producer_active");
  });

  test('records signup reward source without breaking legacy Shopier coupon rewards', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(migration).toContain("reward_source text not null default 'shopier_discount_code'");
    expect(migration).toContain("reward_source = 'signup_creator_code'");
    expect(migration).toContain("reward_source_value:='signup_creator_code'");
    expect(migration).toContain("reward_source_value:='shopier_discount_code'");
    expect(migration).toContain("case when sequence_value<=3 then 100000 else 50000 end");
    expect(migration).toContain("paid_at+interval '14 days'");
  });
});

test.describe('Privacy-safe creator growth analytics', () => {
  test('derives activation, trial, paid and sales from durable server data', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(migration).toContain("x.created_at < cohort.attributed_at + interval '7 days'");
    expect(migration).toContain("bool_or(x.event_type = 'daily_focus') or count(*) >= 2");
    expect(migration).toContain("e.event_type = 'trial_started'");
    expect(migration).toContain("o.status = 'approved'");
    expect(migration).toContain("not in ('refund_full_succeeded', 'refund_partial_succeeded')");
    expect(migration).toContain("r.status in ('pending', 'available', 'reserved', 'paid')");
    expect(migration).toContain("range_key not in ('7d', '30d', 'all')");
  });

  test('creator and admin APIs return aggregate metrics without student PII', () => {
    const creatorRoute = read('app/api/content-producer/route.js');
    const adminRoute = read('app/api/admin/content-producers/route.js');
    const creatorPage = read('app/dashboard/icerik-ureticisi/page.js');
    expect(creatorRoute).toContain('current_content_producer_growth_summary');
    expect(adminRoute).toContain('admin_content_producer_growth_overview');
    expect(creatorPage).toContain('İsim, e-posta veya kişisel çalışma verileri paylaşılmaz');
    expect([creatorRoute, creatorPage].join('\n')).not.toMatch(/referredUsers|studentEmail|studentName|userList/);
  });

  test('legal pages disclose the optional account-side relationship and no campaign cookie', () => {
    const privacy = read('app/gizlilik/page.js');
    const kvkk = read('app/kvkk/page.js');
    const cookie = read('app/cerez-politikasi/page.js');
    const terms = read('app/kullanim-sartlari/page.js');
    expect(privacy).toContain('İçerik Üretici Kodu Verisi');
    expect(kvkk).toContain('Kampanya ve İndirim Verisi');
    expect(cookie).toContain('yönlendirme bağlantısı, kampanya çerezi veya cihazlar arası takip kullanılmaz');
    expect(terms).toContain('başka indirimlerle birleştirilemez');
  });
});
