// Dominio acumulado entre sesiones: aciertos por sistema y región, y errores pendientes.
// Funciones puras (sin DOM ni almacenamiento); storage.js las guarda.

export const emptyMastery = () => ({ bySistema: {}, byRegion: {}, weak: {} });

const keyOf = (q) => `${q.image}|${q.nombre}`;

function bump(group, name, isCorrect) {
    const row = group[name] ?? { ok: 0, total: 0 };
    return { ...group, [name]: { ok: row.ok + (isCorrect ? 1 : 0), total: row.total + 1 } };
}

/** Devuelve un dominio nuevo con la respuesta aplicada. */
export function applyAnswer(mastery, question, isCorrect) {
    const weak = { ...mastery.weak };
    const key = keyOf(question);
    if (isCorrect) {
        delete weak[key];
    } else {
        weak[key] = { part: question, fails: (weak[key]?.fails ?? 0) + 1 };
    }
    return {
        bySistema: bump(mastery.bySistema, question.sistema || 'general', isCorrect),
        byRegion: bump(mastery.byRegion, question.region || 'general', isCorrect),
        weak,
    };
}

/** Preguntas pendientes, las más falladas primero. */
export function weakQuestions(mastery) {
    return Object.values(mastery.weak)
        .sort((a, b) => b.fails - a.fails)
        .map((w) => w.part);
}

/** Filas {name, ok, total, pct} ordenadas de menor a mayor dominio. */
export function rows(group) {
    return Object.entries(group)
        .map(([name, r]) => ({ name, ok: r.ok, total: r.total, pct: r.total ? Math.round((r.ok / r.total) * 100) : 0 }))
        .sort((a, b) => a.pct - b.pct);
}
