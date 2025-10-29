# 🚀 QUICKSTART E2E - 30 segundos

## Ejecutar Tests (Opción 1: Headless - CI/CD)

```bash
npm run e2e
```

✅ Ejecuta automáticamente
✅ Sin necesidad de navegador abierto
✅ Genera reporte HTML

**Resultado esperado:** Exit code `0` (PASS)

---

## Ver Tests en Vivo (Opción 2: UI)

```bash
npm run e2e:ui
```

✅ Abre navegador
✅ Ver qué hace cada test
✅ Pausar, inspeccionar elementos
✅ Rerun individual tests

---

## Debug Interactivo (Opción 3)

```bash
npm run e2e:debug
```

✅ Abre DevTools
✅ Breakpoints paso a paso
✅ Inspeccionar DOM en vivo

---

## Ver Reporte

```bash
npm run e2e:report
```

✅ Abre `playwright-report/index.html`
✅ Screenshots, videos, traces
✅ Timeline de ejecución

---

## Qué Valida

| Item | Status |
|------|--------|
| Login (owner) | ✅ |
| Crear peluquería | ✅ |
| Asignar servicios | ✅ |
| Crear empleado | ✅ |
| Crear cliente | ✅ |
| Crear turno | ✅ |
| Ver en calendario | ✅ |
| Invitar usuario | ✅ |
| Ver miembros | ✅ |
| Sin errores críticos | ✅ |

---

## Troubleshooting Rápido

### ❌ Port 3000 en uso
```bash
npm run kill-port 3000
npm run e2e
```

### ❌ Timeout en tests
- Aumentar tiempo: `--timeout 60000`
- O revisar si selectors son correctos

### ❌ Errores de login
- Verificar: `DEMO_MODE=false` en `.env.local`
- Verificar credenciales: `iangel.oned@gmail.com / 123456`

### ❌ RLS errors (403)
- Revisar políticas en Supabase
- Verificar membresías del usuario

---

## Próximo Paso

**Ejecuta ahora:**
```bash
npm run e2e:ui
```

Y mira cómo COREBOARD pasa todos los tests automáticamente 🎉
