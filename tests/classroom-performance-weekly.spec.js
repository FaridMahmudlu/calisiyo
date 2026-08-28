const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');
const accountRoute = read('app', 'api', 'account', 'route.js');
const dashboardLayout = read('app', 'dashboard', 'layout.js');
const weeklyPage = read('app', 'dashboard', 'haftalik-program', 'page.js');
const socialPage = read('app', 'dashboard', 'arkadaslar', 'page.js');
const classroomPage = read('app', 'dashboard', 'arkadaslar', '[groupId]', 'page.js');
const classroomScene = read('components', 'classroom', 'ClassroomScene.js');
const classroomChat = read('components', 'classroom', 'ClassroomChat.js');
const classroomCss = read('app', 'dashboard', 'arkadaslar', 'classroom.css');
const migration = read('supabase', 'migrations', '20260827190131_optimize_account_and_rich_classroom_chat.sql');
const presenceMigration = read('supabase', 'migrations', '20260828203000_add_classroom_presence_snapshot.sql');

test.describe('Account, weekly plan and rich classroom contracts', () => {
  test('dashboard shell uses one canonical bootstrap and never downloads full activity history', () => {
    expect(accountRoute).toContain("supabase.rpc('get_account_bootstrap')");
    expect(accountRoute).not.toContain(".from('gunluk_gorevler')");
    expect(accountRoute).not.toContain(".from('calisma_suresi')");
    expect(dashboardLayout).not.toContain('result.tasks');
    expect(dashboardLayout).not.toContain('result.sessions');
    expect(migration).toMatch(/create or replace function public\.get_account_bootstrap\(\)[\s\S]*auth\.uid\(\)[\s\S]*get_my_progress\(\)[\s\S]*get_live_streak\(\)/);
    expect(socialPage).toMatch(/Promise\.all\(\[[\s\S]*get_social_hub[\s\S]*get_my_social_identity[\s\S]*\]\)[\s\S]*setLoading\(false\)[\s\S]*list_public_study_groups/);
    expect(socialPage).toContain('includeDirectory: false');
  });

  test('weekly plan is bounded and responsive instead of a seven-column overflow canvas', () => {
    expect(weeklyPage).toContain('.weekly-program-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))');
    expect(weeklyPage).toContain('grid-template-columns:repeat(2,minmax(0,1fr))');
    expect(weeklyPage).toContain('grid-template-columns:1fr');
    expect(weeklyPage).toContain('-webkit-line-clamp:2');
    expect(weeklyPage).toContain('overflow-wrap:anywhere');
    expect(weeklyPage).not.toContain('repeat(7');
    expect(weeklyPage).not.toContain('className="week-grid');
    expect(weeklyPage).toContain('<style jsx global>');
  });

  test('classroom scene is optional, spatial and keeps presence refresh local', () => {
    expect(classroomPage).toContain("calisiyo-classroom-scene:${groupId}");
    expect(classroomPage).toContain("table: 'study_presence'");
    expect(classroomPage).toContain('protectRecentLocalMove ? member.positionX');
    expect(classroomPage).toContain('members: current.members.map');
    expect(classroomPage).toContain("supabase.rpc('get_group_presence_snapshot'");
    expect(classroomPage).toContain("document.visibilityState === 'visible'");
    expect(classroomPage).toContain("supabase.rpc('get_group_messages_v2'");
    expect(classroomPage).toContain('}, [groupId, loadMessages, loadRoom, supabase, userId]);');
    expect(classroomScene).toContain('classroom-room-shell');
    expect(classroomScene).toContain('classroom-back-wall');
    expect(classroomScene).toContain('classroom-floor');
    expect(classroomCss).toContain('perspective:900px');
    expect(presenceMigration).toMatch(/get_group_presence_snapshot[\s\S]*auth\.uid\(\)[\s\S]*is_study_group_member\(p_group_id\)/);
    expect(presenceMigration).toMatch(/revoke all[\s\S]*grant execute[\s\S]*to authenticated/);
  });

  test('rich chat is private, realtime, editable and cleans failed attachment uploads', () => {
    expect(classroomChat).toMatch(/from\('classroom-attachments'\)[\s\S]*?\.upload\(uploadedPath/);
    expect(classroomChat).toContain("from('classroom-attachments').remove");
    expect(classroomChat).toContain("supabase.rpc('send_classroom_message_v2'");
    expect(classroomChat).toContain("supabase.rpc('edit_classroom_message'");
    expect(classroomChat).toContain("supabase.rpc('mark_classroom_messages_read'");
    expect(classroomChat).toContain("supabase.rpc('share_classroom_profile_card'");
    expect(classroomChat).toContain("supabase.rpc('share_classroom_resource'");
    expect(classroomChat).toContain('globalThis.MediaRecorder');
    expect(classroomPage).toContain("table: 'study_group_message_reads'");

    expect(migration).toContain("'classroom-attachments',\n  false");
    expect(migration).toMatch(/Classroom members upload own attachments[\s\S]*foldername\(name\)\)\[2\][\s\S]*auth\.uid\(\)/);
    expect(migration).toMatch(/send_classroom_message_v2[\s\S]*classroom_attachment_group_id\(clean_path\)[\s\S]*storage\.objects/);
    expect(migration).toMatch(/edit_classroom_message[\s\S]*target\.user_id <> viewer/);
    expect(migration).toMatch(/get_group_messages_v2[\s\S]*is_study_group_member\(p_group_id\)/);
    expect(migration).toMatch(/revoke all on function public\.send_classroom_message_v2[\s\S]*grant execute[\s\S]*to authenticated/);
  });
});
