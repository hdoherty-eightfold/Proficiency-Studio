import { test, expect, type Page } from '@playwright/test';

/** Click a sidebar nav button by its label text and wait for the new page to render. */
async function navigateTo(page: Page, label: string | RegExp, expectedHeading: string | RegExp) {
  const btn = page.getByRole('button', { name: label }).first();
  await btn.click();
  await expect(page.getByRole('heading', { name: expectedHeading }).first()).toBeVisible({ timeout: 5000 });
}

test.describe('UI Redesign - Eightfold.ai Branding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for React to mount
    await page.waitForSelector('#root');
  });

  test('app renders without errors', async ({ page }) => {
    // No crash, root element has content
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
  });

  test('Plus Jakarta Sans font is loaded', async ({ page }) => {
    // Check that body uses Plus Jakarta Sans
    const fontFamily = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });
    expect(fontFamily).toContain('Plus Jakarta Sans');
  });

  test('light mode - correct background and foreground colors', async ({ page }) => {
    // Ensure we're in light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Background should be near-white with teal tint (168 20% 98%)
    // In RGB this is approximately rgb(247, 252, 251)
    expect(bgColor).not.toBe('rgb(255, 255, 255)'); // NOT pure white
    expect(bgColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/);

    const textColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).color;
    });
    // Foreground should be navy (241 49% 18%)
    // Not pure black
    expect(textColor).not.toBe('rgb(0, 0, 0)');
  });

  test('dark mode - navy-based background', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // Dark mode background should be very dark navy (241 55% 8%)
    // Not pure black
    expect(bgColor).not.toBe('rgb(0, 0, 0)');
    expect(bgColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });

  test('sidebar has navy background', async ({ page }) => {
    const _sidebar = page.locator('nav[aria-label="Main navigation"]').locator('..');
    // The sidebar parent div should have navy background
    const sidebarContainer = page.locator('.bg-sidebar').first();
    await expect(sidebarContainer).toBeVisible();

    const bgColor = await sidebarContainer.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // Navy background - should be dark (241 49% 18% ≈ rgb(23, 22, 68))
    const match = bgColor.match(/rgb\((\d+), (\d+), (\d+)\)/);
    expect(match).toBeTruthy();
    if (match) {
      const [, r, g, b] = match.map(Number);
      // Navy is dark - all channels should be low
      expect(r).toBeLessThan(100);
      expect(g).toBeLessThan(100);
      expect(b).toBeLessThan(150); // Blue channel slightly higher for navy
    }
  });

  test('sidebar navigation items are visible', async ({ page }) => {
    // Check workflow items exist
    await expect(page.getByText('Welcome')).toBeVisible();
    await expect(page.getByText('Integration')).toBeVisible();
    await expect(page.getByText('Extract Skills')).toBeVisible();
    await expect(page.getByText('Configure')).toBeVisible();
    await expect(page.getByText('Assessment')).toBeVisible();
    await expect(page.getByText('Review')).toBeVisible();

    // Check tools items exist
    await expect(page.getByText('History')).toBeVisible();
    await expect(page.getByText('Analytics')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('sidebar nav buttons have correct hover styling', async ({ page }) => {
    const welcomeBtn = page.getByRole('button', { name: /Welcome/ }).first();
    await expect(welcomeBtn).toBeVisible();

    // Check the button has the sidebar-foreground text styling
    const classes = await welcomeBtn.getAttribute('class');
    expect(classes).toContain('text-sidebar-foreground');
  });

  test('theme toggle button works', async ({ page }) => {
    // Find the theme toggle button
    const themeBtn = page.getByRole('button', { name: /dark mode|light mode|switch to/i }).first();
    await expect(themeBtn).toBeVisible();

    // Toggle cycles: system → light → dark → light → dark ...
    // First click: system → light (may not change dark class if system was light)
    // Second click: light → dark (always adds dark class)
    await themeBtn.click();
    await page.waitForTimeout(200);
    await themeBtn.click();
    await page.waitForTimeout(200);

    // After two clicks from 'system', we should be on 'dark'
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(true);

    // One more click should go back to light
    await themeBtn.click();
    await page.waitForTimeout(200);
    const isLight = await page.evaluate(() => !document.documentElement.classList.contains('dark'));
    expect(isLight).toBe(true);
  });

  test('CSS custom properties are defined - light mode', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    const cssVars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        background: style.getPropertyValue('--background').trim(),
        foreground: style.getPropertyValue('--foreground').trim(),
        primary: style.getPropertyValue('--primary').trim(),
        sidebar: style.getPropertyValue('--sidebar').trim(),
        sidebarForeground: style.getPropertyValue('--sidebar-foreground').trim(),
        radius: style.getPropertyValue('--radius').trim(),
      };
    });

    // Verify Eightfold colors are applied
    expect(cssVars.background).toBe('168 20% 98%');
    expect(cssVars.foreground).toBe('241 49% 18%');
    expect(cssVars.primary).toBe('168 64% 42%');
    expect(cssVars.sidebar).toBe('241 49% 18%');
    expect(cssVars.sidebarForeground).toBe('168 30% 92%');
    // Browser may normalize '0.625rem' to '.625rem'
    expect(cssVars.radius).toMatch(/^0?\.625rem$/);
  });

  test('CSS custom properties are defined - dark mode', async ({ page }) => {
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    const cssVars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        background: style.getPropertyValue('--background').trim(),
        foreground: style.getPropertyValue('--foreground').trim(),
        primary: style.getPropertyValue('--primary').trim(),
        sidebar: style.getPropertyValue('--sidebar').trim(),
      };
    });

    expect(cssVars.background).toBe('241 55% 8%');
    expect(cssVars.foreground).toBe('168 15% 92%');
    expect(cssVars.primary).toBe('168 55% 55%');
    expect(cssVars.sidebar).toBe('241 55% 6%');
  });

  test('no pure black or pure white backgrounds (impeccable guideline)', async ({ page }) => {
    // Light mode check
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
    });

    const lightBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(lightBg).not.toBe('rgb(255, 255, 255)');

    // Dark mode check
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    await page.waitForTimeout(100);

    const darkBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(darkBg).not.toBe('rgb(0, 0, 0)');
  });

  test('border radius is updated to Eightfold style', async ({ page }) => {
    const radius = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--radius').trim();
    });
    // Browser may normalize '0.625rem' to '.625rem'
    expect(radius).toMatch(/^0?\.625rem$/);
  });

  test('sidebar collapse toggle works', async ({ page }) => {
    // Find collapse button
    const collapseBtn = page.getByRole('button', { name: /collapse sidebar/i });
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await page.waitForTimeout(400); // Wait for collapse animation

      // After collapse, the expand button should be visible
      const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
      await expect(expandBtn).toBeVisible();
    }
  });

  test('workflow progress bar is visible', async ({ page }) => {
    const progressText = page.getByText('Workflow Progress');
    await expect(progressText).toBeVisible();
  });

  // ─── Step Navigation ──────────────────────────────────────────────────────────
  // These tests verify that clicking sidebar items renders the correct step content.
  // They run against vite preview (browser only — no Electron IPC).
  // Steps that load data from IPC will show loading/error/empty states; headings still render.

  test.describe('step navigation', () => {
    test('Welcome step renders heading and subtitle', async ({ page }) => {
      await expect(page.getByText('Proficiency Studio')).toBeVisible();
      await expect(page.getByText(/AI-powered proficiency/i)).toBeVisible();
    });

    test('navigating to Integration step shows Choose Integration Path', async ({ page }) => {
      await navigateTo(page, /Integration/i, /Choose Integration Path/i);
    });

    test('navigating to Extract Skills step shows Extract Skills heading', async ({ page }) => {
      await navigateTo(page, /Extract Skills/i, /Extract Skills/i);
    });

    test('navigating to Configure step shows Configure Proficiency heading', async ({ page }) => {
      await navigateTo(page, /Configure/i, /Configure Proficiency/i);
    });

    test('navigating to Assessment step shows Run Proficiency Assessment heading', async ({ page }) => {
      await navigateTo(page, /Assessment/i, /Run Proficiency Assessment|Assessment Complete|Assessment Failed/i);
    });

    test('navigating to Review step shows Assessment Review or loading state', async ({ page }) => {
      const reviewBtn = page.getByRole('button', { name: /Review/i }).first();
      await reviewBtn.click();
      // Review loads async — wait for heading OR loading text
      await expect(
        page.getByText(/Assessment Review|Loading latest assessment|No assessments yet/i).first()
      ).toBeVisible({ timeout: 5000 });
    });

    test('navigating to History step shows Assessment History heading', async ({ page }) => {
      await navigateTo(page, /History/i, /Assessment History/i);
    });

    test('navigating to Analytics step shows Analytics Dashboard heading', async ({ page }) => {
      await navigateTo(page, /Analytics/i, /Analytics Dashboard/i);
    });

    test('navigating to Settings step shows Settings heading', async ({ page }) => {
      await navigateTo(page, /Settings/i, /Settings/i);
    });

    test('navigating back to Welcome renders correctly', async ({ page }) => {
      // Go to settings then back to welcome
      const settingsBtn = page.getByRole('button', { name: /Settings/i }).first();
      await settingsBtn.click();
      await expect(page.getByRole('heading', { name: /Settings/i }).first()).toBeVisible({ timeout: 5000 });

      const welcomeBtn = page.getByRole('button', { name: /Welcome/i }).first();
      await welcomeBtn.click();
      await expect(page.getByText('Proficiency Studio')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('visual screenshots', () => {
    test('light mode full page', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'e2e/screenshots/light-mode.png', fullPage: true });
    });

    test('dark mode full page', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'e2e/screenshots/dark-mode.png', fullPage: true });
    });

    test('sidebar collapsed - light', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });
      const collapseBtn = page.getByRole('button', { name: /collapse sidebar/i });
      if (await collapseBtn.isVisible()) {
        await collapseBtn.click();
        await page.waitForTimeout(400);
      }
      await page.screenshot({ path: 'e2e/screenshots/sidebar-collapsed-light.png', fullPage: true });
    });

    test('sidebar collapsed - dark', async ({ page }) => {
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });
      const collapseBtn = page.getByRole('button', { name: /collapse sidebar/i });
      if (await collapseBtn.isVisible()) {
        await collapseBtn.click();
        await page.waitForTimeout(400);
      }
      await page.screenshot({ path: 'e2e/screenshots/sidebar-collapsed-dark.png', fullPage: true });
    });
  });
});
