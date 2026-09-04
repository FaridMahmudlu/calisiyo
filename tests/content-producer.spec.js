const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test.describe('Content Producer Program security and product contracts', () => {
  test('pricing and fixed-term product semantics have one active source', () => {
    const plans = read('lib/billing/plans.js');
    const pricing = read('lib/billing/pricing-catalog.mjs');
    const landing = read('components/landing/PricingSection.js');
    const billing = read('app/dashboard/abonelik/page.js');
    expect(pricing).toContain('plus_2027: 250000');
    expect(pricing).toContain('plus_2028: 450000');
    expect(plans).toContain("price: planPriceTry('plus_2027')");
    expect(plans).toContain("price: planPriceTry('plus_2028')");
    expect(plans).toContain("period: 'yks_2028'");
    expect(plans).toContain('25 Haziran 2028’e kadar');
    expect([landing, billing].join('\n')).not.toMatch(/5\+1|toplam 6 ay|2\.000|1\.000/);
  });

  test('producer tables are RLS-protected and students receive read-only owner access', () => {
    const migration = read('supabase/migrations/20260825131940_pricing_and_content_producer_program.sql');
    const tables = [
      'profiles', 'access_grants', 'codes', 'code_bindings',
      'rewards', 'adjustments', 'payouts', 'payout_items',
    ];
    for (const table of tables) {
      expect(migration).toContain(`alter table public.content_producer_${table} enable row level security;`);
      expect(migration).toContain(`revoke all on table public.content_producer_${table} from public, anon, authenticated;`);
    }
    expect(migration).not.toContain('grant select, insert, update, delete on all tables in schema public');
    expect(migration).not.toMatch(/grant\s+(?:insert|update|delete)[^;]*content_producer[^;]*authenticated/i);
    expect(migration).not.toContain('grant select on table public.content_producer_code_bindings to authenticated');
  });

  test('producer applications are owner-scoped and approved only through admin RPCs', () => {
    const migration = read('supabase/migrations/20260825190913_content_producer_applications.sql');
    expect(migration).toContain('alter table public.content_producer_applications enable row level security;');
    expect(migration).toContain('revoke all on table public.content_producer_applications from public, anon, authenticated;');
    expect(migration).toContain('viewer uuid := (select auth.uid())');
    expect(migration).toContain("role.role in ('admin', 'super_admin')");
    expect(migration).toContain('admin_approve_content_producer_application');
    expect(migration).not.toMatch(/grant\s+(?:select|insert|update|delete)[^;]*content_producer_applications[^;]*authenticated/i);
  });

  test('application entry and admin approval are discoverable and the user search RPC contract matches', () => {
    const userPage = read('app/dashboard/icerik-ureticisi/page.js');
    const layout = read('app/dashboard/layout.js');
    const adminPage = read('app/admin/icerik-ureticileri/page.js');
    const adminRoute = read('app/api/admin/content-producers/route.js');
    expect(layout).toContain('İçerik Üreticisi Başvurusu');
    expect(userPage).toContain('Başvuruyu gönder');
    expect(userPage).toContain("action: 'submit'");
    expect(adminPage).toContain('Bekleyen başvurular');
    expect(adminPage).toContain('Onayla ve programı etkinleştir');
    expect(adminRoute).toContain("admin_list_users', { p_search: q");
    expect(adminRoute).not.toContain("admin_list_users', { p_query:");
  });

  test('privileged RPCs authenticate admins and keep financial provider RPCs service-role only', () => {
    const migration = read('supabase/migrations/20260825131940_pricing_and_content_producer_program.sql');
    expect(migration).toContain("r.role in ('admin', 'super_admin')");
    expect(migration).toContain("auth.jwt()->>'role'");
    expect(migration).toContain('grant execute on function public.provider_confirm_billing_order(uuid,text,jsonb) to service_role;');
    expect(migration).toContain('grant execute on function public.reconcile_shopier_refund(uuid,text,text,text,numeric,text) to service_role;');
    expect(migration).not.toMatch(/grant execute on function public\.(?:provider_confirm_billing_order|reconcile_shopier_refund)[^;]*authenticated/);
  });

  test('producer UI contains truthful reward, privacy, hold and payout language', () => {
    const page = read('app/dashboard/icerik-ureticisi/page.js');
    expect(page).toContain('İlk 3 doğrulanmış satışında');
    expect(page).toContain('4. satıştan itibaren');
    expect(page).toContain('14 gün');
    expect(page).toContain('Müşteri adı, e-posta veya başka kişisel bilgiler bu panelde gösterilmez');
    expect(page).toContain('Manuel banka transferiyle tamamlanan ödemeler');
  });

  test('admin route uses a server session and never exposes billing secrets', () => {
    const route = read('app/api/admin/content-producers/route.js');
    const shopier = read('lib/billing/content-producer-shopier.js');
    const page = read('app/admin/icerik-ureticileri/page.js');
    expect(route).toContain('supabase.auth.getUser()');
    expect(route).toContain("current_admin_role");
    expect(route).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|SHOPIER_ACCESS_TOKEN/);
    expect(page).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|SHOPIER_ACCESS_TOKEN|providerOrderId/);
    expect(route).toContain('deleteProducerPromo(discountId)');
    expect(shopier).toContain('deleteDiscountCode(id)');
    expect(shopier).toContain("error?.status === 404");
    expect(route).toContain("admin_record_content_producer_promo_disable");
  });

  test('reserved official names cannot become public producer codes', () => {
    const migration = read('supabase/migrations/20260825195911_content_producer_self_code_and_2028_price.sql');
    expect(migration).toContain("'RESMI','OFFICIAL'");
    expect(migration).toContain("root := left(base, 14) || '20'");
  });

  test('producer code is short, unique and self-change is allowed exactly once', () => {
    const migration = read('supabase/migrations/20260825195911_content_producer_self_code_and_2028_price.sql');
    const route = read('app/api/content-producer/route.js');
    const page = read('app/dashboard/icerik-ureticisi/page.js');
    expect(migration).toContain('self_code_change_used boolean not null default false');
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('content_producer_codes c where upper(c.code) = upper(requested_code)');
    expect(migration).toContain("grant execute on function public.service_confirm_self_content_producer_code(uuid,text)\n  to service_role;");
    expect(migration).not.toContain('grant execute on function public.service_confirm_self_content_producer_code(uuid,text)\n  to authenticated;');
    expect(route).toContain("action === 'change_code'");
    expect(route).toContain("action === 'retry_code_sync'");
    expect(route).toContain('syncSelfCode({');
    expect(page).toContain('Etkinleştirmeyi tekrar dene');
    expect(page).toContain('Kodunu yalnızca bir kez değiştirebilirsin');
  });

  test('rotated codes keep historical attribution inside their verified time window', () => {
    const service = read('lib/billing/shopier-service.js');
    const migration = read('supabase/migrations/20260825131940_pricing_and_content_producer_program.sql');
    expect(service).toContain('paidAt < starts || paidAt >= ends');
    expect(service).not.toContain("binding.status !== 'active'");
    expect(service).not.toContain("code.status !== 'active'");
    expect(migration).toContain('b.valid_from<=paid_at and (b.valid_to is null or paid_at<b.valid_to)');
  });
});
