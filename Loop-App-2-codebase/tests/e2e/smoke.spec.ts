import { test, expect } from '@playwright/test';

const mockUser = {
  id: 'e2e-test-user-123',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test.student@vitapstudent.ac.in',
  email_confirmed_at: new Date().toISOString(),
  user_metadata: {
    display_name: 'E2E Student',
    reg_no: '24MIC9999',
  },
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser,
};

test.describe('LOOP Mobile E2E Smoke Tests', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('loads home page and renders brand typography and auth inputs', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('LOOP');

    const emailInput = page.getByPlaceholder('name.rollno@vitapstudent.ac.in');
    const passwordInput = page.getByPlaceholder('••••••••');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    const loginButton = page.getByRole('button', { name: /^login$/i });
    await expect(loginButton).toBeVisible();
  });

  test('toggles seamlessly between Login and Sign Up modes', async ({ page }) => {
    await page.goto('/');

    const signUpToggle = page.getByRole('button', { name: /new to loop\? sign up/i });
    await signUpToggle.click();

    await expect(page.getByText(/Students: @vitapstudent\.ac\.in/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    const loginToggle = page.getByRole('button', { name: /have an account\? login/i });
    await loginToggle.click();

    await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible();
  });

  test('maintains strict single-screen viewport without horizontal scroll', async ({ page }) => {
    await page.goto('/');

    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowInnerWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowInnerWidth);
  });

  test('executes sign-in flow and navigates through core views (Home -> Create -> Chat -> Profile)', async ({ page }) => {
    // Intercept Supabase Auth & REST calls
    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: mockSession,
      });
    });

    await page.route('**/auth/v1/user*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', json: mockUser });
    });

    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        json: {
          id: mockUser.id,
          display_name: 'E2E Student',
          reg_no: '24MIC9999',
          gender: 'male',
          theme: 'dark',
        },
      });
    });

    await page.route('**/rest/v1/loops*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', json: [] });
    });

    await page.route('**/rest/v1/loop_members*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', json: [] });
    });

    await page.goto('/');

    // 1. Enter email and password
    const emailInput = page.getByPlaceholder('name.rollno@vitapstudent.ac.in');
    const passwordInput = page.getByPlaceholder('••••••••');
    await emailInput.fill('sanjay.24mic7130@vitapstudent.ac.in');
    await passwordInput.fill('TestPassword123!');

    // 2. Click Login
    const loginBtn = page.getByRole('button', { name: /^login$/i });
    await loginBtn.click();

    // 3. Verify transition to MainApp with bottom navigation
    const homeTab = page.getByRole('button', { name: /home tab/i });
    const createTab = page.getByRole('button', { name: /create tab/i });
    const chatTab = page.getByRole('button', { name: /chat tab/i });
    const profileTab = page.getByRole('button', { name: /profile tab/i });

    await expect(homeTab).toBeVisible({ timeout: 10000 });
    await expect(createTab).toBeVisible();
    await expect(chatTab).toBeVisible();
    await expect(profileTab).toBeVisible();

    // 4. Switch to Create View (handles first-time profile completion prompt)
    await createTab.click();
    const completeProfileHeading = page.getByRole('heading', { name: /complete profile/i });
    if (await completeProfileHeading.isVisible()) {
      await page.getByPlaceholder(/your name/i).fill('E2E Student');
      await page.getByPlaceholder(/e\.g\. Google, VIT-AP/i).fill('VIT-AP');
      await page.getByRole('button', { name: /^male$/i }).click();
      await page.getByRole('button', { name: /save & continue/i }).click();
    }
    await expect(page.getByPlaceholder('Where from?')).toBeVisible();
    await expect(page.getByPlaceholder('Where to?')).toBeVisible();

    // 5. Switch to Chat View
    await chatTab.click();
    await expect(page.getByRole('heading', { name: /^chats$/i })).toBeVisible();
    await expect(page.getByText('No Active Chats')).toBeVisible();

    // 6. Switch to Profile View
    await profileTab.click();
    await expect(page.getByText('E2E Student')).toBeVisible();

    // 7. Return to Home View
    await homeTab.click();
    await expect(page.getByRole('button', { name: /\+ Create Loop/i })).toBeVisible();
  });
});
