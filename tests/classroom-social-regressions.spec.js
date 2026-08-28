const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const nextConfig = read('next.config.mjs');
const chat = read('components', 'classroom', 'ClassroomChat.js');
const avatar = read('components', 'classroom', 'ClassroomAvatar.js');
const friends = read('app', 'dashboard', 'arkadaslar', 'page.js');
const socialCss = read('app', 'dashboard', 'arkadaslar', 'social.css');
const migration = read('supabase', 'migrations', '20260828143611_expand_classroom_avatar_models.sql');

test.describe('Classroom media and social regressions', () => {
  test('microphone is allowed only for this origin and permission errors are actionable', () => {
    expect(nextConfig).toContain("microphone=(self)");
    expect(nextConfig).not.toContain("microphone=()");
    expect(chat).toContain("recordingError?.name === 'NotAllowedError'");
    expect(chat).toContain('Adres çubuğundaki kilit simgesinden Mikrofon > İzin ver');
    expect(chat).toContain('className="chat-permission-help"');
  });

  test('attachments are optimized, resumable and signed URLs are cached', () => {
    expect(chat).toContain("import * as tus from 'tus-js-client'");
    expect(chat).toContain("canvas.toBlob(resolve, 'image/webp', 0.82)");
    expect(chat).toContain('storage/v1/upload/resumable');
    expect(chat).toContain('retryDelays: [0, 1000, 3000, 5000, 10000]');
    expect(chat).toContain(".filter((path) => !signedPathRef.current.has(path))");
    expect(chat).toContain("Object.keys(freshUrls).forEach((path) => signedPathRef.current.add(path))");
    expect(chat).toContain("from('classroom-attachments').remove([uploadedPath])");
  });

  test('avatar collection contains three girls and three boys without broadening RPC access', () => {
    for (const model of ['navy', 'sage', 'rust', 'ece', 'selin', 'arda']) {
      expect(avatar).toContain(`${model}: {`);
    }
    for (const asset of ['student-ece-v1.webp', 'student-selin-v1.webp', 'student-arda-v1.webp']) {
      expect(fs.existsSync(path.join(root, 'public', 'assets', 'classroom', 'sprites', asset))).toBeTruthy();
    }
    expect(migration).toMatch(/check \(avatar_model in \('navy', 'sage', 'rust', 'ece', 'selin', 'arda'\)\)/);
    expect(migration).toContain("viewer uuid := (select auth.uid())");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toMatch(/revoke all[\s\S]*grant execute[\s\S]*to authenticated/);
  });

  test('friend ranking includes the current user and compact discovery remains responsive', () => {
    expect(friends).toContain("friendshipId: 'self'");
    expect(friends).toContain('isSelf: true');
    expect(friends).toContain('const selfRank = rankedPeople.find');
    expect(friends).toContain('className={person.isSelf ? \'is-self\' : \'\'}');
    expect(friends).toContain('className="social-connect-bar study-panel"');
    expect(friends).toContain('placeholder="Kullanıcı adıyla arkadaş bul"');
    expect(socialCss).toContain('@media(max-width:520px)');
    expect(socialCss).toContain('.social-connect-bar{padding:12px');
  });
});
