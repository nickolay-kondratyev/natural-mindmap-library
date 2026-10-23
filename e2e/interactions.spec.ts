import { HANDLE_GAP, HANDLE_RADIUS, LABEL_EDITOR_ACCESSIBLE_NAME, type Point } from 'natural-mindmap';
import { DEMO_REJECTION_REASON } from '../demo/host/demoHost';
import { dragFromTo, hostData, nodeBox, renameByDoubleClick, textOf, viewOf, viewZoom } from './demoPage';
import { expect, test } from './fixtures';

/**
 * Screen px above VIDA to drop it at. In the fitted reference view every node sits well below this band
 * (the topmost, Hamlet, is ~25 px above VIDA), so the drop lands on empty canvas.
 */
const EMPTY_SPACE_ABOVE_VIDA_PX = 150;
/** Empty canvas above the whole map in the fitted reference view (nodes start ~250 px down). */
const EMPTY_CANVAS_POINT: Point = { x: 470, y: 120 };
const PAN_DELTA: Point = { x: 80, y: 50 };
/** Negative = zoom in, like `WheelEvent.deltaY`. */
const WHEEL_ZOOM_IN_DELTA_Y = -200;
/** `toBeCloseTo` digits: the drop must land within half a CSS px of the pointer. */
const WITHIN_HALF_PX = 0;

test.describe('canvas interactions (spec I1-I5)', () => {
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

  test.describe('GIVEN VIDA dragged into empty space above it (spec I2)', () => {
    let dropPoint: Point;
    let hamletStart: Point;
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      const vida = await nodeBox(page, 'vida');
      hamletStart = (await nodeBox(page, 'hamlet')).center;
      dropPoint = { x: vida.center.x, y: vida.center.y - EMPTY_SPACE_ABOVE_VIDA_PX };
      await dragFromTo(page, vida.center, dropPoint);
    });

    test('WHEN dropped THEN VIDA is drawn at the drop point', async ({ page }) => {
      await expect.poll(async () => (await nodeBox(page, 'vida')).center.y).toBeCloseTo(dropPoint.y, WITHIN_HALF_PX);
    });

    test('WHEN dropped THEN its child Hamlet moved along with it', async ({ page }) => {
      const expectedY = hamletStart.y - EMPTY_SPACE_ABOVE_VIDA_PX;
      await expect.poll(async () => (await nodeBox(page, 'hamlet')).center.y).toBeCloseTo(expectedY, WITHIN_HALF_PX);
    });

    test('WHEN dropped THEN the host data keeps VIDA under the root', async ({ page }) => {
      await expect.poll(async () => (await nodeBox(page, 'vida')).center.y).toBeCloseTo(dropPoint.y, WITHIN_HALF_PX);
      expect((await hostData(page)).find((node) => node.id === 'vida')?.parentId).toBe('root');
    });
  });

  test('GIVEN the reference map WHEN the "x" above TRAGEDIA is clicked THEN the host no longer has it or its children (spec D4)', async ({
    page,
  }) => {
    await page.goto('/');
    const tragedia = await nodeBox(page, 'tragedia');
    const zoom = await viewZoom(page);
    const cross = { x: tragedia.center.x, y: tragedia.center.y - tragedia.size.height / 2 - (HANDLE_GAP + HANDLE_RADIUS) * zoom };
    await page.mouse.move(tragedia.center.x, tragedia.center.y);
    await page.mouse.move(cross.x, cross.y);
    await page.mouse.click(cross.x, cross.y);
    const removedIds = ['tragedia', 'macbeth', 'king-lear'];
    await expect.poll(async () => (await hostData(page)).filter((node) => removedIds.includes(node.id))).toEqual([]);
  });

  test.describe('GIVEN the reference map (spec I1)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await nodeBox(page, 'root');
    });

    test('WHEN empty canvas is dragged THEN the view pans by the drag distance', async ({ page }) => {
      const before = await viewOf(page);
      const to = { x: EMPTY_CANVAS_POINT.x + PAN_DELTA.x, y: EMPTY_CANVAS_POINT.y + PAN_DELTA.y };
      await dragFromTo(page, EMPTY_CANVAS_POINT, to);
      // Rounded: the drag arrives as several fractional pointer moves whose float sum is not exact.
      await expect
        .poll(async () => {
          const { offset } = await viewOf(page);
          return { x: Math.round(offset.x - before.offset.x), y: Math.round(offset.y - before.offset.y) };
        })
        .toEqual(PAN_DELTA);
    });

    test('WHEN the wheel scrolls up over the canvas THEN the view zooms in', async ({ page }) => {
      const before = await viewZoom(page);
      await page.mouse.move(EMPTY_CANVAS_POINT.x, EMPTY_CANVAS_POINT.y);
      await page.mouse.wheel(0, WHEEL_ZOOM_IN_DELTA_Y);
      await expect.poll(() => viewZoom(page)).toBeGreaterThan(before);
    });
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
