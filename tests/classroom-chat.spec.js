const { test, expect } = require('@playwright/test');

const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;

async function login(page) {
  await page.addInitScript(() => window.localStorage.setItem('calisiyo-cookie-consent-v1', 'rejected'));
  await page.goto('/giris');
  await page.getByLabel('E-posta').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('.auth-submit').click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
}

test.describe('Minimal classroom chat', () => {
  test.skip(!email || !password, 'QA credentials are required.');

  test('records, previews, uploads and renders voice without overlapping messages', async ({ page }) => {
    const serverErrors = [];
    const pageErrors = [];
    await page.addInitScript(() => {
      class MockMediaRecorder {
        static isTypeSupported(type) { return type.startsWith('audio/'); }
        constructor() { this.mimeType = 'audio/webm;codecs=opus'; this.state = 'inactive'; }
        start() { this.state = 'recording'; }
        requestData() { this.ondataavailable?.({ data: new Blob(['calisiyo-voice'], { type: 'audio/webm' }) }); }
        stop() { this.state = 'inactive'; queueMicrotask(() => this.onstop?.()); }
      }
      Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: MockMediaRecorder });
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) },
      });
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => { if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`); });

    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page);
    await page.goto('/dashboard/arkadaslar');
    await expect(page.getByRole('heading', { name: 'Ortak ritmin canlı alanı' })).toBeVisible({ timeout: 15000 });

    for (;;) {
      const oldRoom = page.locator('.group-card').filter({ hasText: /Playwright Sınıfı|Chat QA/ }).first();
      if (await oldRoom.count() === 0) break;
      await oldRoom.click();
      await page.getByRole('button', { name: 'Sınıfı kapat' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Sınıfı kapat' }).click();
      await expect(page).toHaveURL(/\/dashboard\/arkadaslar$/);
    }

    const roomName = `Chat QA ${Date.now()}`;
    await page.getByRole('button', { name: 'Sınıf oluştur', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Sınıf adı').fill(roomName);
    await dialog.getByLabel('Haftalık ortak hedef').fill('120');
    await dialog.getByRole('button', { name: 'Sınıfı oluştur ve aç' }).click();
    await expect(page.getByRole('heading', { name: roomName })).toBeVisible();

    const messageText = `Düzenli chat mesajı ${Date.now()}`;
    await page.getByLabel('Sınıfa mesaj yaz').fill(messageText);
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    await expect(page.locator('.classroom-message.is-me').filter({ hasText: messageText })).toBeVisible();

    await page.getByRole('button', { name: 'Ses kaydet' }).click();
    await expect(page.locator('.chat-recording-status')).toContainText('Ses kaydediliyor');
    await page.getByRole('button', { name: 'Ses kaydını bitir' }).click();
    await expect(page.locator('.chat-attachment-preview.is-audio')).toContainText('Ses kaydı hazır');
    await expect(page.locator('.chat-attachment-preview.is-audio audio')).toBeVisible();
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();

    const voiceMessage = page.locator('.classroom-message.is-me').filter({ has: page.locator('.chat-audio') }).last();
    await expect(voiceMessage.locator('.chat-audio')).toBeVisible();
    const voiceMessageId = await voiceMessage.getAttribute('data-message-id');
    const stableVoiceMessage = page.locator(`.classroom-message[data-message-id="${voiceMessageId}"]`);
    const boxes = await page.locator('.classroom-message').evaluateAll((nodes) => nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    }));
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index].top).toBeGreaterThanOrEqual(boxes[index - 1].bottom - 1);
    }

    for (const width of [1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator('.classroom-chat-composer')).toBeVisible();
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await stableVoiceMessage.getByRole('button', { name: 'Mesajı sil' }).click();
    await expect(stableVoiceMessage).toContainText('Silinen mesaj');
    await page.getByRole('button', { name: 'Sınıfı kapat' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Sınıfı kapat' }).click();
    await expect(page).toHaveURL(/\/dashboard\/arkadaslar$/);
    expect(serverErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
