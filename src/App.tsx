import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import datos from './lienzo.json';
import {BUSCA, ENTRADA, FUENTES, OBRA, PARADAS, SUBTITULO, TITULO} from './content';
import {Lienzo} from './components/Lienzo';
import {cajaPantalla, Marcas} from './components/Marcas';
import {Minimapa} from './components/Minimapa';
import {Sobre} from './components/Sobre';
import {useCamara} from './hooks/useCamara';
import {useMovimientoReducido} from './hooks/useMovimientoReducido';
import {dentro, encuadrar, kEncaje, SIN_HOLGURA, zoomRelativo, type Camara, type Holgura, type Rect, type Vista} from './lib/camara';

type Modo = 'portada' | 'recorrido' | 'explorar' | 'busca';
const CLAVE = 'un-dia-en-el-hielo:encontrados';

/** Estado inicial desde la URL: ?parada=3, ?modo=explorar, ?modo=busca. */
function leerUrl(): {modo: Modo; parada: number} {
  const q = new URLSearchParams(location.search);
  const p = Number(q.get('parada'));
  if (p >= 1 && p <= PARADAS.length) return {modo: 'recorrido', parada: p - 1};
  const m = q.get('modo');
  if (m === 'explorar' || m === 'busca') return {modo: m, parada: 0};
  return {modo: 'portada', parada: 0};
}

function escribirUrl(modo: Modo, parada: number) {
  const q = new URLSearchParams();
  if (modo === 'recorrido') q.set('parada', String(parada + 1));
  else if (modo !== 'portada') q.set('modo', modo);
  const s = q.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}

function leerEncontrados(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => BUSCA.some((b) => b.id === x)) : [];
  } catch {
    return [];
  }
}

/** Lo que tapan los paneles (píxeles de pantalla) según el tamaño de la vista. */
function holguraPara(v: Vista): Holgura {
  if (v.w >= 900) return {izq: 420, der: 90, arriba: 96, abajo: 20};
  return {izq: 0, der: 56, arriba: 64, abajo: Math.min(v.h * 0.42, 320)};
}

/** Zona libre: su tamaño y el desplazamiento de su centro respecto al centro de la vista. */
function zonaLibre(v: Vista, h: Holgura) {
  return {v: {w: v.w - h.izq - h.der, h: v.h - h.arriba - h.abajo}, ox: (h.izq - h.der) / 2, oy: (h.arriba - h.abajo) / 2};
}

/** Cámara que deja un rectángulo de la imagen centrado en la zona libre. */
function camaraEnZona(r: Rect, v: Vista, h: Holgura, margen = 0.12): Camara {
  const z = zonaLibre(v, h);
  const c = encuadrar(r, z.v, margen);
  return {x: c.x - z.ox / c.k, y: c.y - z.oy / c.k, k: c.k};
}

/**
 * Vista general: en escritorio, el cuadro entero en la zona libre; en móvil vertical el cuadro
 * entero sería una tira de 6 cm, así que se encaja por la altura y se recorre arrastrando.
 */
function vistaGeneral(v: Vista, h: Holgura): Camara {
  if (v.w >= v.h) return camaraEnZona([0, 0, datos.ancho, datos.alto], v, h, 0.04);
  const z = zonaLibre(v, h);
  const k = (z.v.h * 0.96) / datos.alto;
  return {x: datos.ancho / 2, y: datos.alto / 2 - z.oy / k, k};
}

