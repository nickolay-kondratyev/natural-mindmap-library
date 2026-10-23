import type { Page } from '@playwright/test';
import { LABEL_EDITOR_ACCESSIBLE_NAME, type MindmapData, type NodeBox, type NodeId } from 'natural-mindmap';
import type { MindmapApi } from 'natural-mindmap/react';

/** Canvas content has no DOM, so tests read the map through the demo's `window.mindmap` (demo/testHooks.ts). */
type DemoWindow = Window & { mindmap?: MindmapApi | null };

/** Node box in page coordinates, waiting until the node has been painted. */
export async function nodeBox(page: Page, nodeId: NodeId): Promise<NodeBox> {
  const handle = await page.waitForFunction((id) => (window as DemoWindow).mindmap?.getNodeScreenBox(id) ?? null, nodeId);
  const box = (await handle.jsonValue()) as NodeBox;
  const canvas = await page.getByTestId('mindmap-canvas').boundingBox();
  if (canvas === null) throw new Error('The mindmap canvas is not visible');
  return { center: { x: canvas.x + box.center.x, y: canvas.y + box.center.y }, size: box.size };
}

export async function viewZoom(page: Page): Promise<number> {
  return page.evaluate(() => (window as DemoWindow).mindmap?.getView().zoom ?? 1);
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
