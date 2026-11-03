# ICP y user personas — Estudio de Yoga Andrea

> Tarea 3 · Clase 3 del curso. Los rasgos de las personas son inventados a partir del caso real
> del estudio; los nombres y datos son ficticios.

## 1. ICP (perfil de cliente ideal)

| Dimensión | Definición |
|---|---|
| **Quién compra** | La dueña de un estudio chico de yoga o pilates que además da clases. Decide y paga ella. |
| **Tamaño** | 1 sala, 1 a 3 instructoras, 50 a 150 alumnas activas, 15 a 30 clases por semana. |
| **Modelo de cobro** | Paquetes de clases (8, 10 o 12) pagados en efectivo o por transferencia. Sin suscripción online. |
| **Geografía** | Ciudades medianas y barrios de LatAm (Argentina, México, Chile, Colombia, Uruguay). |
| **Cómo trabaja hoy** | Tarjetas de papel selladas, un cuaderno o una planilla, y todo lo demás por WhatsApp. |
| **Dolores** | Pierde tiempo contestando "¿cuántas clases me quedan?"; discusiones por sellos perdidos; clases sobrevendidas o con huecos; avisar un cambio es escribir uno por uno. |
| **Qué NO quiere** | Apps grandes con login para cada alumna, comisiones por cobro, configuraciones largas, pagar en dólares. |
| **Disparadores de compra** | Pasa de 50 alumnas; suma una segunda instructora; tuvo un conflicto por un saldo; empieza el año o la temporada alta. |
| **Dónde encontrarla** | Instagram y grupos de WhatsApp de profesoras de yoga, escuelas de formación de instructoras, proveedores de mats. |
| **Criterio de éxito para ella** | Que en la primera semana ninguna alumna le pregunte su saldo y que nunca más se sobrevenda una clase. |

**Lo que la hace distinta de "cualquier gimnasio":** no busca crecer rápido ni automatizar ventas.
Busca **calma operativa**: menos mensajes, cero discusiones, más tiempo en el mat.

## 2. User personas

### Persona 1 · Andrea, la dueña (compradora y administradora)
- **Edad / contexto:** 41 años. Fundó el estudio hace 6 años. Da 8 clases por semana.
- **Tecnología:** usa el celular todo el día; WhatsApp Business es su herramienta principal. Poco paciente con pantallas complicadas.
- **Objetivo:** que el estudio funcione sin que ella esté pendiente del teléfono entre clase y clase.
- **Frustración:** recibe 15 a 20 mensajes por semana que se responden mirando la tarjeta de papel.
- **Frase:** "Yo abrí un estudio para dar clases, no para ser secretaria."
- **Qué le aporta la feature 003:** manda la tarjeta en un toque y deja de responder saldos uno por uno.

### Persona 2 · Marta, la instructora
- **Edad / contexto:** 29 años. Da 6 clases por semana, a veces cubre a Sofía.
- **Tecnología:** celular, apps simples. Marca la asistencia entre que entra una alumna y la siguiente.
- **Objetivo:** empezar la clase a horario sabiendo quién viene.
- **Frustración:** no sabe si la clase está llena hasta que llega la gente.
- **Frase:** "Quiero un toque y listo; el mat ya está desplegado."

### Persona 3 · Camila, la alumna (protagonista de la feature 003)
- **Edad / contexto:** 34 años, trabaja en relación de dependencia, va 2 veces por semana después del trabajo.
- **Tecnología:** usa solo el celular. No quiere instalar otra app ni crear otra contraseña.
- **Objetivo:** saber cuántas clases le quedan y si hay lugar el jueves, **sin escribirle a Andrea y esperar**.
- **Frustración:** perdió la tarjeta de papel una vez y discutió su saldo; le incomoda escribirle a Andrea un domingo a la noche.
- **Frase:** "Solo quiero saber si hay lugar, no quiero molestar."
- **Momento clave (time to value):** abre el link de WhatsApp y en menos de 30 segundos ve su saldo y pide un lugar.

## 3. Cómo usamos esto
- La spec 003 (`specs/003-mi-tarjeta-en-un-toque.md`) se diseña para **Camila**, pero la métrica la mira **Andrea**.
- La portada de la app habla al ICP (la dueña), no a la alumna.
