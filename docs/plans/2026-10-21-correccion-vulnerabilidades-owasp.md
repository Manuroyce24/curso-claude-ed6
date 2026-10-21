# Plan: Corrección de vulnerabilidades OWASP Top 10 en API y web-empleados

- **Tipo**: bugfix
- **Fecha**: 2026-10-21
- **Estado**: pendiente

## 1. Resumen

Una revisión estática de `packages/api` y `packages/web-empleados` (con `web-shared`) detectó fallos de control de acceso, un secreto JWT por defecto, falta de aislamiento por restaurante, ausencia de rate limiting y validación, dependencias vulnerables y carencias en el frontend (guards por rol, almacenamiento del token, polling, CSP). Este plan ordena las correcciones por prioridad.

## 2. Contexto y objetivo

Los hallazgos proceden de dos subagentes que **solo leyeron código** (y ejecutaron `npm audit`); no se explotó nada. Por eso la primera tarea de cada bloque es **reproducir** el fallo con `curl` antes de corregirlo.

Comprobado ya a mano al planificar:

- `routes/order.routes.ts`: las 5 rutas solo usan `authenticate`, sin `authorize`.
- `order.service.ts`: `updateItemStatus`, `getById` y `listActive` no comparan con el restaurante ni con el usuario del token; `create` itera `item.quantity` sin validarla.
- `middlewares.ts:4`: `JWT_SECRET` con valor por defecto `'super-secret-resttek-key'`.
- `app.ts`: `cors()` sin opciones, sin helmet y `express.json()` sin límite explícito.
- `web-empleados/src/app/app.routes.ts`: las rutas `cocina`, `barra` y `salon` solo tienen `authGuard`.

**Comportamiento esperado**: ningún usuario accede a datos o acciones fuera de su rol y su restaurante; la API no arranca sin secreto JWT robusto; el login resiste fuerza bruta; las dependencias vulnerables se actualizan.

## 3. Alcance

**Incluye**

- Autorización por rol y por restaurante en `/orders`, platos, ingredientes y restaurantes.
- Secreto JWT obligatorio, algoritmo fijado, `issuer`/`audience`.
- Rate limiting en `/auth/*`, política de contraseñas, normalización de email.
- Validación de entrada, helmet, CORS restringido, límite de body.
- Actualización de dependencias y `.gitignore`.
- Frontend: `roleGuard`, polling, `exp` del JWT, `JSON.parse` seguro, CSP, mensajes de error.
- Refresh token con rotación y revocación (Bloque 8): access JWT de 15 min, refresh opaco guardado con hash en BBDD, `POST /auth/refresh` y `POST /auth/logout`, revocación al cambiar rol o eliminar empleado.

**No incluye**

- Migrar el token a cookie `HttpOnly`: **decidido** mantener `Authorization: Bearer` con almacenamiento en el navegador, compensado con CSP y tokens de vida corta.
- Separar clientes de la tabla `employees`.
- Logging estructurado completo (solo se anota como mejora futura).
- Cambios en `web-admin` y `web-clientes`, salvo los efectos colaterales de tocar `web-shared`.

## 4. Análisis técnico

La autorización se resuelve en el **servidor**; los guards del frontend son solo UX. Se añade un middleware `authorizeRestaurant` y las comprobaciones de pertenencia en `services`/`repositories`. El restaurante efectivo se deriva del JWT (`user.restaurantId`); el `admin` queda exento.

| Capa | Archivo | Cambio previsto |
|------|---------|-----------------|
| Config | `packages/api/src/config/` (nuevo `env.ts`) | Leer y validar `JWT_SECRET` una sola vez |
| Shared | `contexts/shared/infrastructure/http/middlewares.ts` | Usar el secreto central, `algorithms:['HS256']`, nuevo `authorizeRestaurant`, tipar `user` |
| Employee | `contexts/employee/infrastructure/BcryptAuthService.ts` | Usar el secreto central, `issuer`/`audience` |
| Employee | `RegisterClientUseCase.ts`, `CreateEmployeeUseCase.ts`, `Email.ts` | Política de contraseña, email en minúsculas |
| Repositories | `dish.repository.ts`, `ingredient.repository.ts` | Filtrar por `restaurant_id` en `findById`/`update`/`delete` |
| Services | `order.service.ts` | Validar items/cantidad/plato, comprobar pertenencia |
| Controllers | `order.controller.ts` | Pasar `user` al servicio, no devolver `error.message` |
| Routes | `order.routes.ts`, `dish.routes.ts`, `ingredient.routes.ts`, `restaurant.routes.ts`, `auth.routes.ts` | `authorize`, `authorizeRestaurant`, rate limit |
| App | `app.ts` | helmet, CORS con lista blanca, límite de body |
| Frontend | `web-shared/.../auth.store.ts`, `auth.guard.ts` | `exp`, `try/catch`, `roleGuard` |
| Frontend | `web-empleados/.../app.routes.ts`, `order.store.ts`, páginas | `data.roles`, `stopPolling`, mensajes genéricos |

