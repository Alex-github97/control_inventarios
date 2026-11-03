"""Calculadora de costo por cliente en Excel, con fórmulas vivas."""
import json, sys
from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import FormulaRule

DATOS = json.load(open(sys.argv[1], encoding="utf-8"))
SALIDA = sys.argv[2]

F = "Arial"
AZUL = "0000FF"
VERDE = "008000"
ACENTO = "1B4FB8"
f_base = Font(name=F, size=10)
f_entrada = Font(name=F, size=10, color=AZUL)
f_enlace = Font(name=F, size=10, color=VERDE)
f_neg = Font(name=F, size=10, bold=True)
f_titulo = Font(name=F, size=16, bold=True, color=ACENTO)
f_sub = Font(name=F, size=11, bold=True, color=ACENTO)
f_cab = Font(name=F, size=9, bold=True, color="FFFFFF")
f_nota = Font(name=F, size=9, italic=True, color="5B6170")
f_grande = Font(name=F, size=14, bold=True)
r_amarillo = PatternFill("solid", fgColor="FFFF00")
r_amarillo_claro = PatternFill("solid", fgColor="FFF6BF")
r_cab = PatternFill("solid", fgColor=ACENTO)
r_modulo = PatternFill("solid", fgColor="EAF1FE")
r_resultado = PatternFill("solid", fgColor="F0F2F6")
linea = Side(style="thin", color="D5D9E0")
borde = Border(left=linea, right=linea, top=linea, bottom=linea)
izq = Alignment(horizontal="left", vertical="center", wrap_text=True)
der = Alignment(horizontal="right", vertical="center")

MONEDA = '"$"#,##0;("$"#,##0);"-"'
MONEDA2 = '"$"#,##0.00;("$"#,##0.00);"-"'
ENTERO = '#,##0;(#,##0);"-"'
DEC1 = '#,##0.0;(#,##0.0);"-"'
PCT = '0.0%;(0.0%);"-"'
GB = '#,##0.00" GB";(#,##0.00" GB");"-"'
MB = '#,##0.0" MB";(#,##0.0" MB");"-"'

NOMBRES = {m["clave"]: m["nombre"] for m in DATOS["modulos"]}
ORDEN_MOD = [m["clave"] for m in DATOS["modulos"]]
TX = sorted(DATOS["transacciones"], key=lambda t: (ORDEN_MOD.index(t["modulo"]), DATOS["transacciones"].index(t)))
POR_VEH = DATOS["por_activo_mes"]
TOTAL = DATOS["total"]

EJ_PLATAFORMA = {
    "eam_tanqueo": 9600, "eam_chk": 1450, "eam_insp_llanta": 7200, "eam_mov_llanta": 1950, "eam_ot": 790, "eam_lube": 420,
    "tms_viaje": 6000, "wms_salida": 9000, "wms_recepcion": 900, "wms_mkp": 1500, "erp_doc": 12000, "scm_compra": 600,
    "crm_lead": 1500, "dms_doc": 2500, "gh_colab": 900, "qms_reg": 400, "grc_eval": 150, "mes_op": 300, "aps_plan": 400,
    "lms_insc": 600, "sst_reg": 500, "loca_ot": 200, "ags_cita": 0, "pos_venta": 3000, "control_mov": 4000, "tarifax_cot": 1200,
}
EJ_CLIENTE = {"tms_viaje": 1500, "erp_doc": 2200, "dms_doc": 300, "sst_reg": 60}


def celda(ws, ref, valor=None, fuente=f_base, formato=None, relleno=None, alin=None, b=True):
    c = ws[ref]
    if valor is not None:
        c.value = valor
    c.font = fuente
    if formato:
        c.number_format = formato
    if relleno:
        c.fill = relleno
    if alin:
        c.alignment = alin
    if b:
        c.border = borde
    return c


def entrada(ws, ref, valor, formato=None, nota=None):
    c = celda(ws, ref, valor, f_entrada, formato, r_amarillo, der)
    if nota:
        c.comment = Comment(nota, "TittanWare")
    return c


def cabecera(ws, fila, titulos, col0=1):
    for i, t in enumerate(titulos):
        c = ws.cell(row=fila, column=col0 + i, value=t)
        c.font, c.fill, c.alignment, c.border = f_cab, r_cab, Alignment(horizontal="center", vertical="center", wrap_text=True), borde


wb = Workbook()

