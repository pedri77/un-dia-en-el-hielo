# Un día en el hielo

Recorrido de cerca por *Paisaje invernal con patinadores* (Hendrick Avercamp, hacia 1608, Rijksmuseum SK-A-1718): lienzo navegable con zoom, recorrido guiado de 10 paradas y juego de buscar.

- Imagen: Rijksmuseum, dominio público (Public Domain Mark 1.0), IIIF `https://iiif.micr.io/aXnzA/info.json` (6337 × 3674 px).
- Fuentes de los textos: ficha del Rijksmuseum, DutchNews (2015), Wikipedia y Getty (enlazadas en la web, en «Sobre el cuadro»).

## Desarrollo

```bash
npm install
npm run teselas -- https://iiif.micr.io/aXnzA/info.json   # pirámide de teselas en public/teselas y src/lienzo.json
npm run dev        # http://localhost:3030
npm test           # cámara (funciones puras)
npm run build
```

Estados para QA: `?parada=1` … `?parada=10`, `?modo=explorar`, `?modo=busca`.

Hecho con la skill `web-lienzo`.
