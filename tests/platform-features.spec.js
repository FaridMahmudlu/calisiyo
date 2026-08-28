const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const expectAdmin = process.env.QA_ADMIN === '1';
const captureDir = process.env.QA_CAPTURE_DIR;

async function capture(page, name) {
  if (!captureDir) return;
  fs.mkdirSync(captureDir, { recursive: true });
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(captureDir, `${name}.png`), fullPage: true });
}

async function login(page) {
  await page.addInitScript(() => window.localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected'));
  await page.goto('/giris');
  await page.waitForTimeout(400);
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('.auth-submit').click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

test.describe('XP, social classroom and admin platform features', () => {
  test.skip(!email || !password, 'QA credentials are required.');

  test('student progression and social hub are real, interactive and responsive', async ({ page, browser }) => {
    const failed = [];
    const errors = [];
    await page.addInitScript(() => {
      class MockMediaRecorder {
        static isTypeSupported(type) { return type === 'audio/mp4'; }
        constructor() { this.mimeType = 'audio/mp4'; this.state = 'inactive'; }
        start() { this.state = 'recording'; }
        stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['calisiyo-voice'], { type: 'audio/mp4' }) }); this.onstop?.(); }); }
      }
      Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: MockMediaRecorder });
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
      });
    });
    page.on('response', (response) => { if (response.status() >= 500) failed.push(`${response.status()} ${response.url()}`); });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);

    await page.goto('/dashboard/gelisim');
    await expect(page.locator('.progression-hero')).toBeVisible();
    await expect(page.locator('.level-orbit strong')).toContainText(/\d+/);
    await expect(page.getByText('XP kuralları')).toBeVisible();
    await expect(page.locator('.global-error')).toHaveCount(0);
    await capture(page, 'progression-desktop');

    await page.goto('/dashboard/arkadaslar');
    await expect(page.locator('.social-identity-chip strong')).toContainText(/^@[a-z0-9_]{3,24}$/);
    await expect(page.getByText('Neyi paylaşacağını sen seç')).toBeVisible();
    await expect(page.getByText('Deneme netleri hiçbir zaman sosyal profiline eklenmez.')).toBeVisible();
    await capture(page, 'social-hub-desktop');

    // Keep the dedicated QA account repeatable after an interrupted run.
    for (;;) {
      const previousRoom = page.locator('.group-card').filter({ hasText: 'Playwright Sınıfı' }).first();
      if (await previousRoom.count() === 0) break;
      await previousRoom.click();
      await page.getByRole('button', { name: 'Sınıfı kapat' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Sınıfı kapat' }).click();
      await expect(page).toHaveURL(/\/dashboard\/arkadaslar$/);
    }

    const roomName = `Playwright Sınıfı ${Date.now()}`;
    await page.getByRole('button', { name: 'Sınıf oluştur', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Sınıf adı').fill(roomName);
    await dialog.getByLabel('Haftalık ortak hedef').fill('300');
    await dialog.getByRole('button', { name: 'Sınıfı oluştur ve aç' }).click();
    await expect(page).toHaveURL(/\/dashboard\/arkadaslar\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: roomName })).toBeVisible();
    await expect(page.locator('.classroom-world')).toBeVisible();
    await page.getByRole('button', { name: 'Çalışıyor' }).click();
    await page.getByLabel('Şu an ne çalışıyorsun?').fill('TYT Matematik · Problemler');
    await page.getByRole('button', { name: 'Durumumu güncelle' }).click();
    await expect(page.locator('.classroom-character.is-me')).toHaveClass(/is-studying/);
    await expect(page.getByText('TYT Matematik · Problemler')).toBeVisible();

    const playfield = page.locator('.classroom-playfield');
    const character = page.locator('.classroom-character.is-me');
    const positionBefore = await character.getAttribute('style');
    await playfield.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => character.getAttribute('style')).not.toBe(positionBefore);

    const mirrorContext = await browser.newContext();
    const mirrorPage = await mirrorContext.newPage();
    await login(mirrorPage);
    await mirrorPage.goto(page.url());
    const mirrorCharacter = mirrorPage.locator('.classroom-character.is-me');
    await expect(mirrorCharacter).toBeVisible();
    await page.waitForTimeout(1400);
    await playfield.focus();
    await page.keyboard.press('ArrowLeft');
    const livePosition = await character.getAttribute('style');
    await expect.poll(() => mirrorCharacter.getAttribute('style')).toBe(livePosition);
    await mirrorContext.close();

    await page.getByRole('button', { name: /Merhaba!/ }).click();
    await expect(page.locator('.classroom-character.is-me .character-reaction')).toContainText('Merhaba!');

    await page.getByRole('button', { name: /Karakterimi özelleştir/ }).last().click();
    const avatarDialog = page.getByRole('dialog');
    await expect(avatarDialog.getByRole('heading', { name: 'Sınıf karakterini seç' })).toBeVisible();
    await avatarDialog.getByRole('button', { name: 'Karakterimi kaydet' }).click();
    await expect(avatarDialog).toHaveCount(0);

    await page.getByRole('button', { name: '15 dk' }).click();
    await page.getByRole('button', { name: /Ortak odağı başlat/ }).click();
    await expect(page.getByRole('button', { name: 'Turu durdur' })).toBeVisible();
    await page.getByRole('button', { name: 'Turu durdur' }).click();
    await expect(page.getByRole('button', { name: /Ortak odağı başlat/ })).toBeVisible();

    await page.getByRole('button', { name: 'Görseli gizle' }).click();
    await expect(page.getByText('Sınıf görseli kapalı')).toBeVisible();
    await page.getByRole('button', { name: '3D sınıfı aç' }).click();
    await expect(page.locator('.classroom-world')).toBeVisible();

    const messageText = `Playwright mesajı ${Date.now()}`;
    const editedMessageText = `${messageText} düzenlendi`;
    await page.getByPlaceholder('Sınıfa mesaj yaz…').fill(messageText);
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    const ownMessage = page.locator('.classroom-message-list .classroom-message.is-me').filter({ hasText: messageText }).last();
    await expect(ownMessage).toBeVisible();
    const messageId = await ownMessage.getAttribute('data-message-id');
    const stableOwnMessage = page.locator(`.classroom-message-list .classroom-message[data-message-id="${messageId}"]`);
    await stableOwnMessage.getByRole('button', { name: 'Mesajı düzenle' }).click();
    await stableOwnMessage.locator('.message-edit input').fill(editedMessageText);
    await stableOwnMessage.getByRole('button', { name: 'Kaydet' }).click();
    await expect(stableOwnMessage).toContainText(editedMessageText);
    await expect(stableOwnMessage).toContainText('düzenlendi');

    const fileName = `playwright-notu-${Date.now()}.txt`;
    await page.locator('.classroom-chat-composer input[type="file"]').last().setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('Calisiyo classroom attachment regression'),
    });
    await expect(page.locator('.chat-attachment-preview')).toContainText(fileName);
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    const fileMessage = page.locator('.classroom-message-list .classroom-message.is-me').filter({ hasText: fileName }).last();
    await expect(fileMessage.locator('.chat-file')).toBeVisible();
    const fileMessageId = await fileMessage.getAttribute('data-message-id');
    const stableFileMessage = page.locator(`.classroom-message-list .classroom-message[data-message-id="${fileMessageId}"]`);
    await stableFileMessage.getByRole('button', { name: 'Mesajı sil' }).click();
    await expect(stableFileMessage).toContainText('Silinen mesaj');

    await page.getByRole('button', { name: 'Ses kaydet' }).click();
    await expect(page.locator('.chat-recording-status')).toContainText('Ses kaydediliyor');
    await page.getByRole('button', { name: 'Ses kaydını bitir' }).click();
    const audioPreview = page.locator('.chat-attachment-preview.is-audio');
    await expect(audioPreview).toContainText('Ses kaydı hazır');
    await expect(audioPreview.locator('.voice-player')).toBeVisible();
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    const audioMessage = page.locator('.classroom-message-list .classroom-message.is-me').filter({ has: page.locator('.voice-player') }).last();
    await expect(audioMessage.locator('.voice-player')).toBeVisible();
    const audioMessageId = await audioMessage.getAttribute('data-message-id');
    const stableAudioMessage = page.locator(`.classroom-message-list .classroom-message[data-message-id="${audioMessageId}"]`);
    await stableAudioMessage.getByRole('button', { name: 'Mesajı sil' }).click();
    await expect(stableAudioMessage).toContainText('Silinen mesaj');

    const messageBoxes = await page.locator('.classroom-message-list .classroom-message').evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    }));
    for (let index = 1; index < messageBoxes.length; index += 1) {
      expect(messageBoxes[index].top).toBeGreaterThanOrEqual(messageBoxes[index - 1].bottom - 1);
    }

    await page.getByRole('button', { name: 'Sınıfı düzenle' }).click();
    const settingsDialog = page.getByRole('dialog');
    await settingsDialog.getByLabel('Sınıf teması').click();
    await settingsDialog.getByRole('option', { name: /Akşam etüdü/ }).click();
    await settingsDialog.getByText('Tahta mesajı').locator('..').getByRole('textbox').fill('Birlikte odaklan, her gün ilerle.');
    await settingsDialog.getByRole('button', { name: 'Sınıfı güncelle' }).click();
    await expect(page.locator('.classroom-world')).toHaveClass(/theme-evening/);
    await capture(page, 'classroom-desktop');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('.study-mobile-nav')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Menüyü aç' })).toBeVisible();
    await expect(page.locator('.classroom-playfield')).toBeVisible();
    await capture(page, 'classroom-mobile');
    for (const width of [320, 390, 768, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator('.study-mobile-nav')).toHaveCount(0);
    }
    await page.setViewportSize({ width: 320, height: 844 });
    await page.getByRole('button', { name: /Karakterimi özelleştir/ }).last().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('dialog').getByRole('button', { name: 'Pencereyi kapat' }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Sınıfı kapat' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sınıfı kapat' }).click();
    await expect(page).toHaveURL(/\/dashboard\/arkadaslar$/);

    await page.setViewportSize({ width: 390, height: 844 });
    for (const [route, name, readySelector] of [
      ['/dashboard/gelisim', 'progression-mobile', '.progression-hero'],
      ['/dashboard/arkadaslar', 'social-hub-mobile', '.social-connect-bar'],
    ]) {
      await page.goto(route);
      await expect(page.locator(readySelector)).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator('.global-error')).toHaveCount(0);
      await capture(page, name);
    }

    expect(failed).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('weekly plan stays ordered and responsive at desktop, tablet and mobile widths', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/haftalik-program');
    await expect(page.locator('.weekly-program-grid:not(.week-skeleton)')).toBeVisible();
    await expect(page.locator('.week-day')).toHaveCount(7);

    for (const [width, columns] of [[1440, 3], [1024, 2], [390, 1], [320, 1]]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const renderedColumns = await page.locator('.weekly-program-grid:not(.week-skeleton)').evaluate((element) => (
        getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
      ));
      expect(renderedColumns).toBe(columns);
    }
  });

  test('admin area enforces role and renders responsive real analytics', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await login(page);
    await page.goto('/admin');

    if (!expectAdmin) {
      await expect(page).toHaveURL(/\/dashboard$/);
      return;
    }

    await expect(page.getByRole('heading', { name: 'calisiyo’nun nabzı' })).toBeVisible();
    await expect(page.getByText('Toplam kullanıcı')).toBeVisible();
    await expect(page.getByText('Kullanıcı yönetimi')).toBeVisible();
    await expect(page.locator('.admin-users tbody tr').first()).toBeVisible();
    await capture(page, 'admin-desktop');
    await page.locator('.admin-users tbody tr').first().getByRole('button', { name: 'Yönet' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Pencereyi kapat' }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'calisiyo’nun nabzı' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Menüyü aç' }).click();
    const mobileNavigation = page.getByRole('navigation', { name: 'Admin menüsü' });
    await expect(mobileNavigation).toBeVisible();
    await expect.poll(async () => {
      const box = await mobileNavigation.locator('xpath=ancestor::aside').boundingBox();
      return Math.abs(box?.x ?? -999) < 1;
    }).toBe(true);
    const sidebarBox = await mobileNavigation.locator('xpath=ancestor::aside').boundingBox();
    expect(sidebarBox.width).toBeGreaterThanOrEqual(220);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await capture(page, 'admin-mobile');
  });
});
