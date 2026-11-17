import {useRef} from 'react';
import {visible, type Camara, type Lienzo, type Vista} from '../lib/camara';

const VISTA = `${import.meta.env.BASE_URL}teselas/vista.webp`;

/**
 * Minimapa: el cuadro entero en pequeño con el recuadro de lo que se ve. Arrastrar dentro mueve la
 * cámara. Es un atajo visual (aria-hidden): con teclado se navega con flechas en el propio lienzo.
 */
export function Minimapa({cam, vista, datos, ancho, onIr}: {cam: Camara; vista: Vista; datos: Lienzo; ancho: number; onIr: (ix: number, iy: number) => void}) {
  const ref = useRef<HTMLDivElement>(null);
  const alto = (ancho * datos.alto) / datos.ancho;
  const e = ancho / datos.ancho;
  const [x0, y0, x1, y1] = visible(cam, vista);
  const cx = Math.max(0, x0) * e;
  const cy = Math.max(0, y0) * e;
  const cw = (Math.min(datos.ancho, x1) - Math.max(0, x0)) * e;
  const ch = (Math.min(datos.alto, y1) - Math.max(0, y0)) * e;

  const ir = (ev: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onIr((ev.clientX - r.left) / e, (ev.clientY - r.top) / e);
  };

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-sin-gesto
      className="relative cursor-pointer touch-none overflow-hidden rounded-md border border-borde shadow-lg"
      style={{width: ancho, height: alto}}
      onPointerDown={(ev) => {
        ev.currentTarget.setPointerCapture(ev.pointerId);
        ir(ev);
      }}
      onPointerMove={(ev) => ev.buttons && ir(ev)}
    >
      <img src={VISTA} alt="" draggable={false} className="h-full w-full select-none" />
      <div className="absolute border-2 border-acento bg-acento/10" style={{left: cx, top: cy, width: Math.max(cw, 4), height: Math.max(ch, 4)}} />
    </div>
  );
}
