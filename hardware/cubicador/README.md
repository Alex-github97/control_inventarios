# Cubicador de bajo costo (ESP32 + 3 láseres + báscula)

Estación fija para medir largo, ancho, alto y peso de unidades y cajas, y enviar
la medición a tittanware (WMS · Cubicaje). Precisión objetivo: **±1–2 mm por
eje** y **±5 g** hasta 30 kg, con piezas por menos de **US$ 250**.

## Cómo mide

```
        láser Z (mira hacia abajo)
             │
   ┌─────────▼──────────┐
   │                    │◄── láser X (mira hacia la pared X)
   │   ┌────────┐       │
   │   │  caja  │       │
   │   └────────┘       │
   │       ▲            │
   └───────┼────────────┘
       láser Y
  pared X = la de la izquierda; pared Y = la del fondo; piso = la báscula
```

La caja se apoya en la **esquina** que forman dos paredes de referencia, encima
de la báscula. Cada láser está en el lado opuesto a su pared y mide la distancia
hasta la cara de la caja. El servidor calcula, por eje:

```
medida = escala × (base − lectura)
```

donde `base` es la distancia del láser a su pared (o a la báscula, en el eje
vertical). El firmware **no calcula medidas**: manda las lecturas crudas
(siete por eje y diez de la báscula). El servidor toma la mediana, mide la
dispersión y aplica la calibración. Así la calibración se ajusta desde la
pantalla sin reprogramar el equipo, y si una lectura sale mala la mediana la
descarta.

## Lista de piezas

| # | Pieza | Cant. | Referencia orientativa | US$ aprox. |
|---|-------|-------|------------------------|-----------|
| 1 | ESP32 DevKit V1 (WROOM-32) | 1 | cualquier ESP32 con 2 UART libres | 8 |
| 2 | Módulo láser de distancia TTL, resolución 1 mm, ±1 mm | 3 | familia «laser distance sensor 40/80 m TTL», protocolo de 4 bytes (DFRobot SEN0366 o equivalente) | 3 × 35–50 |
| 3 | Celda de carga tipo barra, 30 kg | 1 | celda de 4 hilos, 2 mV/V | 8 |
| 4 | Amplificador HX711 | 1 | módulo HX711 (24 bits) | 3 |
| 5 | Plataforma rígida 40 × 40 cm (acrílico de 10 mm o aluminio) | 2 | base inferior y plato de carga | 20 |
| 6 | Perfil de aluminio 2020 + escuadras | 3 m | para el marco en «L» y el mástil del láser Z | 30 |
| 7 | Láminas blancas mate (reflectoras) para las paredes de referencia | 2 | PVC espumado blanco de 5 mm | 6 |
| 8 | Pulsador grande «MEDIR» + zumbador | 1 + 1 | pulsador de 30 mm | 4 |
| 9 | Pantalla OLED 0,96" I2C (opcional) | 1 | SSD1306 128×64 | 4 |
| 10 | Fuente 5 V 2 A + regulador o la del USB | 1 | | 6 |
| 11 | Cables, bornes, caja para la electrónica | – | | 10 |
| 12 | Bloques patrón para calibrar (2): uno de ~100 × 200 × 300 mm y otro de ~300 × 400 × 500 mm, medidos con flexómetro o pie de rey; y una pesa conocida (p. ej. 2 kg) | – | MDF cortado a escuadra | 10 |

Total aproximado: **US$ 200–250**.

> **Importante: verifique el protocolo del láser.** Los módulos de esta familia
> se venden con varios nombres y no todos hablan igual. El firmware trae el
> protocolo de 4 bytes de una sola medición (`0x80 0x06 0x02 0x78`, con
> respuesta ASCII en metros). Si su módulo responde distinto, solo cambia la
> función `leerLaser()`. Con un monitor serial y la hoja de datos del módulo se
> comprueba en cinco minutos. Láseres «ToF» baratos (VL53L0X/L1X) **no** sirven:
> su error es de ±5 a ±20 mm.

## Conexiones

