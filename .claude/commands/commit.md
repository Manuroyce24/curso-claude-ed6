---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: [tipo(ámbito)] [mensaje opcional]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*)
---

# Crear commit con Conventional Commits

Crea un commit de los cambios actuales siguiendo la especificación [Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/).

## Contexto

- Estado del repositorio: !`git status --short`
- Cambios en staging: !`git diff --cached --stat`
- Cambios sin añadir: !`git diff --stat`
- Últimos commits (para respetar el estilo): !`git log --oneline -10 2>/dev/null || echo "(sin commits todavía)"`

## Argumentos

`$ARGUMENTS`: pista opcional del usuario (tipo, ámbito o descripción). Úsala como orientación, pero verifica que encaje con el diff real.

## Formato

```
<tipo>[ámbito opcional][!]: <descripción>

[cuerpo opcional]

[pie(s) opcional(es)]
```

### Tipos permitidos

| Tipo       | Uso                                                        |
|------------|------------------------------------------------------------|
| `feat`     | Nueva funcionalidad                                        |
| `fix`      | Corrección de un error                                     |
| `docs`     | Cambios solo de documentación                              |
| `style`    | Formato que no afecta al significado (espacios, comas...)  |
| `refactor` | Cambio de código que ni corrige un error ni añade función  |
| `perf`     | Mejora de rendimiento                                      |
| `test`     | Añadir o corregir tests                                    |
| `build`    | Sistema de build o dependencias (`package.json`...)        |
| `ci`       | Configuración de integración continua                      |
| `chore`    | Tareas de mantenimiento que no tocan `src` ni tests        |
| `revert`   | Revierte un commit anterior                                |

### Reglas

1. Descripción en **español**, en imperativo y minúscula inicial, sin punto final y de **72 caracteres o menos** en la primera línea (por ejemplo: `feat(repositories): añade acceso a SQLite para vendehumos`).
2. Ámbito opcional entre paréntesis, con el nombre de la capa o módulo afectado (`routes`, `controllers`, `services`, `repositories`, `models`, `helpers`, `docs`...).
3. Cuerpo opcional, separado por una línea en blanco, que explique el **porqué** y no el qué.
4. Cambios incompatibles: añade `!` tras el tipo/ámbito y/o un pie `BREAKING CHANGE: <explicación>`.
5. Referencias a issues en el pie (`Closes #12`).
6. Un commit = un cambio lógico. Si el diff mezcla varios propósitos, propón dividirlo en varios commits y hazlos por separado.

## Pasos

1. Revisa el contexto anterior y, si hace falta, ejecuta `git diff` / `git diff --cached` para entender los cambios en detalle.
2. Si no hay nada en staging, añade solo los archivos relevantes con `git add <archivos>` (nunca `git add -A` a ciegas; no incluyas secretos, `.env`, `node_modules` ni ficheros generados).
3. Determina el tipo y el ámbito que mejor describan el cambio.
4. Redacta el mensaje cumpliendo las reglas anteriores y muestraselo al usuario utilizando la tool `AskUserQuestion` para preguntarle si le parece bien el mensaje. sino le parece bien, genera otro mensaje y le vuelves a preguntar. cuando lo de por valido sigue con el paso 5.
5. Crea el commit con `git commit -m` (usa varios `-m` o un heredoc para cuerpo y pies). Termina el mensaje con las líneas de atribución que indique el sistema, si las hay.
6. Ejecuta `git status` para confirmar que el commit se ha creado y muestra al usuario el mensaje final.

## Restricciones

- No hagas `git push` ni modifiques la configuración de git.
- No uses `--no-verify` ni `--amend` salvo petición expresa.
- Si hay un hook que falla, corrige el problema y crea un commit **nuevo**.
- Si no hay cambios que commitear, indícalo y no crees un commit vacío.
