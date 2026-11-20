// Lámina ampliada: rueda para acercar, arrastrar para mover, pellizco en táctil,
// doble clic para restablecer. El recuadro es un div en porcentajes: se ve nítido a cualquier aumento.

import { els } from './dom.js';
import { webpFor } from '../config.js';

const MIN = 1;
const MAX = 8;

let view = { s: 1, x: 0, y: 0 };
let opened = false;
const pointers = new Map();
let drag = null;
let pinch = null;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function apply() {
    els.zoomStage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    els.zoomStage.style.setProperty('--s', view.s);
}

/** Centra la lámina ajustada a la ventana. */
function fit() {
    const stage = els.zoomStage.getBoundingClientRect();
    const w = stage.width / view.s;
    const h = stage.height / view.s;
    view = { s: 1, x: (innerWidth - w) / 2, y: (innerHeight - 56 - h) / 2 };
    apply();
}

function zoomAt(cx, cy, factor) {
    const s = clamp(view.s * factor, MIN, MAX);
    const k = s / view.s;
    view = { s, x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k };
    apply();
}

function placeBox(part) {
    const img = els.zoomImage;
    const b = els.zoomBox.style;
    b.left = `${((part.x - part.width / 2) / img.naturalWidth) * 100}%`;
    b.top = `${((part.y - part.height / 2) / img.naturalHeight) * 100}%`;
    b.width = `${(part.width / img.naturalWidth) * 100}%`;
    b.height = `${(part.height / img.naturalHeight) * 100}%`;
}

export function isOpen() { return opened; }

export function openZoom(part) {
    const img = els.zoomImage;
    img.alt = `Imagen de anatomía - ${part.nombre}`;
    const original = part.image;
    img.onerror = () => { img.onerror = null; img.src = original; };
    img.onload = () => { placeBox(part); requestAnimationFrame(fit); };
    img.src = webpFor(original);
    els.zoom.hidden = false;
    opened = true;
    els.zoomClose.focus();
    if (img.complete && img.naturalWidth) img.onload();
}

export function closeZoom() {
    if (!opened) return;
    els.zoom.hidden = true;
    opened = false;
    pointers.clear();
}

export function initZoom() {
    const z = els.zoom;
    const centre = () => [innerWidth / 2, (innerHeight - 56) / 2];

    els.zoomClose.addEventListener('click', closeZoom);
    els.zoomIn.addEventListener('click', () => zoomAt(...centre(), 1.5));
    els.zoomOut.addEventListener('click', () => zoomAt(...centre(), 1 / 1.5));
    els.zoomReset.addEventListener('click', fit);
    z.addEventListener('dblclick', fit);
    window.addEventListener('resize', () => { if (opened) fit(); });

    z.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0018));
    }, { passive: false });

    z.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.zoom-bar')) return;
        z.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) drag = { x: e.clientX - view.x, y: e.clientY - view.y };
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
            drag = null;
        }
    });

    z.addEventListener('pointermove', (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2 && pinch) {
            const [a, b] = [...pointers.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.d);
            pinch.d = d;
        } else if (drag) {
            view.x = e.clientX - drag.x;
            view.y = e.clientY - drag.y;
            apply();
        }
    });

    const end = (e) => {
        pointers.delete(e.pointerId);
        pinch = null;
        drag = null;
        if (pointers.size === 1) {
            const [p] = pointers.values();
            drag = { x: p.x - view.x, y: p.y - view.y };
        }
    };
    z.addEventListener('pointerup', end);
    z.addEventListener('pointercancel', end);
}
