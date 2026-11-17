/**
 * Cámara de un lienzo grande: funciones puras, sin DOM (se prueban con node --test).
 *
 * Coordenadas: todo en píxeles de la IMAGEN original salvo lo que dice «pantalla».
 * La cámara es el punto de la imagen que queda en el centro de la vista (x, y) y la escala k
 * (píxeles de pantalla por píxel de imagen).
 */
import {interpolateZoom} from 'd3-interpolate';

export type Camara = {x: number; y: number; k: number};
export type Vista = {w: number; h: number};
export type Imagen = {ancho: number; alto: number};
/** Rectángulo en píxeles de imagen: [x, y, ancho, alto]. */
export type Rect = [number, number, number, number];

/** Escala que encaja la imagen entera en la vista, con margen. */
export const kEncaje = (v: Vista, img: Imagen, margen = 0.04) =>
  Math.min(v.w / img.ancho, v.h / img.alto) * (1 - margen);

/** Zoom relativo: 1 = cuadro entero. Sirve para decidir qué se muestra por nivel de detalle. */
export const zoomRelativo = (c: Camara, v: Vista, img: Imagen) => c.k / kEncaje(v, img);

/** Píxeles de pantalla que tapan los paneles en cada lado. */
export type Holgura = {izq: number; der: number; arriba: number; abajo: number};
export const SIN_HOLGURA: Holgura = {izq: 0, der: 0, arriba: 0, abajo: 0};

/**
 * Mantiene la cámara dentro de límites: escala entre «cuadro entero» y kMax (por defecto 1,5
 * píxeles de pantalla por píxel de imagen: más allá solo se ve el borroso del escaneo) y el centro
 * de modo que el cuadro no se escape de la zona libre (la vista menos lo que tapan los paneles,
 * `holgura`). Así un detalle del borde puede quedar en la zona libre y no detrás de un panel.
 * Si el cuadro cabe entero en un eje, flota dentro de la vista en ese eje.
 */
export function limitar(c: Camara, v: Vista, img: Imagen, kMax = 1.5, h: Holgura = SIN_HOLGURA): Camara {
  const kMin = kEncaje(v, img);
  const k = Math.min(Math.max(c.k, kMin), Math.max(kMax, kMin));
  const eje = (centro: number, tamImg: number, tamVista: number, antes: number, despues: number) => {
    // El borde inicial del cuadro no pasa de `antes` y el final no baja de tamVista - despues.
    const min = (tamVista / 2 - antes) / k;
    const max = tamImg - (tamVista / 2 - despues) / k;
    const [lo, hi] = min <= max ? [min, max] : [max, min];
    return Math.min(Math.max(centro, lo), hi);
  };
  return {x: eje(c.x, img.ancho, v.w, h.izq, h.der), y: eje(c.y, img.alto, v.h, h.arriba, h.abajo), k};
}

/** Punto de pantalla → punto de imagen. */
export const aImagen = (c: Camara, v: Vista, sx: number, sy: number): [number, number] => [
  c.x + (sx - v.w / 2) / c.k,
  c.y + (sy - v.h / 2) / c.k,
];

/** Punto de imagen → punto de pantalla. */
export const aPantalla = (c: Camara, v: Vista, ix: number, iy: number): [number, number] => [
  (ix - c.x) * c.k + v.w / 2,
  (iy - c.y) * c.k + v.h / 2,
];

/** Arrastre: mueve la cámara al contrario que el dedo, en píxeles de pantalla. */
export const desplazar = (c: Camara, dx: number, dy: number): Camara => ({x: c.x - dx / c.k, y: c.y - dy / c.k, k: c.k});

/** Zoom con un punto de pantalla fijo (el cursor o el centro del pellizco). */
export function zoomEn(c: Camara, v: Vista, factor: number, sx: number, sy: number): Camara {
  const [ix, iy] = aImagen(c, v, sx, sy);
  const k = c.k * factor;
  return {x: ix - (sx - v.w / 2) / k, y: iy - (sy - v.h / 2) / k, k};
}

/** Cámara que encuadra un rectángulo de la imagen dejando margen alrededor. */
export function encuadrar(r: Rect, v: Vista, margen = 0.18): Camara {
  const [x, y, w, h] = r;
  const k = Math.min(v.w / w, v.h / h) * (1 - margen);
  return {x: x + w / 2, y: y + h / 2, k};
}

/** Rectángulo de imagen visible: [x0, y0, x1, y1]. */
export function visible(c: Camara, v: Vista): [number, number, number, number] {
  const [x0, y0] = aImagen(c, v, 0, 0);
  const [x1, y1] = aImagen(c, v, v.w, v.h);
  return [x0, y0, x1, y1];
}

export type Lienzo = {ancho: number; alto: number; tesela: number; niveles: number};
export type Tesela = {n: number; col: number; fila: number; x: number; y: number; w: number; h: number};

/** Nivel de la pirámide adecuado: el más pequeño que aún da ≥ 1 píxel de imagen por píxel físico. */
export function nivelPara(k: number, dpr: number, niveles: number) {
  const n = Math.floor(Math.log2(1 / (k * dpr)));
  return Math.min(Math.max(n, 0), niveles - 1);
}

/** Teselas del nivel adecuado que tocan la vista (con una tesela de margen para que no aparezcan tarde). */
export function teselasVisibles(c: Camara, v: Vista, l: Lienzo, dpr = 1): Tesela[] {
  const n = nivelPara(c.k, dpr, l.niveles);
  const lado = l.tesela * 2 ** n; // lado de la tesela en píxeles de imagen
  const [x0, y0, x1, y1] = visible(c, v);
  const cols = Math.ceil(l.ancho / lado);
  const filas = Math.ceil(l.alto / lado);
  const c0 = Math.max(0, Math.floor(x0 / lado) - 1);
  const c1 = Math.min(cols - 1, Math.floor(x1 / lado) + 1);
  const f0 = Math.max(0, Math.floor(y0 / lado) - 1);
  const f1 = Math.min(filas - 1, Math.floor(y1 / lado) + 1);
  const out: Tesela[] = [];
  for (let fila = f0; fila <= f1; fila++)
    for (let col = c0; col <= c1; col++) {
      const x = col * lado;
      const y = fila * lado;
      out.push({n, col, fila, x, y, w: Math.min(lado, l.ancho - x), h: Math.min(lado, l.alto - y)});
    }
  return out;
}

/**
 * Vuelo de una cámara a otra con la curva de van Wijk y Nuij (aleja, cruza y acerca), la misma de
 * d3-zoom. Devuelve la interpolación y una duración recomendada en milisegundos.
 */
export function vuelo(a: Camara, b: Camara, v: Vista) {
  const i = interpolateZoom([a.x, a.y, v.w / a.k], [b.x, b.y, v.w / b.k]);
  const en = (t: number): Camara => {
    const [x, y, w] = i(t);
    return {x, y, k: v.w / w};
  };
  return {en, duracion: Math.min(Math.max(i.duration * 0.9, 600), 2400)};
}

/** ¿El punto de imagen cae dentro del rectángulo, con tolerancia en píxeles de imagen? */
export const dentro = (r: Rect, ix: number, iy: number, tolerancia = 0) =>
  ix >= r[0] - tolerancia && ix <= r[0] + r[2] + tolerancia && iy >= r[1] - tolerancia && iy <= r[1] + r[3] + tolerancia;
