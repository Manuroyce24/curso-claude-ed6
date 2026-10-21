---
name: plan-feature
description: Planifica cómo implementar una nueva funcionalidad o corregir un bug y genera un plan detallado en docs/plans. Úsala cuando el usuario pida planificar, diseñar o preparar una feature o un bugfix antes de programarlo.
argument-hint: <descripción de la funcionalidad o del bug>
---

# Planificar una funcionalidad o un bug

Genera un plan detallado en un archivo Markdown dentro de `docs/plans/`. **Esta skill solo planifica: no modifiques código fuente.**

## Entrada

`$ARGUMENTS`: descripción de la funcionalidad o del bug. Si es demasiado vaga para planificar, pregunta al usuario con `AskUserQuestion` antes de seguir.

## Pasos

1. **Clasifica** la petición: `feature` o `bugfix`.
2. **Investiga el código** necesario. Lee `CLAUDE.md` y los archivos de las capas afectadas (`routes`, `controllers`, `services`, `repositories`, `models`, `helpers`). Si es un bug, localiza la causa raíz antes de planificar. Si el cambio toca endpoints GET de listados, consulta `docs/api/api-pagination.md`.
3. **Resuelve dudas** relevantes con el usuario mediante `AskUserQuestion` (solo las que cambien el plan y no se puedan deducir del código).
4. **Redacta el plan** usando como base la plantilla [assets/plantilla-plan.md](assets/plantilla-plan.md). Respeta su estructura y el orden de sus secciones; si una sección no aplica, déjala con "No aplica" en lugar de eliminarla.
5. **Guarda el archivo** en `docs/plans/<AAAA-MM-DD>-<slug>.md`, donde `<slug>` es un nombre corto en kebab-case, sin tildes (por ejemplo `docs/plans/2026-10-15-filtro-por-nombre.md`). Crea la carpeta si no existe y no sobrescribas planes existentes.
6. **Resume** al usuario el plan (objetivo, número de tareas y dudas abiertas) e indica la ruta del archivo.
7. **Avisa por Slack** de que el plan está listo para revisar (ver más abajo). Hazlo siempre al final, una vez guardado el archivo.

## Aviso por Slack

Cuando el plan esté guardado y resumido, envía un mensaje al canal **`planes-ed8`**:

1. Obtén el ID del canal con `mcp__slack__slack_list_channels` (busca el nombre `planes-ed8`; el servidor MCP pide el ID, no el nombre).
2. Publica con `mcp__slack__slack_post_message` un mensaje breve, en español, con la ruta del plan, el objetivo en una línea y el número de tareas. Ejemplo: `📝 El plan docs/plans/2026-10-15-filtro-por-nombre.md ya está listo para revisar (Filtro por nombre, 6 tareas).`
3. Si el canal no existe, el servidor Slack no está disponible o el envío falla, **no abortes ni reintentes en bucle**: indícalo al usuario en el resumen final.
4. No incluyas secretos ni tokens en el mensaje.

## Reglas del plan

- **Idioma**: todo en español.
- **Tareas pequeñas**: la lista de tareas debe dividirse de modo que cada una lleve **entre 5 y 10 minutos**. Si una tarea parece más larga, divídela. Cada tarea indica la duración estimada y el archivo afectado.
- **Orden de tareas**: sigue la dirección de dependencias, de abajo arriba (`models` → `repositories` → `services` → `controllers` → `routes`), y deja la verificación y la documentación al final.
- **Tareas concretas**: cada una describe un cambio verificable (qué función o endpoint, qué comportamiento), no objetivos vagos.
- **Convenciones del proyecto**: respeta la arquitectura por capas (SQL solo en repositories, sin lógica en routes/controllers, errores de negocio con `ErrorServicio`), nombres en español y rutas fijas antes de `/:id`.
- **Bugs**: incluye la causa raíz, los pasos para reproducirlo y una tarea final de verificación del caso que fallaba.
- **Sin tests**: el proyecto no tiene tests ni linter; la sección de verificación debe basarse en peticiones manuales (`curl`).
- **Honestidad**: no inventes archivos ni funciones; si algo no se ha podido comprobar, anótalo en "Riesgos y dudas abiertas".
