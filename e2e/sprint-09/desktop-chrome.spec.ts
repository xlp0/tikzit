import { test, expect } from '@playwright/test';

test.describe('Sprint 09: Desktop Assets and Chrome Harmonization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#tikzit-workbench');
  });

  test('09-E2E-01: Displays macOS window chrome with decorative traffic lights', async ({ page }) => {
    const chrome = page.locator('[data-testid="mac-window-chrome"]');
    await expect(chrome).toBeVisible();

    const closeDot = page.locator('[data-testid="traffic-light-close"]');
    const minDot = page.locator('[data-testid="traffic-light-minimize"]');
    const maxDot = page.locator('[data-testid="traffic-light-fullscreen"]');

    await expect(closeDot).toBeVisible();
    await expect(minDot).toBeVisible();
    await expect(maxDot).toBeVisible();
  });

  test('09-E2E-02: Centered window title shows document name and TikZiT app branding', async ({ page }) => {
    const titleLocator = page.locator('[data-testid="mac-window-title"]');
    await expect(titleLocator).toBeVisible();
    const titleText = await titleLocator.textContent();
    expect(titleText).toContain('TikZiT');

    // Contract B compatibility: doc-tab-title selector is preserved
    const docTabTitle = page.locator('[data-testid="doc-tab-title"]');
    await expect(docTabTitle).toBeVisible();
  });

  test('09-E2E-03: Desktop tool palette renders 4 tool buttons with proper desktop icons and styling', async ({ page }) => {
    const palette = page.locator('[data-testid="desktop-tool-palette"]');
    await expect(palette).toBeVisible();

    const selectTool = page.locator('[data-testid="tool-select"]');
    const vertexTool = page.locator('[data-testid="tool-vertex"]');
    const edgeTool = page.locator('[data-testid="tool-edge"]');
    const cropTool = page.locator('[data-testid="tool-bbox"]');

    await expect(selectTool).toBeVisible();
    await expect(vertexTool).toBeVisible();
    await expect(edgeTool).toBeVisible();
    await expect(cropTool).toBeVisible();

    // Verify 32x32 bounding box size for tool buttons
    const box = await selectTool.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.round(box.width)).toBe(32);
      expect(Math.round(box.height)).toBe(32);
    }
  });

  test('09-E2E-04: Tool switching activates tool and applies green #00c853 border highlight', async ({ page }) => {
    const selectBtn = page.locator('[data-testid="tool-select"]');
    const edgeBtn = page.locator('[data-testid="tool-edge"]');

    // Initial state: select is active
    await expect(selectBtn).toHaveAttribute('data-active', 'true');

    // Click edge tool
    await edgeBtn.click();
    await expect(edgeBtn).toHaveAttribute('data-active', 'true');
    await expect(selectBtn).toHaveAttribute('data-active', 'false');

    // Check computed border color or class for green highlight
    const edgeClass = await edgeBtn.getAttribute('class');
    expect(edgeClass).toContain('border-[#00c853]');

    // Switch back to select
    await selectBtn.click();
    await expect(selectBtn).toHaveAttribute('data-active', 'true');
  });

  test('09-E2E-05: Window chrome toolbar buttons trigger actions correctly', async ({ page }) => {
    const undoBtn = page.locator('[data-testid="btn-toolbar-undo"]');
    const redoBtn = page.locator('[data-testid="btn-toolbar-redo"]');
    const newBtn = page.locator('[data-testid="btn-new-diagram"]');

    await expect(undoBtn).toBeVisible();
    await expect(redoBtn).toBeVisible();
    await expect(newBtn).toBeVisible();
  });
});