# ─── Transacciones (datos medidos) ───────────────────────────────────────────
wt = wb.active
wt.title = "Transacciones"
wt["A1"] = "Transacciones típicas: registros que escribe cada una y lo que ocupan"
wt["A1"].font = f_titulo
wt["A2"] = ("Fuente: respaldo de la empresa de prueba «carga» (27-oct-2026) leído fila por fila con las reglas de "
            "almacenamiento de Postgres 16; proporciones del CMMS medidas en producción (300 equipos, 24 meses).")
wt["A2"].font = f_nota
cabecera(wt, 4, ["Clave", "Módulo", "Transacción", "Unidad", "Origen", "Registros por transacción",
                 "Bytes por transacción", "Por vehículo al mes", "Tablas que toca (filas por transacción)"])
FILA_TX = {}
for i, t in enumerate(TX):
    r = 5 + i
    FILA_TX[t["clave"]] = r
    celda(wt, f"A{r}", t["clave"])
    celda(wt, f"B{r}", NOMBRES[t["modulo"]])
    celda(wt, f"C{r}", t["nombre"], alin=izq)
    celda(wt, f"D{r}", t["unidad"])
    celda(wt, f"E{r}", "Medido" if t["origen"] == "medido" else "Estimado")
    celda(wt, f"F{r}", t["registros"], f_entrada, '0.00')
    celda(wt, f"G{r}", t["bytes"], f_entrada, ENTERO)
    celda(wt, f"H{r}", POR_VEH.get(t["clave"]), f_entrada, '0.00')
    celda(wt, f"I{r}", " · ".join(f'{d["tabla"]} ×{d["por_tx"]:g}' for d in t["detalle"]), alin=izq)
ULT_TX = 4 + len(TX)
r = ULT_TX + 2
wt[f"A{r}"] = ("Medido: proporciones de un generador que reproduce la operación real. Estimado: transacción armada con criterio "
               "porque el módulo solo tiene datos de relleno. «Por vehículo al mes» sale del CMMS de producción.")
wt[f"A{r}"].font = f_nota
for col, w in zip("ABCDEFGHI", [16, 22, 46, 16, 11, 14, 14, 13, 90]):
    wt.column_dimensions[col].width = w
wt.freeze_panes = "A5"

# ─── Módulos ─────────────────────────────────────────────────────────────────
wm = wb.create_sheet("Módulos")
wm["A1"] = "Lo que ocupa un registro en cada módulo"
wm["A1"].font = f_titulo
wm["A2"] = "Un registro es una fila de una tabla. Tamaño = datos + índices, en Postgres 16."
wm["A2"].font = f_nota
cabecera(wm, 4, ["Módulo", "Tablas", "Registros medidos", "Tamaño medido (bytes)", "Bytes por registro"])
for i, m in enumerate(sorted(DATOS["modulos"], key=lambda x: -x["bytes_fila"])):
    r = 5 + i
    celda(wm, f"A{r}", m["nombre"])
    celda(wm, f"B{r}", m["tablas"], f_entrada, ENTERO)
    celda(wm, f"C{r}", m["filas"], f_entrada, ENTERO)
    celda(wm, f"D{r}", m["bytes"], f_entrada, ENTERO)
    celda(wm, f"E{r}", f"=IFERROR(D{r}/C{r},0)", f_neg, ENTERO)
ULT_M = 4 + len(DATOS["modulos"])
r = ULT_M + 1
celda(wm, f"A{r}", "Total", f_neg, relleno=r_resultado)
for col in "BCD":
    celda(wm, f"{col}{r}", f"=SUM({col}5:{col}{ULT_M})", f_neg, ENTERO, r_resultado)
celda(wm, f"E{r}", f"=IFERROR(D{r}/C{r},0)", f_neg, ENTERO, r_resultado)
FILA_TOTAL_M = r
r += 2
celda(wm, f"A{r}", "Bytes del respaldo comprimido (pg_dump -Fc)", b=False)
celda(wm, f"D{r}", TOTAL["dump_bytes"], f_entrada, ENTERO)
celda(wm, f"E{r}", f"=IFERROR(D{r}/C{FILA_TOTAL_M},0)", f_neg, ENTERO)
FILA_DUMP = r
r += 1
celda(wm, f"A{r}", "Índices en una empresa", b=False)
celda(wm, f"D{r}", TOTAL["n_indices"], f_entrada, ENTERO)
FILA_NIDX = r
r += 1
celda(wm, f"A{r}", "Empresa vacía (bytes): una página por tabla y por índice", b=False)
celda(wm, f"D{r}", f"=(B{FILA_TOTAL_M}+D{FILA_NIDX})*8192", f_neg, ENTERO)
FILA_VACIO = r
for col, w in zip("ABCDE", [44, 10, 18, 22, 18]):
    wm.column_dimensions[col].width = w
