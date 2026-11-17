import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aImagen, aPantalla, encuadrar, kEncaje, limitar, nivelPara, teselasVisibles, vuelo, zoomEn} from '../src/lib/camara.ts';

const img = {ancho: 6000, alto: 3000};
const v = {w: 1200, h: 800};

test('aPantalla y aImagen son inversas', () => {
  const c = {x: 1234, y: 567, k: 0.37};
  const [sx, sy] = aPantalla(c, v, 2000, 1000);
  const [ix, iy] = aImagen(c, v, sx, sy);
  assert.ok(Math.abs(ix - 2000) < 1e-9 && Math.abs(iy - 1000) < 1e-9);
});

test('limitar no deja alejar más que el cuadro entero ni acercar más que kMax', () => {
  assert.equal(limitar({x: 0, y: 0, k: 0.001}, v, img).k, kEncaje(v, img));
  assert.equal(limitar({x: 3000, y: 1500, k: 50}, v, img, 1.5).k, 1.5);
});

test('limitar deja flotar el cuadro dentro de la vista cuando cabe entero en un eje', () => {
  const c = limitar({x: 3000, y: -9999, k: 0.01}, v, img);
  const [, top] = aPantalla(c, v, 0, 0);
  const [, bottom] = aPantalla(c, v, 0, img.alto);
  assert.ok(top >= -1e-9 && bottom <= v.h + 1e-9);
});

test('limitar con holgura deja llevar un detalle del borde a la zona libre', () => {
  const h = {izq: 0, der: 0, arriba: 0, abajo: 300};
  const c = limitar({x: 3000, y: 3000, k: 1}, v, img, 1.5, h);
  assert.equal(c.y, 3000 - (400 - 300)); // el borde inferior puede subir hasta encima del panel
});

test('zoomEn mantiene fijo el punto bajo el cursor', () => {
  const c = {x: 3000, y: 1500, k: 0.2};
  const antes = aImagen(c, v, 300, 200);
  const despues = aImagen(zoomEn(c, v, 2.5, 300, 200), v, 300, 200);
  assert.ok(Math.abs(antes[0] - despues[0]) < 1e-9 && Math.abs(antes[1] - despues[1]) < 1e-9);
});

test('encuadrar centra el rectángulo y lo hace caber', () => {
  const c = encuadrar([1000, 1000, 400, 200], v, 0);
  assert.deepEqual([c.x, c.y, c.k], [1200, 1100, 3]);
});

test('nivelPara elige la resolución justa', () => {
  assert.equal(nivelPara(1, 1, 5), 0);
  assert.equal(nivelPara(1, 2, 5), 0);
  assert.equal(nivelPara(0.5, 1, 5), 1);
  assert.equal(nivelPara(0.2, 1, 5), 2);
  assert.equal(nivelPara(0.001, 1, 5), 4);
});

test('teselasVisibles con el cuadro entero no pide teselas fuera de rango', () => {
  const l = {...img, tesela: 512, niveles: 5};
  const c = limitar({x: 0, y: 0, k: 0}, v, img);
  for (const t of teselasVisibles(c, v, l)) {
    assert.ok(t.x < l.ancho && t.y < l.alto && t.w > 0 && t.h > 0);
  }
});

test('vuelo empieza y acaba en las cámaras dadas', () => {
  const a = {x: 100, y: 100, k: 0.2};
  const b = {x: 5000, y: 2000, k: 1};
  const {en, duracion} = vuelo(a, b, v);
  const fin = en(1);
  assert.ok(Math.abs(fin.x - b.x) < 1e-6 && Math.abs(fin.k - b.k) < 1e-9);
  assert.ok(Math.abs(en(0).x - a.x) < 1e-6);
  assert.ok(duracion >= 600 && duracion <= 2400);
});
