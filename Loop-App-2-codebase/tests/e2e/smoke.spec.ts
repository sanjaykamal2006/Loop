import { test, expect } from '@playwright/test';

test.describe('LOOP Mobile E2E Smoke Tests', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('loads home page and renders brand typography and auth inputs', async ({ page }) => {
    await page.goto('/');

    // Check title or main heading
    await expect(page.locator('h1')).toContainText('LOOP');

    // Verify email and password input elements exist
    const emailInput = page.getByPlaceholder('name.rollno@vitapstudent.ac.in');
    const passwordInput = page.getByPlaceholder('••••••••');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Verify login action button
    const loginButton = page.getByRole('button', { name: /^login$/i });
    await expect(loginButton).toBeVisible();
  });

  test('toggles seamlessly between Login and Sign Up modes', async ({ page }) => {
    await page.goto('/');

    // Switch to Sign Up
    const signUpToggle = page.getByRole('button', { name: /new to loop\? sign up/i });
    await signUpToggle.click();

    // Verify institutional domain hint and create account button
    await expect(page.getByText(/Students: @vitapstudent\.ac\.in/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    // Switch back to Login
    const loginToggle = page.getByRole('button', { name: /have an account\? login/i });
    await loginToggle.click();

    await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
  });

  test('maintains strict single-screen viewport without horizontal scroll', async ({ page }) => {
    await page.goto('/');

    // Verify document width does not exceed mobile viewport
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowInnerWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth);
  });
});
