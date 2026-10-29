# Spec 002 — "Hoy": el estudio de un vistazo

**Estado:** Aprobada · **Autor:** Gastón Escalante · **Prioridad:** 2 de 3 · **Depende de:** spec 001

## 1. Problema
Andrea y las instructoras abren la app entre clase y clase, con el celular en la mano y poco tiempo.
Hoy la primera pantalla es un panel de gestión con tablas, pestañas y términos técnicos. Para saber
"¿qué tengo ahora?" hay que navegar, y marcar asistencia lleva varios toques.

**Métrica de éxito:** desde que abren la app, en **un toque** marcan la asistencia de una alumna de la clase en curso,
y en **cero toques** saben cuántas clases hay hoy, cuál sigue y qué tan lleno está el estudio.

## 2. Diseño de la solución

### Pantalla "Hoy" (inicio de Andrea y de las instructoras)
1. **Saludo-resumen** con la voz "Calma Activa" (ver `skills/brand-design/SKILL.md`):
   - "Hoy fluyes con 3 clases." + "La próxima empieza en 20 min. Todo listo."
   - Sin clases: "Hoy no hay clases." + "Día para respirar."
   - Si ya pasaron todas: "Por hoy, namasté." + "Terminaste las 3 clases."
2. **Termómetro del estudio:** una barra y una frase con la ocupación de la semana (lunes a domingo).
3. **Clases de hoy** como tarjetas en orden horario: hora, instructora, "8 de 12" y cuántas en espera.
4. Al tocar una clase se abre su **lista de asistencia**: un toque sobre la alumna marca la asistencia
   (usa `SessionService.markAttendance`, que a su vez usa `registerAttendance` de la spec 001).
   Confirmación: "Mat desplegado. {Nombre} ya está en la sala."

La gestión completa (paquetes, nuevas clases, cancelaciones) sigue en la pestaña "Gestión", solo para Andrea.
La alumna solo ve su tarjeta (spec 001).

### Funciones de dominio (`src/domain/today.ts`, puras, sin acceso a la base)
```ts
type TodayClass = { id: string; startTime: string; instructor: string;
                    taken: number; capacity: number; waiting: number; cancelled: boolean };

buildTodaySummary(classes: TodayClass[], now: Date): { title: string; detail: string };
weeklyOccupancy(classes: TodayClass[]): { percent: number; label: string };
attendanceMessage(name: string): string;
```
- `taken` = reservas `CONFIRMED` + `ATTENDED`.
- Las clases `CANCELLED` no cuentan en el resumen ni en el termómetro.
- "La próxima empieza en…": menos de 60 min → "en N min"; si no → "a las HH:MM" (24 h).

### Escala del termómetro
| Ocupación | Frase |
|---|---|
| 0 clases en la semana | "Semana en blanco. Agenda la primera clase." |
| < 40 % | "Mucho espacio para respirar." |
| 40 % – 84 % | "Buen ritmo." |
| 85 % – 99 % | "El estudio está en perfecta armonía." |
| 100 % | "Lleno total. Hora de abrir otra clase." |

### Archivos autorizados
`src/domain/today.ts`, `tests/today.test.ts`, `src/ui/Today.tsx`, `src/App.tsx`, `src/infrastructure/db.ts` (datos de demo),
`src/ui/*.tsx` (solo textos y colores de marca), `skills/brand-design/SKILL.md`, `AGENTS.md`.

### Fuera de alcance
Sustitución de instructora con "¿Quién cubre?" (spec 003), modo "Fuera del Mat" (spec 004), música, ingresos o pagos,
reservas desde la vista de alumna.

## 3. Criterios de aceptación

**CA1 — Resumen del día**
Dado 3 clases hoy a las 09:30, 19:00 y 20:15, y son las 18:40,
entonces el título es "Hoy fluyes con 3 clases." y el detalle es "La próxima empieza en 20 min. Todo listo."

**CA2 — Día sin clases y día terminado**
Dado que no hay clases hoy, el título es "Hoy no hay clases.".
Dado que son las 22:00 y las 3 clases ya empezaron, el título es "Por hoy, namasté." y el detalle "Terminaste las 3 clases."

**CA3 — Las clases canceladas no cuentan**
Dado 3 clases hoy y una está cancelada,
entonces el título dice "Hoy fluyes con 2 clases." y el termómetro no suma sus lugares.

**CA4 — Termómetro**
Dado 2 clases de 12 lugares con 10 y 11 reservas (21 de 24 = 87 %),
entonces `percent` es 87 y la frase es "El estudio está en perfecta armonía.".
Con 24 de 24, la frase es "Lleno total. Hora de abrir otra clase.".

**CA5 — Asistencia en un toque**
Dado una alumna con reserva confirmada y saldo 5,
cuando la instructora toca su nombre en la lista,
entonces la reserva queda `ATTENDED`, el saldo es 4 (spec 001)
y el mensaje es "Mat desplegado. {Nombre} ya está en la sala.".

## 4. Verificación
`bun run test` pasa `tests/today.test.ts` (tests `CA1`…`CA5`) sin romper `tests/packages.test.ts`.
Prueba manual en el preview: abrir como Marta → tocar la clase de las 19:00 → tocar una alumna → ver el mensaje y la tarjeta con una clase menos.

## 5. Registro de cambios de la spec
| Versión | Cambio | Motivo |
|---|---|---|
| 1.0 | Versión inicial a partir de las sugerencias de UX "Calma Activa" | — |
| 1.1 | Se sacan sustitución y modo "Fuera del Mat" a specs propias; el termómetro muestra ocupación y no ingresos | Un feature por spec; los pagos están fuera de alcance en `AGENTS.md` |
| 1.2 | Se agrega el caso "día terminado" (CA2) | Sin él, a la noche la app seguía diciendo "La próxima empieza…" con una hora pasada |
