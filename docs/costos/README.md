# Costo por cliente

Cuánto ocupa un registro en la plataforma y cuánto cuesta atender a cada cliente según lo que escribe y guarda.

| Archivo | Para qué |
|---|---|
| `calculadora-costo-por-cliente.xlsx` | La calculadora en Excel, con fórmulas. Es la que se edita en equipo. |
| `costo-por-cliente.html` | La misma calculadora como página web. Se abre con doble clic en el navegador. |
| `medicion/` | Los scripts y datos con que se midió, para repetir la medición. |

## El Excel

- **Calculadora:** se escribe el costo mensual de la plataforma y el volumen mensual de toda la plataforma por tipo de transacción (columna E). Luego el del cliente (columna F). Para los vehículos y colaboradores hay fórmulas que estiman el CMMS y la nómina. El resultado aparece a la derecha:
  - el costo mensual del cliente;
  - el costo por transacción;
  - el margen con su precio;
  - el precio mínimo para el margen objetivo;
  - cómo crece el costo con la antigüedad.
- **Comparar clientes:** hasta 6 clientes lado a lado, con los costos unitarios de la hoja Calculadora.
- **Proyección:** cuánto ocupan la base, los respaldos y la RAM, de mil a diez mil millones de registros.
- **Transacciones y Módulos:** los datos medidos.
- **Metodología:** cómo se midió y qué queda por fuera.

Se editan las celdas con texto azul y fondo amarillo. Las de fondo amarillo claro traen una fórmula de estimación que se puede sobrescribir. Los valores de partida son un ejemplo.

## La medición (2 de noviembre de 2026)

| Medida | Valor |
|---|---|
| Un registro, con sus índices | 265 bytes en promedio |
| Ese registro dentro de un respaldo comprimido | 41 bytes |
| Lo que escribe cada vehículo al mes en el CMMS | 26 KB |
| Una empresa nueva, sin datos | 17 MB |

Se midió leyendo fila por fila el respaldo de la empresa de prueba «carga» (572 tablas, 1,76 millones de registros), con las reglas de almacenamiento de Postgres 16. Las cifras del CMMS por vehículo salen de la flota de producción: 300 equipos en 24 meses.

Para repetirla con un respaldo nuevo, desde la raíz del repositorio:

```
python -I docs/costos/medicion/medir_respaldo.py backups/<respaldo>.dump medidas.json
python -I docs/costos/medicion/agrupar_por_modulo.py medidas.json docs/costos/medicion/modelo.json
python docs/costos/medicion/crear_excel.py docs/costos/medicion/modelo.json docs/costos/calculadora-costo-por-cliente.xlsx
```

Después hay que abrir el Excel una vez y guardarlo para que calcule las fórmulas. El respaldo debe sacarse con `pg_dump -Fc` y compresión gzip.
