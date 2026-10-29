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

## Correr el proyecto
```bash
bun install
bun run dev    # http://localhost:3000
bun run test   # CA1–CA5 y escenarios de reservas
```

> Demo sin login: los datos viven en el `localStorage` del navegador y son ficticios.
