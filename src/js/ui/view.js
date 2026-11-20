// Pintar el estado en pantalla. Aquí no hay reglas del cuestionario.

import { els } from './dom.js';
import { drawHighlight } from './highlight.js';
import { retrigger, countUp } from './effects.js';

/** «19 imágenes»: cuenta hasta el número y conserva el sufijo. */
function countText(el, n, suffix) {
    el.textContent = '';
    const num = document.createElement('span');
    el.append(num, suffix);
    countUp(num, n, 1400);
}
import { escapeHtml } from '../text.js';
import { webpFor } from '../config.js';
import { rows } from '../mastery.js';

export function showScreen(name) {
    for (const [key, el] of Object.entries(els.screens)) {
        el.classList.toggle('active', key === name);
    }
}

export function setModal(open) {
    els.infoModal.classList.toggle('open', open);
}

export function renderCounts(data) {
    const parts = data.reduce((sum, item) => sum + (item.partes?.length ?? 0), 0);
    countText(els.totalImages, data.length, ' imágenes');
    countText(els.totalParts, parts, ' partes');
}

export function renderBest(stats) {
    els.bestScore.textContent = `Mejor: ${stats.bestScore}%`;
}

export function renderTimer(text) {
    els.timer.textContent = text;
}

/** Pone la pregunta actual: lámina, recuadro, pista y cabecera. */
export function renderQuestion(quiz) {
    const q = quiz.current;
    const img = els.image;

    img.alt = `Imagen de anatomía - ${q.nombre}`;
    // Se sirve el WebP; si faltara, se recurre al original. Se precarga la siguiente lámina.
    img.onerror = () => { img.onerror = null; img.src = q.image; };
    img.src = webpFor(q.image);
    const upcoming = quiz.questions[quiz.index + 1];
    if (upcoming) new Image().src = webpFor(upcoming.image);
    retrigger(img, 'swap');
    retrigger(els.questionText, 'swap');

    const file = q.image.split('/').pop().split('.')[0];
    els.imageName.textContent = `Imagen: ${file.replace(/[_-]/g, ' ')}`;
    els.hintText.textContent = q.hint || '';
    els.hint.hidden = !q.hint;

    resetFeedback();
    els.answerInput.value = '';
    els.answerInput.focus();

    els.progress.textContent = `Pregunta: ${quiz.index + 1}/${quiz.total}`;
    els.score.textContent = `Puntuación: ${quiz.runningScore}%`;
    renderNav(quiz, false);
    renderProgress(quiz);

    // El recuadro se dibuja al cargar la imagen (o ya, si estaba en caché)
    const draw = () => drawHighlight(img, els.canvas, q, { clip: els.markerClip, marker: els.marker });
    img.onload = draw;
    if (img.complete) draw();
}

/** Botones de navegación. En la última pregunta, «Siguiente» se activa al verificar y pasa a «Ver resultados». */
export function renderNav(quiz, answered) {
    els.prevBtn.disabled = quiz.isFirst;
    els.nextBtn.disabled = quiz.isLast && !answered;
    els.nextLabel.textContent = quiz.isLast && answered ? 'Ver resultados' : 'Siguiente';
}

/** Barra segmentada: un tramo por pregunta, coloreado por resultado. */
export function renderProgress(quiz) {
    const track = els.progressTrack;
    if (track.children.length !== quiz.total) {
        track.innerHTML = '';
        for (let i = 0; i < quiz.total; i++) track.appendChild(document.createElement('i'));
    }
    [...track.children].forEach((seg, i) => {
        const a = quiz.answers[i];
        seg.className = i === quiz.index ? 'now' : !a || i > quiz.index ? '' : a.skipped ? 'skip' : a.isCorrect ? 'ok' : 'bad';
    });
}

/** Redibuja el recuadro al cambiar el tamaño de la ventana. */
export function redraw(part) {
    drawHighlight(els.image, els.canvas, part, { clip: els.markerClip, marker: els.marker });
}

export function resetFeedback() {
    els.feedback.className = 'feedback';
    els.feedback.style.display = 'none';
    els.suggestions.innerHTML = '';
}

export function renderFeedback(isCorrect, correctName, suggestions, { near = false, given = '' } = {}) {
    const name = escapeHtml(correctName);

    if (isCorrect && near) {
        els.feedback.className = 'feedback correct';
        els.feedbackText.innerHTML = `<i class="fas fa-check"></i> ¡Casi! Escribiste "${escapeHtml(given)}"; es <strong>${name}</strong>. Cuenta como acierto.`;
    } else if (isCorrect) {
        els.feedback.className = 'feedback correct';
        els.feedbackText.innerHTML = `<i class="fas fa-check"></i> ¡Correcto! "${name}" es la respuesta correcta.`;
    } else {
        els.feedback.className = 'feedback incorrect';
        els.feedbackText.innerHTML = `<i class="fas fa-times"></i> Incorrecto. La respuesta correcta es: <strong>${name}</strong>`;
        renderSuggestions(suggestions);
    }
    els.feedback.style.display = 'block';
    els.feedbackText.insertAdjacentHTML('beforeend', '<span class="continue-hint">Enter para continuar</span>');
}

