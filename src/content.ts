/**
 * Todo el texto de la web. Rectángulos en píxeles de la imagen original (src/lienzo.json):
 * [x, y, ancho, alto]. Cada afirmación lleva su fuente (claves de FUENTES).
 */
import type {Rect} from './lib/camara';

export const ID = 'un-dia-en-el-hielo'; // prefijo de localStorage
export const TITULO = 'Un día en el hielo';
export const SUBTITULO = 'Hendrick Avercamp, Paisaje invernal con patinadores, hacia 1608';
export const ENTRADA =
  'De lejos es una postal de invierno. De cerca hay cientos de personas: la mayoría se divierte y otras trabajan por pura necesidad. Acércate.';

export const ETIQUETA = 'Hendrick Avercamp · hacia 1608';
export const TODO_ENCONTRADO = '¡Los has encontrado todos! Avercamp escondió muchos más: sigue mirando.';

export const OBRA = {
  autorCorto: 'Hendrick Avercamp',
  titulo: 'Paisaje invernal con patinadores',
  original: 'Winterlandschap met ijsvermaak',
  autor: 'Hendrick Avercamp (Ámsterdam, 1585 – Kampen, 1634)',
  fecha: 'hacia 1608',
  tecnica: 'Óleo sobre tabla, 77,3 × 131,9 cm',
  museo: 'Rijksmuseum, Ámsterdam (SK-A-1718)',
  url: 'https://www.rijksmuseum.nl/en/collection/SK-A-1718',
  imagen: 'Imagen: Rijksmuseum, dominio público (Public Domain Mark 1.0)',
};

/** Párrafos de «Sobre el cuadro»: contexto del autor y de la obra, con fuentes en FUENTES. */
export const SOBRE = [
  'Avercamp nació en Ámsterdam en 1585, se crió en Kampen y murió allí en 1634. Le llamaban «el Mudo de Kampen»: no hablaba y probablemente era sordo de nacimiento. Pintó sobre todo inviernos, en plena Pequeña Edad de Hielo, y fue de los primeros pintores holandeses en especializarse en escenas de nieve. Este es uno de sus primeros cuadros y se inspira en los inviernos de Pieter Bruegel el Viejo.',
];

export type Fuente = {titulo: string; url: string};
export const FUENTES: Record<string, Fuente> = {
  rijks: {titulo: 'Rijksmuseum, ficha de la obra SK-A-1718', url: 'https://www.rijksmuseum.nl/en/collection/SK-A-1718'},
  dutchnews: {
    titulo: 'DutchNews, «Eight things about Avercamp’s winter wonderland» (2015)',
    url: 'https://www.dutchnews.nl/2015/12/avercamps-winter-wonderland/',
  },
  wikipedia: {titulo: 'Wikipedia, «Winter Landscape with Skaters»', url: 'https://en.wikipedia.org/wiki/Winter_Landscape_with_Skaters'},
  getty: {
    titulo: 'Getty, «Witnessing Winter with Hendrick Avercamp, the “Mute from Kampen”»',
    url: 'https://www.getty.edu/news/on-thin-ice-dutch-depictions-of-extreme-weather-and%e2%80%93hendrick-avercamp-the-mute-from-kampen/',
  },
};

export type Parada = {id: string; titulo: string; texto: string; rect: Rect; fuentes: string[]};

