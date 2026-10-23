import type { Page } from '@playwright/test';
import {
  DEFAULT_VIEW,
  LABEL_EDITOR_ACCESSIBLE_NAME,
  type MindmapData,
  type MindmapView,
  type NodeBox,
  type NodeId,
  type Point,
} from 'natural-mindmap';
import type { MindmapApi } from 'natural-mindmap/react';

/** Canvas content has no DOM, so tests read the map through the demo's `window.mindmap` (demo/testHooks.ts). */
type DemoWindow = Window & { mindmap?: MindmapApi | null };

/** Several pointer moves per drag, so it crosses the drag threshold like a real hand would. */
const DRAG_STEPS = 12;

/** Node box in page coordinates, waiting until the node has been painted. */
export async function nodeBox(page: Page, nodeId: NodeId): Promise<NodeBox> {
  const handle = await page.waitForFunction((id) => (window as DemoWindow).mindmap?.getNodeScreenBox(id) ?? null, nodeId);
  const box = (await handle.jsonValue()) as NodeBox;
  const canvas = await page.getByTestId('mindmap-canvas').boundingBox();
  if (canvas === null) throw new Error('The mindmap canvas is not visible');
  return { center: { x: canvas.x + box.center.x, y: canvas.y + box.center.y }, size: box.size };
}

export async function viewOf(page: Page): Promise<MindmapView> {
  return page.evaluate((fallback) => (window as DemoWindow).mindmap?.getView() ?? fallback, DEFAULT_VIEW);
}

export async function viewZoom(page: Page): Promise<number> {
  return (await viewOf(page)).zoom;
}

export async function hostData(page: Page): Promise<MindmapData> {
  return page.evaluate(() => (window as DemoWindow).mindmap?.getData() ?? []);
}

export async function textOf(page: Page, nodeId: NodeId): Promise<string | undefined> {
  return (await hostData(page)).find((node) => node.id === nodeId)?.text;
}

export async function renameByDoubleClick(page: Page, nodeId: NodeId, label: string): Promise<void> {
  const { center } = await nodeBox(page, nodeId);
  await page.mouse.dblclick(center.x, center.y);
  await page.getByRole('textbox', { name: LABEL_EDITOR_ACCESSIBLE_NAME }).fill(label);
  await page.keyboard.press('Enter');
}

/** Presses at `from`, drags to `to` and releases, in page coordinates. */
export async function dragFromTo(page: Page, from: Point, to: Point): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: DRAG_STEPS });
  await page.mouse.up();
}
