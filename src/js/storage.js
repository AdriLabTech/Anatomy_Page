// localStorage con try/catch: si está bloqueado (modo privado, etc.) la app sigue funcionando.

import { STORAGE_KEYS, PREFS_KEY } from './config.js';
import { emptyMastery } from './mastery.js';

const EMPTY_STATS = { bestScore: 0, totalQuizzes: 0, totalCorrect: 0, totalQuestions: 0 };

function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
    try { localStorage.setItem(key, value); } catch { /* sin almacenamiento */ }
}
function remove(key) {
    try { localStorage.removeItem(key); } catch { /* sin almacenamiento */ }
}

export function loadStats() {
    try {
        return { ...EMPTY_STATS, ...JSON.parse(read(STORAGE_KEYS.stats)) };
    } catch {
        return { ...EMPTY_STATS };
    }
}

export function recordQuiz(stats, { percentage, correct, total }) {
    const next = { ...stats };
    if (percentage > next.bestScore) next.bestScore = percentage;
    next.totalQuizzes++;
    next.totalCorrect += correct;
    next.totalQuestions += total;
    write(STORAGE_KEYS.stats, JSON.stringify(next));
    return next;
}

export function saveProgress(quiz) {
    write(STORAGE_KEYS.progress, JSON.stringify({
        lastScore: quiz.score,
        totalQuestions: quiz.total,
        date: new Date().toISOString(),
        userAnswers: quiz.answers,
    }));
}

export function loadMastery() {
    try {
        return { ...emptyMastery(), ...JSON.parse(read(STORAGE_KEYS.mastery)) };
    } catch {
        return emptyMastery();
    }
}
export const saveMastery = (mastery) => write(STORAGE_KEYS.mastery, JSON.stringify(mastery));

export function loadPrefs() {
    try {
        return { theme: 'auto', typos: false, welcome: 'session', ...JSON.parse(read(PREFS_KEY)) };
    } catch {
        return { theme: 'auto', typos: false, welcome: 'session' };
    }
}
export const savePrefs = (prefs) => write(PREFS_KEY, JSON.stringify(prefs));

export const tutorialSeen = () => read(STORAGE_KEYS.tutorial) === 'true';
export const markTutorialSeen = () => write(STORAGE_KEYS.tutorial, 'true');

export function clearAll() {
    Object.values(STORAGE_KEYS).forEach(remove);
}