export default function App() {
  const reducido = useMovimientoReducido();
  const inicial = useMemo(leerUrl, []);
  const [modo, setModo] = useState<Modo>(inicial.modo);
  const [parada, setParada] = useState(inicial.parada);
  const [encontrados, setEncontrados] = useState<string[]>(leerEncontrados);
  const [pista, setPista] = useState<string | null>(null);
  const [fallo, setFallo] = useState<{x: number; y: number; t: number} | null>(null);
  const [aviso, setAviso] = useState('');
  const [sobre, setSobre] = useState(false);
  const modoRef = useRef(modo);
  modoRef.current = modo;

  const toque = useCallback((ix: number, iy: number) => {
    if (modoRef.current !== 'busca') return;
    camRef.current && encontrar(ix, iy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {ref, cam, vista, volarA, encajar, zoom, poner, teclado} = useCamara(datos, {
    reducido,
    onToque: toque,
    holgura: (v) => (modoRef.current === 'portada' ? SIN_HOLGURA : holguraPara(v)),
    general: (v) => vistaGeneral(v, modoRef.current === 'portada' ? SIN_HOLGURA : holguraPara(v)),
  });
  const camRef = useRef(cam);
  camRef.current = cam;

  /** Cámara que deja un rectángulo en la zona que no tapan los paneles. */
  const camaraPara = useCallback((r: Rect) => (vista ? camaraEnZona(r, vista, holguraPara(vista)) : null), [vista]);

  // Ir a la parada activa al cambiar de parada o al llegar con ?parada=n.
  const vistaLista = vista !== null;
  useEffect(() => {
    if (!vistaLista) return;
    if (modo === 'recorrido') {
      const c = camaraPara(PARADAS[parada].rect);
      if (c) volarA(c);
      setAviso(`Parada ${parada + 1} de ${PARADAS.length}: ${PARADAS[parada].titulo}`);
    } else if (modo !== 'portada') encajar();
    escribirUrl(modo, parada);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, parada, vistaLista]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(encontrados));
    } catch {
      /* sin almacenamiento: el juego funciona igual, solo no se recuerda */
    }
  }, [encontrados]);

  function encontrar(ix: number, iy: number) {
    const c = camRef.current;
    if (!c) return;
    const tolerancia = 14 / c.k; // 14 px de pantalla alrededor
    const hit = BUSCA.find((b) => !encontradosRef.current.includes(b.id) && dentro(b.rect, ix, iy, tolerancia));
    if (hit) {
      setEncontrados((e) => [...e, hit.id]);
      setPista(hit.id);
      setAviso(`¡Encontrado! ${hit.nombre}. ${hit.hallazgo}`);
    } else {
      setFallo({x: ix, y: iy, t: Date.now()});
      setAviso('Ahí no está. Prueba a acercarte más.');
    }
  }
  const encontradosRef = useRef(encontrados);
  encontradosRef.current = encontrados;

  const irA = (m: Modo, p = 0) => {
    modoRef.current = m; // la holgura del encaje ya es la del modo nuevo
    setModo(m);
    setParada(p);
  };

  // Mientras se mide la vista, el MISMO árbol (main > h1 + visor): si el visor se desmontara y
  // volviera a montar, los gestos quedarían enganchados al elemento viejo.
  if (!cam || !vista) {
    return (
      <main className="fixed inset-0 overflow-hidden bg-void text-texto">
        <h1 className="sr-only">
          {TITULO}. {SUBTITULO}
        </h1>
        <div ref={ref} className="visor absolute inset-0" />
      </main>
    );
  }

  const z = zoomRelativo(cam, vista, datos);
  const escritorio = vista.w >= 900;
  const activa = modo === 'recorrido' ? PARADAS[parada] : null;

  return (
    <main className="fixed inset-0 overflow-hidden bg-void text-texto">
      <h1 className="sr-only">
        {TITULO}. {SUBTITULO}
      </h1>

      {/* Lienzo */}
      <div
        ref={ref}
        tabIndex={0}
        role="application"
        aria-roledescription="lienzo navegable"
        aria-label={`${OBRA.titulo}, de Hendrick Avercamp. Flechas para moverte, más y menos para acercar y alejar, 0 para ver el cuadro entero.`}
        onKeyDown={teclado}
        className={`visor absolute inset-0 touch-none select-none ${modo === 'busca' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <Lienzo cam={cam} vista={vista} datos={datos} />
        {(modo === 'recorrido' || modo === 'explorar') && (
          <Marcas
            cam={cam}
            vista={vista}
            puntos={PARADAS.map((p, i) => ({...p, numero: i + 1}))}
            activa={activa?.id ?? null}
            conTitulos={z >= 2.4}
            onElegir={(id) => {
              setModo('recorrido');
              setParada(PARADAS.findIndex((p) => p.id === id));
            }}
          />
        )}
        {modo === 'busca' && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {BUSCA.filter((b) => encontrados.includes(b.id)).map((b) => (
              <div key={b.id} className={`hallado absolute rounded-full ${pista === b.id ? 'hallado-nuevo' : ''}`} style={cajaPantalla(b.rect, cam, vista)} />
            ))}
            {fallo && <Fallo key={fallo.t} {...fallo} cam={cam} vista={vista} />}
          </div>
        )}
      </div>

      {/* Cabecera */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="cabecera pointer-events-auto rounded-lg px-3 py-2">
          <p className="font-display text-xl leading-none sm:text-2xl">{TITULO}</p>
          <p className="mt-1 hidden text-xs text-texto-2 sm:block">{SUBTITULO}</p>
        </div>
        <button type="button" className="boton pointer-events-auto" onClick={() => setSobre(true)}>
          Sobre el cuadro
        </button>
      </header>

      {/* Controles de zoom y minimapa */}
      {modo !== 'portada' && (
        <div className={`absolute flex flex-col items-end gap-2 ${escritorio ? 'right-5 top-24' : 'right-3 top-16'}`}>
          {escritorio && z > 1.15 && (
            <Minimapa cam={cam} vista={vista} datos={datos} ancho={200} onIr={(x, y) => poner({x, y, k: cam.k})} />
          )}
          <div className="flex flex-col overflow-hidden rounded-lg border border-borde bg-superficie/90 shadow-lg backdrop-blur" role="group" aria-label="Zoom">
            <button type="button" className="control" onClick={() => zoom(1.8)} aria-label="Acercar">+</button>
            <button type="button" className="control" onClick={() => zoom(1 / 1.8)} aria-label="Alejar">−</button>
            <button type="button" className="control text-sm" onClick={encajar} aria-label="Ver el cuadro entero">⤢</button>
          </div>
        </div>
      )}

      {/* Paneles */}
      {modo === 'portada' ? (
        <Portada onEmpezar={() => irA('recorrido', 0)} onExplorar={() => irA('explorar')} onBuscar={() => irA('busca')} />
      ) : (
        <section
          aria-label="Panel"
          className={`panel absolute ${escritorio ? 'left-5 top-24 max-h-[calc(100dvh-7.5rem)] w-[380px]' : 'inset-x-0 bottom-0 h-[min(42dvh,320px)] rounded-b-none'} flex flex-col overflow-hidden rounded-xl`}
        >
          <nav className="flex shrink-0 border-b border-borde" aria-label="Modos">
            {(
              [
                ['recorrido', 'Recorrido'],
                ['explorar', 'Explorar'],
                ['busca', `Busca ${encontrados.length}/${BUSCA.length}`],
              ] as const
            ).map(([m, t]) => (
              <button
                key={m}
                type="button"
                aria-pressed={modo === m}
                className="pestana"
                onClick={() => (m === 'recorrido' ? irA('recorrido', parada) : irA(m))}
              >
                {t}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {modo === 'recorrido' && activa && (
              <article>
                <p className="etiqueta">
                  Parada {parada + 1} de {PARADAS.length}
                </p>
                <h2 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">{activa.titulo}</h2>
                <p className="mt-2 text-body text-texto-2">{activa.texto}</p>
                <p className="mt-3 text-xs text-texto-3">
                  Fuente:{' '}
                  {activa.fuentes.map((f, i) => (
                    <span key={f}>
                      {i > 0 && '; '}
                      <a href={FUENTES[f].url} target="_blank" rel="noreferrer" className="enlace">
                        {FUENTES[f].titulo}
                      </a>
                    </span>
                  ))}
                </p>
              </article>
            )}
            {modo === 'explorar' && (
              <div>
                <p className="text-body text-texto-2">
                  Arrastra para moverte y usa la rueda, el pellizco o los botones para acercarte. Los números son las paradas del recorrido; de cerca verás su nombre.
                </p>
                <ol className="mt-3 grid grid-cols-2 gap-1.5">
                  {PARADAS.map((p, i) => (
                    <li key={p.id}>
                      <button type="button" className="chip w-full" onClick={() => irA('recorrido', i)}>
                        <span className="chip-num">{i + 1}</span> {p.titulo}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {modo === 'busca' && (
              <Busca
                encontrados={encontrados}
                abierta={pista}
                onAbrir={setPista}
                onMostrar={(id) => {
                  const b = BUSCA.find((x) => x.id === id)!;
                  const c = camaraPara(b.rect);
                  if (c) volarA({...c, k: Math.min(c.k, kEncaje(vista, datos) * 6)});
                }}
                onReiniciar={() => {
                  setEncontrados([]);
                  setPista(null);
                }}
              />
            )}
          </div>
          {modo === 'recorrido' && (
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-borde p-3">
              <button type="button" className="boton" disabled={parada === 0} onClick={() => setParada((p) => p - 1)}>
                ← Anterior
              </button>
              <span className="text-xs text-texto-3" aria-hidden="true">
                {parada + 1} / {PARADAS.length}
              </span>
              {parada < PARADAS.length - 1 ? (
                <button type="button" className="boton boton-acento" onClick={() => setParada((p) => p + 1)}>
                  Siguiente →
                </button>
              ) : (
                <button type="button" className="boton boton-acento" onClick={() => irA('busca')}>
                  Ahora, busca tú →
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {aviso}
      </p>
      <Sobre abierto={sobre} onCerrar={() => setSobre(false)} />
    </main>
  );
}

function Portada({onEmpezar, onExplorar, onBuscar}: {onEmpezar: () => void; onExplorar: () => void; onBuscar: () => void}) {
  return (
    <section className="portada pointer-events-none absolute inset-0 flex items-end justify-center p-4 pb-8 sm:items-center sm:p-8">
      <div className="pointer-events-auto max-w-xl rounded-2xl p-6 text-center sm:p-9">
        <p className="etiqueta">Hendrick Avercamp · hacia 1608</p>
        <h2 className="mt-2 font-display text-hero">{TITULO}</h2>
        <p className="mx-auto mt-3 max-w-md text-lead text-texto-2">{ENTRADA}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" className="boton boton-acento boton-grande" onClick={onEmpezar} autoFocus>
            Empezar el recorrido
          </button>
          <button type="button" className="boton boton-grande" onClick={onExplorar}>
            Explorar a mi aire
          </button>
          <button type="button" className="boton boton-grande" onClick={onBuscar}>
            Jugar a buscar
          </button>
        </div>
      </div>
    </section>
  );
}

function Busca({encontrados, abierta, onAbrir, onMostrar, onReiniciar}: {
  encontrados: string[];
  abierta: string | null;
  onAbrir: (id: string | null) => void;
  onMostrar: (id: string) => void;
  onReiniciar: () => void;
}) {
  const todos = encontrados.length === BUSCA.length;
  return (
    <div>
      <p className="text-body text-texto-2">
        {todos
          ? '¡Los has encontrado todos! Avercamp escondió muchos más: sigue mirando.'
          : 'Acércate y toca el cuadro donde creas que está cada cosa.'}
      </p>
      <ul className="mt-3 space-y-1.5">
        {BUSCA.map((b) => {
          const hecho = encontrados.includes(b.id);
          const abierto = abierta === b.id;
          return (
            <li key={b.id} className={`busca-item ${hecho ? 'busca-hecho' : ''}`}>
              <button type="button" className="flex w-full items-center gap-2 text-left" aria-expanded={abierto} onClick={() => onAbrir(abierto ? null : b.id)}>
                <span className="busca-marca" aria-hidden="true">{hecho ? '✓' : ''}</span>
                <span className="flex-1">{b.nombre}</span>
                <span className="sr-only">{hecho ? '(encontrado)' : '(sin encontrar)'}</span>
              </button>
              {abierto && (
                <div className="mt-1.5 pl-7 text-sm text-texto-2">
                  <p>{hecho ? b.hallazgo : `Pista: ${b.pista}`}</p>
                  {!hecho && (
                    <button type="button" className="enlace mt-1 text-xs" onClick={() => onMostrar(b.id)}>
                      Me rindo: llévame cerca
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {encontrados.length > 0 && (
        <button type="button" className="enlace mt-3 text-xs text-texto-3" onClick={onReiniciar}>
          Empezar de nuevo
        </button>
      )}
    </div>
  );
}

function Fallo({x, y, cam, vista}: {x: number; y: number; cam: {x: number; y: number; k: number}; vista: Vista}) {
  const sx = (x - cam.x) * cam.k + vista.w / 2;
  const sy = (y - cam.y) * cam.k + vista.h / 2;
  return <div className="fallo absolute rounded-full" style={{left: sx - 22, top: sy - 22, width: 44, height: 44}} />;
}
