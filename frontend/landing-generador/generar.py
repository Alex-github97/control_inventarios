"""
Genera un folleto por módulo a partir del catálogo.

    python frontend/landing-generador/generar.py

POR QUÉ SE GENERA Y NO SE SIRVE CON UNA PLANTILLA
Podría ser una sola página que lee el módulo de la URL, pero entonces cada
folleto compartiría título, descripción y vista previa: al pegar el enlace de
llantas en un WhatsApp saldría «TittanWare» y no «Mantenimiento». Generando
archivos, cada folleto tiene su propio título, su propia descripción y funciona
sin JavaScript.

LAS CAPTURAS
Cada hueco apunta a `img/<clave>-1.png`. Si el archivo no está, la imagen se
esconde sola y queda el marco con su leyenda. Poner una captura es dejarla caer
en esa carpeta con ese nombre: no hay que tocar código ni volver a generar.
"""
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from catalogo import COBROS, MODULOS   # noqa: E402

# El generador vive FUERA de `landing/` a propósito: esa carpeta se copia
# entera dentro de la imagen y se sirve como sitio público, así que un .py ahí
# quedaría descargable desde internet.
AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(os.path.dirname(AQUI), "landing", "modulos")


def e(t):
    return html.escape(t, quote=True)


CABEZA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{nombre} · {titulo} — TittanWare</title>
<meta name="description" content="{promesa}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:title" content="{nombre} · {titulo} — TittanWare">
<meta property="og:description" content="{promesa}">
<meta property="og:type" content="article">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  /* La misma paleta y la misma retícula de la portada: el folleto tiene que
     sentirse la misma casa, no un anexo. */
  :root{{
    --tinta:#1A1A1A; --abismo:#08080A; --carbon:#1E1E22;
    --grafito:#4D4D4D; --acero:#8C8C8C; --niebla:#E5E5E5;
    --bruma:#F7F7F7; --lienzo:#FFF;
    --acento:#2F6FEB; --acento-claro:#7BA4F5; --acento-vapor:#EAF1FE;
    --radio:16px;
  }}
  *{{margin:0;padding:0;box-sizing:border-box}}
  html{{scroll-behavior:smooth}}
  body{{font-family:'Montserrat',system-ui,sans-serif;color:var(--tinta);
    background:var(--lienzo);line-height:1.62;-webkit-font-smoothing:antialiased}}
  a{{color:inherit;text-decoration:none}}
  img{{max-width:100%;display:block}}
  .env{{width:min(1180px,92vw);margin:0 auto}}
  .mono{{font-family:'JetBrains Mono',ui-monospace,monospace}}

  header{{position:fixed;inset:0 0 auto 0;z-index:60;background:rgba(255,255,255,.92);
    backdrop-filter:blur(16px);border-bottom:1px solid var(--niebla)}}
  .barra{{display:flex;align-items:center;gap:30px;height:72px}}
  .logo{{font-weight:600;font-size:19px;letter-spacing:.22em}}
  header nav{{display:flex;gap:26px;margin-left:auto;font-size:14px;font-weight:500;
    color:var(--grafito)}}
  header nav a:hover{{color:var(--tinta)}}
  .btn{{display:inline-flex;align-items:center;justify-content:center;gap:9px;
    padding:13px 24px;border-radius:999px;font-weight:600;font-size:14.5px;
    border:1px solid transparent;transition:transform .2s ease,box-shadow .25s ease,
    background .2s ease,border-color .2s ease;cursor:pointer}}
  .btn-acento{{background:var(--acento);color:#fff;
    box-shadow:0 10px 26px rgba(47,111,235,.26)}}
  .btn-acento:hover{{transform:translateY(-2px)}}
  .btn-linea{{border-color:var(--niebla);color:var(--tinta);background:#fff}}
  .btn-linea:hover{{border-color:var(--tinta);transform:translateY(-2px)}}
  .btn-fantasma{{border-color:rgba(255,255,255,.32);color:#fff}}
  .btn-fantasma:hover{{border-color:#fff;background:rgba(255,255,255,.08)}}

  /* ── Portada del folleto ── */
  .cima{{background:var(--tinta);color:#fff;padding:150px 0 90px;position:relative;
    overflow:hidden}}
  .cima::before{{content:'';position:absolute;inset:0;pointer-events:none;
    background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.11) 1px,transparent 0),
      radial-gradient(820px 420px at 86% 0%,rgba(47,111,235,.24),transparent 62%);
    background-size:28px 28px,100% 100%}}
  .cima .env{{position:relative;z-index:2}}
  .volver{{display:inline-flex;align-items:center;gap:8px;font-size:13px;
    color:rgba(255,255,255,.6);margin-bottom:26px;font-weight:500}}
  .volver:hover{{color:#fff}}
  .indice{{display:inline-flex;align-items:center;gap:11px;font-size:11px;
    letter-spacing:.18em;text-transform:uppercase;color:var(--acento-claro);
    font-weight:700;font-family:'JetBrains Mono',ui-monospace,monospace}}
  .indice b{{background:rgba(123,164,245,.16);border-radius:7px;padding:5px 8px;
    line-height:1}}
  h1{{font-size:clamp(2.1rem,5.4vw,3.6rem);font-weight:800;letter-spacing:-.03em;
    line-height:1.06;margin:18px 0 0;max-width:18ch}}
  .promesa{{margin-top:22px;font-size:clamp(1.02rem,2vw,1.26rem);
    color:rgba(255,255,255,.74);max-width:56ch}}
  .cima .acciones{{display:flex;gap:14px;margin-top:38px;flex-wrap:wrap}}

  section{{padding:88px 0;position:relative;overflow:hidden}}
  .gris{{background:var(--bruma)}}
  section::before{{content:'';position:absolute;inset:0;pointer-events:none;
    background-image:radial-gradient(circle at 1px 1px,rgba(0,0,0,.075) 1px,transparent 0);
    background-size:28px 28px}}
  section>.env{{position:relative;z-index:2}}
  section+section{{border-top:1px solid rgba(0,0,0,.055)}}

  .rotulo{{display:inline-flex;align-items:center;gap:11px;font-size:11px;
    letter-spacing:.18em;text-transform:uppercase;color:var(--acento);
    font-weight:700;font-family:'JetBrains Mono',ui-monospace,monospace}}
  .rotulo::before{{content:'';width:26px;height:1px;background:currentColor;opacity:.6}}
  h2{{font-size:clamp(1.6rem,3.4vw,2.4rem);font-weight:800;letter-spacing:-.025em;
    margin:14px 0 16px;max-width:24ch}}
  .intro{{color:var(--grafito);max-width:66ch;font-size:1.04rem}}

  .rejilla{{display:grid;gap:20px;margin-top:44px;
    grid-template-columns:repeat(auto-fit,minmax(288px,1fr))}}
  .tarjeta{{background:#fff;border:1px solid var(--niebla);border-radius:var(--radio);
    padding:26px;position:relative;overflow:hidden;
    transition:transform .2s ease,box-shadow .28s ease,border-color .25s ease}}
  .tarjeta::after{{content:'';position:absolute;top:0;left:0;height:2px;width:0;
    background:linear-gradient(90deg,transparent,var(--acento));
    transition:width .55s cubic-bezier(.22,.61,.36,1)}}
  .tarjeta:hover::after{{width:100%}}
  .tarjeta:hover{{transform:translateY(-5px);box-shadow:0 20px 44px rgba(0,0,0,.09);
    border-color:#d3d3d3}}
  .tarjeta h3{{font-size:1.04rem;font-weight:700;margin-bottom:9px}}
  .tarjeta p{{color:var(--grafito);font-size:.93rem}}

  /* ── Capturas ──
     El marco existe aunque la imagen no. Cuando alguien deja el PNG en
     `img/`, aparece sin tocar nada más. */
  .capturas{{display:grid;gap:22px;margin-top:44px;
    grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}}
  .captura{{border:1px solid var(--niebla);border-radius:var(--radio);overflow:hidden;
    background:#fff}}
  .captura .marco{{aspect-ratio:16/10;background:var(--bruma);display:grid;
    place-items:center;position:relative;overflow:hidden}}
  .captura .marco img{{width:100%;height:100%;object-fit:cover;object-position:top left}}
  .captura .vacio{{padding:26px;text-align:center;color:var(--acero);font-size:.86rem;
    font-family:'JetBrains Mono',ui-monospace,monospace;line-height:1.7}}
  .captura .pie{{padding:15px 20px;font-size:.9rem;color:var(--grafito);
    border-top:1px solid var(--niebla)}}

  .franja{{background:var(--tinta);color:#fff}}
  .franja::before{{background-image:radial-gradient(circle at 1px 1px,rgba(255,255,255,.1) 1px,transparent 0);
    background-size:28px 28px}}
  .franja h2{{color:#fff}}
  .franja .intro{{color:rgba(255,255,255,.74)}}
  .franja .rotulo{{color:var(--acento-claro)}}

  .precio{{display:flex;gap:28px;align-items:baseline;flex-wrap:wrap;margin-top:26px}}
  .precio .cifra{{font-family:'JetBrains Mono',ui-monospace,monospace;
    font-size:clamp(2rem,4vw,2.7rem);font-weight:600;letter-spacing:-.03em;
    color:var(--acento)}}
  .precio .texto{{color:var(--grafito);max-width:52ch;font-size:.98rem}}

  .cierre{{text-align:center;padding:104px 0}}
  .cierre h2,.cierre .intro{{margin-left:auto;margin-right:auto}}
  .cierre .intro{{margin-bottom:34px}}
  .cierre .acciones{{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}}

  .otros{{display:grid;gap:10px;margin-top:40px;
    grid-template-columns:repeat(auto-fill,minmax(206px,1fr))}}
  .otro{{display:flex;align-items:center;gap:11px;background:#fff;padding:14px 16px;
    border:1px solid var(--niebla);border-radius:12px;font-size:.87rem;font-weight:600;
    transition:border-color .18s ease,transform .18s ease,box-shadow .22s ease}}
  .otro:hover{{border-color:var(--acento);transform:translateY(-3px);
    box-shadow:0 10px 24px rgba(47,111,235,.13)}}
  .otro i{{font-style:normal;flex-shrink:0;font-size:11px;font-weight:700;
    font-family:'JetBrains Mono',ui-monospace,monospace;color:var(--acento);
    background:var(--acento-vapor);border-radius:7px;padding:4px 6px;line-height:1}}

  footer{{background:var(--abismo);color:rgba(255,255,255,.58);padding:52px 0 34px;
    font-size:.88rem}}
  .pie{{display:flex;gap:24px;flex-wrap:wrap;align-items:center}}
  .pie a:hover{{color:#fff}}
  .legal{{margin-top:26px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);
    font-size:.8rem;color:rgba(255,255,255,.4)}}

  @media (max-width:820px){{
    header nav{{display:none}}
    section{{padding:64px 0}}
    .cima{{padding:120px 0 66px}}
  }}
  @media (prefers-reduced-motion:reduce){{
    *{{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
  }}
</style>
</head>
<body>

<header>
  <div class="env barra">
    <a href="/" class="logo">TITTANWARE</a>
    <nav>
      <a href="/#plataforma">Plataforma</a>
      <a href="/#modulos">Módulos</a>
      <a href="/#tarifas">Tarifas</a>
      <a href="/#contacto">Contacto</a>
    </nav>
    <a class="btn btn-linea" href="https://tittanware.tech">Ingresar</a>
  </div>
</header>

<div class="cima">
  <div class="env">
    <a class="volver" href="/#modulos">← Todos los módulos</a>
    <span class="indice"><b>{orden}</b> {nombre}</span>
    <h1>{titulo}</h1>
    <p class="promesa">{promesa}</p>
    <div class="acciones">
      <a class="btn btn-acento" href="/#contacto">Ver una demostración</a>
      <a class="btn btn-fantasma" href="/#tarifas">Cuánto cuesta</a>
    </div>
  </div>
</div>
"""

PROBLEMA = """
<section>
  <div class="env">
    <span class="rotulo">El problema</span>
    <h2>Qué pasa hoy sin esto</h2>
    <p class="intro">{problema}</p>
  </div>
</section>
"""

CAPACIDADES = """
<section class="gris">
  <div class="env">
    <span class="rotulo">Qué hace</span>
    <h2>Lo que resuelve</h2>
    <p class="intro">Cada punto de esta lista existe en el sistema hoy; no hay nada
      anunciado que no esté construido.</p>
    <div class="rejilla">
{tarjetas}
    </div>
  </div>
</section>
"""

CAPTURAS = """
<section>
  <div class="env">
    <span class="rotulo">Cómo se ve</span>
    <h2>Las pantallas</h2>
    <div class="capturas">
{marcos}
    </div>
  </div>
</section>
"""

CONECTA = """
<section class="franja">
  <div class="env">
    <span class="rotulo">Cómo se conecta</span>
    <h2>No es una isla</h2>
    <p class="intro">{conecta}</p>
  </div>
</section>
"""

PRECIO = """
<section class="gris">
  <div class="env">
    <span class="rotulo">Cuánto cuesta</span>
    <h2>{cobro_titulo}</h2>
    <div class="precio">
      <span class="cifra">{cobro_valor}</span>
      <span class="texto">{cobro_detalle}</span>
    </div>
    <p class="intro" style="margin-top:26px">Usuarios sin límite en todos los planes.
      Se factura solo la unidad con movimiento en el mes.
      <a href="/#tarifas" style="color:var(--acento);font-weight:600">Ver todas las tarifas →</a></p>
  </div>
</section>
"""

CIERRE = """
<section class="cierre">
  <div class="env">
    <span class="rotulo" style="justify-content:center">Seguir mirando</span>
    <h2>Los otros módulos</h2>
    <p class="intro">Se contratan por separado y el que no se contrata no aparece:
      ni en el menú, ni en la factura.</p>
    <div class="otros">
@@OTROS@@
    </div>
    <div class="acciones" style="margin-top:44px">
      <a class="btn btn-acento" href="/#contacto">Solicitar una demostración</a>
      <a class="btn btn-linea" href="/#tarifas">Ver las tarifas</a>
    </div>
  </div>
</section>

<footer>
  <div class="env">
    <div class="pie">
      <a href="/" class="logo" style="font-size:16px">TITTANWARE</a>
      <a href="/#plataforma">Plataforma</a>
      <a href="/#modulos">Módulos</a>
      <a href="/#tarifas">Tarifas</a>
      <a href="/#contacto">Contacto</a>
    </div>
    <div class="legal">
      © <span id="anio"></span> TittanWare · Tecnología que fortalece · Soluciones que trascienden
    </div>
  </div>
</footer>

<script>
  document.getElementById('anio').textContent = new Date().getFullYear();
  // Cada captura que no exista todavía deja su marco con la leyenda. Así se
  // puede publicar el folleto antes de tener las imágenes y agregarlas después
  // sin volver a generar nada.
  for (const img of document.querySelectorAll('.captura img')) {
    img.addEventListener('error', () => {
      img.remove();
    }, { once: true });
  }
</script>
</body>
</html>
"""


def tarjeta(titulo, texto):
    return (f'      <article class="tarjeta">\n'
            f'        <h3>{e(titulo)}</h3>\n'
            f'        <p>{e(texto)}</p>\n'
            f'      </article>')


def marco(clave, i, leyenda):
    return (f'      <figure class="captura">\n'
            f'        <div class="marco">\n'
            f'          <img src="img/{clave}-{i}.png" alt="{e(leyenda)}" loading="lazy">\n'
            f'          <div class="vacio">captura pendiente</div>\n'
            f'        </div>\n'
            f'        <figcaption class="pie">{e(leyenda)}</figcaption>\n'
            f'      </figure>')


def capturas_de(clave):
    """Las capturas que de verdad están en disco, con su leyenda.

    Las leyendas las escribe el guion que fotografía, no el catálogo: si una
    pantalla salió vacía y se descartó, su archivo no está y su leyenda tampoco,
    de modo que el folleto no promete una pantalla que nadie va a ver. Y cuando
    no hay ninguna captura del módulo, la sección entera desaparece: tres marcos
    grises seguidos dicen «esto no está terminado» mucho más alto que su
    ausencia.
    """
    ruta = os.path.join(SALIDA, "img", "leyendas.json")
    if not os.path.exists(ruta):
        return []
    with open(ruta, encoding="utf-8") as f:
        leyendas = json.load(f)
    return [
        (i, leyendas[f"{clave}-{i}"])
        for i in range(1, 10)
        if f"{clave}-{i}" in leyendas
        and os.path.exists(os.path.join(SALIDA, "img", f"{clave}-{i}.png"))
    ]


def generar():
    os.makedirs(os.path.join(SALIDA, "img"), exist_ok=True)
    escritos = []

    for m in MODULOS:
        otros = "\n".join(
            f'      <a class="otro" href="{o["clave"]}.html">'
            f'<i>{o["orden"]}</i>{e(o["nombre"])}</a>'
            for o in MODULOS if o["clave"] != m["clave"]
        )
        cobro = COBROS[m["cobro"]]
        tomas = capturas_de(m["clave"])
        pagina = (
            CABEZA.format(nombre=e(m["nombre"]), titulo=e(m["titulo"]),
                          promesa=e(m["promesa"]), orden=m["orden"])
            + PROBLEMA.format(problema=e(m["problema"]))
            + CAPACIDADES.format(
                tarjetas="\n".join(tarjeta(t, x) for t, x in m["capacidades"]))
            + (CAPTURAS.format(
                marcos="\n".join(marco(m["clave"], i, c) for i, c in tomas))
               if tomas else "")
            + CONECTA.format(conecta=e(m["conecta"]))
            + PRECIO.format(cobro_titulo=e(cobro["titulo"]),
                            cobro_valor=e(cobro["valor"]),
                            cobro_detalle=e(cobro["detalle"]))
            + CIERRE.replace('@@OTROS@@', otros)
        )
        destino = os.path.join(SALIDA, f'{m["clave"]}.html')
        with open(destino, "w", encoding="utf-8") as f:
            f.write(pagina)
        escritos.append(m["clave"])

    print(f"{len(escritos)} folletos generados:")
    for clave in escritos:
        n = len(capturas_de(clave))
        print(f"  {clave:9} {n} captura{'' if n == 1 else 's'}"
              + ("   ← sale sin la sección de pantallas" if n == 0 else ""))
    return escritos


if __name__ == "__main__":
    generar()
