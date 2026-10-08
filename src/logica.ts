export const CONFIG = {
  rondas: 10, // palabras por partida normal
  vidasIniciales: 3, // errores permitidos antes de perder
  definicionesPorPalabra: 3, // opciones de respuesta por palabra
  aciertosMinimos: 7, // respuestas correctas necesarias para ganar
  semillaPredeterminada: 0x6d2b79f5, // valor entero usado si la semilla es cero
} as const;

export type Palabra = {
  palabra: string;
  definiciones: [string, string, string];
  indiceReal: number;
};

export type FaseJuego =
  | "jugando"
  | "respondida"
  | "ganaste"
  | "perdiste"
  | "repaso-terminado";

export type ModoJuego = "normal" | "repaso";

export type EstadoJuego = {
  semilla: number;
  bancoOriginal: Palabra[];
  palabras: Palabra[];
  falladas: Palabra[];
  ronda: number;
  aciertos: number;
  vidas: number | null;
  seleccionada: number | null;
  fase: FaseJuego;
  modo: ModoJuego;
};

export const BANCO_PALABRAS: Palabra[] = [
  {
    palabra: "petrichor",
    definiciones: [
      "El olor de la tierra después de la lluvia.",
      "Una piedra pequeña usada para afilar cuchillos.",
      "La capa de polvo que cubre las hojas en otoño.",
    ],
    indiceReal: 0,
  },
  {
    palabra: "ubérrimo",
    definiciones: [
      "Que tiene un sabor especialmente amargo.",
      "Muy fértil o abundante.",
      "Que ocurre una sola vez cada muchos años.",
    ],
    indiceReal: 1,
  },
  {
    palabra: "cárdeno",
    definiciones: [
      "De color amoratado.",
      "Que tiene forma de corazón.",
      "Dicho de un sonido, grave y prolongado.",
    ],
    indiceReal: 0,
  },
  {
    palabra: "albricias",
    definiciones: [
      "Herramientas pequeñas para trabajar el cuero.",
      "Sombras que aparecen al atardecer.",
      "Regalo que se da a quien trae una buena noticia.",
    ],
    indiceReal: 2,
  },
  {
    palabra: "zahorí",
    definiciones: [
      "Persona que busca agua subterránea.",
      "Viento cálido que sopla desde el mar.",
      "Instrumento antiguo para medir el tiempo.",
    ],
    indiceReal: 0,
  },
  {
    palabra: "arrebol",
    definiciones: [
      "Una senda estrecha entre dos montañas.",
      "Color rojo de las nubes iluminadas por el sol.",
      "Un tipo de ave que canta al amanecer.",
    ],
    indiceReal: 1,
  },
  {
    palabra: "sempiterno",
    definiciones: [
      "Que se repite cada siete años.",
      "Que dura solo un instante.",
      "Que durará siempre; eterno.",
    ],
    indiceReal: 2,
  },
  {
    palabra: "nefelibata",
    definiciones: [
      "Persona soñadora o abstraída, poco atenta a la realidad.",
      "Nube baja que anuncia una tormenta.",
      "Instrumento para observar las estrellas.",
    ],
    indiceReal: 0,
  },
  {
    palabra: "ataraxia",
    definiciones: [
      "Una alegría intensa y repentina.",
      "Imperturbabilidad y serenidad del ánimo.",
      "Miedo a los espacios abiertos.",
    ],
    indiceReal: 1,
  },
  {
    palabra: "gaznápiro",
    definiciones: [
      "Persona simple, torpe o poco lista.",
      "Una vasija pequeña para guardar especias.",
      "Que tiene un color verde amarillento.",
    ],
    indiceReal: 0,
  },
];

export function crearGenerador(semilla: number): () => number {
  if (!Number.isFinite(semilla)) {
    throw new RangeError("La semilla debe ser un número finito.");
  }

  let estado = Math.trunc(semilla) >>> 0;
  if (estado === 0) estado = CONFIG.semillaPredeterminada;

  return () => {
    estado ^= estado << 13;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    return (estado >>> 0) / 0x100000000;
  };
}

function validarBanco(banco: readonly Palabra[], cantidad: number): void {
  if (banco.length !== cantidad) {
    throw new RangeError(`El banco debe contener exactamente ${cantidad} palabras.`);
  }

  for (const entrada of banco) {
    if (
      !entrada.palabra.trim() ||
      entrada.definiciones.length !== CONFIG.definicionesPorPalabra ||
      entrada.definiciones.some((definicion) => !definicion.trim()) ||
      !Number.isInteger(entrada.indiceReal) ||
      entrada.indiceReal < 0 ||
      entrada.indiceReal >= CONFIG.definicionesPorPalabra
    ) {
      throw new RangeError("Cada palabra debe tener tres definiciones y un índice real válido.");
    }
  }
}

function copiarPalabra(palabra: Palabra): Palabra {
  return {
    palabra: palabra.palabra,
    definiciones: [...palabra.definiciones],
    indiceReal: palabra.indiceReal,
  };
}

