import { test } from '@playwright/test';

test('debug page state', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/debug-screenshot.png', fullPage: true });
    const rootChildren = await page.evaluate(() => document.getElementById('root')?.children.length ?? -1);
    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 300) ?? 'EMPTY');
    const consoleErrors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    console.log('ROOT children count:', rootChildren);
    console.log('ROOT HTML:', rootHtml);
});