wm.freeze_panes = "A5"

# ─── Calculadora ─────────────────────────────────────────────────────────────
wc = wb.create_sheet("Calculadora", 0)
wc["A1"] = "Costo por uso de un cliente"
wc["A1"].font = f_titulo
wc["A2"] = ("Celdas amarillas con texto azul: datos a editar. Valores de partida = ejemplo; reemplácelos por los reales. "
            "Las celdas amarillo claro tienen una fórmula de estimación que se puede sobrescribir.")
wc["A2"].font = f_nota

wc["A4"] = "Plataforma"
wc["A4"].font = f_sub
P = {}
filas_p = [
    ("moneda", "Moneda (solo rótulo)", "COP", None, "Texto: COP, USD…"),
    ("costo", "Costo mensual total de la plataforma", 3500000, MONEDA,
     "Ejemplo. Servidores, base de datos, respaldos, dominio, soporte técnico…"),
    ("pct", "% del costo por guardar datos", 0.30, PCT, "Ejemplo. El resto se reparte por actividad (lo que se escribe al mes)."),
    ("empresas", "Empresas en la plataforma", 8, ENTERO, "Ejemplo."),
    ("ret", "Meses de historia guardada", 36, ENTERO, "Cuánto tiempo se conservan los datos en línea."),
    ("copias", "Copias de respaldo conservadas", 24, ENTERO, "Hoy: 14 diarias (respaldo.sh) + 10 antes de cada despliegue (actualizar.sh)."),
    ("holgura", "Holgura de Postgres", 0.20, PCT, "Filas muertas y espacio libre entre limpiezas (autovacuum). Supuesto."),
    ("arch_p", "Archivos nuevos al mes, toda la plataforma (GB)", 6, '0.00', "Ejemplo. Fotos, adjuntos y documentos (van fuera de la base)."),
]
for i, (k, rot, val, fmt, nota) in enumerate(filas_p):
    r = 5 + i
    P[k] = f"$C${r}"
    celda(wc, f"A{r}", rot, b=False)
    entrada(wc, f"C{r}", val, fmt, nota)
r = 5 + len(filas_p)
celda(wc, f"A{r}", "Razón respaldo / base (medida)", b=False)
celda(wc, f"C{r}", f"='Módulos'!E{FILA_DUMP}/'Módulos'!E{FILA_TOTAL_M}", f_enlace, '0.000')
P["razon"] = f"$C${r}"
r += 1
celda(wc, f"A{r}", "Empresa vacía (bytes, medida)", b=False)
celda(wc, f"C{r}", f"='Módulos'!D{FILA_VACIO}", f_enlace, ENTERO)
P["vacio"] = f"$C${r}"
r += 2

wc[f"A{r}"] = "Cliente"
wc[f"A{r}"].font = f_sub
r += 1
C = {}
filas_c = [
    ("nombre", "Nombre del cliente", "Transportadora ejemplo", None, "Ejemplo."),
    ("veh", "Vehículos o activos", 120, ENTERO, "Ejemplo. Llena por fórmula las filas del CMMS (columna F)."),
    ("colab", "Colaboradores", 80, ENTERO, "Ejemplo. Llena por fórmula la fila de Gestión Humana."),
    ("arch_c", "Archivos nuevos al mes del cliente (GB)", 1.2, '0.00', "Ejemplo."),
    ("precio", "Precio mensual que pagaría", 1800000, MONEDA, "Ejemplo."),
    ("margen", "Margen objetivo", 0.40, PCT, "Ejemplo."),
]
for k, rot, val, fmt, nota in filas_c:
    C[k] = f"$C${r}"
    celda(wc, f"A{r}", rot, b=False)
    entrada(wc, f"C{r}", val, fmt, nota)
    r += 1
r += 1

# Tabla de transacciones
wc[f"A{r}"] = "Volumen mensual por tipo de transacción"
wc[f"A{r}"].font = f_sub
r += 1
FILA_CAB = r
cabecera(wc, r, ["Módulo", "Transacción", "Origen", "Bytes c/u", "Toda la plataforma (al mes)",
                 "Este cliente (al mes)", "Bytes al mes plataforma", "Bytes al mes cliente", "Costo de actividad por transacción"])
