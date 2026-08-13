const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const classroomSource = fs.readFileSync(
  path.join(root, 'app', 'dashboard', 'arkadaslar', '[groupId]', 'page.js'),
  'utf8',
);
const migrationSource = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260813201046_serialize_plan_and_billing_mutations.sql'),
  'utf8',
);
const lockRestrictionSource = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260813201933_restrict_mutation_lock_helper.sql'),
  'utf8',
);

test.describe('Security regression contracts', () => {
  test('classroom state is never accepted from member-authored realtime payloads', () => {
    expect(classroomSource).not.toContain(".on('broadcast'");
    expect(classroomSource).not.toContain(".on('presence'");
    expect(classroomSource).not.toContain('presenceState()');
    expect(classroomSource).not.toContain('payload.userId');

    for (const table of [
      'study_presence',
      'study_group_reactions',
      'study_group_messages',
      'study_group_members',
      'study_group_focus_sessions',
    ]) {
      expect(classroomSource).toContain(`table: '${table}'`);
    }
    expect(classroomSource).toContain("supabase.rpc('move_in_classroom'");
    expect(classroomSource).toContain("supabase.rpc('set_classroom_presence'");
  });

  test('quota checks and first-time subscription approvals serialize per user', () => {
    expect(migrationSource).toContain('create or replace function public.lock_current_user_mutation');
    expect(lockRestrictionSource).toMatch(/revoke all on function public\.lock_current_user_mutation\(text\)[\s\S]*authenticated, service_role/);
    expect(migrationSource).toMatch(/create or replace function public\.plan_entitlement_limit\(p_key text\)[\s\S]*?perform public\.lock_current_user_mutation\('plan'\)/);
    expect(migrationSource).toMatch(/create or replace function public\.create_billing_order\([\s\S]*?perform public\.lock_current_user_mutation\('plan'\)[\s\S]*?from public\.billing_orders/);

    const billingLocks = migrationSource.match(/hashtextextended\('calisiyo:billing:' \|\| order_row\.user_id::text, 0\)/g) || [];
    expect(billingLocks).toHaveLength(2);
    expect(migrationSource).toMatch(/admin_review_billing_order[\s\S]*?calisiyo:billing:[\s\S]*?from public\.user_subscriptions/);
    expect(migrationSource).toMatch(/provider_confirm_billing_order[\s\S]*?calisiyo:billing:[\s\S]*?from public\.user_subscriptions/);
  });
});