function mezclarPalabras(
  banco: readonly Palabra[],
  generador: () => number,
): Palabra[] {
  const palabras = banco.map((palabra) => {
    const original = copiarPalabra(palabra);
    const orden = [0, 1, 2];

    for (let indice = orden.length - 1; indice > 0; indice -= 1) {
      const otroIndice = Math.floor(generador() * (indice + 1));
      [orden[indice], orden[otroIndice]] = [orden[otroIndice], orden[indice]];
    }

    const definiciones: Palabra["definiciones"] = [
      original.definiciones[orden[0]],
      original.definiciones[orden[1]],
      original.definiciones[orden[2]],
    ];

    return {
      palabra: original.palabra,
      definiciones,
      indiceReal: orden.indexOf(original.indiceReal),
    };
  });

  for (let indice = palabras.length - 1; indice > 0; indice -= 1) {
    const otroIndice = Math.floor(generador() * (indice + 1));
    [palabras[indice], palabras[otroIndice]] = [palabras[otroIndice], palabras[indice]];
  }

  return palabras;
}

function mezclarFalladas(
  falladas: readonly Palabra[],
  generador: () => number,
): Palabra[] {
  const palabras = falladas.map(copiarPalabra);
  for (let indice = palabras.length - 1; indice > 0; indice -= 1) {
    const otroIndice = Math.floor(generador() * (indice + 1));
    [palabras[indice], palabras[otroIndice]] = [palabras[otroIndice], palabras[indice]];
  }
  return palabras;
}

function normalizarSemilla(semilla: number): number {
  if (!Number.isFinite(semilla)) {
    throw new RangeError("La semilla debe ser un número finito.");
  }

  const normalizada = Math.trunc(semilla) >>> 0;
  return normalizada === 0 ? CONFIG.semillaPredeterminada : normalizada;
}

export function crearEstado(
  semilla: number,
  banco: readonly Palabra[] = BANCO_PALABRAS,
): EstadoJuego {
  validarBanco(banco, CONFIG.rondas);
  const semillaNormalizada = normalizarSemilla(semilla);

  return {
    semilla: semillaNormalizada,
    bancoOriginal: banco.map(copiarPalabra),
    palabras: mezclarPalabras(banco, crearGenerador(semillaNormalizada)),
    falladas: [],
    ronda: 1,
    aciertos: 0,
    vidas: CONFIG.vidasIniciales,
    seleccionada: null,
    fase: "jugando",
    modo: "normal",
  };
}

export function obtenerPalabraActual(estado: EstadoJuego): Palabra | null {
  return estado.palabras[estado.ronda - 1] ?? null;
}

export function elegirDefinicion(estado: EstadoJuego, indice: number): boolean {
  if (
    estado.fase !== "jugando" ||
    !Number.isInteger(indice) ||
    indice < 0 ||
    indice >= CONFIG.definicionesPorPalabra
  ) {
    return false;
  }

  const palabra = obtenerPalabraActual(estado);
  if (!palabra) return false;

  estado.seleccionada = indice;
  if (indice === palabra.indiceReal) {
    estado.aciertos += 1;
  } else if (estado.modo === "normal") {
    estado.vidas = (estado.vidas ?? 0) - 1;
    estado.falladas.push(copiarPalabra(palabra));
  }

  if (estado.modo === "normal" && estado.vidas === 0) {
    estado.fase = "perdiste";
  } else if (estado.ronda === estado.palabras.length) {
    estado.fase =
      estado.modo === "repaso"
        ? "repaso-terminado"
        : estado.aciertos >= CONFIG.aciertosMinimos
          ? "ganaste"
          : "perdiste";
  } else {
    estado.fase = "respondida";
  }

  return true;
}

export function pasarSiguiente(estado: EstadoJuego): boolean {
  if (estado.fase !== "respondida") return false;

  estado.ronda += 1;
  estado.seleccionada = null;
  estado.fase = "jugando";
  return true;
}

export function empezarDeNuevo(estado: EstadoJuego, semilla = estado.semilla): boolean {
  if (!Number.isFinite(semilla)) return false;

  const nuevoEstado = crearEstado(semilla, estado.bancoOriginal);
  Object.assign(estado, nuevoEstado);
  return true;
}

export function empezarRepaso(
  estado: EstadoJuego,
  semilla = estado.semilla,
): boolean {
  if (
    (estado.fase !== "ganaste" && estado.fase !== "perdiste") ||
    estado.falladas.length === 0 ||
    !Number.isFinite(semilla)
  ) {
    return false;
  }

  const semillaNormalizada = normalizarSemilla(semilla);
  estado.semilla = semillaNormalizada;
  estado.palabras = mezclarFalladas(
    estado.falladas,
    crearGenerador(semillaNormalizada),
  );
  estado.ronda = 1;
  estado.aciertos = 0;
  estado.vidas = null;
  estado.seleccionada = null;
  estado.fase = "jugando";
  estado.modo = "repaso";
  return true;
}
