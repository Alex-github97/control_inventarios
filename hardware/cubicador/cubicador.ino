/*
 * Cubicador tittanware — ESP32 + 3 láseres TTL + celda de carga HX711.
 *
 * Al pulsar MEDIR toma 7 lecturas de cada láser y 10 de la báscula y las manda
 * CRUDAS a POST {API_BASE}/wms/cubicador/lecturas. El servidor saca la mediana,
 * la dispersión y aplica la calibración (que se ajusta desde la pantalla, sin
 * reprogramar). El firmware no calcula medidas a propósito.
 *
 * Pitos: 2 = servidor reconoce el equipo; 1 = medición enviada; 3 = error.
 *
 * Librerías: HX711 (bogde), ArduinoJson 7.x, EspSoftwareSerial.
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <HX711.h>
#include <SoftwareSerial.h>
#include "config.h"

#define FIRMWARE "1.0.0"

// ── Pines (ver README) ───────────────────────────────────────────────────────
#define PIN_RX_X 16
#define PIN_TX_X 17
#define PIN_RX_Y 26
#define PIN_TX_Y 27
#define PIN_RX_Z 32
#define PIN_TX_Z 33
#define PIN_HX_DOUT 4
#define PIN_HX_SCK  5
#define PIN_BOTON 14
#define PIN_ZUMBADOR 25

#define LECTURAS_LASER 7
#define LECTURAS_PESO 10

HardwareSerial laserX(2);
HardwareSerial laserY(1);
SoftwareSerial laserZ;
HX711 bascula;

void pitar(int veces) {
  for (int i = 0; i < veces; i++) {
    digitalWrite(PIN_ZUMBADOR, HIGH); delay(90);
    digitalWrite(PIN_ZUMBADOR, LOW);  delay(110);
  }
}

// ── Láser ────────────────────────────────────────────────────────────────────
// Protocolo de 4 bytes de la familia «laser distance sensor TTL» (DFRobot
// SEN0366 y equivalentes): se pide una medición con 80 06 02 78 y responde
// 80 06 82 seguido de la distancia en metros en ASCII («001.234») y un byte de
// verificación. VERIFIQUE con la hoja de datos de su módulo: si responde
// distinto, solo cambia esta función.
const uint8_t CMD_MEDIR[4] = {0x80, 0x06, 0x02, 0x78};

float leerLaser(Stream &puerto) {
  while (puerto.available()) puerto.read();          // descarta lo viejo
  puerto.write(CMD_MEDIR, sizeof(CMD_MEDIR));
  uint8_t r[11];
  size_t n = 0;
  unsigned long t0 = millis();
  while (n < sizeof(r) && millis() - t0 < 1500) {
    if (puerto.available()) r[n++] = puerto.read();
  }
  if (n < sizeof(r) || r[0] != 0x80 || r[1] != 0x06 || r[2] != 0x82) return -1;
  uint8_t suma = 0;
  for (int i = 0; i < 10; i++) suma += r[i];
  if ((uint8_t)(~suma + 1) != r[10]) return -1;      // verificación
  char texto[8];
  memcpy(texto, &r[3], 7); texto[7] = 0;
  if (strstr(texto, "ERR")) return -1;               // fuera de rango, superficie oscura
  return atof(texto) * 1000.0;                       // metros → mm
}

void tomarLaser(Stream &puerto, JsonArray salida) {
  for (int i = 0; i < LECTURAS_LASER; i++) {
    float mm = leerLaser(puerto);
    if (mm > 0) salida.add(mm);
    delay(60);
  }
}

// ── Red ──────────────────────────────────────────────────────────────────────
bool conectarWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_CLAVE);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 15000) delay(250);
  return WiFi.status() == WL_CONNECTED;
}

int llamar(const char *metodo, const String &ruta, const String &cuerpo, String &respuesta) {
  if (!conectarWifi()) return -1;
  WiFiClientSecure seguro;
  WiFiClient plano;
  HTTPClient http;
  String url = String(API_BASE) + ruta;
  bool https = url.startsWith("https");
  if (https) {
    if (strlen(CA_RAIZ)) seguro.setCACert(CA_RAIZ); else seguro.setInsecure();
    http.begin(seguro, url);
  } else {
    http.begin(plano, url);
  }
  http.addHeader("Authorization", String("Bearer ") + TOKEN_CUBICADOR);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  int codigo = strcmp(metodo, "POST") == 0 ? http.POST(cuerpo) : http.GET();
  respuesta = http.getString();
  http.end();
  return codigo;
}

// ── Medición ─────────────────────────────────────────────────────────────────
void medir() {
  JsonDocument doc;
  doc["firmware"] = FIRMWARE;
  JsonObject lect = doc["lecturas"].to<JsonObject>();
  tomarLaser(laserX, lect["x"].to<JsonArray>());
  tomarLaser(laserY, lect["y"].to<JsonArray>());
  tomarLaser(laserZ, lect["z"].to<JsonArray>());
  JsonArray peso = lect["peso"].to<JsonArray>();
  for (int i = 0; i < LECTURAS_PESO; i++) {
    if (bascula.wait_ready_timeout(500)) peso.add(bascula.read());   // crudo: el servidor calibra
  }
  String cuerpo, resp;
  serializeJson(doc, cuerpo);
  int codigo = llamar("POST", "/wms/cubicador/lecturas", cuerpo, resp);
  Serial.printf("Medición enviada: HTTP %d %s\n", codigo, resp.c_str());
  pitar(codigo == 201 ? 1 : 3);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BOTON, INPUT_PULLUP);
  pinMode(PIN_ZUMBADOR, OUTPUT);
  laserX.begin(9600, SERIAL_8N1, PIN_RX_X, PIN_TX_X);
  laserY.begin(9600, SERIAL_8N1, PIN_RX_Y, PIN_TX_Y);
  laserZ.begin(9600, SWSERIAL_8N1, PIN_RX_Z, PIN_TX_Z);
  bascula.begin(PIN_HX_DOUT, PIN_HX_SCK);
  String resp;
  int codigo = llamar("GET", "/wms/cubicador/estado", "", resp);
  Serial.printf("Estado: HTTP %d %s\n", codigo, resp.c_str());
  pitar(codigo == 200 ? 2 : 3);
}

void loop() {
  static unsigned long ultimo = 0;
  if (digitalRead(PIN_BOTON) == LOW && millis() - ultimo > 1500) {   // antirrebote
    ultimo = millis();
    delay(400);   // que la mano se retire y la caja quede quieta
    medir();
  }
  delay(20);
}
