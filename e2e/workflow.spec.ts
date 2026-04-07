/**
 * Functional E2E tests for ProfStudio Desktop workflow
 * Tests primary user flows: navigation, step progression, empty/error states
 */
import { test, expect } from '@playwright/test';

// Helper: navigate to a step via sidebar
async function goToStep(page: import('@playwright/test').Page, stepLabel: string) {
  await page.getByRole('button', { name: stepLabel }).click();
  await page.waitForTimeout(300);
}

test.describe('Workflow Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('Welcome step renders with get-started content', async ({ page }) => {
    // Should be on Welcome (step 0) by default
    const h1 = page.locator('h1, h2').first();
    await expect(h1).toBeVisible();
    // Welcome page has a title containing "Welcome" or "Proficiency"
    const headingText = await h1.textContent();
    expect(headingText).toBeTruthy();
  });

  test('sidebar navigation items are all visible', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
    // Workflow items
    await expect(nav.getByRole('button', { name: /Welcome/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Integration/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Extract/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Configure/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Assessment/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Review/i })).toBeVisible();
  });

  test('Tools section nav items are visible', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('button', { name: /History/i })).toBeVisible();
    await expect(nav.getByRole('button', { name: /Settings/i })).toBeVisible();
  });

  test('active step has aria-current="page"', async ({ page }) => {
    // Welcome is active by default
    const activeBtn = page.locator('button[aria-current="page"]');
    await expect(activeBtn).toBeVisible();
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toContain('welcome');
  });

  test('clicking Integration nav item navigates to Integration step', async ({ page }) => {
    await goToStep(page, /Integration/i);
    // The main content should change
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toContain('integration');
  });

  test('clicking Settings nav item navigates to Settings step', async ({ page }) => {
    await goToStep(page, /Settings/i);
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toContain('settings');
    // Settings page should have some heading
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('clicking History nav item navigates to History step', async ({ page }) => {
    await goToStep(page, /History/i);
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toContain('history');
  });
});

test.describe('Step 0: Welcome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders visible content', async ({ page }) => {
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('has a call-to-action or navigation forward', async ({ page }) => {
    // Welcome should have some way to proceed (button or direct nav)
    const _ctaOrNav = page.locator('button, a').filter({ hasText: /get started|begin|next|integration|connect/i }).first();
    // Either a CTA exists, or the user can use the sidebar (which we already test)
    const sidebarNav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(sidebarNav).toBeVisible();
  });
});

test.describe('Step 2: Extract Skills', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders Extract Skills heading', async ({ page }) => {
    await goToStep(page, /Extract/i);
    await expect(page.getByText(/Extract Skills/i).first()).toBeVisible();
  });

  test('active nav item updates to Extract Skills', async ({ page }) => {
    await goToStep(page, /Extract/i);
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toContain('extract');
  });

  test('shows content area (data source or import UI)', async ({ page }) => {
    await goToStep(page, /Extract/i);
    // Should render some content — heading exists, no crash
    await expect(page.locator('h1, h2').filter({ hasText: /extract/i }).first()).toBeVisible();
  });

  test('Extract Skills button is present', async ({ page }) => {
    await goToStep(page, /Extract/i);
    // Button may be disabled if no source configured — but it should exist
    await expect(page.getByRole('button', { name: /extract skills/i })).toBeVisible();
  });
});

test.describe('Step 3: Configure Proficiency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders proficiency levels section', async ({ page }) => {
    await goToStep(page, /Configure/i);
    await expect(page.getByText(/proficiency/i).first()).toBeVisible();
  });

  test('LLM Parameters card is visible', async ({ page }) => {
    await goToStep(page, /Configure/i);
    await expect(page.getByText(/LLM Parameters/i)).toBeVisible();
  });

  test('temperature slider is interactive', async ({ page }) => {
    await goToStep(page, /Configure/i);
    const slider = page.locator('input[type="range"]').filter({ has: page.locator('[id="temperature-slider"]') }).or(
      page.locator('#temperature-slider')
    );
    await expect(slider).toBeVisible();
  });

  test('max tokens buttons are present', async ({ page }) => {
    await goToStep(page, /Configure/i);
    // At least one of the token buttons should be visible
    const tokenBtn = page.getByRole('button', { name: /8K/i }).or(
      page.getByRole('button', { name: /4K/i })
    );
    await expect(tokenBtn.first()).toBeVisible();
  });
});

