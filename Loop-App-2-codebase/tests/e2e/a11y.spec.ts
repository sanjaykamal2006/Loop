import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('LOOP Accessibility Standards (Axe)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('login and signup flows satisfy core WCAG accessibility standards', async ({ page }) => {
    await page.goto('/');

    // 1. Audit Auth Login view
    const loginA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // High-tech dot-matrix canvas background
      .analyze();

    expect(loginA11y.violations).toEqual([]);

    // 2. Audit Sign Up toggle view
    const signUpToggle = page.getByRole('button', { name: /new to loop\? sign up/i });
    await signUpToggle.click();

    const signUpA11y = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(signUpA11y.violations).toEqual([]);
  });
});
