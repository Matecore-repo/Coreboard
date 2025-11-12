import { expect, Page } from '@playwright/test';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
export const DEFAULT_EMAIL = process.env.E2E_EMAIL ?? 'iangel.oned@gmail.com';
export const DEFAULT_PASSWORD = process.env.E2E_PASSWORD ?? '123456';

export type Credentials = {
  email: string;
  password: string;
};

export const DEFAULT_CREDENTIALS: Credentials = {
  email: DEFAULT_EMAIL,
  password: DEFAULT_PASSWORD,
};

export async function loginAs(page: Page, credentials: Credentials = DEFAULT_CREDENTIALS) {
  if (!credentials.email || !credentials.password) {
    throw new Error('E2E credentials are not configured. Set E2E_EMAIL and E2E_PASSWORD.');
  }

  await page.getByLabel(/Email/i).fill(credentials.email);
  await page.getByLabel(/Contraseña/i).fill(credentials.password);

  const loginButton = page.getByRole('button', { name: /Acceder|Iniciar sesión/i }).first();
  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 30_000 }),
    loginButton.click(),
  ]);
}

export async function navigateToView(page: Page, view: string) {
  await page.goto(`${BASE_URL}/dashboard?view=${view}`, { waitUntil: 'networkidle' });
}

export function uniqueName(prefix: string) {
  const suffix = Math.random().toString(16).slice(2, 8);
  return `${prefix} ${SuffixTimestamp()}-${suffix}`;
}

export function uniqueEmail(prefix: string) {
  const stamp = SuffixTimestamp();
  return `${prefix}.${stamp}@example.com`.toLowerCase();
}

export function uniquePhone() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `+54 11 6000-${random}`;
}

export function futureDate(days = 1) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export async function selectFirstAvailableOption(page: Page) {
  const option = page.locator('[role="option"]:not([aria-disabled="true"]):not([data-disabled])').first();
  await expect(option).toBeVisible({ timeout: 5_000 });
  const label = (await option.textContent())?.trim() ?? '';
  await option.click();
  return label;
}

export async function ensureTextVisible(page: Page, text: string) {
  await expect(page.getByText(text, { exact: false })).toBeVisible({ timeout: 15_000 });
}

export async function ensureLocaleCard(page: Page, partialName: string) {
  await expect(page.getByRole('article', { name: new RegExp(partialName, 'i') })).toBeVisible({ timeout: 15_000 });
}

export async function waitForToast(page: Page, contains: string) {
  await expect(page.getByText(contains, { exact: false })).toBeVisible({ timeout: 15_000 });
}

export async function acceptNextDialog(page: Page) {
  page.once('dialog', (dialog) => dialog.accept());
}

function SuffixTimestamp() {
  return new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

