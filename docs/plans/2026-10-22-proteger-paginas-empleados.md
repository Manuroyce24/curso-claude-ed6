# Plan: Proteger páginas de empleados (issue #1)

- **Tipo**: bugfix
- **Fecha**: 2026-10-22
- **Estado**: pendiente

## 1. Resumen

La issue #1 denuncia que en `web-empleados` se podía entrar a `/barra`, `/salon` y `/cocina` sin control de rol. La corrección ya está en `main` (commit `554757c`, «restringe cocina, barra y salón por rol en las rutas»). Este plan se limita a **verificar manualmente** que el comportamiento pedido se cumple para cada rol y a cerrar la issue.

## 2. Contexto y objetivo

**Comportamiento pedido en la issue**

- Camarero: solo `/barra` y `/salon`.
- Cocinero: solo `/cocina`.
- Gerente (`manager`): las tres.

**Causa raíz original** (según el commit): las rutas no tenían restricción por rol y el `redirectTo` fijo a `/cocina` llevaba a un camarero a una página que no le correspondía.

**Estado actual del código** (comprobado leyendo el repositorio, sin ejecutar la app):

- `packages/web-empleados/src/app/app.routes.ts`: cada ruta lleva `canActivate: [roleGuard]` y `data.roles` (`cocina` → `cocinero`, `manager`; `barra` y `salon` → `camarero`, `manager`) con `forbiddenRedirect: '/'`.
- `packages/web-empleados/src/app/core/default-route.guard.ts`: `/` redirige a `/cocina` (cocinero y manager), `/barra` (camarero) o `/login` (otros roles).
- `packages/web-shared/src/lib/auth/role.guard.ts` y `auth.utils.ts` (`puedeAcceder`): cerrado por defecto; sin sesión redirige a `/login`.
- `shell.component.ts` oculta en el menú lateral los enlaces a los que el rol no accede.

**Resultado esperado de la verificación**: con cada rol, las rutas permitidas se abren y las no permitidas redirigen a `/`, que a su vez lleva a la página de inicio del rol.

## 3. Alcance

**Incluye**

- Verificación manual por rol de las tres rutas, escribiendo la URL a mano.
- Verificación del caso sin sesión y de un rol sin acceso a la app.
- Comentario de cierre en la issue con el resultado y cierre de la issue.

**No incluye**

- Cambios de código: el fix ya está en `main`.
- Endurecer la API por rol (`GET /orders/active` y `PATCH /orders/:orderId/items/:itemId/status` admiten hoy `cocinero`, `camarero`, `manager` y `admin`). El `roleGuard` del front es solo una barrera de UX; queda fuera de esta issue, que habla únicamente de las páginas.
- Tests automatizados: los frontends no tienen tests (solo `web-shared` tiene tests de lógica pura, que ya cubre `puedeAcceder`).

## 4. Análisis técnico

No hay cambios previstos. Capas y archivos que se verifican:

| Capa | Archivo | Cambio previsto |
|------|---------|-----------------|
| Rutas | `packages/web-empleados/src/app/app.routes.ts` | Ninguno (solo verificar) |
| Guard de inicio | `packages/web-empleados/src/app/core/default-route.guard.ts` | Ninguno (solo verificar) |
| Guard de rol | `packages/web-shared/src/lib/auth/role.guard.ts` | Ninguno (solo verificar) |

## 5. Cambios en la API

Sin cambios.

## 6. Lista de tareas

Cada tarea debe poder hacerse en 5-10 minutos.

- [ ] **T1** (~5 min): Preparar el entorno: `npm run seed`, `npm run dev:api` y `npm run dev:empleados` (puerto 4201); confirmar que `/health` responde — `packages/api`, `packages/web-empleados`
- [ ] **T2** (~7 min): Verificar camarero (`camarero1@resttek.com`): `/barra` y `/salon` abren; `/cocina` redirige a `/barra`; el menú muestra solo Barra y Salón — `packages/web-empleados/src/app/app.routes.ts`
- [ ] **T3** (~7 min): Verificar cocinero (`cocinero1@resttek.com`): `/cocina` abre; `/barra` y `/salon` redirigen a `/cocina`; el menú muestra solo Cocina — `packages/web-empleados/src/app/app.routes.ts`
- [ ] **T4** (~7 min): Verificar gerente (`gerente1@resttek.com`): las tres rutas abren y el menú muestra las tres — `packages/web-empleados/src/app/app.routes.ts`
- [ ] **T5** (~5 min): Verificar sin sesión (cerrar sesión o ventana privada): las tres URLs redirigen a `/login`; y un rol sin acceso a la app (p. ej. un `cliente`) acaba en `/login` — `packages/web-shared/src/lib/auth/role.guard.ts`
- [ ] **T6** (~5 min): Publicar en la issue #1 un comentario con la tabla de resultados por rol y cerrarla con `gh issue close 1` — GitHub

## 7. Verificación

Matriz esperada (contraseña de cada usuario = su propio email):

| Usuario | `/cocina` | `/barra` | `/salon` |
|---------|-----------|----------|----------|
| `camarero1@resttek.com` | redirige a `/barra` | abre | abre |
| `cocinero1@resttek.com` | abre | redirige a `/cocina` | redirige a `/cocina` |
| `gerente1@resttek.com` | abre | abre | abre |
| Sin sesión | `/login` | `/login` | `/login` |

Casos límite:

- Tras redirigir, la URL del navegador debe ser la de destino, sin bucles de redirección.
- Recargar la página (F5) estando en una ruta permitida mantiene el acceso.
- Un usuario con rol `manager` o `cocinero` entra a `/` y llega a `/cocina`; un camarero llega a `/barra`.

## 8. Riesgos y dudas abiertas

- No he ejecutado la aplicación: el análisis se basa en la lectura del código y del commit `554757c`, que indica haber sido verificado con `ng build`. La verificación manual (T2-T5) es justo lo que lo confirma.
- La autorización real está en la API y hoy no distingue entre cocinero y camarero en los endpoints de pedidos. Un usuario con token podría llamar a esos endpoints directamente. Queda fuera de esta issue; conviene valorar una issue aparte si se quiere esa garantía.
- El rol `admin` no figura en ninguna ruta de `web-empleados`, así que acaba en `/login` aunque el README lo asocie a `web-admin`. Es coherente con la issue, que no lo menciona; confirmar que es lo deseado.

## 9. Documentación a actualizar

- Ninguna.
