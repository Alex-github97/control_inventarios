# Despliegue de la seguridad de sesión

A partir de este cambio, cada token va atado a una sesión que vive en Redis. Sin esa sesión, el token no abre nada.

- **Inactividad:** la sesión se cierra a los 10 minutos sin actividad.
- **Tope:** dura como máximo 12 horas, aunque se use sin parar.
- **Cierre inmediato:** salir, cambiar la clave, restablecerla o desactivar al usuario la cierran de una vez.

Las contraseñas pasan de bcrypt a Argon2id. La conversión es automática la próxima vez que cada persona entra.

## Antes de desplegar

1. **`SECRET_KEY` de `.env.prod`:** debe tener al menos 32 caracteres y no puede empezar por `change-me-in-production`. Si no cumple, el backend **no arranca**. Para revisar el largo en el servidor sin mostrar la clave:

   ```
   grep -c '^SECRET_KEY=.\{32,\}' .env.prod
   ```

   El resultado debe ser `1`. Si hay que cambiarla, todas las sesiones se cierran igual, porque el despliegue ya las cierra.

2. **Reconstruir la imagen.** Las dependencias cambian:
   - salen `python-jose` y `passlib`;
   - entran `PyJWT` y `argon2-cffi`.

   Reiniciar el contenedor no basta.

3. **Avisar a los clientes:** al desplegar, todos tienen que volver a ingresar. Desplegar fuera del horario de operación.

## Desplegar

```
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build redis backend tarifax_backend frontend
```

`docker-compose.prod.yml` ya deja listo lo siguiente:

- `REDIS_SESIONES_URL=redis://redis:6379/1` en los dos backends. Las sesiones van en una base lógica propia y no dependen de que `.env.prod` traiga `REDIS_URL`.
- Los dos backends esperan a Redis.
- Redis usa la política `volatile-lru`.

## Después

- **Ingreso:** entrar con un usuario real. La clave vieja sigue sirviendo; queda convertida en el primer ingreso.
- **Clon de TarifaX:** abrir `tarifax-icoltrans.site`. La entrada automática abre una sesión nueva al cargar la página. Si la sesión vence por inactividad, al recargar vuelve a entrar sola.
- **Memoria de Redis:**

  ```
  docker exec prod_redis redis-cli info memory | grep used_memory_human
  ```

  Cada sesión ocupa unos cientos de bytes, así que 256 MB alcanzan de sobra. Hay que alertar si pasa del 80 %.

## Si Redis se cae

**Nadie puede entrar ni seguir trabajando:** la API responde 503 «No se pudo validar la sesión». Es a propósito, porque una sesión que no se puede comprobar no se da por buena. El arreglo es levantar Redis:

```
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d redis
```

## Reversa

La imagen anterior no entiende las claves ya convertidas a Argon2id. Para volver atrás:

1. Construir la imagen de reversa con `argon2-cffi` en sus dependencias.
2. Antes de volver, restablecer la clave de quienes ya entraron.

## Guiones de prueba

Los guiones de `backend/tools/` y `backend/tests/` ya no firman tokens a mano. Usan `app.core.sesiones.token_de_herramienta`, que abre una sesión real en Redis.
