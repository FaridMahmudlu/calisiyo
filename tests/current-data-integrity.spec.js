const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260820175257_canonical_activity_exam_and_reliability.sql'),
  'utf8',
);
const securityMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260820181612_enforce_touched_rpc_entitlements.sql'),
  'utf8',
);
const activityBoundaryMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260820182745_exclude_future_verified_activity.sql'),
  'utf8',
);
const dashboard = fs.readFileSync(path.join(root, 'app', 'dashboard', 'page.js'), 'utf8');
const statistics = fs.readFileSync(path.join(root, 'app', 'dashboard', 'istatistikler', 'page.js'), 'utf8');
const wrongQuestions = fs.readFileSync(path.join(root, 'app', 'dashboard', 'yapamadiklari', 'page.js'), 'utf8');
const youtubeRoute = fs.readFileSync(path.join(root, 'app', 'api', 'youtube', 'plan', 'route.js'), 'utf8');

test.describe('current data-integrity implementation', () => {
  test('manual logs, completed tasks and timer sessions share one conservative daily source', () => {
    expect(migration).toMatch(/verified_study_minutes_for_user_day[\s\S]*?with logged as[\s\S]*?completed_plan as[\s\S]*?timer as[\s\S]*?greatest\(logged\.minutes, completed_plan\.minutes, timer\.minutes\)/);
    expect(migration).toMatch(/get_my_study_time_statistics[\s\S]*?verified_study_minutes_for_user_day\(viewer, candidate\.day\)/);
    expect(migration).toMatch(/study_streak_for_user[\s\S]*?from public\.pomodoro_kayitlari/);
    expect(dashboard).toContain("rpc('get_my_study_time_statistics', { p_start_date: null })");
    expect(statistics).toContain("rpc('get_my_study_time_statistics', { p_start_date: rangeStart })");
    expect(statistics).not.toContain('<small>Odak süresi</small>');
    expect(activityBoundaryMigration).toMatch(/today_date date := \(now\(\) at time zone 'Europe\/Istanbul'\)::date/);
    expect(activityBoundaryMigration).toMatch(/task\.tarih <= today_date/);
    expect(activityBoundaryMigration).toMatch(/log\.tarih <= today_date/);
  });

  test('exam blanks are server-derived and invalid totals roll back the atomic RPC', () => {
    expect(migration).toMatch(/blank_count := course\.question_count - correct_count - wrong_count/);
    expect(migration).toMatch(/correct_count \+ wrong_count > course\.question_count/);
    expect(migration).toMatch(/course\.question_count is null[\s\S]*?raise exception/);
    expect(migration).not.toMatch(/blank_count := coalesce\(\(item->>'bos'\)/);
    expect(securityMigration).toMatch(/blank_count := course\.question_count - correct_count - wrong_count/);
    expect(securityMigration).toMatch(/correct_count \+ wrong_count > course\.question_count/);
    expect(securityMigration).toContain('if not public.can_insert_exam(viewer) then');
    expect(securityMigration).toContain('Aynı ders sonucu bir denemeye iki kez eklenemez.');
  });

  test('topic completion no longer creates implicit revisions', () => {
    expect(migration).toContain('drop trigger if exists konu_takibi_create_repeats on public.konu_takibi;');
    expect(migration).not.toMatch(/delete from public\.tekrarlar/);
  });

  test('program compliance excludes future scheduled work from the selected period', () => {
    expect(statistics).toContain(".lte('tarih', today).order('tarih')");
    expect(statistics).toContain('Seçili dönemde program uyumu');
  });

  test('wrong-question image persistence is atomic and uploaded files are rolled back on failure', () => {
    expect(migration).toMatch(/save_wrong_question_with_images[\s\S]*?delete from public\.yapamadiklari_gorseller[\s\S]*?insert into public\.yapamadiklari_gorseller/);
    expect(migration).toMatch(/create_wrong_questions_from_images[\s\S]*?jsonb_array_length\(p_image_paths\) not between 1 and 50/);
    expect(wrongQuestions).toContain('await supabase.storage.from("study-assets").remove(uploadedPaths)');
    expect(wrongQuestions).toContain('Her görsel ayrı bir soru kaydı olur');
    expect(wrongQuestions).not.toContain('Sayfa | Soru no');
  });

  test('YouTube retries are serialized and idempotent', () => {
    expect(migration).toMatch(/import_youtube_learning_plan_idempotent[\s\S]*?pg_advisory_xact_lock[\s\S]*?'reused', true/);
    expect(youtubeRoute).toContain("rpc('import_youtube_learning_plan_idempotent'");
    expect(youtubeRoute).toContain('p_request_id: requestId');
    expect(securityMigration).toContain("import_limit := public.plan_entitlement_limit('youtube_import_monthly_limit')");
    expect(securityMigration).toMatch(/revoke all on function public\.import_youtube_learning_plan\(jsonb, jsonb, date, text, integer, uuid\) from public, anon, authenticated/);
  });
});
