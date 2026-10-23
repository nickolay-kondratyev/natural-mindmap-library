import type { Page } from '@playwright/test';
import { nodeBox, renameByDoubleClick, textOf } from './demoPage';
import { expect, test } from './fixtures';

const ROOT_WIDTH_SETTING = 'setting:node.rootSize.width';
const WIDER_ROOT_PX = '300';
const HOST_DELAY_MS = '1000';

async function rootWidth(page: Page): Promise<number> {
  return (await nodeBox(page, 'root')).size.width;
}

test.describe('demo runner (spec §6a)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('GIVEN default settings WHEN the root node width is increased THEN the root is drawn wider (D3)', async ({ page }) => {
    const before = await rootWidth(page);
    await page.getByTestId(ROOT_WIDTH_SETTING).fill(WIDER_ROOT_PX);
    await expect.poll(() => rootWidth(page)).toBeGreaterThan(before);
  });

  test('GIVEN a changed setting WHEN settings are reset THEN the root is drawn at its default width again (D3)', async ({ page }) => {
    const before = await rootWidth(page);
    await page.getByTestId(ROOT_WIDTH_SETTING).fill(WIDER_ROOT_PX);
    await expect.poll(() => rootWidth(page)).toBeGreaterThan(before);
    await page.getByRole('button', { name: 'Reset settings' }).click();
    await expect.poll(() => rootWidth(page)).toBe(before);
  });

  test('GIVEN a changed setting WHEN the page is reloaded THEN the setting is kept (settings storage)', async ({ page }) => {
    await page.getByTestId(ROOT_WIDTH_SETTING).fill(WIDER_ROOT_PX);
    // The demo stores settings in localStorage; reloading before the write would test nothing.
    await page.waitForFunction(() => window.localStorage.length > 0);
    await page.reload();
    await expect(page.getByTestId(ROOT_WIDTH_SETTING)).toHaveValue(WIDER_ROOT_PX);
  });

  test('GIVEN a slow host WHEN a node is renamed THEN the change shows as waiting until the host saves it (D5)', async ({ page }) => {
    await page.getByLabel('Answer delay').fill(HOST_DELAY_MS);
    await renameByDoubleClick(page, 'hamlet', 'Ophelia');
    await expect(page.getByTestId('edit-status')).toHaveAttribute('data-kind', 'pending');
    await expect.poll(() => textOf(page, 'hamlet')).toBe('Ophelia');
  });

  test('GIVEN an edited map WHEN "Reset map" is clicked THEN the reference data is back (D6)', async ({ page }) => {
    await renameByDoubleClick(page, 'hamlet', 'Ophelia');
    await expect.poll(() => textOf(page, 'hamlet')).toBe('Ophelia');
    await page.getByRole('button', { name: 'Reset map' }).click();
    await expect.poll(() => textOf(page, 'hamlet')).toBe('Hamlet');
  });
});
