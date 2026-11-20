// Efectos visuales. Todos respetan «reducir movimiento».

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Reinicia una animación CSS asociada a una clase. */
export function retrigger(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;            // fuerza el reflujo para que la animación vuelva a empezar
    el.classList.add(className);
}

/** Cuenta de 0 a `to` en el elemento. */
export function countUp(el, to, duration = 1100) {
    const target = Number(to);
    if (reduceMotion() || !Number.isFinite(target) || target === 0) {
        el.textContent = to;
        return;
    }
    const t0 = performance.now();
    const step = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

/** Parte el texto de un elemento en letras que entran en cascada (el texto accesible no cambia). */
export function splitReveal(el, stagger = 0.045) {
    if (reduceMotion() || el.dataset.split) return;
    el.dataset.split = '1';
    const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!node) return;
    const text = node.textContent.trim();
    const wrap = document.createElement('span');
    wrap.className = 'split';
    wrap.setAttribute('aria-label', text);
    [...text].forEach((ch, i) => {
        const s = document.createElement('span');
        s.setAttribute('aria-hidden', 'true');
        s.style.setProperty('--i', i);
        s.style.animationDelay = `${0.25 + i * stagger}s`;
        s.textContent = ch === ' ' ? '\u00a0' : ch;
        wrap.appendChild(s);
    });
    node.replaceWith(wrap);
}

/** El botón se «atrae» ligeramente hacia el cursor. */
export function magnetic(el, strength = 0.25) {
    if (reduceMotion() || !matchMedia('(hover: hover)').matches) return;
    el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * strength}px`);
        el.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * strength}px`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
}

/** Foco de luz que sigue al cursor sobre un panel (variables --lx / --ly). */
export function spotlight(el) {
    if (!matchMedia('(hover: hover)').matches) return;
    el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--lx', `${e.clientX - r.left}px`);
        el.style.setProperty('--ly', `${e.clientY - r.top}px`);
    });
}

/** Onda que nace en el punto de pulsación. */
export function ripple(el) {
    el.addEventListener('pointerdown', (e) => {
        if (reduceMotion()) return;
        const r = el.getBoundingClientRect();
        const dot = document.createElement('span');
        dot.className = 'ripple';
        dot.style.left = `${e.clientX - r.left}px`;
        dot.style.top = `${e.clientY - r.top}px`;
        el.appendChild(dot);
        dot.addEventListener('animationend', () => dot.remove(), { once: true });
    });
}