export const PARADAS: Parada[] = [
  {
    id: 'cerveceria',
    titulo: 'Agua para la cerveza',
    texto:
      'Desde una ventana del edificio grande, un hombre baja un cubo con una cuerda hasta un agujero abierto en el hielo. Se suele leer como una cervecería que saca agua del río para hacer cerveza. Al lado, una red de pesca enorme colgada de un palo: el hielo también da de comer.',
    rect: [1080, 2400, 960, 640],
    fuentes: ['dutchnews'],
  },
  {
    id: 'caballo',
    titulo: 'Lo que no sale en las postales',
    texto:
      'En la esquina de abajo, cuervos y un perrillo se comen el cadáver de un caballo que ha muerto congelado. El Rijksmuseum lo dice así: Avercamp no evita el detalle lúgubre.',
    rect: [60, 3330, 620, 330],
    fuentes: ['rijks'],
  },
  {
    id: 'trampa',
    titulo: 'Una trampa de pájaros',
    texto:
      'Esa tabla apoyada en un palo es una trampa: se echa grano debajo y, cuando los pájaros entran a comer, la tabla cae. Avercamp la copia de un cuadro de Pieter Bruegel el Viejo de 1565 y la repite en otras obras.',
    rect: [1050, 3300, 440, 260],
    fuentes: ['wikipedia'],
  },
  {
    id: 'kolf',
    titulo: 'Palo y bola: el kolf',
    texto:
      'Este señor juega al kolf, un juego de palo y bola muy popular en los Países Bajos del siglo XVII que en invierno se jugaba sobre el hielo. Se suele citar como pariente del hockey y del golf.',
    rect: [2850, 2880, 420, 330],
    fuentes: ['dutchnews'],
  },
  {
    id: 'caida',
    titulo: 'El hielo nos iguala (un rato)',
    texto:
      'En el centro, alguien acaba de caerse de bruces y su sombrero se ha quedado atrás. En el hielo patinaban ricos y pobres, y se caían todos. Pero justo debajo, un mendigo encorvado pide a un grupo de burgueses muy elegantes, que ni le miran.',
    rect: [3680, 2480, 560, 480],
    fuentes: ['dutchnews'],
  },
  {
    id: 'trineo',
    titulo: 'Los que no patinan',
    texto:
      'Un caballo blanco con penacho tira de un trineo rojo. Dentro, gente bien abrigada que no tiene que esforzarse: mientras el resto patina, ellos se dejan llevar.',
    rect: [4480, 2660, 620, 440],
    fuentes: ['rijks'],
  },
  {
    id: 'cortejo',
    titulo: 'También se ligaba',
    texto:
      'A la derecha, un joven de mangas rojas lleva de la mano a una muchacha. El hielo también era sitio de cortejo, y Avercamp esconde más de una pareja en el cuadro.',
    rect: [5230, 3080, 460, 520],
    fuentes: ['dutchnews'],
  },
  {
    id: 'juncos',
    titulo: 'Los que trabajan',
    texto:
      'No todo el mundo está de fiesta. Este hombre carga a la espalda un haz de juncos más grande que él. El junco se cortaba en invierno, cuando el agua helada dejaba llegar a él.',
    rect: [4680, 3230, 440, 440],
    fuentes: ['dutchnews', 'rijks'],
  },
  {
    id: 'barcos',
    titulo: 'Un río parado',
    texto:
      'El agua era la carretera de esta tierra, y con el hielo los barcos se quedaban atrapados donde estaban. Junto a esta barca grande, varada en el hielo, la gente se para a descansar.',
    rect: [2560, 3080, 1360, 360],
    fuentes: ['wikipedia'],
  },
  {
    id: 'distancia',
    titulo: 'Cómo se pinta la distancia',
    texto:
      'Arriba a la izquierda, la iglesia y los tejados se aclaran y se vuelven azulados entre la niebla: así se pinta lo que está lejos. Avercamp no pintaba al aire libre; trabajaba en el taller a partir de bocetos y combinaba escenas, por eso unos edificios se ven desde arriba y los árboles a la altura de los ojos.',
    rect: [200, 1050, 1000, 1050],
    fuentes: ['dutchnews'],
  },
];

export type Busqueda = {id: string; nombre: string; pista: string; hallazgo: string; rect: Rect; fuentes: string[]};

export const BUSCA: Busqueda[] = [
  {
    id: 'firma',
    nombre: 'La firma del pintor',
    pista: 'Está escrita como un grafiti en una caseta de madera, a la derecha.',
    hallazgo: '«HAenricus Av»: Avercamp firma como si un chaval hubiera pintarrajeado la caseta.',
    rect: [5760, 2680, 170, 230],
    fuentes: ['rijks'],
  },
  {
    id: 'monigote',
    nombre: 'Un monigote dibujado',
    pista: 'En una puerta de las casas de la izquierda.',
    hallazgo: 'Un muñeco hecho con tiza. Hace pareja con la firma: los dos parecen pintadas de críos.',
    rect: [620, 2820, 110, 150],
    fuentes: ['dutchnews'],
  },
  {
    id: 'necesidades',
    nombre: 'Alguien haciendo sus necesidades',
    pista: 'Mira en la barca vieja puesta del revés, a la izquierda.',
    hallazgo: 'Un culo al aire en pleno invierno. Avercamp pinta también a la gente aliviándose.',
    rect: [790, 2660, 130, 200],
    fuentes: ['dutchnews'],
  },
  {
    id: 'cantaros',
    nombre: 'Unos cántaros en una fachada',
    pista: 'En lo alto del hastial de la casa grande de ladrillo.',
    hallazgo: 'Son trampas de barro para pájaros: anidaban dentro y se cogían las crías.',
    rect: [1180, 2060, 320, 240],
    fuentes: ['wikipedia'],
  },
  {
    id: 'luna',
    nombre: 'Una media luna',
    pista: 'Cuelga de un cartel, al otro lado de la cervecería.',
    hallazgo: 'El cartel de la cervecería: probablemente se llamaba La Media Luna (De Halve Maan).',
    rect: [2680, 2220, 140, 160],
    fuentes: ['dutchnews'],
  },
  {
    id: 'pajar',
    nombre: 'Dos personas en el pajar',
    pista: 'En un hueco en lo alto del edificio amarillo.',
    hallazgo: 'Qué hacen ahí arriba, solos, lo deja Avercamp a tu imaginación.',
    rect: [1170, 1990, 110, 100],
    fuentes: ['dutchnews'],
  },
  {
    id: 'jinete',
    nombre: 'Un jinete',
    pista: 'En la orilla del fondo, detrás de los árboles del centro.',
    hallazgo: 'Va a caballo por la orilla, ajeno al jaleo del hielo.',
    rect: [2700, 2070, 180, 140],
    fuentes: ['rijks'],
  },
];
