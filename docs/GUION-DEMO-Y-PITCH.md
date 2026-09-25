# Guion de demostración y presentación

## Demostración de 80–90 segundos

> Objetivo: demostrar un ciclo completo, no enumerar tecnologías.

### 0:00–0:08 — Problema

**Santiago:** “Laura vive en una vereda y necesita llegar al Portal Tunal para continuar al centro. Hoy debe preguntarle a varias personas y combinar información que está dispersa.”

En pantalla: página inicial, con el caso visible en la franja de demostración.

### 0:08–0:20 — Pregunta

**Santiago:** “La prueba es simple: ¿cómo se siente preguntar lo que realmente necesita?”

Pulsar **Repetir caso**. El chat escribe la pregunta y Eco responde.

**Eco:** “Colectivo de Quiba, transbordo en Mirador del Paraíso y TransMiCable directo. Cincuenta y un minutos; llegada estimada 6:26.”

Señalar la ruta resaltada y decir: “La misma recomendación existe como texto y como mapa.”

### 0:20–0:38 — Contexto visual

En ocho segundos:

1. Mostrar la ruta verde.
2. TransMiCable amarilla.
3. Veredales naranjas punteadas.
4. SITP azul.

**Santiago:** “La diferencia entre transporte formal e informal no está oculta en un texto técnico; se ve.”

### 0:38–1:02 — Comunidad

Pulsar **Reportar novedad** → **Bloqueo** → **Vía Alpes – Quiba** → **Enviar y recalcular**.

**Santiago:** “Un vecino informa un bloqueo. No termina en un formulario: el reporte aparece en el mapa.”

La ruta se torna amarilla y cambia hacia Las Torres.

### 1:02–1:15 — Decisión de IA

**Eco:** “Evito el tramo bloqueado. La alternativa suma 10 minutos al recorrido, pero no depende de la vía cerrada.”

**Santiago:** “La IA no reemplaza el dato local: incorpora la señal comunitaria y explica la consecuencia.”

### 1:15–1:25 — Cierre

**Santiago:** “Muevete CB convierte una pregunta sencilla en una ruta que la comunidad puede corregir. En un solo flujo: pregunta, compara, muestra y recalcula.”

Cerrar con la frase: **“Menos dudas. Más contexto. Mejor decisiones.”**

## Presentación completa de cinco minutos

| Tiempo | Bloque | Mensaje único |
|---|---|---|
| 0:00–0:35 | Problema | La información existe, pero está fragmentada y no responde a la pregunta real. |
| 0:35–1:10 | Persona y contexto | Laura no necesita un mapa complejo; necesita saber cómo salir, transbordar y llegar a tiempo al Tunal. |
| 1:10–1:50 | Solución | Un asistente cruza rutas formales e informales y explica la opción en lenguaje sencillo. |
| 1:50–2:00 | Demostración | Ejecutar el guion de 80 segundos sin detenerse. |
| 2:00–2:35 | Tecnología | El agente recibe intención y contexto; el mapa usa una ruta estructurada y los reportes actualizan el orden. |
| 2:35–3:20 | Diferencial | La comunidad participa: cada novedad deja una señal visible, trazable y con hora. |
| 3:20–4:05 | Uso responsable | Mostrar confianza, modo demo, alternativa sin conexión y siguiente validación con comunidad y operadores. |
| 4:05–4:40 | Viabilidad | Hoy funciona como MVP; luego se conectan WhatsApp Sandbox, GTFS y moderación. |
| 4:40–5:00 | Cierre | “La IA no adivina el barrio. Aprende a escucharlo.” |

## Respuestas para el jurado

### “¿Esto ya da rutas reales?”

> El mapa y los puntos de referencia usan OpenStreetMap. El prototipo separa deliberadamente los datos base de las rutas, horarios y reportes demostrativos. En la siguiente fase conectamos GTFS y validación comunitaria; nunca mostramos una estimación como certeza.

### “¿Qué pasa con los reportes falsos?”

> Un reporte aislado no debe bloquear una ruta. El contrato incluye estado y corroboración. El MVP muestra el recálculo de inmediato; producción exige moderación, expiración y comparación con una línea base.

### “¿Por qué WhatsApp?”

> Porque reduce la fricción. Pero la web es nuestro canal de resiliencia y respaldo de la demostración. La lógica no debe depender de un solo operador o de la red.

### “¿Por qué es tecnología con IA?”

> Porque el núcleo no es únicamente dibujar una línea: interpretar origen, destino y hora; combinar datos de varios modos; ordenar alternativas; actualizar con información nueva y generar una explicación breve y auditable.

## Lista de verificación antes de entrar

- [ ] `npm run dev` iniciado y QR probado desde un celular.
- [ ] Pantalla al 100 % y audio del avión silenciado.
- [ ] Demostración abierta y pestaña secundaria fuera de vista.
- [ ] Formulario de ruta y bloqueo listo.
- [ ] Video de respaldo guardado en el portátil y en USB o nube.
- [ ] Conexión probada; sin descargas pendientes durante la presentación.
- [ ] Santiago memoriza la primera y la última frase.
- [ ] Otra persona responde preguntas técnicas y reinicia la app si hace falta.

## Plan de contingencia

1. **La app se congela:** recargar la URL; los parámetros conservan el escenario.
2. **Fallan los mapas:** el vector esquemático sigue visible; no llamarlo “mapa en vivo”.
3. **No hay internet:** video más capturas estáticas.
4. **El agente falla:** repetir la respuesta preparada y señalar los pasos visibles.
5. **No se abre el formulario:** usar el segundo mensaje rápido, “Reportar un bloqueo”.
