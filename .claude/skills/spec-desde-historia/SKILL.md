---
name: spec-desde-historia
description: Convierte una historia de usuario en una especificación OpenSpec, aclarando antes con el usuario las suposiciones funcionales que Claude tuvo que hacer. Úsala cuando el usuario diga "vamos a definir una spec", "tengo una historia de usuario", "refinemos esta historia", o pegue una historia de usuario (Como… quiero… para…) para convertirla en spec.
---

# Spec desde historia de usuario

Flujo de desarrollo basado en especificaciones con OpenSpec. Antes de crear la spec
se acuerdan con el usuario todas las suposiciones funcionales y de negocio. La
spec solo se crea cuando el usuario lo confirma.

**Límite**: esta skill no toca código. Termina con la spec creada (o lista para
crearse). La implementación se hace después con `openspec-apply-change`.

## Fase 1 — Recibir la historia

Si el usuario aún no pegó la historia de usuario, pídela y espera.

Lee lo necesario para entender el contexto: `openspec/specs/` y
`openspec/changes/` para ver si ya existe algo relacionado, y el código solo
cuando haga falta para no suponer algo que el proyecto ya resuelve.

## Fase 2 — Rellenar los vacíos y listar las suposiciones

Completa mentalmente la historia: actores, reglas de negocio, datos que se
piden y se muestran, validaciones, permisos, estados, casos límite, mensajes al
usuario, qué queda fuera del alcance.

Muestra al usuario:

1. **Historia completada**: un resumen breve (5–10 líneas) de cómo entendiste la
   historia con los vacíos ya rellenados.
2. **Suposiciones**: un listado **numerado** con todo lo que asumiste que **no es
   técnico**, es decir, lo funcional y de negocio (quién puede hacer qué, qué
   pasa si…, qué campos son obligatorios, límites, textos, notificaciones,
   alcance). No incluyas decisiones técnicas (framework, tablas, endpoints);
   esas van en el design de OpenSpec.

Formato de cada suposición: una línea, concreta y verificable.

```
1. Solo los usuarios con rol Administrador pueden aprobar la solicitud.
2. Si el correo ya existe, se muestra un aviso y no se crea un duplicado.
3. ...
```

Cierra con: *"Dime los números de las suposiciones que no te gustan (por ejemplo:
2, 5, 7). Si todas están bien, dime «todas bien»."*

Espera la respuesta.

## Fase 3 — Preguntas una a una

Por cada número que el usuario rechazó, en el orden en que los dio, haz **una
sola pregunta por turno**. Cada pregunta lleva:

- **Barra de progreso** con las preguntas respondidas y las que faltan:

  ```
  Pregunta 2 de 5  [████████░░░░░░░░░░░░] 1 respondida · 4 restantes
  ```

  La barra tiene 20 caracteres; los llenos son `round(20 × respondidas / total)`.

- La suposición original (número y texto) y por qué la habías asumido.
- **4 alternativas** nuevas y distintas de la original, cada una una
  suposición concreta.
- Una **quinta opción: «Otra»**, para que el usuario escriba su propia
  definición.

Si la herramienta `AskUserQuestion` está disponible, úsala: pon la barra de
progreso al inicio del texto de la pregunta, las 4 alternativas como opciones
(la herramienta añade «Otra» automáticamente), `multiSelect: false`. Si no está
disponible, muéstralo como texto:

```
Pregunta 2 de 5  [████████░░░░░░░░░░░░] 1 respondida · 4 restantes

Suposición #5: "El descuento se aplica solo a clientes nuevos."

  a) ...
  b) ...
  c) ...
  d) ...
  e) Otra — escribe tu definición
```

Reglas:
- Si la respuesta cambia o contradice otras suposiciones ya aceptadas, dilo
  en una línea y añade esa suposición a la cola de preguntas (el total de la
  barra sube).
- Si la respuesta de «Otra» es ambigua, pide una aclaración breve antes de pasar
  a la siguiente; no cuenta como pregunta nueva.
- No hagas varias preguntas en el mismo turno.

## Fase 4 — Listo para crear la especificación

Cuando no queden preguntas, muestra:

1. El listado final de suposiciones, numerado, marcando con ✏️ las que cambiaron.
2. El mensaje: **"Ya me encuentro listo para crear la especificación."**
3. Pregunta si se crea ahora.

No crees la spec hasta que el usuario lo confirme.

## Fase 5 — Crear la spec con OpenSpec

Con la confirmación del usuario, usa la skill `openspec-propose` para crear el
change. Pásale la historia de usuario completada y el listado final de
suposiciones; cada suposición acordada debe quedar reflejada como requisito o
escenario en la spec (o como "fuera de alcance" en la propuesta).

Sigue el idioma de `openspec/config.yaml` (español, con encabezados
estructurales y SHALL/MUST en inglés).

Al terminar, indica la ruta del change creado y que la implementación se inicia
con `/opsx:apply`.