Alternativa descartada: validar solo en el frontend (no es una barrera de seguridad).

## 5. Cambios en la API

| Endpoint | Cambio |
|----------|--------|
| `POST /orders` | `authorize(['cliente','camarero','manager','admin'])`; valida `items` (1–50 líneas), `quantity` entera 1–50, `dishId` existente y del restaurante; 400 con mensaje genérico |
| `GET /orders/active` | `authorize(['cocinero','camarero','manager','admin'])`; `restaurantId` se toma del JWT salvo `admin` (403 si no coincide) |
| `GET /orders/:id` | Solo el cliente dueño, personal del mismo restaurante o `admin`; si no, 404 |
| `PATCH /orders/:orderId/items/:itemId/status` | Solo personal del restaurante del pedido o `admin`; 403/404 en caso contrario |
| `/restaurants/:restaurantId/{dishes,ingredients}/*` | 403 si `user.restaurantId !== :restaurantId` (salvo `admin`); 404 si el recurso es de otro restaurante |
| `GET /restaurants/:id` | Restringir a `admin` o personal de ese restaurante (los clientes usan la ruta pública) |
| `/auth/login`, `/auth/register` | Rate limit (429); contraseña mínima de 10 caracteres; error de registro sin revelar si el email existe |
| `GET /employees` | `limit` con máximo de 100 |
| `POST /auth/login` | Además del access JWT (15 min) devuelve `refreshToken` opaco (7 días) |
| `POST /auth/refresh` | Cuerpo `{ refreshToken }`. Rota el refresh (el anterior queda revocado) y devuelve un par nuevo. 401 si está caducado, revocado o ya usado; un token ya usado revoca toda su familia (detección de reutilización) |
| `POST /auth/logout` | Autenticado. Cuerpo `{ refreshToken }`; lo revoca (204). Idempotente |
| Cambio de rol / baja de empleado | Revoca todos los refresh tokens del empleado |

## 6. Lista de tareas

Cada tarea debe poder hacerse en 5-10 minutos. Se marcan los bloques por prioridad.

**Bloque 0 — Reproducción (antes de corregir)**

- [x] **T1** (~10 min): Arrancar la API con el seed y reproducir con `curl` la lectura de un pedido ajeno y el cambio de estado desde un token `cliente` — `packages/api`
- [x] **T2** (~5 min): Reproducir con `curl` el acceso a `PUT /restaurants/A/dishes/<id de B>` con un manager de A — `packages/api`
- [x] **T3** (~5 min): Ejecutar `npm audit --omit=dev` y guardar el resultado como línea base — raíz

**Bloque 1 — Autorización de `/orders` (crítica)**

- [x] **T4** (~5 min): Tipar `AuthRequest.user` (`id`, `role`, `restaurantId?`) en lugar de `any` — `middlewares.ts`
- [x] **T5** (~10 min): Añadir `restaurantId` al contexto de `getById`, `listActive` y `updateItemStatus` y lanzar `OrderNotFoundError` si el pedido no pertenece al usuario o a su restaurante — `order.service.ts`
- [x] **T6** (~5 min): Añadir un error de dominio `ForbiddenError` y su traducción en `errorHandler` — `errors/DomainErrors.ts`, `errorHandler.ts`
- [x] **T7** (~10 min): En `createOrder`, validar `items` y `quantity` (entero 1–50) y que cada `dishId` exista y sea del restaurante — `order.service.ts`
- [x] **T8** (~10 min): Pasar `req.user` a los métodos del servicio, derivar `restaurantId` del JWT y sustituir `error.message` por mensajes mapeados — `order.controller.ts`
- [x] **T9** (~5 min): Añadir `authorize` con los roles correspondientes a cada ruta — `order.routes.ts`

**Bloque 2 — Secreto JWT (crítica)**