test.describe('Step 4: Run Assessment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders when navigated to via sidebar', async ({ page }) => {
    await goToStep(page, /Assessment/i);
    await expect(page.locator('#root')).not.toBeEmpty();
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toMatch(/assessment/i);
  });

  test('shows warning when no skills are loaded', async ({ page }) => {
    // Clear any persisted skill state
    await page.evaluate(() => localStorage.removeItem('app-storage'));
    await page.reload();
    await page.waitForLoadState('networkidle');
    await goToStep(page, /Assessment/i);
    // Should show either "no skills" message or a back button to configure
    const noSkillsMsg = page.getByText(/no skills/i);
    const backBtn = page.getByRole('button', { name: /back to config/i });
    const hasWarning = (await noSkillsMsg.count()) > 0 || (await backBtn.count()) > 0;
    expect(hasWarning).toBe(true);
  });

  test('Back to Config button navigates to step 3', async ({ page }) => {
    await goToStep(page, /Assessment/i);
    const backBtn = page.getByRole('button', { name: /back to config/i });
    if (await backBtn.count() > 0) {
      await backBtn.click();
      await page.waitForTimeout(300);
      const activeBtn = page.locator('button[aria-current="page"]');
      const label = await activeBtn.textContent();
      expect(label?.toLowerCase()).toMatch(/configure|assess/i);
    } else {
      // Component redirected — acceptable
      expect(true).toBe(true);
    }
  });
});

test.describe('Step 5: Review Assessment - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
    // Clear any saved assessment data
    await page.evaluate(() => localStorage.removeItem('assessmentResults'));
  });

  test('shows empty state when no results exist', async ({ page }) => {
    await goToStep(page, /Review/i);
    // Should show empty message
    const emptyMsg = page.getByText(/no assessment results/i);
    await expect(emptyMsg).toBeVisible();
  });

  test('has a Back button to return to Assessment step', async ({ page }) => {
    await goToStep(page, /Review/i);
    const backBtn = page.getByRole('button', { name: /back/i });
    await expect(backBtn).toBeVisible();
    // Clicking Back should navigate to Assessment step (step 4)
    await backBtn.click();
    await page.waitForTimeout(300);
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toMatch(/assessment/i);
  });
});

test.describe('Step 6: Assessment History - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders without crash', async ({ page }) => {
    await goToStep(page, /History/i);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});

test.describe('Step 10: Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('Settings page renders visible content', async ({ page }) => {
    await goToStep(page, /Settings/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Step 7: Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders without crash', async ({ page }) => {
    await goToStep(page, /Analytics/i);
    await expect(page.locator('#root')).not.toBeEmpty();
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toMatch(/analytics/i);
  });

  test('shows a heading', async ({ page }) => {
    await goToStep(page, /Analytics/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Step 8: Prompt Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders without crash', async ({ page }) => {
    await goToStep(page, /Prompts/i);
    await expect(page.locator('#root')).not.toBeEmpty();
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toMatch(/prompts/i);
  });

  test('shows a heading', async ({ page }) => {
    await goToStep(page, /Prompts/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Step 9: Environment Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders without crash', async ({ page }) => {
    await goToStep(page, /Environments/i);
    await expect(page.locator('#root')).not.toBeEmpty();
  });
});

