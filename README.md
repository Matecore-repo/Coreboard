# Coreboard

CRM de turnos para salones/peluquerías.

## Inicio Rápido

### Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

Abre http://localhost:3000

### Producción

```bash
# Build de producción
npm run build

# Iniciar servidor de producción
npm start
```

## Variables de Entorno

Crear archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NEXT_PUBLIC_DEMO_MODE=false
```

## Documentación

- `docs/INSTRUCTIVO_UNICO.md` — Guía rápida de inicio
- `docs/DEPLOY.md` — Guía de deploy para producción
- `docs/TEST_RESULTS.md` — Resultados de pruebas E2E
- `docs/ARCHITECTURE.md` — Arquitectura del sistema
- `docs/VALIDATORS.md` — Validadores y reglas de negocio

## Testing

```bash
# Pruebas E2E con Playwright
npm run e2e

# Pruebas unitarias con Vitest
npm test
```

## Build y Deploy

Ver `docs/DEPLOY.md` para instrucciones completas de deploy.

## Scripts Disponibles

- `npm run dev` - Desarrollo
- `npm run lint` - Ejecuta ESLint, imprime el resultado en consola y genera `lint-report.txt` para revisar las salidas completas
- `npm run build` - Build de producción
- `npm start` - Servidor de producción
- `npm run e2e` - Pruebas E2E
- `npm run e2e:ui` - Pruebas E2E con UI
