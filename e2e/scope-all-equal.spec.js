import { test, expect } from '@playwright/test';
import { readNodes, treeRow } from './tree-helpers.js';

// S5.4: with scope "Todos iguais", one property edit reaches every use of the rule (same `src`,
// same tag, same leaf-ness: the app's `sharedIds` grouping) and no other element. "Só este" is the
// contrast: exactly the selected element. Driven through the real UI on the axai fixture, where
// `.sum-stat` is used by 6 nodes.
const SHADOW = 'rgb(1, 2, 3) 0px 0px 0px 3px';

// Shadow-root elements whose inline box-shadow now carries SHADOW, as indexes into the scan order.
function touched() {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  const els = [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style');
  return els.flatMap((e, i) => (e.style.boxShadow.includes('rgb(1, 2, 3)') ? [i] : []));
}

function group() {
  const host = [...document.querySelectorAll('*')].find((e) => e.shadowRoot && e.shadowRoot.childElementCount);
  const els = [...host.shadowRoot.querySelectorAll('*')].filter((e) => e.localName !== 'style');
  const key = (e) => `${e.dataset.src}#${e.localName}#${e.children.length > 0}`;
  const first = els.find((e) => e.classList.contains('sum-stat'));
  return els.flatMap((e, i) => (key(e) === key(first) ? [i] : []));
}

async function edit(page, scopeLabel) {
  await page.goto('/?layers=fixtures/axai/');
  await readNodes(page);
  await (await treeRow(page, { title: '.sum-stat' })).click();
  await page.getByText(scopeLabel, { exact: false }).first().click();
  // Text field of the "Sombra" row; typed like a user (select all, type, leave the field to commit).
  const field = page.locator('xpath=//*[normalize-space(text())="Sombra"]/ancestor::*[.//input[@type="text"]][1]//input[@type="text"]').first();
  await field.click({ clickCount: 3 });
  await page.keyboard.type('0 0 0 3px rgb(1, 2, 3)');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
}

test('Scope_AllEqual_EditReachesEveryUseAndNothingElse', async ({ page }) => {
  await edit(page, 'Todos iguais (');
  const expected = await page.evaluate(group);
  expect(expected.length, 'uses of .sum-stat').toBeGreaterThan(1);
  const got = await page.evaluate(touched);
  expect(got).toEqual(expected);
});

test('Scope_One_EditReachesOnlyTheSelected', async ({ page }) => {
  await edit(page, 'Só este');
  const got = await page.evaluate(touched);
  expect(got).toHaveLength(1);
});
