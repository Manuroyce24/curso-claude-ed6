# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

La documentación (README, `docs/`, comentarios de documentación) se escribe en español.

## Qué es

Resttek: plataforma de gestión de restaurantes. Monorepo con **npm workspaces** (`packages/*`): una API (`api`, Express 5 + TypeScript + SQLite) y cuatro paquetes Angular 21 (`web-admin` :4200, `web-empleados` :4201, `web-clientes` :4202 y la librería `web-shared`). Requiere Node 22+.

## Comandos (desde la raíz)

```bash
npm install                 # instala todos los workspaces
npm run seed                # puebla la BD (idempotente: INSERT OR IGNORE)
npm run dev:api             # API en :3000 (tsx watch), health en /health
npm run dev:admin           # | dev:empleados | dev:clientes (ng serve con proxy /api -> :3000)
npm test                    # vitest run, solo del paquete api
```

- Test en modo watch: `cd packages/api && npm run test:watch`
- Un solo test: `cd packages/api && npx vitest run src/services/order.service.test.ts` (o `-t "nombre del test"`).
- Los frontends tienen `build` (`ng build`) pero no hay tests ni lint configurados en ellos; la raíz no define lint ni build global.
- La API necesita `JWT_SECRET` (≥32 caracteres) en `packages/api/.env` (plantilla en `.env.example`); sin él no arranca. Los tests lo definen en `vitest.config.ts`.
- Tests de `web-shared` (lógica pura): `npm test -w @resttek/web-shared`.
- Credenciales de seed: la contraseña de cada usuario es su propio email (p. ej. `admin@resttek.com`). Lista completa en el README.
- Los cambios en `web-shared` no se recargan solos: reinicia el dev server del frontend.

## Arquitectura

Documentación detallada en `docs/arquitectura/` y `docs/dominio/` (modelo de datos, glosario). `docs/revisiones/` contiene revisiones de inconsistencias entre código y docs.

### API (`packages/api/src`) — dos estilos conviven

- **Hexagonal + DDD solo en `contexts/employee/`** (`domain` → `application` (use cases) → `infrastructure` con repositorio SQLite, auth bcrypt/JWT, controladores y `dependencies.ts` como composición). `contexts/shared/` aloja value objects, `errorHandler` y middlewares (`authenticate`, `authorize`).
- **Por capas en `restaurant`, `dish`, `ingredient`, `order`**: `routes/` → `controllers/` → `services/` → `repositories/` (+ `models/`). Los repositorios tienen mocks en `repositories/mocks/` usados por los tests de servicios.
- Hay rutas públicas separadas (`*.public.routes.ts`) de las autenticadas.
- Alias de paths en `tsconfig.json` (`@services/*`, `@repositories/*`, `@employee/*`, `@shared/*`, etc.); vitest los resuelve con `vite-tsconfig-paths`. Usa los alias en vez de rutas relativas largas.
- TS muy estricto (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), ESM (`"type": "module"`, `nodenext`).
- BD: `packages/api/resttek.db`; las tablas se crean/migran en código al arrancar. Con `NODE_ENV=test` se usa SQLite `:memory:`. Los tests son unitarios colocados junto al código (`*.test.ts`).
- Auth: access JWT de 15 min en `Authorization: Bearer` + refresh token rotatorio con revocación (`/auth/refresh`, `/auth/logout`, tabla `refresh_tokens`); roles con `authorize()` y aislamiento por restaurante con `authorizeRestaurant`. Ver `docs/arquitectura/seguridad.md`. Errores de dominio en `errors/` (`AppError`, `DomainErrors`) traducidos por `errorHandler`.

### Frontends

- Angular 21: standalone components, signals, zoneless (sin `zone.js`), guards/interceptors funcionales.
- `web-admin` y `web-empleados`: feature-based (`features/<f>/{models,pages,services,store}`) con patrón **Store** (servicio `providedIn: 'root'` con signals privadas expuestas como readonly; HTTP vía `firstValueFrom`).
- `web-clientes`: estructura distinta y más simple (`core/{models,services,store}` + componentes sueltos en `features/`); los componentes consumen `Observable` con `.subscribe()`. Su componente raíz es `App` (`app.ts`), no `AppComponent`.
- `@resttek/web-shared` (único código compartido, entrada `src/index.ts`): auth, interceptors y componentes comunes. Los frontends no dependen entre sí.

## scripts/

`scripts/seed-issues.sh` crea issues en GitHub desde `scripts/issues.json` (requiere `gh` y `jq`); ver `scripts/README.md`.
