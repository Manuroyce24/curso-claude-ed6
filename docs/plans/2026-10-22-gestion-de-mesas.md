# Plan: Gestión de mesas (issue #5)

- **Tipo**: feature
- **Fecha**: 2026-10-22
- **Estado**: pendiente

## 1. Resumen

Introducir la entidad **mesa** en Resttek. El administrador (y el manager de su restaurante) gestiona las mesas con un CRUD en `web-admin`; el cliente, al entrar en un restaurante en `web-clientes`, indica cuántas personas son, elige una mesa libre con capacidad suficiente, la mesa pasa a `ocupada` y continúa a la carta, donde su pedido queda asociado a esa mesa. Camareros y managers ven en `web-empleados` el estado de las mesas, lo cambian y consultan los pedidos activos de las mesas ocupadas.

## 2. Contexto y objetivo

Hoy `orders.table_id` es un `TEXT` libre sin entidad detrás (el seed usa `'5'` y `web-clientes` envía siempre `tableId: null`). No hay forma de saber qué mesas existen, su capacidad ni si están libres.

**Decisiones tomadas con el usuario**

| Cuestión | Decisión |
|----------|----------|
| Liberar una mesa | Solo manual: el gerente (`manager`) o el camarero la marca como `libre` desde `/mesas` en `web-empleados` (`PATCH /:id/status`). El admin también puede hacerlo por la API y desde el formulario de edición de `web-admin` |
| CRUD en `web-admin` | Admin (cualquier restaurante) y manager (el suyo), igual que platos e ingredientes |
| Ver/cambiar estado en `web-empleados` | Camarero y manager (nueva página `/mesas`); el cocinero no la ve |
| Mesas que ve el cliente | `libre` y `capacidad >= personas`, ordenadas de menor a mayor capacidad |

**Modelo de mesa** (pedido por la issue): `id`, `numero`, `descripcion`, `capacidad`, `estado` (`libre` | `ocupada` | `reservada`). Se añaden `restaurantId`, `createdAt` y `updatedAt` como en el resto de entidades. En código se usan los nombres en inglés del proyecto (`number`, `description`, `capacity`, `status`), con los valores de estado en español como en `order.model.ts`.

## 3. Alcance

**Incluye**

- API: tabla `restaurant_tables`, modelo, repositorio (con mock), servicio, controlador y rutas bajo `/api/v1/restaurants/:restaurantId/tables`.
- API: endpoints para el cliente (mesas disponibles y ocupar mesa) con ocupación **atómica** (`UPDATE ... WHERE status = 'libre'`) para evitar que dos clientes cojan la misma mesa.
- API: `OrderService.create` valida que el `tableId` recibido sea una mesa `ocupada` del mismo restaurante.
- Seed con mesas para `rest-1` y `rest-2`, y el pedido de ejemplo apuntando a una mesa real.
- `web-admin`: listado, alta, edición y borrado de mesas por restaurante, con enlaces en el menú y el dashboard del restaurante.
- `web-empleados`: página `/mesas` (camarero, manager) con el estado de cada mesa, selector para cambiarlo y los pedidos activos de las mesas ocupadas.
- `web-clientes`: paso previo a la carta para elegir número de personas y mesa; el pedido se envía con `tableId`.
- Tests unitarios (vitest) de modelo, servicio y rutas de la API; documentación.

**No incluye**

- Liberación automática de mesas al entregar o pagar pedidos.
- Gestión de reservas (fecha/hora, cliente que reserva): `reservada` es solo un estado que fija el personal.
- Unir mesas para grupos grandes, plano del salón o pagos.
- Tests en los frontends (no hay infraestructura de tests en las apps Angular).
- Clave foránea `orders.table_id → restaurant_tables.id` (ver riesgos).

## 4. Análisis técnico

**Diseño**

