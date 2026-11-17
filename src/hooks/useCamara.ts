import {useCallback, useEffect, useRef, useState} from 'react';
import {aImagen, desplazar, kEncaje, limitar, SIN_HOLGURA, vuelo, zoomEn, type Camara, type Holgura, type Imagen, type Vista} from '../lib/camara';

type Opciones = {
  /** Escala máxima (píxeles de pantalla por píxel de imagen). */
  kMax?: number;
  /** Toque o clic sin arrastre, en coordenadas de imagen. */
  onToque?: (ix: number, iy: number) => void;
  /** Cualquier gesto del usuario (para soltar el recorrido guiado, por ejemplo). */
  onGesto?: () => void;
  reducido?: boolean;
  /** Lo que tapan los paneles en cada lado, según la vista. */
  holgura?: (v: Vista) => Holgura;
  /** Vista general («ver el cuadro entero»); por defecto encaja el cuadro en toda la vista. */
  general?: (v: Vista) => Camara;
};

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Cámara de un lienzo con pan, zoom con rueda o pellizco, inercia, teclado y vuelos animados.
 * Devuelve un ref para el elemento visor (debe tener `touch-action: none`).
 */
export function useCamara(img: Imagen, {kMax = 1.5, onToque, onGesto, reducido = false, holgura, general}: Opciones = {}) {
  // Ref de callback guardado en estado: si el visor se desmonta y vuelve a montar, los efectos se
  // re-enganchan al elemento nuevo (con useRef se quedarían en el viejo y los gestos morirían).
  const [el, ref] = useState<HTMLDivElement | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [cam, setCam] = useState<Camara | null>(null);
  const [volando, setVolando] = useState(false);
  const camRef = useRef<Camara | null>(null);
  const vistaRef = useRef<Vista | null>(null);
  const anim = useRef(0);
  const cb = useRef({onToque, onGesto, holgura, general});
  cb.current = {onToque, onGesto, holgura, general};
  const h = (v: Vista) => cb.current.holgura?.(v) ?? SIN_HOLGURA;

  const poner = useCallback(
    (c: Camara) => {
      const v = vistaRef.current;
      if (!v) return;
      const l = limitar(c, v, img, kMax, h(v));
      camRef.current = l;
      setCam(l);
    },
    [img, kMax],
  );

  const parar = useCallback(() => {
    cancelAnimationFrame(anim.current);
    anim.current = 0;
    setVolando(false);
  }, []);

  /** Vuela a una cámara. Con movimiento reducido, salta. */
  const volarA = useCallback(
    (destino: Camara) => {
      const v = vistaRef.current;
      const desde = camRef.current;
      parar();
      if (!v || !desde) return;
      const fin = limitar(destino, v, img, kMax, h(v));
      if (reducido) return poner(fin);
      const {en, duracion} = vuelo(desde, fin, v);
      const t0 = performance.now();
      setVolando(true);
      const paso = (ahora: number) => {
        const t = Math.min(1, (ahora - t0) / duracion);
        poner(en(suave(t)));
        if (t < 1) anim.current = requestAnimationFrame(paso);
        else {
          anim.current = 0;
          setVolando(false);
        }
      };
      anim.current = requestAnimationFrame(paso);
    },
    [img, kMax, parar, poner, reducido],
  );

  const encajar = useCallback(() => {
    const v = vistaRef.current;
    if (v) volarA(cb.current.general?.(v) ?? {x: img.ancho / 2, y: img.alto / 2, k: kEncaje(v, img)});
  }, [img, volarA]);

  /** Zoom desde el centro de la vista (botones y teclado). */
  const zoom = useCallback(
    (factor: number) => {
      const v = vistaRef.current;
      const c = camRef.current;
      if (v && c) volarA(zoomEn(c, v, factor, v.w / 2, v.h / 2));
    },
    [volarA],
  );

  const mover = useCallback(
    (dx: number, dy: number) => {
      const c = camRef.current;
      if (c) volarA(desplazar(c, dx, dy));
    },
    [volarA],
  );

  // Tamaño del visor.
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const v = {w: e.contentRect.width, h: e.contentRect.height};
      if (v.w === 0 || v.h === 0) return;
      vistaRef.current = v;
      setVista(v);
      poner(camRef.current ?? {x: img.ancho / 2, y: img.alto / 2, k: 0});
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, img, poner]);

  // Gestos: arrastrar, pellizcar, rueda, doble clic, inercia.
  useEffect(() => {
    if (!el) return;
    const punteros = new Map<number, {x: number; y: number}>();
    let caja = el.getBoundingClientRect();
    let inicio = {x: 0, y: 0, t: 0, movido: false};
    let previo: {mx: number; my: number; d: number} | null = null;
    let muestras: {x: number; y: number; t: number}[] = [];
    let ultimoToque = {x: 0, y: 0, t: 0};

    const local = (e: PointerEvent | WheelEvent | MouseEvent) => ({x: e.clientX - caja.left, y: e.clientY - caja.top});
    const centro = () => {
      const ps = [...punteros.values()];
      const mx = ps.reduce((s, p) => s + p.x, 0) / ps.length;
      const my = ps.reduce((s, p) => s + p.y, 0) / ps.length;
      const d = ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
      return {mx, my, d};
    };

    const abajo = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      // Botones y controles encima del lienzo (data-sin-gesto) reciben su clic normal.
      if ((e.target as HTMLElement).closest('[data-sin-gesto]')) return;
      caja = el.getBoundingClientRect();
      el.setPointerCapture(e.pointerId);
      punteros.set(e.pointerId, local(e));
      parar();
      cb.current.onGesto?.();
      const p = local(e);
      if (punteros.size === 1) inicio = {x: p.x, y: p.y, t: performance.now(), movido: false};
      else inicio.movido = true; // un pellizco nunca es un toque
      previo = centro();
      muestras = [];
    };

    const mueve = (e: PointerEvent) => {
      if (!punteros.has(e.pointerId)) return;
      punteros.set(e.pointerId, local(e));
      const c = camRef.current;
      const v = vistaRef.current;
      if (!c || !v || !previo) return;
      const ahora = centro();
      let n = desplazar(c, ahora.mx - previo.mx, ahora.my - previo.my);
      if (punteros.size > 1 && previo.d > 0) n = zoomEn(n, v, ahora.d / previo.d, ahora.mx, ahora.my);
      if (Math.hypot(ahora.mx - inicio.x, ahora.my - inicio.y) > 6) inicio.movido = true;
      poner(n);
      previo = ahora;
      muestras.push({x: ahora.mx, y: ahora.my, t: performance.now()});
      if (muestras.length > 6) muestras.shift();
    };

    const arriba = (e: PointerEvent) => {
      if (!punteros.has(e.pointerId)) return;
      const eraUno = punteros.size === 1;
      punteros.delete(e.pointerId);
      previo = punteros.size ? centro() : null;
      if (!eraUno) return;
      const p = local(e);
      const ahora = performance.now();
      const c = camRef.current;
      const v = vistaRef.current;
      if (!c || !v) return;
      if (!inicio.movido && ahora - inicio.t < 400) {
        // Doble toque en pantalla táctil: acerca. El ratón usa dblclick.
        if (e.pointerType !== 'mouse' && ahora - ultimoToque.t < 320 && Math.hypot(p.x - ultimoToque.x, p.y - ultimoToque.y) < 30) {
          volarA(zoomEn(c, v, 2, p.x, p.y));
          ultimoToque.t = 0;
          return;
        }
        ultimoToque = {x: p.x, y: p.y, t: ahora};
        const [ix, iy] = aImagen(c, v, p.x, p.y);
        cb.current.onToque?.(ix, iy);
        return;
      }
      // Inercia.
      if (reducido || muestras.length < 2) return;
      const a = muestras[0];
      const b = muestras[muestras.length - 1];
      const dt = b.t - a.t;
      if (dt <= 0 || ahora - b.t > 80) return;
      let vx = (b.x - a.x) / dt;
      let vy = (b.y - a.y) / dt;
      let t0 = ahora;
      const paso = (t: number) => {
        const dtf = t - t0;
        t0 = t;
        const cc = camRef.current;
        if (!cc) return;
        poner(desplazar(cc, vx * dtf, vy * dtf));
        const f = Math.pow(0.94, dtf / 16);
        vx *= f;
        vy *= f;
        if (Math.hypot(vx, vy) > 0.02) anim.current = requestAnimationFrame(paso);
        else anim.current = 0;
      };
      if (Math.hypot(vx, vy) > 0.25) anim.current = requestAnimationFrame(paso);
    };

    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const c = camRef.current;
      const v = vistaRef.current;
      if (!c || !v) return;
      parar();
      cb.current.onGesto?.();
      caja = el.getBoundingClientRect();
      const p = local(e);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      // ctrlKey: pellizco del trackpad. Sin ctrl y con desplazamiento lateral: trackpad moviendo.
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.5 && e.deltaMode === 0) {
        poner(desplazar(c, -e.deltaX, -e.deltaY));
        return;
      }
      poner(zoomEn(c, v, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y));
    };

    const dobleClic = (e: MouseEvent) => {
      const c = camRef.current;
      const v = vistaRef.current;
      if (!c || !v) return;
      caja = el.getBoundingClientRect();
      const p = local(e);
      volarA(zoomEn(c, v, e.shiftKey ? 0.5 : 2, p.x, p.y));
    };

    el.addEventListener('pointerdown', abajo);
    el.addEventListener('pointermove', mueve);
    el.addEventListener('pointerup', arriba);
    el.addEventListener('pointercancel', arriba);
    el.addEventListener('wheel', rueda, {passive: false});
    el.addEventListener('dblclick', dobleClic);
    return () => {
      el.removeEventListener('pointerdown', abajo);
      el.removeEventListener('pointermove', mueve);
      el.removeEventListener('pointerup', arriba);
      el.removeEventListener('pointercancel', arriba);
      el.removeEventListener('wheel', rueda);
      el.removeEventListener('dblclick', dobleClic);
    };
  }, [el, parar, poner, reducido, volarA]);

  /** Teclado en el visor: flechas mueven, + y − acercan y alejan, 0 encaja. */
  const teclado = useCallback(
    (e: React.KeyboardEvent) => {
      const v = vistaRef.current;
      if (!v) return;
      const paso = Math.min(v.w, v.h) * 0.25;
      const acciones: Record<string, () => void> = {
        ArrowLeft: () => mover(paso, 0),
        ArrowRight: () => mover(-paso, 0),
        ArrowUp: () => mover(0, paso),
        ArrowDown: () => mover(0, -paso),
        '+': () => zoom(1.6),
        '=': () => zoom(1.6),
        '-': () => zoom(1 / 1.6),
        '0': () => encajar(),
      };
      const a = acciones[e.key];
      if (!a) return;
      e.preventDefault();
      cb.current.onGesto?.();
      a();
    },
    [encajar, mover, zoom],
  );

  return {ref, cam, vista, volando, volarA, encajar, zoom, poner, teclado};
}
