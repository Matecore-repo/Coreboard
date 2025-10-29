const { chromium } = require('playwright');

const TEST_EMAIL = 'iangel.oned@gmail.com';
const TEST_PASSWORD = '123456';

async function runQuickTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('🚀 Iniciando prueba manual rápida...\n');

    // 1. Login
    console.log('1️⃣ Navegando al login...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const loginForm = await page.locator('input[type="email"]').isVisible().catch(() => false);
    if (loginForm) {
      console.log('✅ Formulario de login encontrado');
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      await page.click('button:has-text("Ingresar")');
      await page.waitForURL('/');
      await page.waitForLoadState('networkidle');
    }

    // 2. Verificar que estamos logueados
    console.log('2️⃣ Verificando login...');
    const homeVisible = await page.locator('text=Inicio').isVisible().catch(() => false);
    if (homeVisible) {
      console.log('✅ Login exitoso - vista home visible');
    }

    // 3. Test de navegación entre secciones (con timeout)
    console.log('3️⃣ Probando navegación entre secciones...');
    
    const sections = ['Clientes', 'Gestión'];
    for (const section of sections) {
      console.log(`   - Navegando a "${section}"...`);
      const startTime = Date.now();
      
      try {
        await page.click(`text=${section}`);
        await Promise.race([
          page.waitForLoadState('networkidle'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        
        const elapsed = Date.now() - startTime;
        console.log(`     ✅ "${section}" cargó en ${elapsed}ms (sin loops)`);
      } catch (err) {
        console.log(`     ⚠️ Timeout o error en "${section}": ${err.message}`);
      }
    }

    // 4. Verificar consola
    console.log('4️⃣ Verificando errores en consola...');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`   ⚠️ Error en consola: ${msg.text()}`);
      }
    });

    console.log('\n✨ Prueba manual completada. Presiona Enter en la consola para cerrar el navegador.');
    await new Promise(resolve => process.stdin.once('data', resolve));
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await browser.close();
  }
}

runQuickTest();
