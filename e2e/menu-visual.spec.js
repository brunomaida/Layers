import { test, expect } from '@playwright/test';

// S3.2 visual freeze: the menu pattern changes behavior only. Baselines come from the unmodified
// index.html and must still match pixel for pixel after the wiring. No project is loaded, so no
// toast, timestamp or plane can move between runs. Manual pixel gate: baselines are local, never
// committed, so the spec runs only with LAYERS_VISUAL=1 and never in the regression run.
test.skip(!process.env.LAYERS_VISUAL, 'manual pixel gate: set LAYERS_VISUAL=1');
test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are Chromium-only');

const SHOT = { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 };
const MENUS = [
  { key: 'hist', trigger: (p) => p.getByText('Nenhum projeto').first(), probe: (p) => p.getByText('Conectar pasta local…') },
  { key: 'apar', trigger: (p) => p.locator('button[title^="Aparência · Fonte"]'), probe: (p) => p.getByText('Aparência', { exact: true }) },
  { key: 'inter', trigger: (p) => p.getByText('Interagir', { exact: false }).first(), probe: (p) => p.getByText('Modo interativo').first() },
  { key: 'acoes', trigger: (p) => p.getByText('Ações ▾'), probe: (p) => p.getByText(/^Ver diff/) },
];

async function ready(page) {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByText('Ações ▾')).toBeVisible();
}

async function park(page) {
  const c = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
  await page.mouse.move(c.x, c.y);
}

// keyboard focus is not part of the visual contract: blur before every shot
const unfocus = (page) => page.evaluate(() => document.activeElement && document.activeElement.blur());

test('Visual_AllClosed_MatchesBaseline', async ({ page }) => {
  await ready(page);
  await park(page);
  await expect(page).toHaveScreenshot('menu-closed.png', SHOT);
});

for (const m of MENUS) {
  test(`Visual_ClickOpen_${m.key}_MatchesBaseline`, async ({ page }) => {
    await ready(page);
    await m.trigger(page).click();
    await expect(m.probe(page)).toBeVisible();
    await unfocus(page);
    await expect(page).toHaveScreenshot(`menu-${m.key}-open.png`, SHOT);
  });
}

for (const m of MENUS) {
  test(`Visual_HoverOpen_${m.key}_MatchesClickBaseline`, async ({ page }) => {
    await ready(page);
    await m.trigger(page).hover();
    await expect(m.probe(page)).toBeVisible();
    await unfocus(page);
    await expect(page).toHaveScreenshot(`menu-${m.key}-open.png`, SHOT);
  });
}
