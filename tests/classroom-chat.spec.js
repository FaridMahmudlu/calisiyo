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
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: async () => {
          const context = new AudioContext();
          await context.resume();
          const destination = context.createMediaStreamDestination();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          gain.gain.value = 0.04;
          oscillator.connect(gain).connect(destination);
          oscillator.start();
          globalThis.__voiceTestAudio = { context, oscillator };
          return destination.stream;
        } },
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

    await page.locator('.classroom-blackboard').click();
    const boardDialog = page.locator('.classroom-board-modal');
    await expect(boardDialog).toBeVisible();
    const boardText = `Bugünün sorusu ${Date.now()}`;
    await boardDialog.getByPlaceholder(/Bugünün sorusu/).fill(boardText);
    await boardDialog.getByRole('button', { name: 'Notu kaydet' }).click();
    await expect(boardDialog.locator('.board-shared-text')).toHaveText(boardText);
    const boardSvg = boardDialog.getByRole('img', { name: 'Sınıfın ortak çizim tahtası' });
    const boardBox = await boardSvg.boundingBox();
    await page.mouse.move(boardBox.x + 80, boardBox.y + 90);
    await page.mouse.down();
    await page.mouse.move(boardBox.x + 150, boardBox.y + 135, { steps: 8 });
    await page.mouse.up();
    await expect(boardSvg.locator('polyline')).toHaveCount(1);
    await boardDialog.getByRole('button', { name: 'Tahtayı kapat' }).click();

    await page.getByRole('button', { name: 'Ön sol sıra sırasına otur' }).click();
    await expect(page.locator('.classroom-character.is-me')).toHaveClass(/is-pose-sitting/);
    await page.getByRole('button', { name: 'Ayağa kalk' }).click();
    await expect(page.locator('.classroom-character.is-me')).toHaveClass(/is-pose-standing/);
    await page.getByRole('button', { name: 'Zıpla', exact: true }).click();
    await expect(page.locator('.classroom-character.is-me')).toHaveClass(/is-jumping/);

    const messageText = `Düzenli chat mesajı ${Date.now()}`;
    await page.getByLabel('Sınıfa mesaj yaz').fill(messageText);
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();
    await expect(page.locator('.classroom-message.is-me').filter({ hasText: messageText })).toBeVisible();

    await page.getByRole('button', { name: 'Ses kaydet' }).click();
    await expect(page.locator('.chat-recording-status')).toContainText('Ses kaydediliyor');
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Ses kaydını bitir' }).click();
    await expect(page.locator('.chat-attachment-preview.is-audio')).toContainText('Ses kaydı hazır');
    const previewPlayer = page.locator('.chat-attachment-preview.is-audio .voice-player');
    await expect(previewPlayer).toBeVisible();
    await expect(previewPlayer).not.toHaveClass(/has-error/, { timeout: 10000 });
    await expect(previewPlayer.locator('.voice-time')).not.toHaveText('0:00 / 0:00', { timeout: 10000 });
    await previewPlayer.getByRole('button', { name: 'Ses kaydını oynat' }).click();
    await expect.poll(() => previewPlayer.locator('audio').evaluate((audio) => !audio.paused && audio.currentTime > 0)).toBe(true);
    await previewPlayer.getByRole('button', { name: 'Ses kaydını duraklat' }).click();
    await page.getByRole('button', { name: 'Mesajı gönder' }).click();

    const voiceMessage = page.locator('.classroom-message.is-me').filter({ has: page.locator('.voice-player') }).last();
    await expect(voiceMessage.locator('.voice-player')).toBeVisible();
    await expect(voiceMessage.locator('.voice-time')).not.toHaveText('0:00 / 0:00', { timeout: 10000 });
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
