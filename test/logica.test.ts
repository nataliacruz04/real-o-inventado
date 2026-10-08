import { describe, expect, it } from "vitest";
import {
  CONFIG,
  crearEstado,
  elegirDefinicion,
  empezarDeNuevo,
  empezarRepaso,
  obtenerPalabraActual,
  pasarSiguiente,
} from "../src/logica";

function responder(estado: ReturnType<typeof crearEstado>, correcta = true): void {
  const palabra = obtenerPalabraActual(estado);
  if (!palabra) throw new Error("No hay una palabra actual para responder.");
  const indice = correcta
    ? palabra.indiceReal
    : (palabra.indiceReal + 1) % CONFIG.definicionesPorPalabra;
  if (!elegirDefinicion(estado, indice)) {
    throw new Error("No se pudo registrar la respuesta de la prueba.");
  }
}

function cometerErrores(estado: ReturnType<typeof crearEstado>, cantidad: number): void {
  for (let numero = 0; numero < cantidad; numero += 1) {
    responder(estado, false);
    if (estado.fase === "respondida") pasarSiguiente(estado);
  }
}

describe("lógica de ¿Real o Inventado?", () => {
  it("arma el estado inicial con diez rondas, tres vidas y tres opciones", () => {
    const estado = crearEstado(123);

    expect(estado.ronda).toBe(1);
    expect(estado.aciertos).toBe(0);
    expect(estado.vidas).toBe(CONFIG.vidasIniciales);
    expect(estado.fase).toBe("jugando");
    expect(estado.palabras).toHaveLength(CONFIG.rondas);
    expect(estado.falladas).toHaveLength(0);
    expect(estado.palabras.every((palabra) => palabra.definiciones.length === 3)).toBe(true);
  });

  it("acepta una elección válida y rechaza índices inválidos o una segunda elección", () => {
    const estado = crearEstado(123);
    const palabra = obtenerPalabraActual(estado)!;

    expect(elegirDefinicion(estado, -1)).toBe(false);
    expect(elegirDefinicion(estado, 3)).toBe(false);
    expect(elegirDefinicion(estado, 1.5)).toBe(false);
    expect(elegirDefinicion(estado, palabra.indiceReal)).toBe(true);
    expect(estado.seleccionada).toBe(palabra.indiceReal);
    expect(estado.aciertos).toBe(1);
    expect(elegirDefinicion(estado, palabra.indiceReal)).toBe(false);
  });

  it("resta una vida y guarda la palabra cuando la respuesta es incorrecta", () => {
    const estado = crearEstado(123);
    const palabra = obtenerPalabraActual(estado)!;
    const indiceIncorrecto = (palabra.indiceReal + 1) % CONFIG.definicionesPorPalabra;

    expect(elegirDefinicion(estado, indiceIncorrecto)).toBe(true);
    expect(estado.vidas).toBe(CONFIG.vidasIniciales - 1);
    expect(estado.falladas).toHaveLength(1);
    expect(estado.falladas[0].palabra).toBe(palabra.palabra);
  });

  it("impide avanzar antes de responder y avanza después de una respuesta válida", () => {
    const estado = crearEstado(123);
    const palabra = obtenerPalabraActual(estado)!;

    expect(pasarSiguiente(estado)).toBe(false);
    responder(estado);
    expect(pasarSiguiente(estado)).toBe(true);
    expect(estado.ronda).toBe(2);
    expect(estado.seleccionada).toBeNull();
    expect(estado.fase).toBe("jugando");
    expect(pasarSiguiente(estado)).toBe(false);
    expect(palabra).toBeDefined();
  });

  it("reinicia una partida con una semilla válida y rechaza una semilla infinita", () => {
    const estado = crearEstado(123);
    responder(estado, false);
    const antesDelIntentoInvalido = JSON.stringify(estado);

    expect(empezarDeNuevo(estado, Infinity)).toBe(false);
    expect(JSON.stringify(estado)).toBe(antesDelIntentoInvalido);
    expect(empezarDeNuevo(estado, 456)).toBe(true);
    expect(estado).toEqual(crearEstado(456));
  });

  it("impide iniciar el repaso durante la partida y permite repasar tras perder", () => {
    const estado = crearEstado(123);

    expect(empezarRepaso(estado)).toBe(false);
    cometerErrores(estado, CONFIG.vidasIniciales);
    expect(estado.fase).toBe("perdiste");
    expect(empezarRepaso(estado)).toBe(true);
    expect(estado.modo).toBe("repaso");
    expect(estado.vidas).toBeNull();
    expect(estado.palabras).toHaveLength(CONFIG.vidasIniciales);
    expect(empezarRepaso(estado)).toBe(false);
  });

  it("termina en victoria al completar las diez rondas con respuestas correctas", () => {
    const estado = crearEstado(123);

    for (let ronda = 0; ronda < CONFIG.rondas; ronda += 1) {
      responder(estado);
      if (estado.fase === "respondida") expect(pasarSiguiente(estado)).toBe(true);
    }

    expect(estado.aciertos).toBe(CONFIG.rondas);
    expect(estado.aciertos).toBeGreaterThanOrEqual(CONFIG.aciertosMinimos);
    expect(estado.fase).toBe("ganaste");
  });

  it("termina en derrota cuando se agotan las tres vidas al tercer error", () => {
    const estado = crearEstado(123);

    cometerErrores(estado, CONFIG.vidasIniciales);

    expect(estado.vidas).toBe(0);
    expect(estado.falladas).toHaveLength(CONFIG.vidasIniciales);
    expect(estado.fase).toBe("perdiste");
    expect(elegirDefinicion(estado, 0)).toBe(false);
    expect(pasarSiguiente(estado)).toBe(false);
  });
});