r += 1
PRIMERA = r
mod_actual = None
FILAS_CALC = {}
for t in TX:
    if t["modulo"] != mod_actual:
        mod_actual = t["modulo"]
        for col in range(1, 10):
            c = wc.cell(row=r, column=col)
            c.fill, c.border = r_modulo, borde
        wc.cell(row=r, column=1, value=NOMBRES[mod_actual]).font = Font(name=F, size=10, bold=True, color=ACENTO)
        r += 1
    ft = FILA_TX[t["clave"]]
    FILAS_CALC[t["clave"]] = r
    celda(wc, f"A{r}", f"='Transacciones'!B{ft}", f_enlace)
    celda(wc, f"B{r}", f"='Transacciones'!C{ft}", f_enlace, alin=izq)
    celda(wc, f"C{r}", f"='Transacciones'!E{ft}", f_enlace)
    celda(wc, f"D{r}", f"='Transacciones'!G{ft}", f_enlace, ENTERO)
    entrada(wc, f"E{r}", EJ_PLATAFORMA.get(t["clave"], 0), ENTERO)
    if t["clave"] in POR_VEH:
        c = celda(wc, f"F{r}", f"=ROUND('Transacciones'!H{ft}*{C['veh']},0)", f_base, ENTERO, r_amarillo_claro, der)
        c.comment = Comment("Estimado: vehículos × lo que produjo cada vehículo al mes en producción. Se puede sobrescribir con un número.", "TittanWare")
    elif t["clave"] == "gh_colab":
        c = celda(wc, f"F{r}", f"={C['colab']}", f_base, ENTERO, r_amarillo_claro, der)
        c.comment = Comment("Estimado: un registro de nómina por colaborador al mes. Se puede sobrescribir.", "TittanWare")
    else:
        entrada(wc, f"F{r}", EJ_CLIENTE.get(t["clave"], 0), ENTERO)
    celda(wc, f"G{r}", f"=E{r}*D{r}*(1+{P['holgura']})", f_base, ENTERO)
    celda(wc, f"H{r}", f"=F{r}*D{r}*(1+{P['holgura']})", f_base, ENTERO)
    celda(wc, f"I{r}", f"=D{r}*(1+{P['holgura']})*$L$8", f_base, MONEDA2)
    r += 1
ULTIMA = r - 1
celda(wc, f"A{r}", "Total", f_neg, relleno=r_resultado)
for col in "BCD":
    celda(wc, f"{col}{r}", None, relleno=r_resultado)
for col in "EFGH":
    celda(wc, f"{col}{r}", f"=SUM({col}{PRIMERA}:{col}{ULTIMA})", f_neg, ENTERO, r_resultado)
celda(wc, f"I{r}", None, relleno=r_resultado)
FILA_TOT = r

# Resultados (columnas K-L)
wc["K4"] = "Costos unitarios de la plataforma"
wc["K4"].font = f_sub
U = [
    ("Bytes escritos al mes, toda la plataforma", f"=G{FILA_TOT}", ENTERO),
    ("GB guardados, toda la plataforma (base + respaldos + archivos)",
     f"=({P['ret']}*G{FILA_TOT}+{P['empresas']}*{P['vacio']})*(1+{P['razon']}*{P['copias']})/1024^3+{P['arch_p']}*{P['ret']}", GB),
    ("Costo por guardar datos (al mes)", f"={P['costo']}*{P['pct']}", MONEDA),
    ("Costo por actividad (al mes)", f"={P['costo']}*(1-{P['pct']})", MONEDA),
    ("Guardar 1 GB durante un mes", "=IFERROR(L7/L6,0)", MONEDA2),
    ("Escribir 1 byte", "=IFERROR(L8/L5,0)", '0.000000'),
    ("Escribir 1 MB", "=L10*1024^2", MONEDA2),
]
for i, (rot, f, fmt) in enumerate(U):
    rr = 5 + i
    celda(wc, f"K{rr}", rot, alin=izq)
    celda(wc, f"L{rr}", f, f_base, fmt, r_resultado)
# Arreglar referencias: L5 bytes, L6 GB, L7 alm, L8 act, L9 por GB, L10 por byte, L11 por MB
for clave, fila_c in FILAS_CALC.items():
    wc[f"I{fila_c}"].value = f"=D{fila_c}*(1+{P['holgura']})*$L$10"

