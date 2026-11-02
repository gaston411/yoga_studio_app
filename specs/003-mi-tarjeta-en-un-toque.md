# Spec 003 — "Mi tarjeta en un toque"

**Estado:** Aprobada · **Autor:** Gastón Escalante · **Prioridad:** 3 de 3 · **Depende de:** specs 001 y 002
**Persona protagonista:** Camila, la alumna (ver `docs/icp-user-persona.md`)

## 1. Problema
La alumna no sabe cuántas clases le quedan ni si hay lugar en la próxima clase sin escribirle a Andrea
y esperar la respuesta. Andrea contesta 15 a 20 mensajes por semana que solo piden su saldo.

La app guarda los datos en el navegador de Andrea (no hay servidor). Un link "normal" abierto en el
celular de la alumna **no vería nada**. La solución debe funcionar igual en el celular de la alumna.

## 2. Diseño de la solución

### Flujo (time to value < 30 s)
1. En **Gestión → Tarjetas de las alumnas**, Andrea elige a la alumna y toca **"Mandar tarjeta por WhatsApp"**.
2. Se abre WhatsApp con un mensaje para la alumna y un link a la app.
3. La alumna toca el link y ve **directo su tarjeta** (sin portada, sin cuenta, sin contraseña):
   saldo grande con los 10 sellos y las próximas clases con "Quedan 3 lugares" o "Clase llena".
4. Toca **"Pedir lugar"** (o **"Anotarme en espera"** si está llena): se abre WhatsApp con un
   mensaje para Andrea con la clase ya escrita. Andrea confirma la reserva en la app como siempre
   (spec 001 y `SessionService.bookSession`: descuenta 1, deja historial, respeta cupo y lista de espera).
5. Sin saldo: no aparece el botón. Se ve "No te quedan clases. Habla con Andrea para renovar tu paquete."
6. El historial (últimos 5 movimientos) se ve plegado debajo.

### La tarjeta viaja dentro del link
- El link lleva una **foto de solo lectura** de la tarjeta, en el fragmento `#t=` de la URL
  (JSON → UTF-8 → base64url). El fragmento **no se envía al servidor** (Vercel no lo registra).
- Contenido mínimo: nombre de pila, saldo, total, últimos 5 movimientos, próximas 5 clases
  (7 días) con lugares libres, teléfono del estudio y fecha de la foto. **Nunca** el teléfono de la
  alumna ni datos de otras alumnas.
- La tarjeta muestra "Actualizada el dd/mm a las hh:mm". La fuente de verdad sigue siendo la app de Andrea.

### Funciones de dominio (`src/domain/myCard.ts`, puras)
```ts
buildCardSnapshot(db, studentId, now, studioPhone): CardSnapshot | null;
encodeCardLink(snapshot, baseUrl): string;          // `${baseUrl}#t=<base64url>`
decodeCardHash(hash): CardSnapshot | null;          // null si es inválido; nunca lanza
buildPlaceRequestLink(snapshot, classId): string | null;  // null sin saldo o clase desconocida
buildSendCardLink(studentPhone, studentName, cardUrl): string;
computeLinkMetrics(sentEvents, bookings, now): LinkMetrics;
```

### Métricas (`src/infrastructure/linkEvents.ts`)
Cada "Mandar tarjeta" guarda `{ studentId, sentAt }` en `localStorage` (`andrea_yoga_card_links_v1`).
Las métricas se calculan en el celular de Andrea cruzando esos envíos con las reservas de la app.
Sin dependencias ni servicios de analítica.

## 3. Criterios de aceptación

| CA | Dado | Cuando | Entonces |
|---|---|---|---|
| **CA1** | Una alumna con paquete | Andrea genera su link | El link decodificado devuelve la misma tarjeta: nombre de pila, saldo, total, historial y clases. No contiene su teléfono ni datos de otra alumna. |
| **CA2** | Un link roto, alterado, de otra versión o de más de 4000 caracteres | La alumna lo abre | `decodeCardHash` devuelve `null` sin lanzar error, y la pantalla dice "Este enlace no funciona. Pídele uno nuevo a Andrea." |
| **CA3** | Clases en los próximos 7 días | Se arma la tarjeta | Aparecen solo las futuras, no canceladas, en orden horario, máximo 5. Los lugares libres = cupo − (CONFIRMED + ATTENDED), nunca negativo. |
| **CA4** | Una alumna con saldo | Toca "Pedir lugar" | Se arma un link `wa.me` al teléfono del estudio con el texto codificado con `encodeURIComponent` que nombra la clase (día, hora, instructora). Si la clase está llena, el texto pide la lista de espera. |
| **CA5** | Una alumna sin saldo | Ve su tarjeta | No hay link para pedir lugar (`null`) y se muestra `NO_BALANCE_MESSAGE`. |
| **CA6** | Envíos de tarjeta registrados | Andrea abre Gestión | Ve tarjetas enviadas, % de alumnas que reservaron en los 7 días siguientes al envío (activación) y % que reservaron 2 o más veces en 14 días (retención). Sin envíos, los porcentajes son 0 y no hay división por cero. |

## 4. Métricas de éxito

| Tipo | Métrica | Meta a 30 días | Cómo se mide |
|---|---|---|---|
| Activación | % de alumnas que reservan dentro de los 7 días de recibir su tarjeta | ≥ 40 % | Panel en Gestión (CA6) |
| Time to value | Tiempo desde abrir el link hasta ver el saldo | < 30 s, 0 pantallas intermedias | Prueba en celular real; el link abre directo la tarjeta |
| Retención | % de alumnas con 2+ reservas en los 14 días siguientes al envío | ≥ 30 % | Panel en Gestión (CA6) |
| Operativa | Mensajes "¿cuántas clases me quedan?" por semana | De 15–20 a ≤ 5 | Conteo manual de Andrea en WhatsApp |

## 5. Fuera de alcance y limitaciones
- **Sin servidor:** la tarjeta del link es una foto del momento del envío; no se actualiza sola.
  Para ver el saldo nuevo, Andrea manda otra tarjeta.
- **El link no es una credencial:** cualquiera que lo tenga ve el nombre de pila y el saldo. Por eso
  no lleva teléfono ni apellido. Alterarlo no cambia nada real: el saldo vive en la app de Andrea.
- La reserva la confirma Andrea; la alumna no escribe en la base (no hay backend, ver AGENTS.md §6.7).
- Sin pagos, sin cuentas, sin WhatsApp por API paga.

## 6. Archivos autorizados
`src/domain/myCard.ts`, `src/infrastructure/linkEvents.ts`, `src/ui/MyCard.tsx`, `src/ui/Landing.tsx`,
`src/ui/LinkMetrics.tsx`, `src/ui/StudentCard.tsx` (botón "Mandar tarjeta por WhatsApp"), `src/App.tsx` (rutas por hash),
`tests/my-card.test.ts`, `README.md`.

## 7. Registro de cambios
- **1.0** (2026-11-02): versión inicial. Cambia el borrador del plan: la reserva directa desde el link se
  reemplaza por "Pedir lugar" por WhatsApp, porque sin servidor la alumna no puede escribir en los datos
  de Andrea. El CA de "descontar 1 sin doble cobro" queda cubierto por la spec 001 cuando Andrea confirma.
- **1.1** (2026-11-02): el botón pasa de "Enviar tarjeta" a "Mandar tarjeta por WhatsApp", porque la skill de
  marca prohíbe "Enviar" como texto de botón. Sin cambios en los criterios.
