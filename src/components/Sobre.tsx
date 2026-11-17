import {useEffect, useRef} from 'react';
import {FUENTES, OBRA} from '../content';
import lienzo from '../lienzo.json';

/** Ficha de la obra, cómo se usa y fuentes, en un <dialog> nativo (foco y Escape gratis). */
export function Sobre({abierto, onCerrar}: {abierto: boolean; onCerrar: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog ref={ref} onClose={onCerrar} className="dialogo" aria-labelledby="sobre-titulo">
      <div className="flex items-start justify-between gap-4">
        <h2 id="sobre-titulo" className="font-display text-3xl leading-tight">
          Sobre el cuadro
        </h2>
        <button type="button" className="boton" onClick={onCerrar} autoFocus>
          Cerrar
        </button>
      </div>
      <dl className="ficha mt-4">
        <dt>Obra</dt>
        <dd>
          {OBRA.titulo} <span className="text-texto-3">({OBRA.original})</span>
        </dd>
        <dt>Autor</dt>
        <dd>{OBRA.autor}</dd>
        <dt>Fecha</dt>
        <dd>{OBRA.fecha}</dd>
        <dt>Técnica</dt>
        <dd>{OBRA.tecnica}</dd>
        <dt>Museo</dt>
        <dd>
          <a href={OBRA.url} target="_blank" rel="noreferrer" className="enlace">
            {OBRA.museo}
          </a>
        </dd>
      </dl>
      <p className="mt-4 text-body text-texto-2">
        Avercamp nació en Ámsterdam en 1585, se crió en Kampen y murió allí en 1634. Le llamaban «el Mudo de Kampen»: no hablaba y probablemente era sordo de nacimiento. Pintó
        sobre todo inviernos, en plena Pequeña Edad de Hielo, y fue de los primeros pintores holandeses en especializarse en escenas de nieve. Este es uno de sus
        primeros cuadros y se inspira en los inviernos de Pieter Bruegel el Viejo.
      </p>
      <h3 className="mt-5 font-display text-xl">Cómo moverte</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-texto-2">
        <li>Arrastra para moverte; rueda del ratón, pellizco o botones + y − para el zoom; doble clic para acercarte a un punto.</li>
        <li>Con teclado: entra en el cuadro con Tab, flechas para moverte, + y − para el zoom, 0 para verlo entero.</li>
        <li>El recorrido guiado cuenta lo mismo en texto, parada a parada.</li>
      </ul>
      <h3 className="mt-5 font-display text-xl">Fuentes</h3>
      <ul className="mt-1 space-y-1 text-sm">
        {Object.values(FUENTES).map((f) => (
          <li key={f.url}>
            <a href={f.url} target="_blank" rel="noreferrer" className="enlace">
              {f.titulo}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-texto-3">
        {OBRA.imagen}. Imagen de {lienzo.ancho} × {lienzo.alto} píxeles servida en teselas desde esta misma web. Textos propios a partir de las fuentes citadas.
      </p>
    </dialog>
  );
}