function renderSuggestions(names) {
    els.suggestions.innerHTML = '';
    if (names.length === 0) return;

    const title = document.createElement('p');
    title.className = 'suggestions-title';
    title.textContent = '¿Quizás quisiste decir?';
    els.suggestions.appendChild(title);

    for (const name of names) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'suggestion';
        chip.textContent = name;
        chip.addEventListener('click', () => { els.answerInput.value = name; els.answerInput.focus(); });
        els.suggestions.appendChild(chip);
    }
}

export function setSubmitDisabled(disabled) {
    els.submitBtn.disabled = disabled;
}

export function showTutorial(visible) {
    els.tutorial.hidden = !visible;
}

const CIRCUMFERENCE = 2 * Math.PI * 70;

export function renderResults(summary, answers) {
    countUp(els.correctCount, summary.correct);
    countUp(els.incorrectCount, summary.incorrect);
    countUp(els.skippedCount, summary.skipped);
    countUp(els.finalScore, summary.percentage);
    els.totalTime.textContent = summary.time;
    els.accuracyRate.textContent = `${summary.accuracy}%`;
    els.avgTime.textContent = summary.avgTime;
    els.finalGrade.textContent = summary.grade;

    // El anillo parte siempre vacío y se llena con transición
    const circle = els.scoreCircle;
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = CIRCUMFERENCE;
    void circle.getBoundingClientRect();
    setTimeout(() => {
        circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(.32,.72,0,1)';
        circle.style.strokeDashoffset = CIRCUMFERENCE - (summary.percentage / 100) * CIRCUMFERENCE;
    }, 100);

    renderAnswers(answers);
}

const STATUS = {
    skipped:   { cls: 'skipped',   icon: 'fa-forward' },
    correct:   { cls: 'correct',   icon: 'fa-check-circle' },
    incorrect: { cls: 'incorrect', icon: 'fa-times-circle' },
};

function renderAnswers(answers) {
    els.answersList.innerHTML = '';

    answers.forEach((answer, i) => {
        const { cls, icon } = STATUS[answer.skipped ? 'skipped' : answer.isCorrect ? 'correct' : 'incorrect'];
        const row = document.createElement('div');
        row.className = `answer-item ${cls}`;
        row.innerHTML = `
            <div class="answer-info">
                <span class="question-number">Pregunta ${i + 1}</span>
                <span class="question-text">${escapeHtml(answer.question.nombre)}</span>
                <span class="user-answer">Tu respuesta: <strong>${escapeHtml(answer.userAnswer)}</strong></span>
            </div>
            <div class="answer-status"><i class="fas ${icon}"></i></div>`;
        els.answersList.appendChild(row);
    });
}

const NAMES = { esqueletico: 'Esquelético', nervioso: 'Nervioso', muscular: 'Muscular', cabeza: 'Cabeza', columna: 'Columna', cuello: 'Cuello' };
const pretty = (name) => NAMES[name] ?? name.charAt(0).toUpperCase() + name.slice(1);

/** Panel «Tu dominio» del inicio: aciertos por sistema y región y errores pendientes. */
export function renderMastery(mastery) {
    const groups = [['Sistemas', rows(mastery.bySistema)], ['Regiones', rows(mastery.byRegion)]];
    const hasData = groups.some(([, r]) => r.length > 0);
    els.progressEmpty.hidden = hasData;
    els.progressBars.innerHTML = groups
        .filter(([, r]) => r.length > 0)
        .map(([title, list]) => `
            <div class="bars-group">
                <h4>${title}</h4>
                ${list.map((r) => `
                    <div class="bar-row">
                        <span class="bar-name">${escapeHtml(pretty(r.name))}</span>
                        <span class="bar-track"><span class="bar-fill" style="--w:${r.pct}%"></span></span>
                        <span class="bar-value">${r.pct}% <small>${r.ok}/${r.total}</small></span>
                    </div>`).join('')}
            </div>`).join('');

    const weak = Object.keys(mastery.weak).length;
    els.weakCount.textContent = `(${weak})`;
    els.reviewWeakBtn.disabled = weak === 0;
}

/** Aplica el tema elegido: 'auto' deja mandar al sistema. */
export function applyTheme(theme) {
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
}
