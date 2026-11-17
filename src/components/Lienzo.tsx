import {memo, useMemo} from 'react';
import {teselasVisibles, type Camara, type Lienzo as Datos, type Vista} from '../lib/camara';

const BASE = `${import.meta.env.BASE_URL}teselas/`;

/**
 * Dibuja el cuadro: una imagen base entera (siempre debajo, para que nunca haya huecos mientras
 * cargan las teselas) y encima las teselas del nivel que pide el zoom. Todo dentro de un único
 * contenedor con transform: mover y acercar no re-maqueta nada.
 */
export const Lienzo = memo(function Lienzo({cam, vista, datos}: {cam: Camara; vista: Vista; datos: Datos}) {
  const dpr = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const teselas = teselasVisibles(cam, vista, datos, dpr);
  // Solape de un píxel de pantalla para que no se vean juntas entre teselas al escalar.
  const solape = 1 / cam.k;
  const tx = vista.w / 2 - cam.x * cam.k;
  const ty = vista.h / 2 - cam.y * cam.k;
  const estilo = useMemo(
    () => ({width: datos.ancho, height: datos.alto}),
    [datos.ancho, datos.alto],
  );
  return (
    <div
      className="absolute left-0 top-0 origin-top-left will-change-transform"
      style={{...estilo, transform: `translate3d(${tx}px, ${ty}px, 0) scale(${cam.k})`}}
      aria-hidden="true"
    >
      <img src={`${BASE}vista.webp`} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
      {teselas.map((t) => (
        <img
          key={`${t.n}/${t.col}_${t.fila}`}
          src={`${BASE}${t.n}/${t.col}_${t.fila}.webp`}
          alt=""
          draggable={false}
          decoding="async"
          className="absolute max-w-none select-none"
          style={{left: t.x, top: t.y, width: t.w + solape, height: t.h + solape}}
        />
      ))}
    </div>
  );
});
