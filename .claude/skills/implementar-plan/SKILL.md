name: implement-plan
description: Implementa un plan de docs/plans/ (generado con plan-feature) creando una rama desde development en un git worktree propio (uno por agente si varios agentes implementan distintas apps) y aplicando TDD estricto tarea a tarea, con un commit por tarea y marcando cada tarea como hecha en el plan. Úsala cuando el usuario pida implementar, desarrollar o ejecutar un plan. Requiere que se adjunte el plan.
argument-hint: <ruta del plan> [nº de ticket]
allowed-tools: Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git switch:*), Bash(git worktree:*), Bash(git rev-parse:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Bash(git diff:*), Bash(npx vitest:*), Bash(npm test:*), Bash(npm install:*), Bash(npm i:*), mcp__slack__slack_list_channels, mcp__slack__slack_post_message
---

# Implementar un plan con TDD estricto

Implementa el plan indicado: $ARGUMENTS

## Paso 0: requisitos de entrada

1. **El plan es obligatorio.** Debe venir adjunto o indicado como ruta (normalmente `docs/plans/<AAAA-MM-DD>-<slug>.md`). Si no se ha aportado, **detente y pídelo**; no elijas uno por tu cuenta ni implementes de memoria.
2. Lee el plan completo y `CLAUDE.md` (arquitectura por capas, convenciones, mensajes en español). Si el plan tiene dudas abiertas (sección 8) que bloqueen una decisión, pregúntalas al usuario antes de empezar.
3. Si el plan no tiene lista de tareas con `- [ ] **T<n>**`, detente e indica que hay que generarlo con `plan-feature`.
4. Comprueba que el árbol de trabajo está limpio (`git status --short`). Si hay cambios sin commitear que no sean el propio plan, avisa al usuario y pregunta cómo proceder (no los pierdas ni los mezcles con la implementación). Si el plan aparece como no versionado, se incluirá en el primer commit que lo modifique.

## Paso 1: crear la rama

### 1.1 Rama base `development`

1. Comprueba si existe `development` (local o `origin/development`): `git branch --list development` y `git branch -r --list origin/development`.
2. **Si no existe**, créala primero desde la rama principal: `main` si existe; si no, `master`. Ejemplo: `git switch -c development main`. Si no existe ninguna de las dos, detente y avisa.
3. Si existe solo en remoto, crea la local con seguimiento: `git switch development`.
4. **Nunca** trabajes directamente sobre `development`, `main` ni `master`.

### 1.2 Nombre de la rama

Formato obligatorio: `<tipo-cambio>/<num-ticket>-<breve-descripcion>`

- `tipo-cambio`: tipo de Conventional Commits derivado del campo **Tipo** del plan: `feature` → `feat`, `bug` → `fix`; si el plan lo indica de otra forma (`refactor`, `docs`, `chore`, `perf`, `test`…), úsalo. Si el cambio rompe compatibilidad, la rama sigue usando el tipo base (el `!` solo va en los commits).
- `num-ticket`: número del ticket. Sácalo del argumento, del plan o del mensaje del usuario. **Si no aparece en ninguno, pregúntalo**; no lo inventes.
- `breve-descripcion`: kebab-case, sin acentos, 2-5 palabras (normalmente el slug del plan sin la fecha ni el prefijo `fix-`).
- Ejemplo: `feat/123-asociar-vendehumo-usuario`.

Si la rama ya existe, no la sobrescribas: pregunta al usuario si continuar en ella (útil para reanudar un plan a medias). La rama **no se crea con `git switch -c`**, sino junto con su worktree (ver 1.3).

### 1.3 Worktree de trabajo

Todos los cambios se hacen en un **`git worktree`** propio, nunca en el directorio principal del repositorio, que permanece intacto en su rama actual.

1. Ruta del worktree: carpeta hermana del repositorio, fuera de él, con el formato `../<nombre-repo>-worktrees/<rama con "/" sustituido por "-">` (p. ej. `../base-curso-desarrollo-con-ia-worktrees/feat-123-filtro-por-nombre`).
2. Créalo junto con la rama desde `development`: `git worktree add -b <rama> <ruta> development`.
   - Si la rama ya existe y el usuario confirma continuar en ella: `git worktree add <ruta> <rama>`. Si la rama ya está desplegada en otro worktree (`git worktree list`), reutiliza ese en lugar de crear otro.
3. A partir de aquí, **todos los comandos** (tests, `git add`, `git commit`, `npm install`…) se ejecutan dentro del worktree (`cd <ruta>` o `git -C <ruta>`), y las rutas de archivos que edites son las del worktree, incluido el plan.
4. Un worktree nuevo no tiene `node_modules`: ejecuta `npm install` en él antes del Paso 2.
5. Si el plan no está versionado (no existe en `development`), cópialo al worktree y trabaja con esa copia; se incluirá en el primer commit que lo modifique.

### 1.4 Plan que afecta a varias aplicaciones con varios agentes

Aplica solo si el plan afecta a varias aplicaciones (paquetes de `packages/`) **y el usuario pide que varios agentes las implementen, cada uno una app**. Si la implementa un único agente, usa un solo worktree (1.3).

1. Genera **un worktree y una rama por agente/app**, todos desde `development`. La rama añade la app como sufijo: `<tipo-cambio>/<num-ticket>-<breve-descripcion>-<app>` (p. ej. `feat/123-filtro-por-nombre-api`, `feat/123-filtro-por-nombre-web-admin`) y el worktree sigue el formato de 1.3 con ese nombre de rama.
2. Lanza un agente por app, indicándole en su prompt: la ruta de **su** worktree (único donde puede escribir), su rama, la app a su cargo, **solo las tareas del plan que corresponden a esa app** y que siga los Pasos 2 a 4 en su worktree. Los agentes no tocan el worktree de otro ni el directorio principal.
3. Cada agente marca como hechas únicamente sus tareas en la copia del plan de su worktree, para evitar conflictos al integrar. Respeta las dependencias entre tareas del plan (p. ej. si el front necesita el endpoint de la API, la API va antes o se acuerda el contrato en el plan).
4. Cuando terminen todos, comprueba que cada worktree tiene la suite en verde y el árbol limpio, y haz el cierre (Paso 5) una sola vez, reportando rama y worktree de cada agente. No fusiones las ramas entre sí salvo que el usuario lo pida.

## Paso 2: preparar el entorno de pruebas

El proyecto puede no tener framework de tests (`npm test` es un placeholder). Comprueba `package.json` y las carpetas `test/`/`tests/`.

- El framework de tests es **vitest**. Si no está instalado, añádelo como devDependency (`npm install -D vitest`); es la única dependencia nueva permitida, no añadas otras (p. ej. supertest). Para probar HTTP, importa `src/app.js` (no abre puerto), arráncala con `app.listen(0)` y llama con `fetch`.
- El código de `src/` es CommonJS: los tests pueden ser ESM (`import { describe, it, expect } from 'vitest'`) e importar los módulos CJS (`import app from '../../src/app.js'`) o usar `createRequire`. Si vitest no resuelve `node:sqlite`, configura `test.server.dep****ternal` o `resolve.external` en `vitest.config.js` para tratarlo como módulo nativo.
- Usa `DB_PATH=:memory:` en los tests (y `JWT_SECRET` de prueba) para aislar la BBDD. Como `src/` usa módulos con estado (la conexión a SQLite se crea al importar), usa `vi.resetModules()` o `pool: 'forks'`/aislamiento por archivo para que cada archivo de test parta de una BBDD limpia.
- Ubicación: `test/`, reflejando `src/` (p. ej. `test/services/vendehumo.service.test.js`, `test/api/vendehumo.test.js`). Ejecución: `npx vitest run`. Nombre de archivos: `*.test.js`.
- Este andamiaje (vitest en `devDependencies`, `vitest.config.js` con `DB_PATH=:memory:` y `JWT_SECRET` de prueba en `test.env`, carpeta `test/`, script `test` de `package.json` → `vitest run`, y un test mínimo de `/health` que demuestre que funciona) se hace **en su propio commit previo** (`chore(test): ...`) antes de la primera tarea, y solo si no existe ya. Comprueba que `npx vitest run` arranca sin errores antes de continuar.
- Antes de la primera tarea, ejecuta la suite una vez para conocer la línea base. Si ya hay tests rotos, avisa al usuario.

## Paso 3: bucle por tarea (TDD estricto)

Procesa las tareas **en el orden del plan**, una por una y sin saltarte ninguna. Para cada tarea `T<n>`:

### 🔴 Rojo
1. Escribe primero **un test** que exprese el resultado verificable de la tarea (comportamiento, no implementación). No escribas código de producción todavía.
2. Ejecútalo (`npx vitest run <archivo>`) y **comprueba que falla, y que falla por la razón esperada** (aserción incumplida, no un error de sintaxis o de import). Si pasa sin tocar código, el test no sirve o la tarea ya estaba hecha: revísalo antes de seguir.

### 🟢 Verde
3. Escribe el **código mínimo** que haga pasar el test, en el archivo y capa que indica la tarea, respetando la arquitectura (`routes` → `controllers` → `services` → `repositories`) y las convenciones de `CLAUDE.md`.
4. Ejecuta **toda la suite** (`npx vitest run`): todo en verde, incluidos los tests anteriores.

### 🔵 Refactor
5. Limpia duplicación o nombres sin cambiar comportamiento; vuelve a ejecutar la suite en verde.

### Cierre de tarea
6. **Marca la tarea como hecha en el plan**: cambia `- [ ] **T<n>**` por `- [x] **T<n>**` en el archivo del plan (solo esa línea; no reescribas el resto). Si la tarea completa un punto de la sección "Documentación a actualizar", márcalo también.
7. **Haz un commit** con el test, el código y el plan actualizado juntos (usa `git add` de archivos concretos, nunca `git add -A`). Mensaje en **Conventional Commits** en español, estilo del historial (`feat(vendehumos): ...`), con `!` si rompe compatibilidad según el plan, y el pie de atribución que corresponda. Un commit = una tarea; el asunto debe ser coherente con la tarea.
8. Pasa a la siguiente tarea.

### Reglas del TDD estricto
- **Prohibido escribir código de producción sin un test rojo previo** que lo exija.
- Un test nuevo cada vez; no encadenes varios comportamientos en una misma tarea.
- No avances a la siguiente tarea con la suite en rojo ni dejes tests deshabilitados o saltados.
- No modifiques un test para que pase; si el test estaba mal, corrígelo y explica por qué en el mensaje del commit.
- Si el comportamiento de una tarea ya está cubierto por tests de una anterior (el test nace en verde), no fuerces código artificial: documenta que ya está cubierto, marca la tarea como hecha y haz commit solo del plan (y de tests adicionales si aportan).

### Tareas que no son de código
- **Verificación manual con `curl`** (p. ej. "probar con curl..."): conviértela en tests automatizados de integración que cubran los casos del "Plan de pruebas" del plan. El ciclo rojo/verde se aplica igual: si ya pasan, la tarea consiste en añadir esos tests y comprobar que son sensibles (p. ej. rompiendo temporalmente el código y viendo que fallan, sin dejar el cambio).
- **Documentación** (`CLAUDE.md`, `docs/`): no tiene test; actualízala en español, comprueba que describe lo realmente implementado y haz el commit (`docs: ...`).
- **Migraciones o scripts**: pruébalos con un test que parta de una BBDD temporal con el esquema antiguo.

## Paso 4: si algo se tuerce

- Si una tarea es más grande de lo previsto o el plan es incorrecto/incompleto (p. ej. contradice el código real), **detente y consúltalo** con el usuario; no improvises un cambio de diseño. Si se acuerda, anota el ajuste en el plan.
- Si un test no se puede poner en verde tras un intento razonable, no fuerces el commit: informa del bloqueo con la salida del test.
- Nunca uses `--no-verify`, `git push --force`, ni reescribas commits ya hechos sin permiso.

## Paso 5: cierre

1. Cuando todas las tareas estén en `[x]`, ejecuta la suite completa una última vez, y comprueba `git status` (árbol limpio), en cada worktree si hay varios.
   - **No elimines los worktrees** (`git worktree remove`) salvo que el usuario lo pida: contienen el trabajo para revisar.
2. Cambia el campo **Estado** del plan a `completado` y haz un último commit (`docs(plan): marca el plan como completado`).
3. **No hagas push ni abras PR** salvo que el usuario lo pida.
4. Resume al usuario, en español: rama y ruta del worktree creados (uno por agente/app si procede), tareas completadas (con sus commits), resultado de la suite, y cualquier desviación o duda pendiente.
5. **Avisa por Slack** de que la implementación está lista para revisar, solo si todas las tareas están hechas y la suite está en verde:
   1. Obtén el ID del canal **`planes-ed8`** con `mcp__slack__slack_list_channels` (el servidor MCP pide el ID, no el nombre).
   2. Publica con `mcp__slack__slack_post_message` un mensaje breve en español con la rama, el plan, el nº de tareas/commits y el resultado de la suite. Ejemplo: `✅ La implementación del plan docs/plans/2026-10-15-filtro-por-nombre.md ya está lista para revisar en la rama feat/123-filtro-por-nombre (6 tareas, 24 tests en verde).`
   3. Si el canal no existe, Slack no está disponible o el envío falla, **no abortes ni reintentes en bucle**: indícalo al usuario. No incluyas secretos ni tokens en el mensaje.
   4. Si el proceso se detuvo por un bloqueo (Paso 4), **no** envíes el aviso de revisión.