- [x] **T10** (~5 min): Crear `config/env.ts` que exija `JWT_SECRET` (≥32 caracteres) y falle al arrancar; en `NODE_ENV=test` usar un valor fijo de test — `packages/api/src/config/env.ts`
- [x] **T11** (~5 min): Reemplazar el secreto duplicado en `middlewares.ts` y fijar `algorithms:['HS256']` — `middlewares.ts`
- [x] **T12** (~5 min): Reemplazar el secreto en `BcryptAuthService.ts` y añadir `issuer`/`audience` (verificarlos en `authenticate`) — `BcryptAuthService.ts`
- [x] **T13** (~5 min): Documentar `JWT_SECRET` y crear `.env.example` — `README.md`, `packages/api/.env.example`

**Bloque 3 — Aislamiento por restaurante (alta)**

- [x] **T14** (~10 min): Crear `authorizeRestaurant` (admin o `user.restaurantId === params.restaurantId`) — `middlewares.ts`
- [x] **T15** (~10 min): Añadir `AND restaurant_id = ?` a `findById`/`update`/`delete` de platos y ajustar el servicio — `dish.repository.ts`, `dish.service.ts`
- [x] **T16** (~10 min): Lo mismo para ingredientes — `ingredient.repository.ts`, `ingredient.service.ts`
- [x] **T17** (~5 min): Aplicar `authorizeRestaurant` en las rutas de platos, ingredientes y empleados del restaurante — `dish.routes.ts`, `ingredient.routes.ts`, `restaurant-employee.routes.ts`
- [x] **T18** (~5 min): Restringir `GET /restaurants/:id` a admin o personal de ese restaurante — `restaurant.routes.ts`
- [x] **T19** (~5 min): Actualizar los mocks de repositorios — `repositories/mocks/`

**Bloque 4 — Autenticación (alta/media)**

- [x] **T20** (~5 min): Instalar `express-rate-limit` y aplicarlo a `/auth/login` y `/auth/register` — `auth.routes.ts`, `package.json`
- [x] **T21** (~10 min): Validar la contraseña (string, longitud mínima 10) en registro y creación de empleado — `RegisterClientUseCase.ts`, `CreateEmployeeUseCase.ts`
- [x] **T22** (~5 min): Normalizar el email a minúsculas — `Email.ts`
- [x] **T23** (~10 min): En el login, ejecutar `bcrypt.compare` contra un hash ficticio si el usuario no existe — `LoginUseCase.ts`
- [x] **T24** (~5 min): Hacer que `seed.ts` no se ejecute con `NODE_ENV=production` y dejar constancia en el README de que la contraseña del seed es el email — `scripts/seed.ts`, `README.md`

**Bloque 5 — Validación y configuración HTTP (media)**

- [x] **T25** (~5 min): Instalar `helmet` y añadirlo; `app.disable('x-powered-by')` — `app.ts`
- [x] **T26** (~5 min): CORS con lista blanca (`CORS_ORIGINS`) y `express.json({ limit: '100kb' })` — `app.ts`
- [x] **T27** (~5 min): Limitar `limit` a 100 en el listado de empleados — `EmployeeController.ts`
- [x] **T28** (~5 min): Validar `price` (número finito > 0) — `dish.service.ts`
- [x] **T29** (~5 min): Validar el esquema `http(s)` de `logoUrl` — `restaurant.service.ts`
- [x] **T30** (~5 min): Devolver 400 para JSON malformado — `errorHandler.ts`

**Bloque 6 — Dependencias y repositorio (alta/baja)**

- [x] **T31** (~10 min): `npm audit fix` y actualización de vitest/vite; comprobar `npm test` — `package.json`, `package-lock.json`
- [x] **T32** (~5 min): Añadir `*.db`, `.env*` (excepto `.env.example`) y `.DS_Store` — `.gitignore`

**Bloque 7 — Frontend (alta/media/baja)**

