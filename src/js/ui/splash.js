// Bienvenida a pantalla completa. El HTML y el CSS ya la muestran desde el primer pintado
// (decide el script de <head>); aquí se rellenan las cifras, se espera a que la escena 3D
// esté lista y se retira al pasar el tiempo mínimo o al pulsar/Esc/Enter/espacio.

const MIN_HOLD = 4300;      // lo que dura la animación completa (barra de progreso)
const OUT = 800;            // duración del cierre
const MAX_WAIT = 9000;      // tope si la escena 3D tarda más de lo razonable

const root = document.documentElement;
const $ = (id) => document.getElementById(id);

export const isSplashOn = () => root.dataset.splash === 'on';

function fillStats(pills) {
    const box = $('splash-stats');
    box.innerHTML = '';
    pills.forEach((p, i) => {
        const el = document.createElement('span');
        el.className = `sp-pill${p.bad ? ' bad' : ''}`;
        el.style.animationDelay = `${1900 + i * 140}ms`;
        el.textContent = p.label;
        box.appendChild(el);
    });
}

/**
 * Ejecuta la bienvenida. `pills`: cifras reales a mostrar. `wait`: promesa que debe cumplirse
 * antes de retirarla (p. ej. la carga de la escena 3D). La promesa devuelta se resuelve
 * cuando EMPIEZA el cierre, para que la web arranque sus animaciones mientras se retira.
 */
export function runSplash({ pills = [], wait = Promise.resolve() } = {}) {
    const el = $('splash');
    const status = $('splash-status');

    return new Promise((resolve) => {
        try { sessionStorage.setItem('anatomySplash', '1'); } catch { /* sin almacenamiento */ }
        status.textContent = 'Pulsa para continuar';
        fillStats(pills);
        el.focus({ preventScroll: true });

        let left = false;
        let minDone = false;
        let waitDone = false;
        const timers = [];

        const leave = () => {
            if (left) return;
            left = true;
            timers.forEach(clearTimeout);
            removeEventListener('keydown', onKey, true);
            el.removeEventListener('click', leave);
            root.dataset.splash = 'leaving';
            resolve();
            setTimeout(() => { root.dataset.splash = 'off'; }, OUT + 60);
        };
        const check = () => {
            if (minDone && waitDone) leave();
            else if (minDone) status.textContent = 'Preparando la escena 3D…';
        };
        const onKey = (e) => {
            if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); leave(); }
        };

        addEventListener('keydown', onKey, true);
        el.addEventListener('click', leave);
        timers.push(setTimeout(() => { minDone = true; check(); }, MIN_HOLD));
        timers.push(setTimeout(leave, MAX_WAIT));
        wait.then(() => { waitDone = true; check(); });
    });
}
