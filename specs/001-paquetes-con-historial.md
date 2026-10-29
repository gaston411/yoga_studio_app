# Spec 001 — Saldo de paquete verificable (tarjeta digital)

**Estado:** Aprobada · **Autor:** Gastón Escalante · **Prioridad:** 1 de 3

## 1. Problema
Andrea vende paquetes de 10 clases y los controla con tarjetas de papel que sella a mano.
- Las alumnas pierden la tarjeta.
- Hay discusiones sobre cuántas clases quedan, y **no hay forma de comprobarlo**.

Este es el feature más importante porque afecta el dinero del estudio y la confianza con las alumnas en cada clase.
El cupo y los avisos (specs 002 y 003) dependen de que el saldo sea confiable.

**Métrica de éxito:** cero discusiones de saldo sin resolver, porque cada clase consumida tiene fecha, hora, clase y quién la registró.

## 2. Diseño de la solución

### Flujo
1. Andrea cobra en persona y **da de alta un paquete** a la alumna (10 clases).
2. La instructora **marca asistencia** en la clase: se descuenta 1 clase.
3. La alumna abre su **tarjeta digital** con su teléfono y ve el saldo y el historial.
4. Si hay un error, Andrea hace un **ajuste manual con motivo obligatorio**. Nunca borra movimientos.

### Modelo de datos
```ts
type Package = {
  id: string; studentId: string;
  totalClasses: 10; remainingClasses: number;   // >= 0
  status: 'ACTIVE' | 'EXHAUSTED';
  createdAt: string;
};
type AuditEntry = {           // solo agregar, nunca editar
  id: string; packageId: string;
  delta: number;              // -1 asistencia, +/-N ajuste
  reason: 'PACKAGE_CREATED' | 'CLASS_ATTENDED' | 'MANUAL_ADJUSTMENT';
  note?: string;              // obligatoria en MANUAL_ADJUSTMENT
  sessionId?: string;
  performedBy: 'ADMIN' | 'INSTRUCTOR';
  timestamp: string;          // ISO 8601
};
```

### Funciones de dominio (`src/domain/packages.ts`)
- `createPackage(studentId)` → crea paquete de 10 clases y entrada `PACKAGE_CREATED (+10)`. Falla si la alumna ya tiene un paquete `ACTIVE`.
- `registerAttendance(studentId, sessionId, by)` → descuenta 1 y registra `CLASS_ATTENDED`. Falla con error `NO_BALANCE` si no hay paquete activo. Falla con `ALREADY_REGISTERED` si ya se marcó esa clase.
- `adjustBalance(packageId, delta, note)` → solo ADMIN, nota obligatoria, el resultado no puede ser < 0 ni > 10.
- `getCard(studentId)` → saldo + historial ordenado del más reciente al más antiguo.

### Archivos autorizados
`src/domain/packages.ts`, `src/domain/sessions.ts` (solo para delegar la asistencia en `registerAttendance`), `src/infrastructure/db.ts`, `src/ui/AdminDashboard.tsx`, `src/ui/AttendanceList.tsx`, `src/ui/StudentCard.tsx`, `src/App.tsx` (solo para mostrar la tarjeta), `tests/packages.test.ts`.

### Notas de integración con el código existente
- El código previo (generado en AI Studio desde el prompt de la tarea 1) ya tenía `PackageService`. Las funciones de esta spec se agregan como métodos de esa clase, sin romper reservas ni avisos.
- `AuditEntry` en `db.ts` suma los campos opcionales `note` y `session_id`, el motivo `PACKAGE_CREATED` y el autor `INSTRUCTOR`.

### Fuera de alcance de esta spec
Reservas, cupo, lista de espera, vencimiento de paquetes, avisos de WhatsApp, pagos.

## 3. Criterios de aceptación

**CA1 — Alta de paquete**
Dado una alumna sin paquete activo,
cuando Andrea le da de alta un paquete,
entonces su saldo es 10 y el historial muestra 1 entrada `PACKAGE_CREATED` con +10.

**CA2 — Asistencia descuenta y deja rastro**
Dado una alumna con saldo 5,
cuando la instructora marca su asistencia a la clase del martes 19:00,
entonces el saldo es 4 y el historial muestra una entrada `-1` con la fecha, la clase y "Instructora".

**CA3 — Sin doble descuento**
Dado una asistencia ya registrada para una alumna en una clase,
cuando se intenta marcar otra vez en esa misma clase,
entonces se rechaza con `ALREADY_REGISTERED` y el saldo no cambia.

**CA4 — Saldo nunca negativo**
Dado una alumna con saldo 1,
cuando se registra su asistencia,
entonces el saldo es 0, el paquete pasa a `EXHAUSTED`,
y un nuevo intento de asistencia se rechaza con `NO_BALANCE` y el mensaje "No te quedan clases. Habla con Andrea para renovar tu paquete."

**CA5 — El historial explica el saldo**
Dado cualquier paquete,
la suma de los `delta` de su historial es igual a `remainingClasses`,
y un ajuste manual sin nota se rechaza.

## 4. Verificación
`npm test` debe pasar `tests/packages.test.ts`, con un test por cada CA (nombrados `CA1`…`CA5`).
Prueba manual: alta → 3 asistencias → la tarjeta de la alumna muestra 7 y 4 movimientos.

## 5. Registro de cambios de la spec
| Versión | Cambio | Motivo |
|---|---|---|
| 1.0 | Versión inicial generada con IA desde el prompt de la tarea 1 | — |
| 1.1 | Se reduce a un solo feature (antes había 4 escenarios) y se agrega CA3 | El prompt original mezclaba cupo, espera y avisos; el doble descuento no estaba cubierto |
| 1.2 | Se agrega CA5 y la nota obligatoria en ajustes | Sin esto, el historial podía no cuadrar con el saldo y la disputa seguía sin resolverse |
| 1.3 | Se autorizan `sessions.ts` y `App.tsx` y se agregan notas de integración | Al implementar sobre el repo existente, la asistencia se registraba en `sessions.ts` sin pasar por el saldo, y la tarjeta no tenía dónde mostrarse. Se corrigió la spec antes de tocar código |