wc["K14"] = "Resultado del cliente"
wc["K14"].font = f_sub
RES = [
    ("Transacciones al mes", f"=F{FILA_TOT}", ENTERO),
    ("Bytes escritos al mes", f"=H{FILA_TOT}", ENTERO),
    ("Su parte de la actividad de la plataforma", f"=IFERROR(L16/L5,0)", PCT),
    ("Costo por actividad (al mes)", "=L16*L10", MONEDA),
    ("GB guardados con la historia completa",
     f"=(L16*{P['ret']}+{P['vacio']})*(1+{P['razon']}*{P['copias']})/1024^3+{C['arch_c']}*{P['ret']}", GB),
    ("Costo por lo que guarda (al mes)", "=L19*L9", MONEDA),
    ("COSTO MENSUAL DEL CLIENTE (historia completa)", "=L18+L20", MONEDA),
    ("Costo por transacción", "=IFERROR(L21/L15,0)", MONEDA2),
    ("Precio mensual", f"={C['precio']}", MONEDA),
    ("Margen con ese precio", "=IFERROR((L23-L21)/L23,0)", PCT),
    ("Precio mínimo para el margen objetivo", f"=IFERROR(L21/(1-{C['margen']}),0)", MONEDA),
    ("Estado", f'=IF(L16>L5,"Revise: el cliente escribe más que toda la plataforma",'
               f'IF(L23<=0,"Escriba un precio",IF(L24>={C["margen"]},"Cumple el margen objetivo",'
               f'IF(L24>=0,"Deja ganancia, por debajo del objetivo","El precio no cubre el costo"))))', None),
]
for i, (rot, f, fmt) in enumerate(RES):
    rr = 15 + i
    grande = rot.startswith("COSTO")
    celda(wc, f"K{rr}", rot, f_neg if grande else f_base, alin=izq)
    celda(wc, f"L{rr}", f, f_grande if grande else f_base, fmt, r_resultado, izq if fmt is None else der)
wc.conditional_formatting.add("L26", FormulaRule(formula=['ISNUMBER(SEARCH("Cumple",L26))'], font=Font(name=F, color="16A34A", bold=True)))
wc.conditional_formatting.add("L26", FormulaRule(formula=['OR(ISNUMBER(SEARCH("no cubre",L26)),ISNUMBER(SEARCH("Revise",L26)))'], font=Font(name=F, color="DC2626", bold=True)))
wc.conditional_formatting.add("L26", FormulaRule(formula=['ISNUMBER(SEARCH("por debajo",L26))'], font=Font(name=F, color="B45309", bold=True)))

wc["K29"] = "Cómo crece con la antigüedad"
wc["K29"].font = f_sub
cabecera(wc, 30, ["Mes", "GB guardados", "Costo mensual"], col0=11)
for i, mes in enumerate([1, 6, 12, 24, 36, 48, 60]):
    rr = 31 + i
    entrada(wc, f"K{rr}", mes, ENTERO)
    celda(wc, f"L{rr}", f"=(L$16*MIN(K{rr},{P['ret']})+{P['vacio']})*(1+{P['razon']}*{P['copias']})/1024^3+{C['arch_c']}*MIN(K{rr},{P['ret']})", f_base, GB)
    celda(wc, f"M{rr}", f"=L$18+L{rr}*L$9", f_base, MONEDA)
wc["K39"] = "Después de los meses de historia guardada el costo deja de crecer: lo más viejo se archiva o se borra."
wc["K39"].font = f_nota

for col, w in zip("ABCDEFGHIJKLM", [40, 46, 10, 11, 14, 14, 16, 16, 15, 3, 44, 22, 16]):
    wc.column_dimensions[col].width = w
wc.row_dimensions[FILA_CAB].height = 30
wc.freeze_panes = f"A{FILA_CAB + 1}"
dv = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True,
                    error="Escriba un número igual o mayor que cero.", errorTitle="Valor no válido")
wc.add_data_validation(dv)
dv.add(f"E{PRIMERA}:F{ULTIMA}")

# ─── Comparar clientes ───────────────────────────────────────────────────────
wk = wb.create_sheet("Comparar clientes", 1)
wk["A1"] = "Comparar clientes"
wk["A1"].font = f_titulo
wk["A2"] = ("Usa los costos unitarios de la hoja Calculadora (costo de la plataforma y volumen total). "
            "Una columna por cliente; las filas del CMMS se estiman por vehículos y se pueden sobrescribir.")
