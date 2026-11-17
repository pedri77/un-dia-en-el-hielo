#!/usr/bin/env python3
"""
Parte una imagen grande en una pirámide de teselas WebP para el lienzo.

Uso (desde la raíz del proyecto):
  npm run teselas -- <fuente>
  (= uv run --with pillow python -I scripts/teselas.py <fuente>)

<fuente> puede ser:
  - la URL de un info.json IIIF (museos: Rijksmuseum, Met, Getty, bibliotecas…): descarga full/max;
  - la URL directa de una imagen;
  - un fichero local.

Salida:
  public/teselas/<n>/<col>_<fila>.webp   nivel n = escala 1/2^n (0 = resolución completa)
  public/teselas/vista.webp              imagen entera de 2048 px de ancho como base
  src/lienzo.json                        {ancho, alto, tesela, niveles}

Lo descargado se guarda en originales/ (ignorado por git) y se reutiliza.
La licencia y la procedencia de la imagen van en src/content.ts (FUENTE), no aquí.
"""
import json
import math
import pathlib
import shutil
import sys
import urllib.request

from PIL import Image

Image.MAX_IMAGE_PIXELS = 400_000_000  # cuadros escaneados de verdad superan el límite por defecto

RAIZ = pathlib.Path.cwd()
ORIGINALES = RAIZ / "originales"
SALIDA = RAIZ / "public" / "teselas"
TESELA = 512
CALIDAD = 80
ANCHO_VISTA = 2048


def bajar(url: str, destino: pathlib.Path) -> None:
    if destino.exists():
        return
    req = urllib.request.Request(url, headers={"User-Agent": "web-lienzo/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        destino.write_bytes(r.read())


def obtener(fuente: str) -> pathlib.Path:
    if not fuente.startswith("http"):
        return pathlib.Path(fuente)
    ORIGINALES.mkdir(exist_ok=True)
    if fuente.endswith("info.json"):
        info = json.loads(urllib.request.urlopen(urllib.request.Request(fuente, headers={"User-Agent": "web-lienzo/1.0"}), timeout=60).read())
        base = info.get("id") or info.get("@id")
        url = f"{base}/full/max/0/default.jpg" if "ImageService3" in str(info.get("type", "")) else f"{base}/full/full/0/default.jpg"
        print(f"IIIF {info['width']}×{info['height']} → {url}")
    else:
        url = fuente
    destino = ORIGINALES / "original.jpg"
    bajar(url, destino)
    return destino


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    im = Image.open(obtener(sys.argv[1])).convert("RGB")
    ancho, alto = im.size
    # Niveles hasta que la imagen entera quepa en una tesela.
    niveles = max(1, math.ceil(math.log2(max(ancho, alto) / TESELA)) + 1)
    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    total = 0
    for n in range(niveles):
        escala = 2 ** n
        w, h = math.ceil(ancho / escala), math.ceil(alto / escala)
        nivel = im if n == 0 else im.resize((w, h), Image.LANCZOS)
        carpeta = SALIDA / str(n)
        carpeta.mkdir(parents=True)
        for fila in range(math.ceil(h / TESELA)):
            for col in range(math.ceil(w / TESELA)):
                caja = (col * TESELA, fila * TESELA, min(w, (col + 1) * TESELA), min(h, (fila + 1) * TESELA))
                nivel.crop(caja).save(carpeta / f"{col}_{fila}.webp", "WEBP", quality=CALIDAD, method=6)
                total += 1
    vista = im.resize((ANCHO_VISTA, round(alto * ANCHO_VISTA / ancho)), Image.LANCZOS)
    vista.save(SALIDA / "vista.webp", "WEBP", quality=CALIDAD, method=6)
    (RAIZ / "src" / "lienzo.json").write_text(
        json.dumps({"ancho": ancho, "alto": alto, "tesela": TESELA, "niveles": niveles}) + "\n", encoding="utf-8"
    )
    peso = sum(f.stat().st_size for f in SALIDA.rglob("*.webp"))
    print(f"{ancho}×{alto}, {niveles} niveles, {total} teselas, {peso / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
