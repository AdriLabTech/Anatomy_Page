// Modelo del cuestionario: preguntas, respuestas y puntuación. No toca el DOM.

import { SIMILARITY_THRESHOLD, MAX_SUGGESTIONS, TYPO_MIN_LENGTH } from './config.js';
import { normalizeText, getSimilarity, editDistance, formatTime } from './text.js';

/** Aplana data.json en una lista de partes con su lámina, sistema y región. */
export function flattenParts(data) {
    const parts = [];
    for (const lamina of data) {
        if (!lamina || !Array.isArray(lamina.partes)) continue;
        for (const parte of lamina.partes) {
            parts.push({
                image: lamina.imagen,
                sistema: lamina.sistema || 'general',
                region: lamina.region || 'general',
                ...parte,
            });
        }
    }
    return parts;
}

const pickRandom = (list, random) => list[Math.floor(random() * list.length)];

/**
 * Genera las preguntas. `mode`: 'mixed' | 'system' | 'region'.
 * `random` se puede inyectar para pruebas.
 */
export function buildQuestions(data, { count, mode = 'mixed', random = Math.random }) {
    const all = flattenParts(data);
    let pool = all;

    if (mode === 'system') {
        const chosen = pickRandom([...new Set(all.map((p) => p.sistema))], random);
        pool = all.filter((p) => p.sistema === chosen);
    } else if (mode === 'region') {
        const chosen = pickRandom([...new Set(all.map((p) => p.region))], random);
        pool = all.filter((p) => p.region === chosen);
    }

    const shuffled = [...pool].sort(() => random() - 0.5);
    return shuffled.slice(0, Math.min(count, pool.length));
}

/** Nombres parecidos al correcto (sin repetir) para distinguir estructuras cercanas. */
export function similarNames(data, correctName) {
    const target = normalizeText(correctName);
    const seen = new Set();
    const found = [];

    for (const part of flattenParts(data)) {
        const key = normalizeText(part.nombre);
        if (key === target || seen.has(key)) continue;
        const similarity = getSimilarity(part.nombre, correctName);
        if (similarity > SIMILARITY_THRESHOLD) {
            seen.add(key);
            found.push({ nombre: part.nombre, similarity });
        }
    }

    return found
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, MAX_SUGGESTIONS)
        .map((s) => s.nombre);
}

export class Quiz {
    constructor(questions) {
        this.questions = questions;
        this.index = 0;
        this.answers = [];
    }

    get total() { return this.questions.length; }
    get finished() { return this.index >= this.questions.length; }
    get current() { return this.questions[this.index]; }
    get score() { return this.answers.filter((a) => a.isCorrect).length; }
    get isFirst() { return this.index === 0; }
    get isLast() { return this.index === this.questions.length - 1; }

    /** Porcentaje acumulado antes de la pregunta actual. */
    get runningScore() {
        return this.index > 0 ? Math.round((this.score / this.index) * 100) : 0;
    }

    /**
     * Registra una respuesta. Con `typos` se admite una errata en nombres de 5+ letras
     * (cuenta como acierto y se marca `near`). Devuelve { isCorrect, near }.
     */
    answer(text, time, { typos = false } = {}) {
        const given = normalizeText(text);
        const target = normalizeText(this.current.nombre);
        const exact = given === target;
        const near = !exact && typos && target.length >= TYPO_MIN_LENGTH && editDistance(given, target) <= 1;
        const isCorrect = exact || near;
        this.answers.push({ question: this.current, userAnswer: text, isCorrect, near, skipped: false, time });
        return { isCorrect, near };
    }

    skip(time) {
        this.answers.push({ question: this.current, userAnswer: '(saltada)', isCorrect: false, skipped: true, time });
        this.next();
    }

    next() { this.index++; }

    prev() {
        if (this.index === 0) return;
        if (this.answers.length > this.index) this.answers.pop();
        this.index--;
    }

    get mistakes() {
        return this.answers.filter((a) => !a.isCorrect && !a.skipped).map((a) => a.question);
    }

    summary(elapsedMs) {
        const correct = this.answers.filter((a) => a.isCorrect).length;
        const incorrect = this.answers.filter((a) => !a.isCorrect && !a.skipped).length;
        const skipped = this.answers.filter((a) => a.skipped).length;
        const total = this.total;
        const answered = correct + incorrect;
        const avgSeconds = answered > 0 ? Math.round(elapsedMs / 1000 / answered) : null;
        return {
            correct, incorrect, skipped, total,
            percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
            accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
            avgTime: avgSeconds === null ? '—' : `${avgSeconds} s`,
            grade: `${correct}/${total}`,
            time: formatTime(elapsedMs),
        };
    }

    /** Fichero que descarga «Descargar resultados» (mismo formato de siempre). */
    report(elapsedMs, now = new Date()) {
        const s = this.summary(elapsedMs);
        return {
            fecha: now.toISOString(),
            totalPreguntas: s.total,
            respuestasCorrectas: s.correct,
            respuestasIncorrectas: s.incorrect,
            preguntasSaltadas: s.skipped,
            porcentaje: s.percentage,
            nota: s.grade,
            tiempo: s.time,
            respuestas: this.answers.map((a) => ({
                pregunta: a.question.nombre,
                respuestaUsuario: a.userAnswer,
                correcta: a.isCorrect,
                saltada: a.skipped,
            })),
        };
    }
}