- **Por capas**, como `dish` (`routes → controllers → services → repositories → models`), no hexagonal.
- Nombre de tabla `restaurant_tables` para no confundir "table" con el concepto SQL. Restricción `UNIQUE(restaurant_id, number)`: el número de mesa no se repite dentro de un restaurante.
- **Ocupación atómica**: `occupyIfFree(id, restaurantId)` ejecuta `UPDATE restaurant_tables SET status = 'ocupada', updated_at = ? WHERE id = ? AND restaurant_id = ? AND status = 'libre'` y devuelve `changes === 1`. Si devuelve `false`, el servicio distingue entre "no existe" (`TableNotFoundError`, 404) y "no está libre" (`TableNotAvailableError`, 409).
- **Rutas del cliente**: el cliente no tiene `restaurantId` en el token, así que `authorizeRestaurant` le daría 403. Los dos endpoints de cliente (`GET /available`, `POST /:id/occupy`) van en el mismo router **sin** `authorizeRestaurant` y con `authorize(['cliente'])`. El resto lleva `authenticate, authorizeRestaurant, authorize([...])`. `/available` se declara antes de `/:id`.
- **Errores** nuevos en `errors/DomainErrors.ts` (patrón `AppError`, el proyecto no tiene `ErrorServicio`): `TableNotFoundError` (404), `TableNumberRequiredError`/`InvalidTableNumberError`, `InvalidCapacityError`, `InvalidTableStatusError`, `InvalidPartySizeError` (400), `DuplicatedTableNumberError` y `TableNotAvailableError` (409). El `errorHandler` hoy solo emite 400/401/403/404: se añade una lista `CONFLICT_ERRORS` → 409.
- **Borrado**: no se permite borrar una mesa `ocupada` (`TableNotAvailableError`), para no dejar pedidos activos apuntando a una mesa inexistente.
- **Pedidos**: `OrderService` recibe un tercer colaborador `TableRepository`. Si `tableId` no es `null`, debe existir en el restaurante y estar `ocupada`; si no, `InvalidOrderError`. Los pedidos sin mesa (`tableId: null`, p. ej. los que crea un camarero) siguen permitidos.
- **Pedidos por mesa en `web-empleados`**: no hace falta endpoint nuevo; `GET /orders/active` ya devuelve `tableId`, así que la página de mesas reutiliza `OrderStore` y filtra por `tableId`.
- **Mesa elegida en `web-clientes`**: se guarda en `CartStore` (`tableId` + `restaurantId`) y se persiste en `sessionStorage` (envuelto en `try/catch`) para que una recarga no obligue a coger otra mesa ya que la elegida queda `ocupada`. `clear()` vacía solo los platos; la mesa se mantiene para pedidos posteriores.

