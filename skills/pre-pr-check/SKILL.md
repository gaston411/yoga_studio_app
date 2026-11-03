---
name: pre-pr-check
description: Revisión obligatoria antes de cada commit, push o PR del Estudio de Yoga Andrea. Úsala también cuando el usuario pida "revisar", "chequear" o "¿está listo?".
---

# Skill: Revisión antes del PR — Estudio de Yoga Andrea

## Objetivo
Responder una sola pregunta: **"¿Este cambio está listo para revisión?"**
Es el loop de revisión local del agente. El GitHub Action `.github/workflows/ci.yml` corre
**los mismos comandos** en la nube, para que local y CI den el mismo resultado.
Si cambias un comando aquí, cámbialo también en `ci.yml` (y al revés).

## Reglas generales
- Corre los **4 pasos en orden y siempre todos**, aunque uno falle: el reporte debe estar completo.
- **No modifiques archivos** durante la revisión: solo lees y reportas.
- Usa `bun`, nunca `npm`.
- No agregues dependencias al proyecto. Gitleaks es una herramienta externa y no va en `package.json`.
- Si faltan las dependencias (`node_modules` no existe), corre antes `bun install --frozen-lockfile`.

## Pasos

| # | Paso | Comando | Pasa si |
|---|---|---|---|
| 1 | Tipos | `bun run lint` | Código de salida 0 (`tsc --noEmit` sin errores) |
| 2 | Tests | `bun run test --reporter=dot` | Todos los tests en verde |
| 3 | Dependencias | `bun audit --audit-level=high` | Ninguna vulnerabilidad alta o crítica |
| 4 | Secretos | `gitleaks git --staged --redact --no-banner` | Ningún hallazgo |

### 1. Tipos
Si falla, muestra solo las líneas `archivo(línea,col): error TSxxxx: …` (máximo 20).

### 2. Tests
Usa el reporter compacto `dot`. Si falla, muestra **solo** el nombre de cada test fallido y a qué
criterio de aceptación corresponde, según la convención de `/tests`:
- El `describe` nombra la spec: `Spec 001 — …`, `Spec 002 — …`.
- El `it` empieza con el criterio: `CA1 — …`, `CA2 — …`.
- Ejemplo de reporte: `❌ Spec 001 · CA4 — Saldo nunca negativo`.
- Los tests anteriores a SDD (`Escenario N: …`) se reportan con su nombre de escenario.

### 3. Dependencias
Reporta solo vulnerabilidades **altas y críticas**: paquete, severidad y versión que lo corrige.
Las bajas y moderadas se mencionan en una línea como total, sin detalle.

### 4. Secretos
- Local: `gitleaks git --staged --redact --no-banner` revisa lo que se va a commitear.
- En CI: `gitleaks git --redact --no-banner --log-opts="BASE..HEAD"` revisa solo los commits del PR (en `main`, todo el historial).
- **Nunca imprimas un secreto.** Usa siempre `--redact` y muestra solo archivo, línea y tipo de regla.
- Si `gitleaks` no está instalado, marca el paso ⚠️, dilo y muestra cómo instalarlo
  (`brew install gitleaks`, o el binario de https://github.com/gitleaks/gitleaks/releases).
  **No lo instales sin preguntar.** Recuerda que el paso igual corre en CI.

## Ahorro de tokens
- No pegues la salida completa de ninguna herramienta. Una línea por paso.
- Si un paso pasa, escribe solo "OK".
- Si un paso falla, máximo 20 líneas relevantes del error.

## Reporte final
```
| Paso         | Estado | Detalle                      |
|--------------|--------|------------------------------|
| Tipos        | ✅     | OK                           |
| Tests        | ❌     | Spec 003 · CA2 — …           |
| Dependencias | ✅     | OK                           |
| Secretos     | ⚠️     | gitleaks no instalado        |

Veredicto: No listo: corregir Spec 003 · CA2.
```
- Estados: ✅ pasa · ❌ falla · ⚠️ no instalado.
- Veredicto en una línea: **"Listo para PR"** o **"No listo: corregir X"**.
- Si algo falla, **propón** el arreglo y di qué archivos cambiarías, pero no lo apliques sin avisar.
- Si el fallo viene de un criterio de aceptación, recuerda la regla de `AGENTS.md`:
  **se corrige primero la spec y después el código.**
