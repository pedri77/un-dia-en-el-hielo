#!/usr/bin/env node
// Prueba de interacción del lienzo: Busca (fallo y acierto), teclado, rueda y diálogo.
// Uso: node scripts/busca.mjs http://127.0.0.1:3030/
// Requiere Google Chrome y playwright-core (global, o su ruta en PLAYWRIGHT_CORE).
// Ventana 1440×900: la zona libre (sin panel ni controles) tiene su centro en (885, 488), según
// holguraPara() de App.tsx. Si cambias la holgura, cambia CENTRO.
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

const url = process.argv[2];
if (!url) throw new Error('Uso: node scripts/busca.mjs <url>');
const CENTRO = {x: 1440 / 2 + (420 - 90) / 2, y: 900 / 2 + (96 - 20) / 2};

let chromium;
try {
  ({chromium} = await import('playwright-core'));
} catch {
  const raices = [join(dirname(process.execPath), '..', 'lib', 'node_modules'), '/opt/homebrew/lib/node_modules', '/usr/local/lib/node_modules'];
  const require = createRequire(import.meta.url);
  for (const c of [process.env.PLAYWRIGHT_CORE, ...raices.flatMap((r) => [`${r}/playwright-core`, `${r}/@playwright/cli/node_modules/playwright-core`])].filter(Boolean)) {
    try {
      ({chromium} = require(c));
      break;
    } catch {}
  }
}
if (!chromium) throw new Error('No encuentro playwright-core');

const nav = await chromium.launch({channel: 'chrome'});
const p = await nav.newPage({viewport: {width: 1440, height: 900}});
const errores = [];
p.on('pageerror', (e) => errores.push(e.message));
const resultado = {};
const transform = () => p.locator('.visor > div').first().getAttribute('style');

const busca = new URL(url);
busca.search = 'modo=busca';
await p.goto(busca.href);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForTimeout(2500);

// 1. Fallo: un toque arriba del todo, en la cabecera del cuadro, no debería acertar nada.
await p.mouse.click(CENTRO.x, 110);
await p.waitForTimeout(300);
resultado.falloMarcado = (await p.locator('.fallo').count()) === 1;

// 2. Acierto: «Me rindo» con el primer elemento y tocar el centro de la zona libre.
const contador = p.getByRole('button', {name: /^Busca/});
const antes = await contador.innerText();
await p.locator('.busca-item button').first().click();
await p.getByRole('button', {name: /Me rindo/}).click();
await p.waitForTimeout(3000);
await p.mouse.click(CENTRO.x, CENTRO.y);
await p.waitForTimeout(700);
resultado.acierto = `${antes} → ${await contador.innerText()}`;
resultado.aviso = (await p.locator('[aria-live]').textContent())?.slice(0, 80);

// 3. Teclado y rueda.
const t0 = await transform();
await p.locator('.visor').focus();
for (const k of ['0', '+', 'ArrowRight']) {
  await p.keyboard.press(k);
  await p.waitForTimeout(1300);
}
const t1 = await transform();
resultado.tecladoMueve = t0 !== t1;
await p.mouse.move(CENTRO.x, CENTRO.y);
await p.mouse.wheel(0, -600);
await p.waitForTimeout(300);
resultado.ruedaAcerca = t1 !== (await transform());

// 4. Diálogo «Sobre…»: abre y cierra con Escape.
await p.getByRole('button', {name: /^Sobre/}).click();
await p.waitForTimeout(300);
const abierto = (await p.locator('dialog[open]').count()) === 1;
await p.keyboard.press('Escape');
await p.waitForTimeout(200);
resultado.dialogo = abierto && (await p.locator('dialog[open]').count()) === 0;

resultado.errores = errores;
console.log(JSON.stringify(resultado, null, 1));
await nav.close();
