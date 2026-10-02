// Copie este archivo como config.h y complete los datos. config.h NO se sube
// al repositorio: lleva la clave del wifi y el token del cubicador.
#pragma once

#define WIFI_SSID      "nombre-de-la-red"
#define WIFI_CLAVE     "clave-de-la-red"

// Dirección de la API, sin barra al final.
#define API_BASE       "https://tittanware.tech/api/v1"

// Token emitido en WMS · Cubicaje → Cubicadores → Emitir token.
#define TOKEN_CUBICADOR "pegue-aqui-el-token"

// Certificado raíz del servidor (PEM) para validar HTTPS. Vacío = no se valida
// (solo para pruebas en la red local).
#define CA_RAIZ ""
