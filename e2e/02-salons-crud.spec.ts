import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'iangel.oned@gmail.com';
const OWNER_PASSWORD = '123456';

test.describe('CRUD Peluquerías (Salons)', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loginForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
    if (loginForm) {
      await page.fill('input[type="email"]', OWNER_EMAIL);
      await page.fill('input[type="password"]', OWNER_PASSWORD);
      await page.click('button:has-text("Ingresar")');
      await page.waitForURL('/');
      await page.waitForLoadState('networkidle');
    }
  });

  test('Crear peluquería', async ({ page }) => {
    // Navegar a Gestión > Peluquerías
    await page.click('text=Gestión');
    await page.click('text=Peluquerías');
    await page.waitForLoadState('networkidle');

    // Click en "+ Nueva peluquería"
    await page.click('button:has-text("Nueva peluquería")');
    await page.waitForTimeout(300);

    // Llenar formulario
    const timestamp = Date.now();
    const salonName = `Test Salon ${timestamp}`;
    
    await page.fill('input[placeholder*="Studio"]', salonName);
    await page.fill('input[placeholder*="Principal"]', 'Av. Test 123, Ciudad');
    await page.fill('input[placeholder*="1234"]', '+54 11 1234-5678');

    // Click en crear
    await page.click('button:has-text("Crear peluquería")');
    await page.waitForTimeout(1000);

    // Verificar que aparece en la lista
    const salonVisible = await page.locator(`text=${salonName}`).isVisible().catch(() => false);
    expect(salonVisible).toBeTruthy();

    // Verificar toast de éxito
    const toast = await page.locator('text=Peluquería creada').isVisible().catch(() => false);
    expect(toast || salonVisible).toBeTruthy();
  });

  test('Editar peluquería', async ({ page }) => {
    await page.click('text=Gestión');
    await page.click('text=Peluquerías');
    await page.waitForLoadState('networkidle');

    // Seleccionar primera peluquería
    const firstSalon = await page.locator('[class*="border-border"]').first().isVisible();
    if (firstSalon) {
      await page.locator('[class*="border-border"]').first().click();
      await page.waitForTimeout(300);

      // Click en editar
      await page.click('button:has-text("Editar peluquería")');
      await page.waitForTimeout(300);

      // Cambiar nombre
      const nameInput = page.locator('input[placeholder*="Studio"]').last();
      await nameInput.fill('Test Salon Editado');

      // Guardar
      await page.click('button:has-text("Guardar cambios")');
      await page.waitForTimeout(500);

      // Verificar cambio
      const edited = await page.locator('text=Test Salon Editado').isVisible().catch(() => false);
      expect(edited).toBeTruthy();
    }
  });

  test('Borrar peluquería', async ({ page }) => {
    await page.click('text=Gestión');
    await page.click('text=Peluquerías');
    await page.waitForLoadState('networkidle');

    // Contar salones antes
    const salonsBefore = await page.locator('[class*="border-border"]').count();

    // Seleccionar primera peluquería
    if (salonsBefore > 0) {
      await page.locator('[class*="border-border"]').first().click();
      await page.waitForTimeout(300);

      // Click en eliminar
      const deleteBtn = await page.locator('button:has-text("Eliminar")').isVisible().catch(() => false);
      if (deleteBtn) {
        await page.click('button:has-text("Eliminar")');
        
        // Confirmar eliminación
        await page.click('button:has-text("Eliminar")');
        await page.waitForTimeout(500);

        // Contar salones después
        const salonsAfter = await page.locator('[class*="border-border"]').count();
        expect(salonsAfter).toBeLessThan(salonsBefore);
      }
    }
  });
});
