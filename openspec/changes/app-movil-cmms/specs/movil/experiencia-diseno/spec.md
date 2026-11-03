# Spec Delta

## Purpose

Que la app se vea y se sienta de alto nivel —a la altura de las mejores apps empresariales— y que a la vez sea práctica en campo: sol directo, guantes, prisa y señal mala.

## ADDED Requirements

### Requirement: Sistema de diseño propio
Todas las pantallas SHALL construirse con un único sistema de diseño de la app: paleta derivada de la marca TittanWare, una sola familia tipográfica con escala definida, espaciado en retícula de 4 puntos, radios, sombras y componentes comunes (botones, tarjetas, listas, formularios, hojas inferiores, chips de estado, indicadores, gráficos). Una pantalla MUST NOT definir colores ni tamaños sueltos fuera del sistema.

#### Scenario: Cambiar el color de acento
- **WHEN** se cambia el color de acento de la marca en el sistema de diseño
- **THEN** todas las pantallas de la app toman el nuevo color sin editarlas una por una

### Requirement: Modo claro y oscuro
La app SHALL tener modo claro y oscuro diseñados (no una inversión automática), seguir por defecto el del teléfono y permitir elegirlo. Ambos modos MUST cumplir contraste WCAG AA en texto.

#### Scenario: Turno nocturno
- **WHEN** el teléfono está en modo oscuro
- **THEN** la app se muestra en su modo oscuro, legible y sin pantallazos blancos al navegar

### Requirement: Movimiento y respuesta
Las transiciones, listas y gestos SHALL ir a 60 cuadros por segundo en un teléfono Android de gama media. Las acciones importantes SHALL dar respuesta háptica, y las esperas SHALL mostrar esqueletos de carga en vez de pantallas en blanco. La app SHALL abrir en menos de 2 segundos desde un arranque en frío con los datos ya sincronizados.

#### Scenario: Lista larga de órdenes
- **WHEN** el supervisor recorre una lista de 2.000 órdenes
- **THEN** el desplazamiento es fluido y las filas aparecen sin saltos

### Requirement: Uso en campo
Los objetivos táctiles SHALL medir al menos 48 dp; las acciones principales SHALL quedar al alcance del pulgar; los textos SHALL respetar el tamaño de letra del sistema; las mediciones SHALL ingresarse con teclado numérico y pasos grandes. La app SHALL poder leer códigos QR y de barras con la cámara para encontrar activos, llantas y repuestos.

#### Scenario: Inspección con guantes
- **WHEN** el inspector registra la profundidad de los surcos con guantes
- **THEN** cada campo y botón se puede tocar sin errores y el teclado numérico aparece solo

#### Scenario: Encontrar un activo por su placa QR
- **WHEN** el técnico escanea la placa QR de un activo
- **THEN** la app abre la ficha de ese activo

### Requirement: Accesibilidad e idioma
La app SHALL estar en español y en inglés con los mismos textos del portal, y SHALL ser utilizable con TalkBack: cada control con su etiqueta y orden de lectura lógico.

#### Scenario: Lector de pantalla
- **WHEN** un usuario navega con TalkBack la ficha de una orden
- **THEN** cada botón e indicador se anuncia con un nombre que describe su función
