# Estudio de Yoga Andrea — Spec-Driven Development

App mobile-first para el estudio de yoga de Andrea: paquetes de 10 clases con historial verificable, cupo de 12 personas, lista de espera y avisos por WhatsApp.

Demo: https://yoga-studio-app-vert.vercel.app

## Tarea 2 — De prompt a especificación
| Punto | Archivo |
|---|---|
| 1. Contexto persistente | [`AGENTS.md`](AGENTS.md) |
| 2. Especificación del feature principal | [`specs/001-paquetes-con-historial.md`](specs/001-paquetes-con-historial.md) |
| 3. Skill de diseño de marca | [`skills/brand-design/SKILL.md`](skills/brand-design/SKILL.md) |
| 4. Implementación | `src/domain/packages.ts`, `src/ui/StudentCard.tsx`, `tests/packages.test.ts` |
| Extra: spec 002 "Hoy" | [`specs/002-hoy-en-el-estudio.md`](specs/002-hoy-en-el-estudio.md), `src/domain/today.ts`, `src/ui/Today.tsx`, `tests/today.test.ts` |

Cada feature sigue el ciclo SDD en sus commits: spec → tests en rojo → dominio en verde → UI. Si un criterio falla, se corrige primero la spec (ver el registro de cambios de cada spec).

## Tarea 3 — Lanzamiento a producción
| Punto | Dónde |
|---|---|
| 1. ICP y user personas | [`docs/icp-user-persona.md`](docs/icp-user-persona.md) |
| 2. Spec nueva con criterios y métricas | [`specs/003-mi-tarjeta-en-un-toque.md`](specs/003-mi-tarjeta-en-un-toque.md) |
| 3. En producción | https://yoga-studio-app-vert.vercel.app (portada) · `#demo` (la app) |
| Implementación | `src/domain/myCard.ts`, `src/ui/MyCard.tsx`, `src/ui/LinkMetrics.tsx`, `src/ui/Landing.tsx`, `tests/my-card.test.ts` |
| Revisión automática | [`skills/pre-pr-check/SKILL.md`](skills/pre-pr-check/SKILL.md) en local y [`.github/workflows/ci.yml`](.github/workflows/ci.yml) en cada PR |

**Feature 003 "Mi tarjeta en un toque":** Andrea manda la tarjeta por WhatsApp; la alumna la abre en su
celular, ve su saldo y pide lugar en un toque. Sin servidor: la tarjeta viaja en el fragmento `#t=` del link
(no llega al servidor). En Gestión se ven las métricas de activación y retención.

## Correr el proyecto
```bash
bun install
bun run dev    # http://localhost:3000
bun run test   # criterios de las specs 001–003 y escenarios de reservas
bun run lint   # tipos
```

> Demo sin login: los datos viven en el `localStorage` del navegador y son ficticios.
