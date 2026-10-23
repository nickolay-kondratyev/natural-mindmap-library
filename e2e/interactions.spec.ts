import type { Page } from '@playwright/test';
import { HANDLE_GAP, HANDLE_RADIUS, LABEL_EDITOR_ACCESSIBLE_NAME, type Point } from 'natural-mindmap';
import { DEMO_REJECTION_REASON } from '../demo/host/demoHost';
import { hostData, nodeBox, renameByDoubleClick, textOf, viewZoom } from './demoPage';
import { expect, test } from './fixtures';

/** Several pointer moves per drag, so it crosses the drag threshold like a real hand would. */
const DRAG_STEPS = 12;

async function dragFromTo(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: DRAG_STEPS });
  await page.mouse.up();
}

test.describe('canvas interactions (spec I3-I5)', () => {
  test('GIVEN the reference map WHEN the "+" of VIDA is clicked and a label typed THEN the host gets a new child of VIDA', async ({
    page,
  }) => {
    await page.goto('/');
    const vida = await nodeBox(page, 'vida');
    const zoom = await viewZoom(page);
    // VIDA is on the right side, so its "+" sits just right of it.
    const plus = { x: vida.center.x + vida.size.width / 2 + (HANDLE_GAP + HANDLE_RADIUS) * zoom, y: vida.center.y };
    await page.mouse.move(vida.center.x, vida.center.y);
    await page.mouse.move(plus.x, plus.y);
    await page.mouse.click(plus.x, plus.y);
    await page.getByRole('textbox', { name: LABEL_EDITOR_ACCESSIBLE_NAME }).fill('Romeo');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await hostData(page)).find((node) => node.text === 'Romeo')?.parentId).toBe('vida');
  });

  test('GIVEN the reference map WHEN Hamlet is double-clicked and renamed THEN the host has the new label', async ({ page }) => {
    await page.goto('/');
    await renameByDoubleClick(page, 'hamlet', 'Ophelia');
    await expect.poll(() => textOf(page, 'hamlet')).toBe('Ophelia');
  });

  test('GIVEN the reference map WHEN Hamlet is dragged onto POESIA THEN the host moves Hamlet under POESIA', async ({ page }) => {
    await page.goto('/');
    const hamlet = await nodeBox(page, 'hamlet');
    const poesia = await nodeBox(page, 'poesia');
    await dragFromTo(page, hamlet.center, poesia.center);
    await expect.poll(async () => (await hostData(page)).find((node) => node.id === 'hamlet')?.parentId).toBe('poesia');
  });

  test.describe('GIVEN the runner host is set to reject every change (spec D5)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.getByRole('checkbox', { name: 'Reject every change' }).check();
      await renameByDoubleClick(page, 'hamlet', 'Ophelia');
    });

    test('WHEN a rename is sent THEN the host reason is shown', async ({ page }) => {
      await expect(page.getByRole('alert')).toContainText(DEMO_REJECTION_REASON);
    });

    test('WHEN a rename is rejected THEN the typed label is offered again for retry', async ({ page }) => {
      await expect(page.getByRole('textbox', { name: LABEL_EDITOR_ACCESSIBLE_NAME })).toHaveValue('Ophelia');
    });
  });
});
