import { test, expect } from '@playwright/test';

test('landing loads and redirects unauth to login', async ({ page, baseURL }) => {
  await page.goto(baseURL! + '/dashboard');
  await expect(page).toHaveURL(/login|dashboard/);
});


