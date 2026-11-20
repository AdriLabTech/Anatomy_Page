// Avisos y confirmaciones en la propia página (sustituyen a alert/confirm).

import { els } from './dom.js';

export function toast(message, { kind = 'info', ms = 3200 } = {}) {
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.setAttribute('role', 'status');
    el.textContent = message;
    els.toasts.appendChild(el);

    setTimeout(() => {
        el.classList.add('leaving');
        el.addEventListener('animationend', () => el.remove(), { once: true });
        setTimeout(() => el.remove(), 600);   // por si las animaciones están desactivadas
    }, ms);
}

export function confirmDialog(message) {
    return new Promise((resolve) => {
        const dialog = els.confirmDialog;
        els.confirmText.textContent = message;
        dialog.returnValue = 'cancel';
        dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
        dialog.showModal();
    });
}
