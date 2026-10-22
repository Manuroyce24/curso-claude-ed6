# Seguridad

Resumen de las medidas de seguridad de Resttek y de lo que debe configurar quien despliegue la aplicación. Nació de la revisión OWASP Top 10 descrita en `docs/plans/2026-10-21-correccion-vulnerabilidades-owasp.md`.

## Autenticación

- **Access token**: JWT firmado con HS256, con `issuer` y `audience`, y una vida de 15 minutos (`ACCESS_TOKEN_TTL_SECONDS`). Se envía como `Authorization: Bearer`.
- **Refresh token**: cadena aleatoria opaca de 32 bytes con una vida de 7 días (`REFRESH_TOKEN_TTL_SECONDS`). En la BBDD solo se guarda su hash SHA-256 (tabla `refresh_tokens`).
- **Rotación**: cada `POST /auth/refresh` revoca el refresh usado y emite uno nuevo de la misma *familia*. Si se reutiliza uno ya rotado, se asume robo y se revoca toda la familia.
- **Cierre de sesión**: `POST /auth/logout` (autenticado) revoca la familia del refresh recibido.
- **Revocación**: un empleado eliminado pierde sus refresh tokens (`ON DELETE CASCADE`). El rol se vuelve a leer de la BBDD en cada renovación. El access token ya emitido sigue siendo válido hasta 15 minutos, porque `authenticate` no consulta la BBDD.
- **Secreto**: `JWT_SECRET` es obligatorio (mínimo 32 caracteres). La API no arranca sin él.
- **Contraseñas**: de 10 a 72 caracteres (límite de bcrypt). Se comparan siempre contra un hash, aunque el email no exista, para no revelar qué cuentas existen por el tiempo de respuesta.
- **Límite de intentos**: `/auth/login`, `/auth/register` y `/auth/refresh` admiten por defecto 10 peticiones cada 15 minutos por IP (`AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`). Tras un proxy inverso hay que configurar `trust proxy` en Express; si no, todas las peticiones parecerán venir de la IP del proxy.

## Autorización

- Cada ruta autenticada declara los roles permitidos con `authorize([...])`.
- **Aislamiento por restaurante**: `authorizeRestaurant` (y `authorizeRestaurantBy('id')`) solo deja pasar al `admin` o al personal cuyo `restaurantId` del token coincide con el de la URL. Los repositorios de platos e ingredientes buscan por `id` y `restaurant_id`.
- **Pedidos** (`/orders`): el servicio recibe el *actor* del token. El restaurante se deduce del JWT y un pedido ajeno se responde como `404`. Los clientes solo ven sus propios pedidos.
- Los guards del frontend (`authGuard`, `roleGuard`) son solo una mejora de usabilidad: la barrera real es la API.

## Cabeceras y configuración HTTP de la API

- `helmet` y `x-powered-by` desactivado.
- CORS con lista blanca en `CORS_ORIGINS` (por defecto los puertos de desarrollo 4200-4202).
- Cuerpo JSON limitado a 100 kB; un JSON malformado responde `400` y uno demasiado grande `413`.

## Frontend: CSP y cabeceras

Los tres frontends (`web-empleados`, `web-admin` y `web-clientes`) generan en producción dos metaetiquetas CSP que se combinan:

1. La de `security.autoCsp` (en `angular.json`): `script-src` con hashes de los scripts en línea y `strict-dynamic`.
2. La de `src/index.prod.html` (solo se usa en el build de producción): `style-src`, `img-src` (en `web-admin` y `web-clientes` admite también `https:` por los logos de restaurante), `font-src`, `connect-src`, `frame-src`, `worker-src`, `form-action`, `object-src` y `base-uri`. No declara `default-src` ni `script-src` a propósito, para no bloquear los scripts con hash.

La fuente Inter se sirve en local (`@fontsource/inter`), así que la política no abre nada a terceros.

Una `<meta>` no admite `frame-ancestors`, `report-uri` ni `Content-Security-Policy-Report-Only`. Quien sirva los estáticos (nginx, CDN...) debe enviar estas cabeceras HTTP:

```
Content-Security-Policy: frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Recomendación para cambios futuros de la CSP: publicarla primero como `Content-Security-Policy-Report-Only` desde el servidor y revisar las violaciones antes de aplicarla.

## HTTPS y despliegue

- En producción, la aplicación y la API deben servirse siempre por HTTPS. `environment.production.ts` usa `/api/v1` relativo, así que hace falta un proxy inverso que dirija `/api` a la API.
- `proxy.conf.json` (con `secure: false`) es solo para `ng serve` en desarrollo.
- No ejecutar `npm run seed` en producción (el script se niega con `NODE_ENV=production`): sus cuentas usan el email como contraseña.
- `packages/api/.env` y `*.db` están en `.gitignore`; no versionarlos.

## Riesgos conocidos

- Los tokens (access y refresh) se guardan en `localStorage`. Un XSS que supere la CSP puede leerlos. Se compensa con una vida corta del access, la rotación del refresh y la CSP.
- La rotación puede cerrar la sesión si dos pestañas renuevan a la vez con el mismo refresh. Dentro de una pestaña las renovaciones se serializan; entre pestañas no.
- Los refresh tokens caducados no se purgan de la BBDD.
- `npm audit --omit=dev` está en 0 vulnerabilidades (`sqlite3` 6.0.1).
- `npm audit` mantiene 3 avisos (2 bajos y 1 alto) de `vite` 7.3.6 y `esbuild` 0.27.x, que `@angular/build` 21.2.27 fija con versión exacta. Solo afectan al servidor de desarrollo (`ng serve`); no llegan al build ni a producción. Se resolverán al publicarse una versión de `@angular/build` con `vite` ≥ 7.3.7.
