import { test, expect } from '@playwright/test';
import { readNodes } from './tree-helpers.js';

// S3.2: the four menus share one pattern (LayersCore.menuStep): hover opens, click pins, a pointerdown
// outside / Escape / focus leaving / an action item closes, touch taps open pinned. Open state is the
// trigger's aria-expanded plus the popover's first item.
const MENUS = [
  { key: 'hist', probe: /Conectar pasta local…/ }, // regex: the row text starts with a "+" span, an exact string never matches
  { key: 'apar', probe: 'Aparência' },
  { key: 'inter', probe: 'Modo interativo' },
  { key: 'acoes', probe: /^Ver diff/ },
];
const [HIST, APAR, INTER, ACOES] = MENUS;
const GRACE = 260; // LayersCore.MENU_TIMING.closeGrace
const trig = (page, key) => page.locator(`[data-menu="${key}"]`);
const item = (page, m) => page.getByText(m.probe, { exact: typeof m.probe === 'string' }).first();

async function load(page) {
  await page.goto('/?layers=fixtures/plain-css/');
  await readNodes(page);
}

async function isOpen(page, m, open) {
  await expect(trig(page, m.key)).toHaveAttribute('aria-expanded', String(open));
  if (open) await expect(item(page, m)).toBeVisible();
  else await expect(item(page, m)).toBeHidden();
}

async function stageCentre(page) {
  return page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    const b = stage.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  });
}

async function park(page) {
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
}

for (const m of MENUS) {
  test(`Hover_${m.key}_OpensUnpinnedAndClosesAfterLeave`, async ({ page }) => {
    await load(page);
    await trig(page, m.key).hover();
    await isOpen(page, m, true);
    await park(page);
    await isOpen(page, m, false);
  });

  test(`Click_${m.key}_PinsAgainstLeaveAndSecondClickCloses`, async ({ page }) => {
    await load(page);
    await trig(page, m.key).click();
    await park(page);
    await page.waitForTimeout(GRACE + 300);
    await isOpen(page, m, true);
    await trig(page, m.key).click();
    await isOpen(page, m, false);
  });

  test(`OutsidePointerDown_${m.key}_ClosesPinned`, async ({ page }) => {
    await load(page);
    await trig(page, m.key).click();
    await isOpen(page, m, true);
    const c = await stageCentre(page);
    await page.mouse.click(c.x, c.y);
    await isOpen(page, m, false);
  });

  test(`Keyboard_${m.key}_EnterOpensEscapeClosesAndRefocuses`, async ({ page }) => {
    await load(page);
    await trig(page, m.key).focus();
    await page.keyboard.press('Enter');
    await isOpen(page, m, true);
    await page.keyboard.press('Escape');
    await isOpen(page, m, false);
    await expect(trig(page, m.key)).toBeFocused();
  });
}

test('HoverOther_WhilePinned_DoesNotSteal', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').click();
  await trig(page, 'inter').hover();
  await page.waitForTimeout(GRACE + 300);
  await isOpen(page, APAR, true);
  await expect(trig(page, 'inter')).toHaveAttribute('aria-expanded', 'false');
});

test('HoverOther_WhileUnpinned_SwitchesAtOnce', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').hover();
  await isOpen(page, APAR, true);
  await trig(page, 'inter').hover();
  await isOpen(page, INTER, true);
  await expect(trig(page, 'apar')).toHaveAttribute('aria-expanded', 'false');
});

test('ClickOther_OneMenuOpenAtATime', async ({ page }) => {
  await load(page);
  await trig(page, 'hist').click();
  await isOpen(page, HIST, true);
  await trig(page, 'apar').click();
  await isOpen(page, APAR, true);
  await isOpen(page, HIST, false);
});

test('HoverThenPointerDownInside_Pins', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').hover();
  await item(page, APAR).click(); // the "Aparência" label: inside the popover, not an action
  await park(page);
  await page.waitForTimeout(GRACE + 300);
  await isOpen(page, APAR, true);
});

