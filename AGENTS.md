# AGENTS.md — Contexto persistente del proyecto "Estudio de Yoga Andrea"

> Instrucciones generales que el agente debe respetar en TODA tarea de este repositorio.
> Las specs de cada feature viven en `/specs`. Las skills en `/skills`.

## 1. Qué es el producto
App web mobile-first para un estudio de yoga pequeño (1 administradora, 2 instructoras, ~100 alumnas).
Reemplaza las tarjetas de papel selladas a mano, gestiona el cupo de las clases y avisa cambios.

Usuarias:
- **Andrea (ADMIN):** da de alta paquetes, ajusta saldos, cancela/sustituye clases.
- **Instructoras (INSTRUCTOR) — Marta y Sofía en la demo:** marcan asistencia desde el celular.
- **Alumnas (STUDENT):** solo consultan su tarjeta (saldo e historial). Usan solo el celular y no son técnicas.

La app está pensada primero para Andrea y las instructoras: simple, rápida, que dé calma al usarla.

## 2. Alcance permanente
**Dentro:** paquetes de 10 clases y su historial, reservas, cupo de 12 personas, lista de espera, avisos por WhatsApp (enlaces `wa.me`).

**Fuera (no implementar nunca, aunque parezca útil):**
- Pagos online (Stripe, PayPal, MercadoPago). El cobro es en persona o por transferencia.
- Videos, rutinas, catálogo de posturas o planes de entrenamiento.
- Tienda, carrito o venta de productos.
- Envío automático de WhatsApp por API de pago: solo se generan enlaces `wa.me` que una persona toca.

## 3. Stack y arquitectura
- React + TypeScript, Vite. Estilos con Tailwind.
- Persistencia: `localStorage` detrás de una interfaz de repositorio (`src/infrastructure/db.ts`) para poder cambiar a una base real sin tocar el dominio.
- Lógica de negocio en `src/domain/` como funciones puras y testeables. **La UI nunca modifica saldos directamente**, siempre llama al dominio.
- Tests con Vitest en `/tests`.
- No agregues dependencias nuevas sin justificarlo en la spec.

## 4. Invariantes del negocio (nunca se rompen)
1. Un saldo de paquete nunca es negativo.
2. Todo cambio de saldo genera una entrada en el historial (`audit log`). El historial es solo de agregado: no se edita ni se borra.
3. Una clase nunca tiene más reservas confirmadas que su cupo (12 por defecto).
4. La lista de espera es FIFO.
5. Las fechas se guardan en ISO 8601 con zona horaria y se muestran en hora local, formato 24 h.

## 5. Forma de trabajar (Spec-Driven)
1. Lee la spec del feature en `/specs` antes de escribir código.
2. Escribe primero los tests de los criterios de aceptación (rojo), luego el código (verde).
3. Modifica solo los archivos que la spec autoriza.
4. Si algo no está en la spec, **pregunta**; no lo inventes.
5. Si un criterio no se cumple, se corrige la spec primero, luego se reimplementa.
6. Al terminar, reporta qué criterio cubre cada test.

## 6. Seguridad (el repositorio es público)
1. **Nunca** subas credenciales: API keys, tokens, contraseñas, `.env`. Solo existe `.env.example` con valores de ejemplo.
2. Antes de cada commit, revisa el diff buscando secretos (`AIza…`, `sk-…`, `ghp_…`, claves privadas).
3. No pongas datos personales reales en el código ni en los datos de demo: usa nombres y teléfonos ficticios.
4. Los enlaces de WhatsApp se arman con `encodeURIComponent` y se abren con `rel="noopener noreferrer"`.
5. Valida y limita el largo de toda entrada de texto. No uses `dangerouslySetInnerHTML` ni `eval`.
6. No agregues dependencias sin uso; corre `bun audit` antes de entregar.
7. La app guarda datos en `localStorage` del navegador: es una demo, no un sistema con login. No la uses con datos reales sin agregar autenticación y backend (fuera de alcance).

## 7. Estilo de código y UI
- Nombres de código en inglés; textos visibles en español neutro, trato de "tú".
- Funciones pequeñas, sin `any`.
- Botones de al menos 44 px de alto, legibles en celular, contraste AA.
- La identidad visual **y la voz** ("Calma Activa") se rigen por la skill `skills/brand-design/SKILL.md`. Todo texto visible pasa su checklist.
