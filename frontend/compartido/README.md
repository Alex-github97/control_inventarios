# compartido

Código que usan **el portal** (`frontend/src`) y **la app móvil** (`movil/`). Va dentro de `frontend/`
porque las tres compilaciones del portal —local, producción y CI— usan `frontend/` como contexto; la app
lo importa con el alias `@compartido`.

| Carpeta | Qué hay | Quién la escribe |
|---|---|---|
| `marca.ts` | Nombre, paleta, acento, colores de estado y series | A mano |
| `i18n/` | Textos traducidos | A mano |
| `reglas/` | Cómo se presentan los datos: vida de una llanta, rangos de profundidad, estados de una OT | A mano |
| `api/esquema.d.ts` | Tipos de toda la API | **Generado**: `npm run tipos-api` (no editar) |
| `api/cliente.ts` | Cliente tipado (`openapi-fetch`) | A mano |

Reglas:

- Sin dependencias de React DOM ni de React Native: solo TypeScript y `openapi-fetch`.
- Si el servidor cambia, se regeneran los tipos. El despliegue verifica que `esquema.d.ts` esté al día y
  que el portal y la app compilen con él: un campo renombrado que la app usa rompe el despliegue.
- Ver `docs/movil/ADAPTAR.md` para llevar un cambio del portal a la app.