- [ ] **T33** (~10 min): Crear `roleGuard` leyendo `route.data['roles']` y exportarlo — `web-shared/src/lib/auth/`, `web-shared/src/index.ts`
- [ ] **T34** (~5 min): Aplicar `roleGuard` con `data.roles` a `cocina`, `barra` y `salon` — `web-empleados/src/app/app.routes.ts`
- [ ] **T35** (~10 min): Comprobar `exp` del JWT en `isAuthenticated` y envolver `JSON.parse` en `try/catch` — `web-shared/.../auth.store.ts`
- [ ] **T36** (~10 min): Parar el polling en `ngOnDestroy`, evitar doble `startPolling` y pararlo al cerrar sesión o tras un 401 — `order.store.ts`, páginas de `orders/pages`
- [ ] **T37** (~5 min): Dejar de leer `restaurantId` de `localStorage` para las llamadas (la API lo toma del JWT) — `order.service.ts`
- [ ] **T38** (~5 min): Mostrar mensajes genéricos en lugar de `err.message` — `order.store.ts`
- [ ] **T39** (~10 min): Actualizar `@angular/*` a la última versión parcheada de 21.x y ejecutar `ng build` — `package.json`
- [ ] **T40** (~10 min): Activar `security.autoCsp` en `angular.json` y alojar la fuente Inter en local para no abrir `style-src`/`font-src` a terceros — `angular.json`, `styles.css`
- [ ] **T40b** (~10 min): Definir la CSP completa (`default-src 'self'`, `script-src` con nonce/hash, `connect-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`) y probarla en modo `Content-Security-Policy-Report-Only` antes de aplicarla — `index.html`/configuración del servidor
- [ ] **T41** (~5 min): Documentar las cabeceras de seguridad y el uso de HTTPS en producción — `docs/arquitectura/`

**Bloque 8 — Refresh token con revocación (media)**

Depende del Bloque 2 (secreto y `issuer`/`audience`). Se ejecuta antes de las tareas de frontend T35 y T36.

- [x] **T44** (~10 min): Crear la tabla `refresh_tokens` (`id`, `employee_id`, `family_id`, `token_hash`, `expires_at`, `revoked_at`, `replaced_by`, `created_at`) con índice en `token_hash` — `config/database.ts`
- [x] **T45** (~10 min): Puerto `RefreshTokenRepository` (`save`, `findByHash`, `revoke`, `revokeFamily`, `revokeAllByEmployee`) — `contexts/employee/domain/`
- [x] **T46** (~10 min): Implementación SQLite con consultas parametrizadas — `contexts/employee/infrastructure/SqliteRefreshTokenRepository.ts`
- [x] **T47** (~5 min): Generar el refresh con `crypto.randomBytes(32)` y guardar solo su hash SHA-256 — `BcryptAuthService.ts`
- [x] **T48** (~5 min): Reducir la expiración del access JWT a 15 min (configurable) — `BcryptAuthService.ts`
- [x] **T49** (~10 min): `LoginUseCase` crea la familia y devuelve `refreshToken` junto al access — `LoginUseCase.ts`
- [x] **T50** (~10 min): `RefreshTokenUseCase`: valida hash y caducidad, rota, y si el token ya estaba revocado revoca la familia y responde 401 — `contexts/employee/application/RefreshTokenUseCase.ts`
- [x] **T51** (~5 min): `LogoutUseCase` que revoca el refresh recibido (idempotente) — `contexts/employee/application/LogoutUseCase.ts`
- [x] **T52** (~5 min): Revocar todos los refresh del empleado al cambiar su rol o eliminarlo — casos de uso de empleados
- [x] **T53** (~10 min): Controlador y rutas `POST /auth/refresh` y `POST /auth/logout`, con rate limit propio — `auth.routes.ts`, controlador de auth
- [x] **T54** (~5 min): Registrar los casos de uso y el repositorio — `contexts/employee/infrastructure/dependencies.ts`
- [x] **T55** (~10 min): Tests unitarios de rotación, reutilización, caducidad y revocación — `RefreshTokenUseCase.test.ts`
- [ ] **T56** (~10 min): En `web-shared`, guardar `refreshToken` y añadir `AuthService.refresh()` y `logout()` que llama a la API antes de limpiar el estado — `auth.service.ts`, `auth.store.ts`
- [ ] **T57** (~10 min): En el interceptor, ante un 401 llamar a `refresh()` una sola vez a la vez (cola de peticiones), reintentar la petición y, si falla, cerrar sesión — `web-shared/.../error.interceptor.ts`
- [ ] **T58** (~5 min): No intentar refrescar en las propias llamadas de `/auth/*` para evitar bucles — interceptor

**Cierre**

- [ ] **T42** (~10 min): Repetir las pruebas de T1 y T2 y la matriz de la sección 7 — `packages/api`
- [ ] **T43** (~5 min): Actualizar la documentación (sección 9) — `docs/`

## 7. Verificación

Con la API en marcha y el seed cargado (`TOKEN_x` = login de cada rol; la contraseña del seed es el email):