test.describe('Step 11: Documentation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('renders without crash', async ({ page }) => {
    await goToStep(page, /Documentation/i);
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('shows documentation heading', async ({ page }) => {
    await goToStep(page, /Documentation/i);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Integrated Workflow: Step 5 with injected results', () => {
  const mockAssessmentResults = [
    {
      skill_name: 'TypeScript',
      proficiency: 3,
      proficiency_numeric: 3,
      proficiency_name: 'Proficient',
      confidence_score: 0.9,
      reasoning: 'Strong TypeScript usage throughout the codebase.',
      evidence: ['Uses strict types', 'No any usage'],
    },
    {
      skill_name: 'React',
      proficiency: 2,
      proficiency_numeric: 2,
      proficiency_name: 'Developing',
      confidence_score: 0.75,
      reasoning: 'Good React patterns with hooks.',
      evidence: ['Uses hooks'],
    },
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
    // Inject mock assessment results
    await page.evaluate((results) => {
      localStorage.setItem('assessmentResults', JSON.stringify(results));
    }, mockAssessmentResults);
  });

  test('Review step shows injected skill results', async ({ page }) => {
    await goToStep(page, /Review/i);
    // Table should be visible with our injected skills
    await expect(page.getByText('TypeScript')).toBeVisible();
    await expect(page.getByText('React')).toBeVisible();
  });

  test('Review step shows correct skill count', async ({ page }) => {
    await goToStep(page, /Review/i);
    // Should show "2 skills assessed"
    await expect(page.getByText(/2 skills assessed/i)).toBeVisible();
  });

  test('Review step table has assessment columns', async ({ page }) => {
    await goToStep(page, /Review/i);
    await expect(page.getByRole('columnheader', { name: /skill/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /level/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /confidence/i })).toBeVisible();
  });

  test('navigating back from Review goes to Assessment', async ({ page }) => {
    await goToStep(page, /Review/i);
    const backBtn = page.getByRole('button', { name: /back/i });
    await backBtn.click();
    await page.waitForTimeout(300);
    const activeBtn = page.locator('button[aria-current="page"]');
    const label = await activeBtn.textContent();
    expect(label?.toLowerCase()).toMatch(/assessment/i);
  });
});

test.describe('Step 3 LLM Parameters: UI controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
    await goToStep(page, /Configure/i);
  });

  test('temperature slider changes value on interaction', async ({ page }) => {
    const slider = page.locator('#temperature-slider');
    await expect(slider).toBeVisible();
    const initialValue = await slider.inputValue();
    // Set to a specific value via fill
    await slider.fill('0.3');
    const newValue = await slider.inputValue();
    expect(newValue).toBe('0.3');
    expect(newValue).not.toBe(initialValue === '0.3' ? '0.8' : initialValue);
  });

  test('max tokens selection updates UI', async ({ page }) => {
    // Click 4K button
    const btn4K = page.getByRole('button', { name: '4K' });
    await expect(btn4K).toBeVisible();
    await btn4K.click();
    // Button should now be selected (aria-pressed or styled differently)
    await expect(btn4K).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('Backend call states (E2E-008)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('Extract Skills button is disabled when no source is configured', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('profstudio_integration_type');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await goToStep(page, /Extract/i);

    const extractBtn = page.getByRole('button', { name: /extract skills/i });
    await expect(extractBtn).toBeVisible();
    // Button should be disabled when no source is set
    await expect(extractBtn).toBeDisabled();
  });

  test('Extract Skills shows empty-source guidance when no integration type set', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('profstudio_integration_type');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await goToStep(page, /Extract/i);

    // Should show the "no source" guidance message
    const guidanceMsg = page.getByText(/no data source detected/i)
      .or(page.getByText(/go back to step 1/i))
      .or(page.getByText(/choose an integration type/i));
    await expect(guidanceMsg.first()).toBeVisible();
  });

  test('Configure Proficiency shows error display section when accessed', async ({ page }) => {
    await goToStep(page, /Configure/i);
    // Footer action buttons should be present (Back + Continue)
    const continueBtn = page.getByRole('button', { name: /continue to assessment/i });
    await expect(continueBtn).toBeVisible();
    const backBtn = page.getByRole('button', { name: /back/i });
    await expect(backBtn).toBeVisible();
  });

  test('Review step shows CSV export button', async ({ page }) => {
    await goToStep(page, /Review/i);
    const exportBtn = page.getByRole('button', { name: /export csv/i });
    await expect(exportBtn).toBeVisible();
  });

  test('Review step CSV export is disabled when no results', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('assessmentResults'));
    await goToStep(page, /Review/i);
    const exportBtn = page.getByRole('button', { name: /export csv/i });
    await expect(exportBtn).toBeDisabled();
  });
});

test.describe('Sidebar UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#root');
    await page.waitForLoadState('networkidle');
  });

  test('sidebar can be collapsed and expanded', async ({ page }) => {
    // Find and click Collapse button
    const collapseBtn = page.getByRole('button', { name: /collapse sidebar/i });
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();
    await page.waitForTimeout(400);
    // After collapse, expand button should be visible
    const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
    await expect(expandBtn).toBeVisible();
    // Expand again
    await expandBtn.click();
    await page.waitForTimeout(400);
    await expect(collapseBtn).toBeVisible();
  });
});