```
ESP32            Láser X        Láser Y        Láser Z        HX711        Otros
-----            -------        -------        -------        -----        -----
5V  ──────────── VCC ────────── VCC ────────── VCC ────────── VCC
GND ──────────── GND ────────── GND ────────── GND ────────── GND ──────── GND (pulsador, zumbador, OLED)
GPIO16 (RX2) ◄── TX
GPIO17 (TX2) ──► RX
GPIO26 (RX1) ◄──────────────── TX
GPIO27 (TX1) ──────────────────► RX
GPIO32 (RX sw) ◄───────────────────────────── TX
GPIO33 (TX sw) ──────────────────────────────► RX
GPIO4  ◄───────────────────────────────────────────────────── DOUT
GPIO5  ──────────────────────────────────────────────────────► SCK
GPIO14 ◄── pulsador MEDIR (a GND, con pull-up interno)
GPIO25 ──► zumbador (+)
GPIO21 (SDA) / GPIO22 (SCL) ──► OLED (opcional)

Celda de carga → HX711: rojo E+, negro E−, blanco A−, verde A+ (según la celda).
```

Los láseres trabajan a 3,3 V en la línea de datos aunque se alimenten a 5 V;
si el suyo saca 5 V por TX, ponga un divisor de tensión (1 kΩ + 2 kΩ) hacia
el ESP32. El tercer láser va por un puerto serial por software, que a 9600 bps
es confiable.

## Montaje

1. Arme una «L» con dos paredes perpendiculares (escuadra verificada: el error
   de escuadra se vuelve error de medida). Atornille encima las láminas blancas.
2. La celda de carga va entre la base y el plato, centrada. El plato no debe
   tocar las paredes: deje 2–3 mm de luz.
3. Láser X: en la pared opuesta a la pared X, a unos 5 cm de altura sobre el
   plato, perpendicular a la pared X. Láser Y: igual, frente a la pared Y.
   Láser Z: en un mástil, mirando hacia abajo al plato, a unos 80 cm de altura.
4. Alinee cada láser con su punto rojo: debe caer a la misma altura en la pared
   con y sin caja.

## Configuración y puesta en marcha

1. En tittanware: **WMS · Cubicaje → Cubicadores → Nuevo**. Después **Emitir
   token** (se muestra una sola vez).
2. Copie `config.ejemplo.h` como `config.h` y ponga la red wifi, la dirección
   del servidor y el token. `config.h` **no** se sube al repositorio.
3. Abra `cubicador.ino` en Arduino IDE (placa «ESP32 Dev Module»). Instale las
   librerías **HX711** (bogde), **ArduinoJson** (7.x), **EspSoftwareSerial** y,
   si usa pantalla, **Adafruit SSD1306**. Compile y cargue.
4. Al encender, el equipo consulta `/wms/cubicador/estado` y pita dos veces si
   el servidor lo reconoce.

## Calibración (desde la pantalla, sin reprogramar)

En **WMS · Cubicaje → Estación**:

1. Báscula vacía y sin caja → **MEDIR** → «Usar para calibrar» con peso 0 g.
2. Bloque A en la esquina → **MEDIR** → «Usar para calibrar» con sus tres
   medidas reales en mm y su peso real en g.
3. Bloque B → **MEDIR** → «Usar para calibrar» con sus medidas reales.

Con un bloque se fija la base de cada eje; con dos de tamaños distintos el
sistema ajusta también la escala (mínimos cuadrados) y avisa si los datos no
cuadran. Recalibre si mueve un láser o una pared, y verifique una vez por semana
midiendo un bloque: si se aleja más de 2 mm, recalibre.

## Uso diario

1. En la pantalla de la estación, elija el producto (o escanee su código) y el
   nivel (unidad, caja, máster).
2. Ponga la pieza en la esquina, quieta, y pulse **MEDIR**. Un pito: medición
   enviada. Tres pitos: error de red o del servidor.
3. La medición aparece en la pantalla con su dispersión. Si es estable, asígnela.
   Si no, vuelva a medir.

## Seguridad

- El token del cubicador solo sirve para enviar mediciones: no es una sesión de
  usuario y no abre ninguna otra parte del sistema.
- Emitir un token nuevo revoca el anterior. Si el equipo se pierde, emita uno
  nuevo o desactívelo.
- Use HTTPS (`https://…` en `config.h`); el firmware valida el certificado si se
  le da la CA en `config.h`.