```bash
# Cliente intenta leer/cambiar pedidos ajenos  -> esperado 403/404
curl -i -H "Authorization: Bearer $TOKEN_CLIENTE" localhost:3000/api/v1/orders/active?restaurantId=<id>
curl -i -H "Authorization: Bearer $TOKEN_CLIENTE" localhost:3000/api/v1/orders/<id_ajeno>
curl -i -X PATCH -H "Authorization: Bearer $TOKEN_CLIENTE" -H 'Content-Type: application/json' \
  -d '{"status":"entregado"}' localhost:3000/api/v1/orders/<o>/items/<i>/status

# Manager de A contra recursos de B -> esperado 403/404
curl -i -X DELETE -H "Authorization: Bearer $TOKEN_MANAGER_A" localhost:3000/api/v1/restaurants/<B>/dishes/<id>

# Arranque sin secreto -> el proceso debe terminar con error
JWT_SECRET= npm run dev:api

# Token forjado con el secreto antiguo -> esperado 401
# Fuerza bruta: 20 logins seguidos -> esperado 429
# Refresh: POST /auth/refresh con el refresh del login -> 200 y par nuevo; repetir con el mismo
#   refresh ya usado -> 401 y el refresh nuevo también deja de funcionar (familia revocada)
# Logout: POST /auth/logout y luego /auth/refresh con ese token -> 401
# Cambiar el rol de un empleado y refrescar con su token anterior -> 401
# Pedido con quantity 1e9, -1 o 1.5 -> esperado 400
# GET /employees?limit=99999 -> como mucho 100 resultados
# Contraseña de 6 caracteres en registro -> 400
```

Casos válidos que deben seguir funcionando: cocinero lista y actualiza pedidos de su restaurante; cliente crea un pedido y ve `/orders/mine`; admin accede a todo.

Frontend: con un cocinero, navegar a `/barra` redirige; cambiar `auth_user` en `localStorage` no da acceso a datos ajenos; el polling se detiene al cerrar sesión (pestaña Red de las herramientas del navegador); `ng build` de `web-empleados` pasa. Ejecutar también `npm test` en la raíz, ya que los cambios en repositorios y servicios afectan a los tests de `api`.

## 8. Riesgos y dudas abiertas

- Los hallazgos son de **revisión estática**; T1–T3 sirven para confirmarlos antes de corregir.
- **Decidido**: se mantiene Bearer con tokens en el navegador, refresh con rotación y revocación, y CSP. Riesgo residual: un XSS que supere la CSP puede leer ambos tokens; la vida corta del access, la rotación con detección de reutilización y la CSP lo limitan, pero no lo eliminan.
- La revocación no es inmediata para el access token: sigue válido hasta 15 min tras revocar el refresh (el middleware `authenticate` no consulta la BD). Si no es aceptable, habría que comprobar el estado del usuario en cada petición; queda como mejora opcional.
- La CSP puede romper la app si algún estilo o script en línea no lleva nonce; por eso T40b se prueba primero en modo solo informe.
- La rotación puede provocar falsos positivos con varias pestañas que refrescan a la vez (la segunda reutiliza un token ya rotado y cierra la familia). T57 serializa el refresh dentro de una pestaña, pero entre pestañas queda sin cubrir; hay que valorar un periodo de gracia corto.
- Los tokens de refresh en BBDD necesitan limpieza periódica de los caducados; no está planificada.
- Fijar `issuer`/`audience` invalida los tokens ya emitidos; los usuarios deberán iniciar sesión de nuevo.
- Exigir el secreto al arrancar romperá entornos locales sin `JWT_SECRET`; se mitiga con `.env.example` y un valor fijo en tests.
- No se ha confirmado que los roles de un `cliente` no incluyan `restaurantId`; hay que revisar el payload del JWT en `BcryptAuthService.ts` antes de T5.
- Los hallazgos sobre `tar`/`cacache` (vía `sqlite3`) son de build; `npm audit fix` podría requerir una subida mayor de `sqlite3`.
- La skill indica que el proyecto no tiene tests, pero `CLAUDE.md` documenta tests con vitest en `api`; se usan ambos tipos de verificación.
- Cambiar `web-shared` afecta a `web-admin` y `web-clientes`; hay que reiniciar sus servidores de desarrollo y comprobar que compilan.

## 9. Documentación a actualizar

- `README.md`: variable `JWT_SECRET`, `CORS_ORIGINS`, advertencia sobre el seed y la política de contraseñas.
- `docs/arquitectura/`: modelo de autorización (roles y aislamiento por restaurante), flujo de refresh y revocación, y cabeceras de seguridad/CSP.
- `docs/dominio/`: nueva tabla `refresh_tokens` en el modelo de datos.
- `CLAUDE.md`: nota sobre `JWT_SECRET` obligatorio.