| Capa | Archivo | Cambio previsto |
|------|---------|-----------------|
| BBDD | `packages/api/src/config/database.ts` | `CREATE TABLE IF NOT EXISTS restaurant_tables` + índice |
| Errores | `packages/api/src/errors/DomainErrors.ts` | Errores de mesa |
| Errores | `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | `TableNotFoundError` → 404, `CONFLICT_ERRORS` → 409 |
| Modelo | `packages/api/src/models/table.model.ts` (nuevo) | `Table`, `TableStatusType`, `normalizeTableStatus` |
| Repositorio | `packages/api/src/repositories/table.repository.ts` (nuevo) | `TableRepository` + `SqliteTableRepository` |
| Mock | `packages/api/src/repositories/mocks/MockTableRepository.ts` (nuevo) | Implementación en memoria |
| Servicio | `packages/api/src/services/table.service.ts` (nuevo) | CRUD, cambio de estado, disponibles, ocupar |
| Servicio | `packages/api/src/services/order.service.ts` | Validación de `tableId` |
| Controlador | `packages/api/src/controllers/table.controller.ts` (nuevo) | Handlers + `toJSON` |
| Rutas | `packages/api/src/routes/table.routes.ts` (nuevo), `order.routes.ts`, `app.ts` | Montaje y roles |
| Test helpers | `packages/api/src/test/http.ts` | `crearMesa` |
| Seed | `packages/api/src/scripts/seed.ts` | Mesas de ejemplo |
| web-admin | `features/tables/**` (nuevo), `app.routes.ts`, `shell.component.html`, `restaurant-dashboard.component.html` | CRUD de mesas |
| web-empleados | `features/tables/**` (nuevo), `app.routes.ts`, `shell.component.html` | Página `/mesas` |
| web-clientes | `core/models/table.model.ts`, `core/services/table.service.ts` (nuevos), `core/store/cart.store.ts`, `core/services/order.service.ts`, `features/tables/table-selection.component.ts` (nuevo), `app.routes.ts`, `restaurant-list.component.ts`, `restaurant-menu.component.ts`, `cart.component.ts` | Selección de mesa |

## 5. Cambios en la API

Base: `/api/v1/restaurants/:restaurantId/tables`.

**Representación de una mesa**

```json
{
  "id": "uuid",
  "number": 3,
  "description": "Junto a la ventana",
  "capacity": 4,
  "status": "libre",
  "restaurantId": "rest-1",
  "createdAt": "2026-10-22T10:00:00.000Z",
  "updatedAt": "2026-10-22T10:00:00.000Z"
}
```

| Método | Ruta | Roles | Cuerpo / query | Respuestas |
|--------|------|-------|----------------|------------|
| `GET` | `/available?people=N` | `cliente` | `people`: entero 1-50 | 200 lista de mesas `libre` con `capacity >= N`, por capacidad ascendente; 400 `InvalidPartySizeError` |
| `POST` | `/:id/occupy` | `cliente` | — | 200 mesa con `status: "ocupada"`; 404 no existe en ese restaurante; 409 `TableNotAvailableError` |
| `GET` | `/` | admin, manager, camarero (+ `authorizeRestaurant`) | — | 200 lista ordenada por `number` |
| `GET` | `/:id` | admin, manager, camarero | — | 200 / 404 |
| `POST` | `/` | admin, manager | `{ number, description?, capacity, status? }` (`status` por defecto `libre`) | 201 / 400 validación / 409 número duplicado |
| `PUT` | `/:id` | admin, manager | `{ number, description, capacity, status }` | 200 / 400 / 404 / 409 |
| `PATCH` | `/:id/status` | admin, manager, camarero | `{ status }` | 200 mesa actualizada / 400 estado inválido / 404 |
| `DELETE` | `/:id` | admin, manager | — | 204 / 404 / 409 si está `ocupada` |

Validaciones: `number` entero ≥ 1; `capacity` entero 1-50; `description` cadena ≤ 200 caracteres o `null`; `status` ∈ {`libre`, `ocupada`, `reservada`}.

**Modificado**: `POST /api/v1/orders` — si `tableId` no es `null` y no corresponde a una mesa `ocupada` del `restaurantId` del pedido → 400 `InvalidOrderError` (`"Table is not occupied in this restaurant"`).

## 6. Lista de tareas

Cada tarea debe poder hacerse en 5-10 minutos. En la API se trabaja con TDD (test primero, `npx vitest run <archivo>`).

**API — base**

- [x] **T1** (~5 min): Añadir `CREATE TABLE IF NOT EXISTS restaurant_tables (id TEXT PK, restaurant_id TEXT NOT NULL FK, number INTEGER NOT NULL, description TEXT, capacity INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'libre', created_at, updated_at, UNIQUE(restaurant_id, number))` e índice por `restaurant_id`; test en `database.test.ts` que comprueba que la tabla existe — `packages/api/src/config/database.ts`
- [x] **T2** (~5 min): Añadir los errores de mesa (`TableNotFoundError`, `TableNumberRequiredError`, `InvalidCapacityError`, `InvalidTableStatusError`, `InvalidPartySizeError`, `DuplicatedTableNumberError`, `TableNotAvailableError`) — `packages/api/src/errors/DomainErrors.ts`
- [ ] **T3** (~5 min): En `errorHandler`, `TableNotFoundError` en `NOT_FOUND_ERRORS` y nueva lista `CONFLICT_ERRORS` (`DuplicatedTableNumberError`, `TableNotAvailableError`) → 409; tests en `errorHandler.test.ts` — `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts`
- [ ] **T4** (~5 min): Crear `table.model.ts` con `Table`, `VALID_TABLE_STATUSES`, `TableStatusType` y `normalizeTableStatus` (lanza `InvalidTableStatusError`); test `table.model.test.ts` — `packages/api/src/models/table.model.ts`

**API — repositorio**

- [ ] **T5** (~10 min): `TableRepository` + `SqliteTableRepository` con `findByRestaurantId` (orden por `number`), `findByIdInRestaurant`, `findByNumber(restaurantId, number)` y mapeo fila→`Table`; test `table.repository.test.ts` con BD `:memory:` — `packages/api/src/repositories/table.repository.ts`
- [ ] **T6** (~10 min): Métodos `save` (insert/update con `ON CONFLICT(id) DO UPDATE`), `delete` y `updateStatus`; tests — `packages/api/src/repositories/table.repository.ts`
- [ ] **T7** (~10 min): `findAvailable(restaurantId, minCapacity)` (`status = 'libre' AND capacity >= ?` ordenado por `capacity, number`) y `occupyIfFree(id, restaurantId): Promise<boolean>` atómico; tests incluido que una segunda ocupación devuelve `false` — `packages/api/src/repositories/table.repository.ts`
- [ ] **T8** (~5 min): `MockTableRepository` en memoria con los mismos métodos — `packages/api/src/repositories/mocks/MockTableRepository.ts`

**API — servicio**

- [ ] **T9** (~10 min): `TableService.create` (valida `number`, `capacity`, `description`, `status`; `DuplicatedTableNumberError` si el número existe) y `findByRestaurantId`; tests `table.service.test.ts` — `packages/api/src/services/table.service.ts`
- [ ] **T10** (~10 min): `findById`, `update` (404 si no existe en el restaurante; duplicado solo si el número es de otra mesa) y `delete` (409 si está `ocupada`); tests — `packages/api/src/services/table.service.ts`
- [ ] **T11** (~5 min): `changeStatus(restaurantId, id, status)`; tests de estado inválido y mesa inexistente — `packages/api/src/services/table.service.ts`
- [ ] **T12** (~10 min): `findAvailable(restaurantId, people)` (valida entero 1-50 → `InvalidPartySizeError`) y `occupy(restaurantId, id)` (404/409 según el caso); tests — `packages/api/src/services/table.service.ts`
- [ ] **T13** (~10 min): Inyectar `TableRepository` en `OrderService` y validar `tableId` en `create` (mesa del restaurante y `ocupada`); actualizar las construcciones existentes en `order.service.test.ts` y añadir tests (mesa libre, de otro restaurante, inexistente, `null` permitido) — `packages/api/src/services/order.service.ts`

**API — controlador y rutas**

- [ ] **T14** (~10 min): `TableController` (estilo arrow functions de `DishController`) con `create`, `getAll`, `getById`, `update`, `changeStatus`, `delete`, `getAvailable` (lee `req.query.people` y lo convierte a número), `occupy` y `toJSON` — `packages/api/src/controllers/table.controller.ts`
- [ ] **T15** (~10 min): `table.routes.ts` (`Router({ mergeParams: true })`) con los roles de la sección 5, `/available` antes de `/:id`; montarlo en `app.ts` en `/api/v1/restaurants/:restaurantId/tables`; pasar `SqliteTableRepository` a `OrderService` en `order.routes.ts` — `packages/api/src/routes/table.routes.ts`
- [ ] **T16** (~5 min): Helper `crearMesa(id, restaurantId, number, capacity, status)` — `packages/api/src/test/http.ts`
- [ ] **T17** (~10 min): Tests de rutas de gestión: 401 sin token, 403 cocinero y manager de otro restaurante, CRUD 201/200/204 como manager, 409 número duplicado, `PATCH status` como camarero — `packages/api/src/routes/table.routes.test.ts`
- [ ] **T18** (~10 min): Tests de rutas de cliente: `GET /available?people=4` filtra y ordena, 400 con `people=0`, `POST /:id/occupy` 200 y luego 409, 403 si lo llama un camarero; test en `order.routes.test.ts` de pedido con mesa no ocupada → 400 — `packages/api/src/routes/table.routes.test.ts`
- [ ] **T19** (~10 min): Seed: 6 mesas para `rest-1` y 4 para `rest-2` con ids fijos (`INSERT OR IGNORE`), capacidades 2-8; el pedido de ejemplo usa una mesa real marcada `ocupada` en vez de `'5'` — `packages/api/src/scripts/seed.ts`

**web-admin**

- [ ] **T20** (~5 min): Modelo `Table`, `TableStatus`, `CreateTableDto` y `TableService` HTTP (`getAll`, `getById`, `create`, `update`, `delete`) — `packages/web-admin/src/app/features/tables/{models,services}/`
- [ ] **T21** (~5 min): `TableStore` con signals (`tables`, `loading`, `error`) y `loadByRestaurant`, `create`, `update`, `delete`, igual que `DishStore` — `packages/web-admin/src/app/features/tables/store/table.store.ts`
- [ ] **T22** (~10 min): `TableListComponent`: tabla con número, descripción, capacidad y estado (badge), botones editar/borrar con confirmación y mensaje de error si la API devuelve 409 — `packages/web-admin/src/app/features/tables/pages/table-list/`
- [ ] **T23** (~10 min): `TableFormComponent` (alta/edición) con validación de número ≥ 1, capacidad 1-50 y selector de estado; muestra el error de número duplicado — `packages/web-admin/src/app/features/tables/pages/table-form/`
- [ ] **T24** (~5 min): `tables.routes.ts` (`''`, `new`, `:id/edit`), ruta `tables` en `app.routes.ts`, enlace "Mesas" en el menú lateral y tarjeta en el dashboard del restaurante — `packages/web-admin/src/app/app.routes.ts`

**web-empleados**

- [ ] **T25** (~10 min): Modelo `Table`, `TableService` (`getAll(restaurantId)`, `changeStatus`) y `TableStore` (con `restaurantId` del `AuthStore`, polling de 30 s como `OrderStore`) — `packages/web-empleados/src/app/features/tables/`
- [ ] **T26** (~10 min): `MesasComponent`: tarjetas por mesa con número, capacidad, estado y `<select>` para cambiarlo; arranca/para el polling de mesas y de `OrderStore` — `packages/web-empleados/src/app/features/tables/pages/mesas/`
- [ ] **T27** (~10 min): En las mesas `ocupada`, listar los pedidos activos de `OrderStore` con `tableId === mesa.id` y el estado de cada plato — `packages/web-empleados/src/app/features/tables/pages/mesas/mesas.component.html`
- [ ] **T28** (~5 min): Ruta `/mesas` con `roleGuard` y `data.roles: ['camarero', 'manager']`; enlace "Mesas" en el shell visible solo para esos roles — `packages/web-empleados/src/app/app.routes.ts`

**web-clientes**

- [ ] **T29** (~5 min): Modelo `Table` y `TableService` (`getAvailable(restaurantId, people)`, `occupy(restaurantId, tableId)`) — `packages/web-clientes/src/app/core/{models,services}/`
- [ ] **T30** (~10 min): `CartStore`: signal `tableId` con `setTable(restaurantId, tableId)`, persistencia en `sessionStorage` con `try/catch`; `clear()` conserva la mesa y se añade `clearTable()`; `addItem` de otro restaurante no hereda la mesa — `packages/web-clientes/src/app/core/store/cart.store.ts`
- [ ] **T31** (~10 min): `TableSelectionComponent`: input de número de personas, botón "Buscar mesas", lista de mesas disponibles seleccionables y botón "Continuar" que llama a `occupy`, guarda la mesa en `CartStore` y navega a `/restaurants/:id`; si la API devuelve 409, avisa y recarga la lista — `packages/web-clientes/src/app/features/tables/table-selection.component.ts`
- [ ] **T32** (~5 min): Ruta `restaurants/:id/mesa`; el listado de restaurantes enlaza a ella; `RestaurantMenuComponent` redirige a `/restaurants/:id/mesa` si no hay mesa elegida para ese restaurante — `packages/web-clientes/src/app/app.routes.ts`
- [ ] **T33** (~5 min): `OrderService.createOrder` recibe `tableId` y `CartComponent` lo pasa desde `CartStore`; mostrar el número de mesa en el carrito — `packages/web-clientes/src/app/core/services/order.service.ts`

**Verificación y documentación**

- [ ] **T34** (~5 min): `npm test` en verde y `npm run build -w` de `web-admin`, `web-empleados` y `web-clientes` sin errores — (raíz)
- [ ] **T35** (~10 min): Verificación manual con `curl` y en el navegador según la sección 7 — (manual)
- [ ] **T36** (~10 min): Documentar `restaurant_tables` en `docs/dominio/modelo-datos.md`, "Mesa" y sus estados en `docs/dominio/glosario.md`, los endpoints en `docs/arquitectura/arquitectura-api.md`, los permisos en `docs/arquitectura/seguridad.md` y las nuevas páginas en `docs/arquitectura/arquitectura-frontend.md` — `docs/`

## 7. Verificación

Además de los tests unitarios (`npm test`), verificación manual tras `npm run seed` y `npm run dev:api`:

```bash
API=http://localhost:3000/api/v1
token() { curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$1\"}" | jq -r .token; }
GER=$(token gerente1@resttek.com); CAM=$(token camarero1@resttek.com)
COC=$(token cocinero1@resttek.com); CLI=$(token cliente1@resttek.com)

# CRUD como manager de rest-1
curl -s -H "Authorization: Bearer $GER" $API/restaurants/rest-1/tables | jq           # 200, mesas del seed
curl -s -X POST -H "Authorization: Bearer $GER" -H 'Content-Type: application/json' \
  -d '{"number":20,"description":"Terraza","capacity":4}' $API/restaurants/rest-1/tables # 201, status "libre"
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $GER" -H 'Content-Type: application/json' \
  -d '{"number":20,"capacity":4}' $API/restaurants/rest-1/tables                         # 409 duplicado
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $GER" $API/restaurants/rest-2/tables # 403
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $COC" $API/restaurants/rest-1/tables # 403

# Flujo de cliente
curl -s -H "Authorization: Bearer $CLI" "$API/restaurants/rest-1/tables/available?people=4" | jq # libres, capacity >= 4, ascendente
MESA=<id de la primera>
curl -s -X POST -H "Authorization: Bearer $CLI" $API/restaurants/rest-1/tables/$MESA/occupy | jq # 200, "ocupada"
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H "Authorization: Bearer $CLI" \
  $API/restaurants/rest-1/tables/$MESA/occupy                                             # 409
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $CLI" \
  "$API/restaurants/rest-1/tables/available?people=0"                                     # 400

# Pedido con mesa ocupada (201) y con mesa libre (400)
curl -s -X POST -H "Authorization: Bearer $CLI" -H 'Content-Type: application/json' \
  -d "{\"restaurantId\":\"rest-1\",\"tableId\":\"$MESA\",\"items\":[{\"dishId\":\"<plato de rest-1>\",\"quantity\":1,\"notes\":null}]}" $API/orders

# Camarero libera la mesa; borrar una ocupada da 409
curl -s -X PATCH -H "Authorization: Bearer $CAM" -H 'Content-Type: application/json' \
  -d '{"status":"libre"}' $API/restaurants/rest-1/tables/$MESA/status | jq               # 200
```

**Navegador**

- `web-clientes` (:4202) con `cliente1@resttek.com`: elegir restaurante → indicar 4 personas → solo aparecen mesas libres de ≥4 → Continuar → carta → pedido; en "Mis pedidos" el pedido tiene mesa. Recargar la carta no pide otra mesa. Intentar entrar a `/restaurants/rest-1` sin mesa redirige a la selección.
- `web-empleados` (:4201) con `camarero1@resttek.com`: `/mesas` muestra la mesa ocupada con su pedido; cambiar a `libre` la hace aparecer de nuevo al cliente. Con `cocinero1@resttek.com` el enlace no aparece y `/mesas` redirige.
- `web-admin` (:4200) con `admin@resttek.com`: crear, editar y borrar una mesa; borrar una ocupada muestra el error.

## 8. Riesgos y dudas abiertas

- **Sin clave foránea en `orders.table_id`**: las migraciones son `CREATE TABLE IF NOT EXISTS`, así que una FK no se aplicaría a BD existentes y rompería los pedidos del seed con `table_id = '5'`. La integridad se garantiza en `OrderService`. Las BD locales existentes conservarán pedidos con `'5'` hasta borrar `resttek.db` y volver a sembrar.
- **Mesa ocupada sin pedido**: si el cliente ocupa una mesa y abandona, queda `ocupada` hasta que el gerente o un camarero la libere (decisión: liberación solo manual).
- **Cualquier cliente puede pedir a una mesa ocupada por otro** si conoce su id: no se guarda qué cliente ocupó la mesa. Si se quiere restringir, habría que añadir `occupied_by` (fuera de alcance).
- **Estado en `sessionStorage`**: si el cliente cambia de dispositivo o borra datos, perderá la mesa elegida y tendrá que pedir a un camarero que la libere.
- **Plantilla de la skill**: indica que el proyecto no tiene tests, pero la API sí tiene vitest (ver `CLAUDE.md`); el plan incluye tests en la API y verificación manual en los frontends.
- No se ha comprobado `docs/api/api-pagination.md` porque no existe en el repositorio; los listados de mesas no se paginan (un restaurante tiene pocas mesas).

## 9. Documentación a actualizar

- `docs/dominio/modelo-datos.md`: tabla `restaurant_tables` y relación con `orders.table_id`.
- `docs/dominio/glosario.md`: término "Mesa" y estados `libre`/`ocupada`/`reservada`.
- `docs/arquitectura/arquitectura-api.md`: endpoints de mesas.
- `docs/arquitectura/seguridad.md`: matriz de roles de mesas y endpoints de cliente sin `authorizeRestaurant`.
- `docs/arquitectura/arquitectura-frontend.md`: feature `tables` en `web-admin` y `web-empleados`, selección de mesa en `web-clientes`.
