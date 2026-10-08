
import './estilo.css';
import {
  CONFIG,
  crearEstado,
  elegirDefinicion,
  empezarDeNuevo,
  empezarRepaso,
  obtenerPalabraActual,
  pasarSiguiente,
  type EstadoJuego,
} from './logica';

function obtenerContenedor(): HTMLDivElement {
  const contenedor = document.querySelector<HTMLDivElement>('#app');
  if (!contenedor) throw new Error('No se encontró el contenedor del juego.');
  return contenedor;
}

const app = obtenerContenedor();

let estado: EstadoJuego | null = null;

function vistaInicio(): string {
  return `
    <main class="marco">
      <section class="panel inicio" aria-labelledby="titulo">
        <p class="ceja">Un desafío de vocabulario</p>
        <h1 id="titulo">¿Real o Inventado?</h1>
        <p class="introduccion">Diez palabras raras. Tres definiciones. ¿Podés encontrar la verdadera?</p>
        <ul class="instrucciones">
          <li>Elegí una definición en cada ronda.</li>
          <li>Tenés ${CONFIG.vidasIniciales} vidas.</li>
          <li>También podés usar las teclas 1, 2 y 3; Enter continúa.</li>
        </ul>
        <button class="boton boton-principal" type="button" data-accion="iniciar">Empezar a jugar</button>
      </section>
    </main>`;
}

function vistaPartida(partida: EstadoJuego): string {
  const palabra = obtenerPalabraActual(partida);
  if (!palabra) throw new Error('No se encontró la palabra de la ronda actual.');

  const respondida = partida.seleccionada !== null;
  const opciones = palabra.definiciones.map((definicion, indice) => {
    let clase = '';
    if (respondida && indice === palabra.indiceReal) clase = ' correcta';
    else if (respondida && indice === partida.seleccionada) clase = ' incorrecta';
    return `
      <button class="boton opcion${clase}" type="button" data-accion="elegir" data-indice="${indice}" ${respondida ? 'disabled' : ''}>
        <span class="numero-opcion">${indice + 1}</span><span>${definicion}</span>
      </button>`;
  }).join('');

  let aviso = 'Elegí la definición que te parece real.';
  if (respondida && partida.seleccionada === palabra.indiceReal) {
    aviso = '¡Correcto! Esa es la definición real.';
  } else if (respondida) {
    aviso = `No era esa. La definición real es: ${palabra.definiciones[palabra.indiceReal]}`;
  }

  const vidas = partida.vidas === null ? 'Sin vidas (repaso)' : `Vidas: ${partida.vidas}`;
  return `
    <main class="marco">
      <section class="panel partida" aria-labelledby="palabra" aria-live="polite">
        <div class="marcadores">
          <p>Ronda ${partida.ronda} de ${partida.palabras.length}</p>
          <p>Aciertos: ${partida.aciertos}</p>
          <p>${vidas}</p>
        </div>
        <p class="ceja">¿Qué significa esta palabra?</p>
        <h1 class="palabra" id="palabra">${palabra.palabra}</h1>
        <p class="aviso" role="status">${aviso}</p>
        <div class="opciones">${opciones}</div>
        ${partida.fase === 'respondida' ? '<button class="boton boton-principal" type="button" data-accion="siguiente">Siguiente</button>' : ''}
      </section>
    </main>`;
}

function vistaFinal(partida: EstadoJuego): string {
  const titulo = partida.fase === 'ganaste'
    ? '¡Ganaste!'
    : partida.fase === 'perdiste'
      ? 'Perdiste'
      : 'Repaso terminado';
  const mostrarRepaso = partida.modo === 'normal' && partida.falladas.length > 0;
  return `
    <main class="marco">
      <section class="panel final" aria-labelledby="titulo-final" aria-live="polite">
        <p class="ceja">Partida finalizada</p>
        <h1 id="titulo-final">${titulo}</h1>
        <p class="resumen">Aciertos: <strong>${partida.aciertos}</strong></p>
        ${partida.modo === 'normal' ? `<p class="resumen">Palabras falladas: <strong>${partida.falladas.length}</strong></p>` : ''}
        <div class="acciones-finales">
          ${mostrarRepaso ? '<button class="boton boton-secundario" type="button" data-accion="repasar">Repasar las que fallé</button>' : ''}
          <button class="boton boton-principal" type="button" data-accion="reiniciar">Jugar otra vez</button>
        </div>
      </section>
    </main>`;
}

function dibujar(): void {
  const partida = estado;
  if (partida === null) {
    app.innerHTML = vistaInicio();
  } else if (partida.fase === 'ganaste' || partida.fase === 'perdiste' || partida.fase === 'repaso-terminado') {
    app.innerHTML = vistaFinal(partida);
  } else {
    app.innerHTML = vistaPartida(partida);
  }
}

app.addEventListener('click', (evento: MouseEvent) => {
  if (!(evento.target instanceof Element)) return;
  const boton = evento.target.closest<HTMLButtonElement>('[data-accion]');
  if (!boton) return;

  const accion = boton.dataset.accion;
  if (accion === 'iniciar' && estado === null) {
    estado = crearEstado(CONFIG.semillaPredeterminada);
  } else if (estado !== null && accion === 'elegir') {
    if (!elegirDefinicion(estado, Number(boton.dataset.indice))) return;
  } else if (estado !== null && accion === 'siguiente') {
    if (!pasarSiguiente(estado)) return;
  } else if (estado !== null && accion === 'repasar') {
    if (!empezarRepaso(estado)) return;
  } else if (estado !== null && accion === 'reiniciar') {
    if (!empezarDeNuevo(estado)) return;
  } else {
    return;
  }
  dibujar();
});

document.addEventListener('keydown', (evento: KeyboardEvent) => {
  if (estado === null || evento.repeat) return;
  if (/^[1-3]$/.test(evento.key)) {
    evento.preventDefault();
    if (elegirDefinicion(estado, Number(evento.key) - 1)) dibujar();
  } else if (evento.key === 'Enter') {
    evento.preventDefault();
    if (pasarSiguiente(estado)) dibujar();
  }
});

dibujar();