wk["A2"].font = f_nota
CLIENTES = [
    ("Transportadora A", 120, 80, 1.2, 1800000, 24, {"tms_viaje": 1500, "erp_doc": 2200, "dms_doc": 300, "sst_reg": 60}),
    ("Operador logístico B", 40, 150, 2.0, 2500000, 12, {"wms_salida": 5000, "wms_recepcion": 500, "wms_mkp": 1500, "erp_doc": 4000, "crm_lead": 600, "tms_viaje": 800}),
    ("Flota propia C", 300, 40, 3.0, 2200000, 36, {"dms_doc": 200}),
    ("Cliente D", 0, 0, 0, 0, 1, {}),
    ("Cliente E", 0, 0, 0, 0, 1, {}),
    ("Cliente F", 0, 0, 0, 0, 1, {}),
]
cols = [get_column_letter(3 + i) for i in range(len(CLIENTES))]
cabecera(wk, 4, ["Dato", "Unidad"] + [f"Cliente {i + 1}" for i in range(len(CLIENTES))])
PARAM = [("Nombre", "", None), ("Vehículos o activos", "unidades", ENTERO), ("Colaboradores", "personas", ENTERO),
         ("Archivos nuevos al mes", "GB", '0.00'), ("Precio mensual", "moneda", MONEDA), ("Antigüedad", "meses", ENTERO)]
for i, (rot, uni, fmt) in enumerate(PARAM):
    rr = 5 + i
    celda(wk, f"A{rr}", rot)
    celda(wk, f"B{rr}", uni)
    for j, cli in enumerate(CLIENTES):
        entrada(wk, f"{cols[j]}{rr}", cli[i], fmt)
rr = 12
for col in range(1, 3 + len(CLIENTES)):
    wk.cell(row=rr, column=col).fill = r_modulo
wk.cell(row=rr, column=1, value="Transacciones al mes").font = Font(name=F, size=10, bold=True, color=ACENTO)
rr += 1
PRIM_K = rr
for t in TX:
    ft = FILA_TX[t["clave"]]
    celda(wk, f"A{rr}", f"='Transacciones'!C{ft}", f_enlace, alin=izq)
    celda(wk, f"B{rr}", f"='Transacciones'!D{ft}", f_enlace)
    for j, cli in enumerate(CLIENTES):
        col = cols[j]
        if t["clave"] in POR_VEH:
            celda(wk, f"{col}{rr}", f"=ROUND('Transacciones'!$H${ft}*{col}$6,0)", f_base, ENTERO, r_amarillo_claro, der)
        elif t["clave"] == "gh_colab":
            celda(wk, f"{col}{rr}", f"={col}$7", f_base, ENTERO, r_amarillo_claro, der)
        else:
            entrada(wk, f"{col}{rr}", cli[6].get(t["clave"], 0), ENTERO)
    rr += 1
ULT_K = rr - 1
rr += 1
for col in range(1, 3 + len(CLIENTES)):
    wk.cell(row=rr, column=col).fill = r_modulo
wk.cell(row=rr, column=1, value="Resultados").font = Font(name=F, size=10, bold=True, color=ACENTO)
rr += 1
bytes_por_fila = {}
RK = [
    ("Bytes escritos al mes", "bytes", None, ENTERO),
    ("Costo por actividad", "moneda", None, MONEDA),
    ("GB guardados a la antigüedad indicada", "GB", None, GB),
    ("Costo por lo que guarda", "moneda", None, MONEDA),
    ("Costo mensual total", "moneda", None, MONEDA),
    ("Margen con el precio", "%", None, PCT),
    ("Precio mínimo para el margen objetivo", "moneda", None, MONEDA),
]
FR = {}
for i, (rot, uni, _, fmt) in enumerate(RK):
    FR[rot] = rr + i
