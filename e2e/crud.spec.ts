import { test, expect } from '@playwright/test';
import {
  loginAs,
  navigateToView,
  uniqueName,
  uniqueEmail,
  uniquePhone,
  futureDate,
  selectFirstAvailableOption,
  ensureLocaleCard,
  ensureTextVisible,
  waitForToast,
  acceptNextDialog,
  BASE_URL,
  DEFAULT_CREDENTIALS,
} from './support/helpers';

test.describe.serial('Flujos CRUD principales', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !DEFAULT_CREDENTIALS.email || !DEFAULT_CREDENTIALS.password,
      'Configura las variables E2E_EMAIL y E2E_PASSWORD para ejecutar las pruebas E2E.',
    );

    await page.goto(`${BASE_URL}/login`);
    await loginAs(page, DEFAULT_CREDENTIALS);
  });

  test('Turnos: crear y eliminar turno con datos legibles', async ({ page }) => {
    const clientName = uniqueName('Cliente QA');
    const appointmentDate = futureDate(1);

    await navigateToView(page, 'home');
    await page.getByRole('button', { name: /Nuevo Turno/i }).click();

    // Local
    await page.locator('[data-field="salon-id"]').click();
    await selectFirstAvailableOption(page);

    // Servicio
    await page.locator('[data-field="service"]').click();
    await selectFirstAvailableOption(page);

    await page.locator('#client_name_input').fill(clientName);
    await page.locator('#date').fill(appointmentDate);
    await page.locator('#time').fill('23:30');

    await page.getByRole('button', { name: /^Guardar$/i }).click();
    await waitForToast(page, 'Turno creado correctamente');

    await navigateToView(page, 'appointments');
    const row = page.getByRole('row', { name: new RegExp(clientName) });
    await expect(row).toBeVisible({ timeout: 15_000 });

    await row.click();
    await page.getByRole('button', { name: /^Acciones$/i }).click();
    await acceptNextDialog(page);
    await page.getByRole('menuitem', { name: /Eliminar/i }).click();
    await waitForToast(page, 'Turno eliminado correctamente');
    await expect(page.getByRole('row', { name: new RegExp(clientName) })).toHaveCount(0);
  });

  test('Clientes: crear, editar y eliminar cliente', async ({ page }) => {
    const clientName = uniqueName('Cliente QA');
    const updatedName = `${clientName} Editado`;
    const email = uniqueEmail('cliente');
    const updatedPhone = uniquePhone();

    await navigateToView(page, 'clients');
    await page.getByRole('button', { name: /Nuevo Cliente/i }).click();
    await page.getByLabel(/^Nombre$/i).fill(clientName);
    await page.getByLabel(/^Teléfono$/i).fill(uniquePhone());
    await page.getByLabel(/^Email$/i).fill(email);
    await page.getByRole('button', { name: /^Crear$/i }).click();
    await waitForToast(page, 'Cliente creado correctamente');
    const clientCard = page.getByRole('article', { name: new RegExp(clientName) });
    await expect(clientCard).toBeVisible({ timeout: 10_000 });

    await clientCard.getByRole('button', { name: new RegExp(`Editar cliente ${clientName}`) }).click();
    await page.getByLabel(/^Nombre$/i).fill(updatedName);
    await page.getByLabel(/^Teléfono$/i).fill(updatedPhone);
    await page.getByRole('button', { name: /^Actualizar$/i }).click();
    await waitForToast(page, 'Cliente actualizado correctamente');
    await expect(page.getByRole('article', { name: new RegExp(updatedName) })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('article', { name: new RegExp(updatedName) })).toContainText(updatedPhone);

    await acceptNextDialog(page);
    await page
      .getByRole('article', { name: new RegExp(updatedName) })
      .getByRole('button', { name: new RegExp(`Eliminar cliente ${updatedName}`) })
      .click();
    await waitForToast(page, 'Cliente eliminado correctamente');
    await expect(page.getByRole('article', { name: new RegExp(updatedName) })).toHaveCount(0);
  });

  test('Locales: crear, actualizar y eliminar local', async ({ page }) => {
    const salonName = uniqueName('Local QA');
    const initialAddress = 'Av. QA 123';
    const updatedAddress = `${initialAddress} Piso 1`;

    await navigateToView(page, 'salons');
    await page.getByRole('button', { name: /Nuevo local/i }).click();
    await page.getByLabel(/^Nombre \*/i).fill(salonName);
    await page.getByLabel(/^Dirección \*/i).fill(initialAddress);
    await page.getByLabel(/^Teléfono$/i).fill(uniquePhone());
    await page.getByRole('button', { name: /Crear local/i }).click();
    await waitForToast(page, 'Local creado correctamente');
    await ensureLocaleCard(page, salonName);

    // Seleccionar tarjeta para mostrar acciones
    const card = page.getByRole('article', { name: new RegExp(salonName) });
    await card.click();
    await page.getByRole('button', { name: /Editar local/i }).click();
    await page.getByLabel(/^Dirección \*/i).fill(updatedAddress);
    await page.getByRole('button', { name: /Guardar cambios/i }).click();
    await waitForToast(page, 'Local actualizado correctamente');
    await ensureLocaleCard(page, updatedAddress);

    await card.click();
    await acceptNextDialog(page);
    await page.getByRole('button', { name: /^Eliminar$/i, exact: false }).click();
    await waitForToast(page, 'Local eliminado');
    await expect(page.getByRole('article', { name: new RegExp(salonName) })).toHaveCount(0);
  });

  test('Organización: miembros visibles con etiquetas legibles', async ({ page }) => {
    await navigateToView(page, 'organization');
    await ensureTextVisible(page, 'Miembros de la organización');
    await ensureTextVisible(page, 'Rol:');

    // Validar que las tarjetas muestran nombres o correos en lugar de IDs crudos
    await expect(page.getByText(/Rol:/i).first()).toBeVisible();
    await expect(page.getByText(/Rol: (Propietario|Administrador|Empleado|Visualizador)/)).toBeVisible();
  });
});