test('HoverTriggerThenPopover_inter_StaysOpenPastGrace', async ({ page }) => {
  await load(page);
  await trig(page, 'inter').hover();
  await isOpen(page, INTER, true);
  // the popover is a sibling of the top bar, not inside the trigger root: leave + enter must cancel the grace
  await item(page, INTER).hover();
  await page.waitForTimeout(GRACE + 300);
  await isOpen(page, INTER, true);
});

test('HoverOpen_inter_CornerResizeOutside_StaysOpen', async ({ page }) => {
  await load(page);
  await trig(page, 'inter').hover();
  await isOpen(page, INTER, true);
  const h = await page.locator('div[title="Arrastar para redimensionar"]').boundingBox(); // index.html:200
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y + 120, { steps: 6 }); // shrink: the pointer ends outside the popover
  await page.waitForTimeout(GRACE + 300);
  await isOpen(page, INTER, true);
  await page.mouse.up();
  await isOpen(page, INTER, true);
});

test('Tab_FocusLeavesRoot_Closes', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').focus();
  await page.keyboard.press('Enter');
  await isOpen(page, APAR, true);
  await page.keyboard.press('Shift+Tab'); // the previous focusable is outside the ⚙ root
  await isOpen(page, APAR, false);
});

test('ActionItem_Acoes_ClosesEvenWhenTheActionRefuses', async ({ page }) => {
  await load(page);
  await trig(page, 'acoes').click();
  // fixture without a connected folder: exportFull refuses by toast, the menu still closes
  await page.getByText('Exportar versões completas…').click();
  await expect(trig(page, 'acoes')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Exportar versões completas…')).toBeHidden();
});

test('NestedCombobox_EscapeClosesInnerThenMenu', async ({ page }) => {
  await load(page);
  await trig(page, 'apar').click();
  await page.getByText('Tema', { exact: true }).first().locator('xpath=following-sibling::div//button').click();
  const opt = page.getByText('Gray · 2 Ardósia', { exact: true });
  await expect(opt).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(opt).toBeHidden();
  await isOpen(page, APAR, true);
  await page.keyboard.press('Escape');
  await isOpen(page, APAR, false);
});

test('DragOverTrigger_DoesNotOpen', async ({ page }) => {
  await load(page);
  const c = await stageCentre(page);
  const t = await trig(page, 'inter').boundingBox();
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 });
  await page.waitForTimeout(GRACE + 300);
  await expect(trig(page, 'inter')).toHaveAttribute('aria-expanded', 'false');
  await page.mouse.up();
});

test('PinnedMenu_StageDrag_ClosesAndOrbits', async ({ page }) => {
  await load(page);
  await trig(page, 'inter').click();
  await isOpen(page, INTER, true);
  const c = await stageCentre(page);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.mouse.move(c.x + 8, c.y);
  await page.mouse.move(c.x + 60, c.y + 40, { steps: 5 });
  // Plane sets willChange 'transform' only while dragging (same probe as viewport-culling.spec.js)
  const dragging = await page.evaluate(() => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) =>
      getComputedStyle(el).backgroundImage.includes('radial-gradient'),
    );
    return [...stage.querySelectorAll('div')].some((el) => el.style.willChange === 'transform');
  });
  await page.mouse.up();
  expect(dragging, 'the orbit starts on the same pointerdown that closes the menu').toBe(true);
  await isOpen(page, INTER, false);
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('Touch_Tap_OpensPinnedAndOutsideTapCloses', async ({ page }) => {
    await load(page);
    await trig(page, 'inter').tap();
    await isOpen(page, INTER, true);
    await page.waitForTimeout(GRACE + 300);
    await isOpen(page, INTER, true);
    await trig(page, 'inter').tap();
    await isOpen(page, INTER, false);
    await trig(page, 'inter').tap();
    await isOpen(page, INTER, true);
    const c = await stageCentre(page);
    await page.touchscreen.tap(c.x, c.y);
    await isOpen(page, INTER, false);
  });
});
