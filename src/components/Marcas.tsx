import {aPantalla, type Camara, type Rect, type Vista} from '../lib/camara';

/** Rectángulo de imagen → caja de pantalla. */
export function cajaPantalla(r: Rect, cam: Camara, vista: Vista) {
  const [x, y] = aPantalla(cam, vista, r[0], r[1]);
  return {left: x, top: y, width: r[2] * cam.k, height: r[3] * cam.k};
}

type Punto = {id: string; numero: number; titulo: string; rect: Rect};

/**
 * Marcas sobre el lienzo, en coordenadas de pantalla (no escalan con el zoom):
 * - números de las paradas; con zoom cercano, también su título (nivel de detalle);
 * - el recuadro de la parada activa.
 */
export function Marcas({cam, vista, puntos, activa, conTitulos, onElegir}: {
  cam: Camara;
  vista: Vista;
  puntos: Punto[];
  activa: string | null;
  conTitulos: boolean;
  onElegir: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {puntos.map((p) => {
        const c = cajaPantalla(p.rect, cam, vista);
        const esActiva = p.id === activa;
        const cx = c.left + c.width / 2;
        const cy = c.top + c.height / 2;
        if (cx < -40 || cy < -40 || cx > vista.w + 40 || cy > vista.h + 40) return null;
        return (
          <div key={p.id}>
            {esActiva && <div className="marca-recuadro absolute rounded-md" style={c} />}
            {!esActiva && (
              <button
                type="button"
                data-sin-gesto
                onClick={() => onElegir(p.id)}
                className="marca pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
                style={{left: cx, top: cy}}
                aria-label={`Parada ${p.numero}: ${p.titulo}`}
              >
                <span className="marca-numero">{p.numero}</span>
                {conTitulos && <span className="marca-titulo">{p.titulo}</span>}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
