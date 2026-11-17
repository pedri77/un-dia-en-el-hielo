// Capturas de QA por ESTADO, no por scroll: en un explorable lo que hay que revisar son los
// valores extremos de cada control. Cada estado es una query string que useParametro lee al cargar.
// Uso: node estados.mjs <url> <prefijo-salida> <ancho> <alto> "d=0" "d=50" "d=42&modo=b" …
//      REDUCIDO=1 node estados.mjs …   (prefers-reduced-motion)
//      ESPERA=3000 node estados.mjs …  (ms tras cargar: deja terminar vuelos y transiciones)
//      SELECTOR='#s1' node estados.mjs … (captura solo ese elemento en vez de la ventana)
// Imprime JSON con errores de consola, respuestas ≥ 400 y textos con NaN/Infinity/undefined por estado.
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';

let chromium;
try {
  ({chromium} = await import('playwright-core'));
} catch {
  const raices = [join(dirname(process.execPath), '..', 'lib', 'node_modules'), '/opt/homebrew/lib/node_modules', '/usr/local/lib/node_modules'];
  const candidatos = [process.env.PLAYWRIGHT_CORE, ...raices.flatMap((r) => [`${r}/playwright-core`, `${r}/@playwright/cli/node_modules/playwright-core`])].filter(Boolean);
  const require = createRequire(import.meta.url);
  for (const c of candidatos) {
    try {
      ({chromium} = require(c));
      break;
    } catch {}
  }
}
if (!chromium) throw new Error('No encuentro playwright-core');

const [url, salida, vw = '1440', vh = '900', ...estados] = process.argv.slice(2);
if (!estados.length) estados.push('');
const navegador = await chromium.launch({channel: 'chrome'});
const pagina = await navegador.newPage({viewport: {width: +vw, height: +vh}, reducedMotion: process.env.REDUCIDO === '1' ? 'reduce' : 'no-preference'});
const informe = [];
let errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
pagina.on('response', (r) => r.status() >= 400 && errores.push(`${r.status()} ${r.url()}`));
for (const [i, q] of estados.entries()) {
  errores = [];
  const destino = new URL(url);
  destino.search = q;
  await pagina.goto(destino.href, {waitUntil: 'networkidle'});
  await pagina.waitForTimeout(Number(process.env.ESPERA ?? 900)); // ESPERA=3000 si hay vuelos animados
  // Cifras rotas: el fallo típico de un explorable en los extremos.
  const rotos = await pagina.evaluate(() => (document.body.innerText.match(/[^\n]*\b(NaN|Infinity|undefined|null)\b[^\n]*/g) ?? []).slice(0, 5));
  const nombre = `${salida}-${String(i).padStart(2, '0')}.png`;
  if (process.env.SELECTOR) await pagina.locator(process.env.SELECTOR).screenshot({path: nombre});
  else await pagina.screenshot({path: nombre, fullPage: process.env.COMPLETA === '1'});
  informe.push({estado: q || '(por defecto)', captura: nombre, errores, rotos});
}
console.log(JSON.stringify(informe, null, 1));
await navegador.close();
