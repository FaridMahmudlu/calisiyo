const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

function read(relative) {
  return fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8');
}

test.describe('Public pricing regression — anonymous visitors must see only standard prices', () => {
  test('anonymous /paketler shows ₺2.500 for YKS 2027 and ₺4.500 for YKS 2028, never creator prices', async ({ page }) => {
    await page.goto('/paketler');
    await page.waitForLoadState('networkidle');

    // Default view should be YKS 2027 = ₺2.500
    const plusCard = page.locator('.pricing-card.is-popular');
    await expect(plusCard.locator('.pricing-price strong')).toContainText('₺2.500');

    // Switch to YKS 2028 → should show ₺4.500
    await page.getByRole('button', { name: /YKS 2028/ }).click();
    await expect(plusCard.locator('.pricing-price strong')).toContainText('₺4.500');

    // Switch back to 2027
    await page.getByRole('button', { name: /YKS 2027/ }).click();
    await expect(plusCard.locator('.pricing-price strong')).toContainText('₺2.500');

    // The standalone pricing facts table on /paketler must show standard prices
    const facts = page.locator('.pricing-facts');
    if (await facts.count() > 0) {
      await expect(facts).toContainText('₺2.500');
      await expect(facts).toContainText('₺4.500');
      await expect(facts).not.toContainText('₺2.000');
      await expect(facts).not.toContainText('₺3.600');
    }

    // Full page body must never contain creator prices
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('₺2.000');
    expect(bodyText).not.toContain('₺3.600');
  });

  test('anonymous / landing shows ₺2.500 for YKS 2027 and ₺4.500 for YKS 2028, never creator prices', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const plusCard = page.locator('.pricing-card.is-popular');
    await expect(plusCard.locator('.pricing-price strong')).toContainText('₺2.500');

    await page.getByRole('button', { name: /YKS 2028/ }).click();
    await expect(plusCard.locator('.pricing-price strong')).toContainText('₺4.500');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('₺2.000');
    expect(bodyText).not.toContain('₺3.600');
  });

  test('anonymous billing API returns standard prices only with null creatorDiscount', async ({ request }) => {
    const response = await request.get('/api/billing');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.authenticated).toBe(false);
    expect(body.creatorDiscount).toBeNull();

    const plusPlan = body.plans.find(p => p.code === 'plus');
    expect(plusPlan).toBeTruthy();
    const v2027 = plusPlan.variants.find(v => v.code === 'plus_2027');
    const v2028 = plusPlan.variants.find(v => v.code === 'plus_2028');
    expect(v2027.price).toBe(2500);
    expect(v2028.price).toBe(4500);

    // Must not leak any creator pricing info
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain('"price":2000');
    expect(bodyStr).not.toContain('"price":3600');
  });
});

test.describe('Server-side billing authority — client cannot control pricing', () => {
  test('pricing catalog defines standard prices at 2500 / 4500', () => {
    const catalog = read('lib/billing/pricing-catalog.mjs');
    expect(catalog).toContain('plus_2027: 250000');
    expect(catalog).toContain('plus_2028: 450000');
  });

  test('plans.js derives prices from catalog, not hardcoded', () => {
    const plans = read('lib/billing/plans.js');
    expect(plans).toContain("price: planPriceTry('plus_2027')");
    expect(plans).toContain("price: planPriceTry('plus_2028')");
    // Prices must NOT be hardcoded
    expect(plans).not.toMatch(/price:\s*2000[^0]/);
    expect(plans).not.toMatch(/price:\s*3600/);
  });

  test('orders route derives pricing server-side, client cannot specify price or discount', () => {
    const route = read('app/api/billing/orders/route.js');
    // Client body is destructured for planCode and billingPeriod only
    expect(route).not.toMatch(/body\.(?:amount|price|discount|creator|userId|pricingSource)/);
    // Pricing source is determined server-side from attribution context
    expect(route).toContain("creatorContext?.attributed ? 'signup_creator_code' : 'standard'");
    // Discount is computed server-side from list price
    expect(route).toContain('producerDiscountMinor(listAmountMinor)');
  });

  test('shopier product selection is based on server-determined pricing source, not client', () => {
    const provider = read('lib/billing/providers/shopier.js');
    expect(provider).toContain("shopierProductForPlan(planCode, pricingSource = 'standard')");
    expect(provider).toContain("pricingSource === 'signup_creator_code' ? config.creatorProducts : config.products");
  });

  test('content producer discount is exactly 20% fixed, hardcoded server-side', () => {
    const producer = read('lib/billing/content-producer.mjs');
    expect(producer).toContain('discountBps: 2000');
  });
});

