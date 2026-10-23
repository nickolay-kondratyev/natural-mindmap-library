import { expect, FONT_URL_GLOB, test } from './fixtures';

const HTTP_NOT_FOUND = 404;

test.describe('font loading (spec L6)', () => {
  let pageErrors: Error[];
  test.beforeEach(({ page }) => {
    pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error));
  });

  test('GIVEN the font is reachable WHEN the demo loads THEN the status becomes loaded and labels draw without errors', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('font-status')).toHaveAttribute('data-status', 'loaded');
    // One more frame so the post-load repaint (glyph drawing) has run.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(pageErrors).toEqual([]);
  });

  test('GIVEN the font is missing WHEN the demo loads THEN the status becomes error and rendering raises no errors', async ({
    page,
  }) => {
    await page.route(FONT_URL_GLOB, (route) => route.fulfill({ status: HTTP_NOT_FOUND }));
    await page.goto('/');
    await expect(page.getByTestId('font-status')).toHaveAttribute('data-status', 'error');
    await expect(page.getByTestId('font-status')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
