import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { readTree } from './tree-helpers.js';

// S5.2: per-fixture snapshot of the mounted node tree (count, depth, root box, `src` coverage).
// Compared against e2e/__snapshots__/tree.json; regenerate with UPDATE_SNAPSHOT=1 after an
// intentional loader or fixture change and review the diff.
const SNAP = new URL('./__snapshots__/tree.json', import.meta.url);
// 'results' is left out: the checklist lists it as pending a snapshot (the mock mounts empty).
const FIXTURES = [
  'traval', 'axai', 'marketview', 'plain-css', 'nested-oklch', 'dc-template',
  'student-dashboard', 'plain-admin', 'choices-js', 'todomvc-react', 'coffee-masters',
  'vcard-portfolio', 'pico-css', 'slick-carousel', 'mobile-select', 'ecommerce-jsx',
];
const update = process.env.UPDATE_SNAPSHOT === '1';
const stored = fs.existsSync(SNAP) ? JSON.parse(fs.readFileSync(SNAP, 'utf8')) : {};
const fresh = {};

for (const name of FIXTURES) {
  test(`Tree_${name}_MatchesSnapshot`, async ({ page }) => {
    await page.goto(`/?layers=fixtures/${name}/`);
    const tree = await readTree(page);
    expect(tree.nodes, `${name}: nodes mounted`).toBeGreaterThan(0);
    fresh[name] = tree;
    if (!update && stored[name]) expect(tree).toEqual(stored[name]);
  });
}

test.afterAll(() => {
  const missing = FIXTURES.filter((n) => !stored[n] && fresh[n]);
  if (!update && !missing.length) return;
  fs.mkdirSync(new URL('./__snapshots__/', import.meta.url), { recursive: true });
  const out = update ? fresh : { ...stored, ...Object.fromEntries(missing.map((n) => [n, fresh[n]])) };
  fs.writeFileSync(SNAP, JSON.stringify(out, null, 2) + '\n');
});