test.describe('Creator pricing isolation — discount only for valid immutable attribution', () => {
  test('billing API displays creatorDiscount only for attributed users, never for anonymous or unaffiliated', () => {
    const billingRoute = read('app/api/billing/route.js');
    // creatorDiscount is only populated when creatorContext?.attributed is true
    expect(billingRoute).toContain("!creatorError && creatorContext?.attributed");
    // For anonymous users, user is null, so creatorDiscount stays null
    expect(billingRoute).toContain('let creatorDiscount = null');
  });

  test('dashboard abonelik page renders creator price only when billing.creatorDiscount is set', () => {
    const page = read('app/dashboard/abonelik/page.js');
    expect(page).toContain("billing?.creatorDiscount?.plans?.[selected.code]");
    // Standard price is fallback when no creator context
    expect(page).toContain("formatTry(selected.price)");
  });

  test('creator discount stacking is rejected by webhook handler', () => {
    const service = read('lib/billing/shopier-service.js');
    expect(service).toContain("internalOrder.pricing_source === 'signup_creator_code' && normalized.discountMinor > 0");
    expect(service).toContain("reason: 'creator_discount_stacking'");
  });
});

test.describe('Signup attribution security', () => {
  test('claim uses SHA-256 hashed opaque token, not raw creator ID', () => {
    const signup = read('lib/auth/content-producer-signup.js');
    expect(signup).toContain("createHash('sha256')");
    expect(signup).toContain('CLAIM_TOKEN_PATTERN');
    expect(signup).toContain("import 'server-only'");
  });

  test('validation alone does not create permanent attribution', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    // Claims have expiry
    expect(migration).toMatch(/expires_at\s+timestamptz\s+not null/);
    // Attribution requires separate claim step
    expect(migration).toContain('service_claim_content_producer_signup_attribution');
  });

  test('signup RPCs are service_role only, not accessible to anon or authenticated', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    // Revoke from public/anon/authenticated
    expect(migration).toContain('revoke all on function public.service_validate_content_producer_signup_code');
    expect(migration).toContain('revoke all on function public.service_create_content_producer_signup_claim');
    expect(migration).toContain('revoke all on function public.service_claim_content_producer_signup_attribution');
    // Grant only to service_role
    expect(migration).toMatch(/grant execute on function public\.service_validate_content_producer_signup_code.*to service_role/s);
  });

  test('attribution is immutable once created', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    // Immutability: no UPDATE/DELETE policies for regular users
    expect(migration).toContain('enable row level security');
    // Attribution table should not have update/delete grants for authenticated
    expect(migration).not.toMatch(/grant\s+(?:update|delete)\s+on\s+.*content_producer_signup_attributions.*to\s+authenticated/i);
  });

  test('self-referral is prevented', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    // Creator cannot use their own code
    expect(migration).toMatch(/producer_id\s*=\s*p_user_id|self.referral|self_purchase/i);
  });

  test('auth callback has allowlisted redirect destinations preventing open redirects', () => {
    const callback = read('app/auth/callback/route.js');
    expect(callback).toContain('ALLOWED_DESTINATIONS');
    expect(callback).toContain("resolved.origin !== origin || !ALLOWED_DESTINATIONS.has(resolved.pathname)");
  });

  test('creator claim token cannot be replaced with creator ID in auth callback', () => {
    const callback = read('app/auth/callback/route.js');
    // The callback uses claimContentProducerSignupAttribution which expects a token, not an ID
    expect(callback).toContain('claimContentProducerSignupAttribution(user.id, creatorClaim)');
    // The server-side claim function validates token format
    const signup = read('lib/auth/content-producer-signup.js');
    expect(signup).toContain('CLAIM_TOKEN_PATTERN.test');
  });
});

