// Utilidades de texto puras (sin DOM): se pueden probar con `node --test`.

/** Minúsculas, sin tildes ni signos y con espacios colapsados. */
export function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Distancia de edición (Levenshtein) entre dos cadenas. */
export function editDistance(a, b) {
    const costs = [];
    for (let i = 0; i <= a.length; i++) {
        let last = i;
        for (let j = 0; j <= b.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let value = costs[j - 1];
                if (a.charAt(i - 1) !== b.charAt(j - 1)) {
                    value = Math.min(value, last, costs[j]) + 1;
                }
                costs[j - 1] = last;
                last = value;
            }
        }
        if (i > 0) costs[b.length] = last;
    }
    return costs[b.length];
}

/** Parecido entre 0 y 1 de dos nombres (insensible a mayúsculas y tildes). */
export function getSimilarity(str1, str2) {
    const s1 = normalizeText(str1);
    const s2 = normalizeText(str2);

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.startsWith(shorter)) return (shorter.length / longer.length) * 0.8;

    return (longer.length - editDistance(s1, s2)) / longer.length;
}

/** m:ss */
export function formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Para insertar texto de datos o del usuario dentro de innerHTML. */
export function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
