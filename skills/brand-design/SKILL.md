---
name: brand-design
description: Identidad visual del Estudio de Yoga Andrea. Úsala siempre que crees o modifiques una pantalla, un componente, un texto visible o un mensaje de WhatsApp de la app.
---

# Skill: Diseño de marca — Estudio de Yoga Andrea

## Personalidad
Calma, cercana y clara. La app debe sentirse como la recepción del estudio: tranquila, nunca burocrática.
Evita lo "fitness agresivo" (neón, mayúsculas gritonas, fotos de cuerpos).

## Colores (tokens)
| Token | Hex | Uso |
|---|---|---|
| `--salvia` | `#7A8F6B` | Color primario, botones principales |
| `--salvia-oscuro` | `#4F5F45` | Texto sobre fondo claro, hover |
| `--arena` | `#F6F1E9` | Fondo de la app |
| `--terracota` | `#C46A4A` | Acento, alertas suaves, saldo bajo (≤ 2 clases) |
| `--tinta` | `#2E2A26` | Texto principal |
| `--niebla` | `#E4DDD2` | Bordes y divisores |
| `--error` | `#B3261E` | Solo errores reales (sin saldo, rechazo) |

Contraste mínimo AA. No uses negro puro ni blanco puro de fondo.

## Tipografía
- Títulos: **Fraunces** (serif suave), 600.
- Texto e interfaz: **Inter**, 400/500. Base 16 px; nunca menos de 14 px.
- Números de saldo: Inter 700, grande (48 px en la tarjeta).

## Formas y espaciado
- Esquinas redondeadas: 16 px en tarjetas, 999 px en botones (píldora).
- Espaciado en múltiplos de 8 px. Mucho aire.
- Botones de al menos 44 px de alto, ancho completo en móvil.
- Sombras muy suaves (`0 2px 8px rgb(46 42 38 / 0.06)`).

## Componentes clave
- **Tarjeta digital de paquete:** recuerda a la tarjeta de papel. 10 círculos; los consumidos se rellenan en salvia como "sellos". Debajo, el saldo en número grande.
- **Historial:** lista simple, fecha a la izquierda, `−1` / `+10` a la derecha. Los ajustes manuales llevan la nota en gris.
- **Estados:** saldo ≥ 3 → salvia; 1–2 → terracota con "Te quedan pocas clases"; 0 → mensaje de renovar.

## Iconografía
Iconos de línea (Lucide), trazo 1.5. Motivo decorativo opcional: hoja o círculo de respiración. Nada de mandalas recargados.

## Voz: "Calma Activa"
La app habla como la instructora con más años en el estudio: tiene todo bajo control con una mirada y no da rodeos.

**Tres adjetivos:** fluida, ultra-directa, cómplice.
**Límites:** cómplice, pero no cursi. Directa, pero no seca. Con guiños de yoga, pero sin sermones ni frases de taza.

### Reglas de escritura
1. **Escribe como hablas.** Léelo en voz alta: si no se lo dirías a Andrea en la recepción, cámbialo.
2. **Voz activa y presente.** "Guardamos el ajuste", no "El ajuste ha sido guardado".
3. **Fragmentos con ritmo.** Se vale empezar con "Y" o "Pero" y usar frases sin verbo: "Mat desplegado."
4. **Una idea por pantalla.** Título corto (2–5 palabras) + una línea de detalle como máximo.
5. **Botones = verbos de lo que pasa.** "Hecho", "Agendar", "Liberar lugar", "Dar de alta". Nunca "Aceptar", "Enviar", "OK".
6. **Números concretos.** "Quedan 3 lugares", no "Hay disponibilidad".

### Cuándo ser original y cuándo no
| Momento | Tono | Ejemplo |
|---|---|---|
| Bienvenida / inicio | Cómplice, con guiño | "Hoy fluyes con 3 clases." |
| Éxito | Breve, con imagen de yoga | "Mat desplegado. Lucía ya está en la sala." |
| Carga | Respiración | "Inhala… exhala… Ya casi." |
| Error de la app | Humano, admite la falla | "Perdimos el equilibrio. Algo se cayó por aquí." + [Reintentar] |
| **Saldo, cobros, cancelaciones** | **Sobrio y claro, sin chistes** | "No te quedan clases. Habla con Andrea para renovar tu paquete." |

### Palabras prohibidas (suenan a sistema o a IA)
"usuario", "sistema", "procesar", "exitosamente", "por favor espere", "registro completado", "FIFO", "auditoría", "débito", "crédito", "aforo", "sesión", "API", "¡Excelente!", "¡Genial!".

### WhatsApp
Saludo con el nombre, el dato, cierre amable. Máximo un emoji (🌿).
Ejemplo: "Hola Lucía 🌿 La clase de hoy 19:00 se cancela porque Marta está enferma. Tu clase no se descuenta."

## Checklist antes de entregar una pantalla
- [ ] Solo usa los tokens de color de esta skill.
- [ ] Se ve bien a 360 px de ancho.
- [ ] Botones ≥ 44 px, texto ≥ 14 px.
- [ ] Textos en español, con "tú", sin tecnicismos ni palabras prohibidas.
- [ ] Cada botón es un verbo de lo que pasa.
- [ ] Los mensajes de saldo y errores son sobrios.