test.describe('Webhook security', () => {
  test('webhook handler verifies signature before any processing', () => {
    const webhook = read('app/api/billing/shopier/webhook/route.js');
    const lines = webhook.split('\n');
    const signatureCheck = lines.findIndex(l => l.includes('verifyConfiguredShopierWebhook'));
    const process = lines.findIndex(l => l.includes('processShopierEvent'));
    expect(signatureCheck).toBeGreaterThan(0);
    expect(process).toBeGreaterThan(signatureCheck);
  });

  test('webhook has replay protection via idempotent event claim', () => {
    const webhook = read('app/api/billing/shopier/webhook/route.js');
    expect(webhook).toContain('claim_shopier_webhook_event');
    expect(webhook).toContain("!claim?.claimed");
    expect(webhook).toContain("'duplicate_accepted'");
  });

  test('webhook validates timestamp within acceptable window', () => {
    const webhook = read('app/api/billing/shopier/webhook/route.js');
    expect(webhook).toContain('timestampSeconds > nowSeconds + 300');
    expect(webhook).toContain('timestampSeconds < nowSeconds -');
  });

  test('webhook enforces payload size limit', () => {
    const webhook = read('app/api/billing/shopier/webhook/route.js');
    expect(webhook).toContain('MAX_BODY_BYTES');
    expect(webhook).toMatch(/256\s*\*\s*1024/);
  });
});

test.describe('Secret isolation — no credentials in client bundle or public response', () => {
  test('server-only modules guard all sensitive code paths', () => {
    const sensitive = [
      'lib/supabase/admin.js',
      'lib/billing/providers/shopier.js',
      'lib/billing/shopier-service.js',
      'lib/billing/config.js',
      'lib/billing/legal.js',
      'lib/auth/content-producer-signup.js',
    ];
    for (const file of sensitive) {
      const content = read(file);
      expect(content.startsWith("import 'server-only'")).toBe(true);
    }
  });

  test('no NEXT_PUBLIC prefix on Shopier or service role env vars', () => {
    const files = [
      'lib/billing/providers/shopier.js',
      'lib/supabase/admin.js',
      'lib/billing/config.js',
    ];
    for (const file of files) {
      const content = read(file);
      expect(content).not.toContain('NEXT_PUBLIC_SHOPIER');
      expect(content).not.toContain('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE');
    }
  });

  test('.gitignore blocks .env files from being tracked', () => {
    const gitignore = read('.gitignore');
    expect(gitignore).toContain('.env*');
    expect(gitignore).toContain('!.env.example');
  });

  test('.env.example contains only placeholders, no real secrets', () => {
    const example = read('.env.example');
    expect(example).not.toMatch(/eyJ[A-Za-z0-9_-]{40,}/);
    expect(example).toContain('your-shopier-personal-access-token');
    expect(example).toContain('your-supabase-service-role-key');
  });
});

test.describe('Reward system correctness', () => {
  test('first 3 creator qualified sales yield 1000 TL, later 500 TL', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    // Reward tiers: first 3 = 100000 minor (1000 TL), later = 50000 minor (500 TL)
    expect(migration).toContain('case when sequence_value<=3 then 100000 else 50000 end');
  });

  test('reward hold period is 14 days', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(migration).toContain("paid_at+interval '14 days'");
  });

  test('duplicate order cannot create duplicate reward', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(migration).toContain('where r.order_id=order_row.id');
  });

  test('suspended creator receives no new rewards', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    expect(migration).toContain("producer_id=order_row.user_id or not producer_active");
  });
});

test.describe('Creator suspension behavior', () => {
  test('existing attributed student keeps discount even after creator suspension', () => {
    const migration = read('supabase/migrations/20260903192503_content_producer_signup_attribution.sql');
    // Eligible flag is based on attribution discount_bps_snapshot, not producer status
    expect(migration).toContain("'eligible', a.discount_bps_snapshot = 2000");
    // Should NOT gate eligibility on producer active status
    expect(migration).not.toMatch(/service_content_producer_checkout_context[\s\S]{0,800}'eligible',\s*p\.status = 'active'/);
  });
});

test.describe('Invalid creator code validation', () => {
  test('invalid creator code returns valid=false without error leak', async ({ request }) => {
    const response = await request.post('/api/auth/content-producer-code', {
      data: { code: 'INVALIDCODE999' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.valid).toBe(false);
    expect(body.ok).toBe(true);
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/stack|trace|error|exception/i);
  });
});
