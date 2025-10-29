import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'iangel.oned@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('Autenticación', () => {
  test('Login exitoso como owner', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Detectar si ya está logueado
    const homeTitle = await page.locator('text=Inicio').first().isVisible().catch(() => false);
    if (homeTitle) {
      await page.locator('text=Salir').click();
      await page.waitForTimeout(500);
    }

    // Login
    await page.fill('input[type="email"]', OWNER_EMAIL);
    await page.fill('input[type="password"]', OWNER_PASSWORD);
    await page.click('button:has-text("Ingresar")');

    // Esperar a que cargue la página principal
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');

    // Verificar que estamos en home
    const sidebarVisible = await page.locator('text=Inicio').isVisible();
    expect(sidebarVisible).toBeTruthy();

    const userLoggedIn = await page.locator('text=iangel').isVisible().catch(() => false);
    expect(userLoggedIn || sidebarVisible).toBeTruthy();
  });

  test('Logout funciona', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Login primero
    const loginEmail = await page.locator('input[type="email"]').isVisible().catch(() => false);
    if (loginEmail) {
      await page.fill('input[type="email"]', OWNER_EMAIL);
      await page.fill('input[type="password"]', OWNER_PASSWORD);
      await page.click('button:has-text("Ingresar")');
      await page.waitForURL('/');
      await page.waitForLoadState('networkidle');
    }

    // Logout
    await page.click('text=Salir');
    await page.waitForTimeout(500);

    // Verificar que volvió a login
    const loginForm = await page.locator('input[type="email"]').isVisible();
    expect(loginForm).toBeTruthy();
  });

  test('Persistencia de sesión', async ({ page }) => {
    // Primer acceso
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const needsLogin = await page.locator('input[type="email"]').isVisible().catch(() => false);
    if (needsLogin) {
      await page.fill('input[type="email"]', OWNER_EMAIL);
      await page.fill('input[type="password"]', OWNER_PASSWORD);
      await page.click('button:has-text("Ingresar")');
      await page.waitForURL('/');
    }

    // Recargar página
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Debe seguir logueado
    const stillLoggedIn = await page.locator('text=Inicio').isVisible();
    expect(stillLoggedIn).toBeTruthy();
  });
});