for i, (rot, uni, _, fmt) in enumerate(RK):
    fila = rr + i
    celda(wk, f"A{fila}", rot, f_neg if rot == "Costo mensual total" else f_base)
    celda(wk, f"B{fila}", uni)
    for j in range(len(CLIENTES)):
        col = cols[j]
        terminos = "+".join(f"{col}{PRIM_K + k}*'Calculadora'!$D${FILAS_CALC[t['clave']]}" for k, t in enumerate(TX))
        f = {
            "Bytes escritos al mes": f"=({terminos})*(1+'Calculadora'!{P['holgura']})",
            "Costo por actividad": f"={col}{FR['Bytes escritos al mes']}*'Calculadora'!$L$10",
            "GB guardados a la antigüedad indicada":
                f"=({col}{FR['Bytes escritos al mes']}*MIN({col}$10,'Calculadora'!{P['ret']})+'Calculadora'!{P['vacio']})"
                f"*(1+'Calculadora'!{P['razon']}*'Calculadora'!{P['copias']})/1024^3+{col}$8*MIN({col}$10,'Calculadora'!{P['ret']})",
            "Costo por lo que guarda": f"={col}{FR['GB guardados a la antigüedad indicada']}*'Calculadora'!$L$9",
            "Costo mensual total": f"={col}{FR['Costo por actividad']}+{col}{FR['Costo por lo que guarda']}",
            "Margen con el precio": f"=IFERROR(({col}$9-{col}{FR['Costo mensual total']})/{col}$9,0)",
            "Precio mínimo para el margen objetivo": f"=IFERROR({col}{FR['Costo mensual total']}/(1-'Calculadora'!{C['margen']}),0)",
        }[rot]
        celda(wk, f"{col}{fila}", f, f_grande if rot == "Costo mensual total" else f_base, fmt, r_resultado)
fila_m = FR["Margen con el precio"]
rango = f"{cols[0]}{fila_m}:{cols[-1]}{fila_m}"
wk.conditional_formatting.add(rango, FormulaRule(formula=[f"AND({cols[0]}$9>0,{cols[0]}{fila_m}<0)"], font=Font(name=F, color="DC2626", bold=True)))
wk.conditional_formatting.add(rango, FormulaRule(formula=[f"AND({cols[0]}$9>0,{cols[0]}{fila_m}>='Calculadora'!{C['margen']})"], font=Font(name=F, color="16A34A", bold=True)))
wk.column_dimensions["A"].width = 52
wk.column_dimensions["B"].width = 14
for c in cols:
    wk.column_dimensions[c].width = 20
wk.freeze_panes = "C5"

# ─── Proyección ──────────────────────────────────────────────────────────────
wp = wb.create_sheet("Proyección", 2)
wp["A1"] = "De mil a diez mil millones de registros"
wp["A1"].font = f_titulo
wp["A2"] = "Promedio medido por registro (datos + índices) con la holgura y las copias de respaldo de la hoja Calculadora."
wp["A2"].font = f_nota
celda(wp, "A4", "Bytes por registro con holgura", b=False)
celda(wp, "C4", f"='Módulos'!E{FILA_TOTAL_M}*(1+'Calculadora'!{P['holgura']})", f_enlace, ENTERO)
celda(wp, "A5", "Bytes por registro en un respaldo comprimido", b=False)
celda(wp, "C5", f"='Módulos'!E{FILA_DUMP}", f_enlace, ENTERO)
celda(wp, "A6", "Copias de respaldo conservadas", b=False)
celda(wp, "C6", f"='Calculadora'!{P['copias']}", f_enlace, ENTERO)
celda(wp, "A7", "Fracción de la base que se consulta a diario (para la RAM)", b=False)
entrada(wp, "C7", 0.20, PCT, "Supuesto: Postgres va rápido cuando lo que se consulta a diario cabe en memoria.")
celda(wp, "A8", "RAM mínima (GB)", b=False)
entrada(wp, "C8", 2, ENTERO, "Supuesto: piso para el sistema y Postgres.")
cabecera(wp, 10, ["Registros", "Base de datos (GB)", "Un respaldo (GB)", "Respaldos conservados (GB)", "Total en disco (GB)", "RAM sugerida (GB)"])
for i, n in enumerate([1e3, 1e6, 1e7, 1e8, 1e9, 5e9, 1e10]):
    rr = 11 + i
    entrada(wp, f"A{rr}", n, ENTERO)
    celda(wp, f"B{rr}", f"=A{rr}*$C$4/1024^3", f_base, '#,##0.000')
    celda(wp, f"C{rr}", f"=A{rr}*$C$5/1024^3", f_base, '#,##0.000')
    celda(wp, f"D{rr}", f"=C{rr}*$C$6", f_base, '#,##0.000')
    celda(wp, f"E{rr}", f"=B{rr}+D{rr}", f_neg, '#,##0.000')
    celda(wp, f"F{rr}", f"=MAX($C$8,B{rr}*$C$7)", f_base, '#,##0.0')
for col, w in zip("ABCDEF", [52, 20, 18, 24, 20, 18]):
    wp.column_dimensions[col].width = w

