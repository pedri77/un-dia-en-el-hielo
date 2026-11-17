import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUSCA, FUENTES, PARADAS} from '../src/content.ts';

const lienzo = JSON.parse(readFileSync(new URL('../src/lienzo.json', import.meta.url), 'utf8'));

test('cada rectángulo cae dentro del cuadro y tiene tamaño', () => {
  for (const p of [...PARADAS, ...BUSCA]) {
    const [x, y, w, h] = p.rect;
    assert.ok(w > 0 && h > 0, `${p.id}: tamaño`);
    assert.ok(x >= 0 && y >= 0 && x + w <= lienzo.ancho && y + h <= lienzo.alto, `${p.id}: fuera del cuadro`);
  }
});

test('ids únicos (son claves de la URL y de localStorage)', () => {
  const ids = [...PARADAS, ...BUSCA].map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('cada parada y cada búsqueda cita fuentes que existen', () => {
  for (const p of [...PARADAS, ...BUSCA]) {
    assert.ok(p.fuentes.length > 0, `${p.id}: sin fuente`);
    for (const f of p.fuentes) assert.ok(FUENTES[f], `${p.id}: fuente ${f} no existe`);
  }
});

test('textos en castellano de España: sin rayas como puntuación ni comillas inglesas', () => {
  for (const p of PARADAS) {
    assert.ok(!/ — | – /.test(p.texto), `${p.id}: raya`);
    assert.ok(!/"/.test(p.texto), `${p.id}: comillas rectas`);
  }
});
