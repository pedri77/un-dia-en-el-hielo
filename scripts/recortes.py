#!/usr/bin/env python3
"""
Recorta del original cada rectángulo de src/content.ts (paradas y búsquedas) con su marco rojo y los
junta en una hoja: así se comprueba de un vistazo que cada texto señala lo que dice.

Uso: npm run recortes   (= uv run --with pillow python -I scripts/recortes.py)
Salida: recortes.jpg en la raíz (ignorado por git). Necesita originales/original.jpg (npm run teselas).
También: scripts/recortes.py --rejilla x,y [x,y …] para ver zonas a resolución real con una rejilla
de coordenadas cada 100 px (sirve para localizar los detalles antes de escribir los rectángulos).
"""
import json
import pathlib
import subprocess
import sys

from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = 400_000_000
RAIZ = pathlib.Path.cwd()
im = Image.open(RAIZ / "originales" / "original.jpg").convert("RGB")


def rejilla(x: int, y: int, w: int = 800, h: int = 500) -> Image.Image:
    c = im.crop((x, y, x + w, y + h)).copy()
    d = ImageDraw.Draw(c)
    for gx in range((x // 100 + 1) * 100, x + w, 100):
        d.line([(gx - x, 0), (gx - x, h)], fill=(0, 200, 255))
        d.text((gx - x + 2, 2), str(gx), fill=(255, 0, 255))
    for gy in range((y // 100 + 1) * 100, y + h, 100):
        d.line([(0, gy - y), (w, gy - y)], fill=(0, 200, 255))
        d.text((2, gy - y + 2), str(gy), fill=(255, 0, 255))
    return c


def hoja(piezas: list[Image.Image], cols: int, lado: tuple[int, int], salida: str) -> None:
    filas = (len(piezas) + cols - 1) // cols
    out = Image.new("RGB", (lado[0] * cols, lado[1] * filas), "white")
    for i, p in enumerate(piezas):
        out.paste(p, ((i % cols) * lado[0], (i // cols) * lado[1]))
    out.save(RAIZ / salida, quality=86)
    print(f"{salida}: {len(piezas)} piezas")


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "--rejilla":
        zonas = [tuple(map(int, a.split(","))) for a in sys.argv[2:]]
        hoja([rejilla(x, y) for x, y in zonas], 2, (800, 500), "rejilla.jpg")
        return
    # Node lee content.ts directamente (quita los tipos) y devuelve los rectángulos.
    codigo = "const c = await import('./src/content.ts'); console.log(JSON.stringify([...c.PARADAS, ...c.BUSCA].map(p => [p.id, p.rect])))"
    rects = json.loads(subprocess.run(["node", "--input-type=module", "-e", codigo], check=True, capture_output=True, text=True).stdout)
    piezas = []
    for ident, (x, y, w, h) in rects:
        m = max(80, int(max(w, h) * 0.3))
        c = im.crop((max(0, x - m), max(0, y - m), min(im.width, x + w + m), min(im.height, y + h + m))).copy()
        ox, oy = x - max(0, x - m), y - max(0, y - m)
        d = ImageDraw.Draw(c)
        d.rectangle([ox, oy, ox + w, oy + h], outline=(255, 0, 0), width=max(2, w // 120))
        c.thumbnail((400, 300))
        lienzo = Image.new("RGB", (400, 320), "white")
        lienzo.paste(c, (0, 20))
        ImageDraw.Draw(lienzo).text((4, 4), ident, fill=(200, 0, 0))
        piezas.append(lienzo)
    hoja(piezas, 4, (400, 320), "recortes.jpg")


if __name__ == "__main__":
    main()