# ─── Metodología ─────────────────────────────────────────────────────────────
wd = wb.create_sheet("Metodología")
wd["A1"] = "Cómo se midió y qué queda por fuera"
wd["A1"].font = f_titulo
TEXTO = [
    "Tamaño real de Postgres, no de un archivo: se leyó el respaldo de la empresa «carga» (27-oct-2026, 572 tablas, 1,76 millones de registros) fila por fila y se aplicaron las reglas de almacenamiento de Postgres 16: 24 bytes de cabecera por fila, alineación de cada tipo, largo real de cada texto, páginas de 8 KB y cada índice B-tree de la tabla.",
    "Un registro es una fila de una tabla. Una transacción escribe varias (una orden de trabajo con repuestos, mano de obra y movimientos de bodega son unas 10). Por eso la calculadora trabaja por transacción.",
    "El CMMS se midió contra la flota de producción: 300 equipos durante 24 meses en app.tittanware.com produjeron 86.869 tanqueos, 65.020 inspecciones de llanta y 7.093 órdenes de trabajo. De ahí salen las cifras por vehículo al mes.",
    "Los módulos con datos de relleno tienen textos de largo verosímil, no real. La holgura de Postgres cubre parte de esa diferencia.",
    "Cada empresa vacía ocupa unos 17 MB: cada tabla y cada índice reserva al menos una página de 8 KB.",
    "Los archivos (fotos, adjuntos, PDF) no están en la base: van al disco del servidor y tienen su propio campo.",
    "Reparto del costo: una parte (el % por guardar datos) se divide por GB guardados (base + respaldos + archivos) y el resto por bytes escritos al mes. Los bytes escritos son una aproximación del trabajo del servidor: un informe pesado consulta mucho sin escribir nada.",
    "No incluye Redis (sesiones, pocos MB), los registros del servidor ni el tráfico de red.",
    "Colores: texto azul sobre amarillo = dato a editar; amarillo claro = fórmula de estimación que se puede sobrescribir; texto verde = vínculo a otra hoja; negro = fórmula.",
]
for i, t in enumerate(TEXTO):
    c = wd.cell(row=3 + i, column=1, value=t)
    c.font, c.alignment = f_base, Alignment(wrap_text=True, vertical="top")
    wd.row_dimensions[3 + i].height = 45
wd.column_dimensions["A"].width = 120

# ─── Léame ───────────────────────────────────────────────────────────────────
wl = wb.create_sheet("Léame", 0)
wl["A1"] = "Calculadora de costo por cliente · TittanWare"
wl["A1"].font = f_titulo
PASOS = [
    ("Qué responde", "Cuánto cuesta atender a un cliente según lo que escribe y guarda en la plataforma, y qué margen deja su precio."),
    ("1. Calculadora", "Escriba el costo mensual de la plataforma y el volumen mensual de TODA la plataforma por tipo de transacción (columna E). Luego el del cliente (columna F, o vehículos y colaboradores para estimarlo). El resultado está a la derecha."),
    ("2. Comparar clientes", "Hasta 6 clientes lado a lado con los mismos costos unitarios. Útil para revisar precios en equipo."),
    ("3. Proyección", "Cuánto ocupa la base de mil a diez mil millones de registros, con respaldos y RAM sugerida."),
    ("Datos medidos", "Hojas Transacciones y Módulos: lo que ocupa cada transacción y cada registro. Origen en Metodología."),
    ("Celdas a editar", "Texto azul sobre fondo amarillo. Amarillo claro: fórmula que estima el valor (se puede sobrescribir). Los valores de partida son un ejemplo."),
    ("Fecha de medición", "2 de noviembre de 2026, sobre el respaldo de la empresa de prueba «carga» y el CMMS de producción."),
]
for i, (a, b) in enumerate(PASOS):
    rr = 3 + i
    wl.cell(row=rr, column=1, value=a).font = f_neg
    c = wl.cell(row=rr, column=2, value=b)
    c.font, c.alignment = f_base, Alignment(wrap_text=True, vertical="top")
    wl.row_dimensions[rr].height = 42
wl["A12"] = "Ejemplo de celda a editar:"
wl["A12"].font = f_base
entrada(wl, "B12", 3500000, MONEDA, "Así se ve una celda para editar.")
wl.column_dimensions["A"].width = 24
wl.column_dimensions["B"].width = 110

for ws in wb.worksheets:
    ws.sheet_view.showGridLines = False
wb.active = 1
wb.save(SALIDA)
print("ok", SALIDA, "filas calc", PRIMERA, ULTIMA, "tot", FILA_TOT)
