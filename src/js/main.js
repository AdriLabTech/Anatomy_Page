// Controlador: une el modelo (Quiz), el almacenamiento y la vista.

import { TUTORIAL_DELAY_MS } from './config.js';
import { loadData } from './data.js';
import { Quiz, buildQuestions, similarNames } from './quiz.js';
import { applyAnswer, weakQuestions } from './mastery.js';
import { formatTime } from './text.js';
import * as storage from './storage.js';
import { els } from './ui/dom.js';
import * as view from './ui/view.js';
import { toast, confirmDialog } from './ui/dialogs.js';
import { initZoom, openZoom, closeZoom, isOpen as zoomOpen } from './ui/zoom.js';
import { splitReveal, magnetic, spotlight, ripple } from './ui/effects.js';
import { isSplashOn, runSplash } from './ui/splash.js';

class App {
    constructor() {
        this.data = [];
        this.quiz = null;
        this.stats = storage.loadStats();
        this.mastery = storage.loadMastery();
        this.prefs = storage.loadPrefs();

        this.startTime = 0;
        this.elapsed = 0;
        this.timerId = null;
        this.answered = false;     // la pregunta actual ya se verificó
        this.hero = null;          // escena 3D del inicio (opcional)
    }

    async init() {
        const splash = isSplashOn();
        this.heroPromise = this.loadHero();          // Three.js y la escena se cargan mientras suena la bienvenida
        this.data = await loadData();
        view.applyTheme(this.prefs.theme);
        els.typoMode.value = this.prefs.typos ? 'typo' : 'exact';
        els.welcomeMode.value = this.prefs.welcome;
        initZoom();
        this.bind();

        if (splash) await runSplash({ pills: this.splashPills(), wait: this.heroPromise });
        this.reveal();
    }

    /** Cifras reales para la bienvenida. */
    splashPills() {
        const parts = this.data.reduce((sum, item) => sum + (item.partes?.length ?? 0), 0);
        const pills = [{ label: `${this.data.length} láminas` }, { label: `${parts} estructuras` }];
        if (this.stats.bestScore > 0) pills.push({ label: `Mejor nota: ${this.stats.bestScore}%` });
        const weak = Object.keys(this.mastery.weak).length;
        if (weak > 0) pills.push({ label: `${weak} por repasar`, bad: true });
        return pills;
    }

    /** Muestra el inicio: contadores, panel de dominio, efectos y entrada de la escena 3D. */
    reveal() {
        view.renderCounts(this.data);
        view.renderBest(this.stats);
        view.renderMastery(this.mastery);
        this.decorateHome();
        this.heroPromise.then((hero) => hero?.play());
    }

    async replaySplash() {
        window.scrollTo({ top: 0 });
        document.documentElement.dataset.splash = 'on';
        await runSplash({ pills: this.splashPills(), wait: this.heroPromise });
    }

    loadHero() {
        return import('./ui/hero3d.js')
            .then(({ initHero }) => initHero(els.heroStage))
            .then((hero) => {
                this.hero = hero;
                if (!hero) els.heroStage.hidden = true;
                return hero;
            })
            .catch(() => { els.heroStage.hidden = true; return null; });
    }

    /** Efectos del inicio (la escena 3D se carga aparte: si falla, la página sigue igual). */
    decorateHome() {
        splitReveal(document.querySelector('.welcome-card h2'));
        magnetic(els.startBtn);
        ripple(els.startBtn);
        document.querySelectorAll('.welcome-card, .progress-card, .settings').forEach(spotlight);
    }

    bind() {
        els.startBtn.addEventListener('click', () => this.start());
        els.submitBtn.addEventListener('click', () => this.check());
        els.answerInput.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            // Tras verificar, Enter continúa; antes, verifica
            if (this.answered) this.go('next');
            else this.check();
        });
        els.nextBtn.addEventListener('click', () => this.go('next'));
        els.prevBtn.addEventListener('click', () => this.go('prev'));
        els.skipBtn.addEventListener('click', () => this.skip());
        els.restartBtn.addEventListener('click', () => this.home());
        els.reviewBtn.addEventListener('click', () => this.review());
        els.reviewWeakBtn.addEventListener('click', () => this.reviewWeak());
        els.downloadBtn.addEventListener('click', () => this.download());
        els.clearStorage.addEventListener('click', () => this.clearStorage());
        els.closeTutorial.addEventListener('click', () => {
            view.showTutorial(false);
            storage.markTutorialSeen();
        });

        els.typoMode.addEventListener('change', () => {
            this.prefs.typos = els.typoMode.value === 'typo';
            storage.savePrefs(this.prefs);
        });
        els.themeBtn.addEventListener('click', () => this.toggleTheme());
        els.welcomeMode.addEventListener('change', () => {
            this.prefs.welcome = els.welcomeMode.value;
            storage.savePrefs(this.prefs);
        });
        els.welcomeReplay.addEventListener('click', () => this.replaySplash());

        els.zoomBtn.addEventListener('click', () => this.zoom());
        els.image.addEventListener('click', () => this.zoom());

        const openInfo = (e) => { e.preventDefault(); view.setModal(true); };
        els.aboutLink.addEventListener('click', openInfo);
        els.helpLink.addEventListener('click', openInfo);
        els.closeModal.addEventListener('click', () => view.setModal(false));
        els.infoModal.addEventListener('click', (e) => { if (e.target === els.infoModal) view.setModal(false); });

        document.addEventListener('keydown', (e) => this.onKey(e));

        window.addEventListener('resize', () => {
            if (this.quiz && !this.quiz.finished) view.redraw(this.quiz.current);
        });
    }

    onKey(e) {
        if (e.key === 'Escape') {
            if (zoomOpen()) closeZoom();
            view.setModal(false);
            return;
        }
        if (!els.screens.quiz.classList.contains('active') || !this.quiz || zoomOpen()) return;

        const typing = e.target.matches?.('input, select, textarea');
        // Con Alt siempre; sin Alt solo si no se está escribiendo
        if (!e.altKey && typing) return;
        if (e.ctrlKey || e.metaKey) return;

        const act = {
            ArrowRight: () => !els.nextBtn.disabled && this.go('next'),
            ArrowLeft: () => !els.prevBtn.disabled && this.go('prev'),
            s: () => this.skip(),
            z: () => this.zoom(),
        }[e.key.length === 1 ? e.key.toLowerCase() : e.key];

        if (act) { e.preventDefault(); act(); }
    }

    // ---- preferencias ----

    toggleTheme() {
        const dark = matchMedia('(prefers-color-scheme: dark)').matches;
        const current = this.prefs.theme === 'auto' ? (dark ? 'dark' : 'light') : this.prefs.theme;
        this.prefs.theme = current === 'dark' ? 'light' : 'dark';
        storage.savePrefs(this.prefs);
        view.applyTheme(this.prefs.theme);
    }

    zoom() {
        if (this.quiz && !this.quiz.finished) openZoom(this.quiz.current);
    }

    // ---- ciclo del cuestionario ----

    async start() {
        const questions = buildQuestions(this.data, {
            count: parseInt(els.numQuestions.value, 10),
            mode: els.quizMode.value,
        });
        if (questions.length === 0) {
            toast('No hay suficientes preguntas disponibles. Revisa data.json.', { kind: 'error' });
            return;
        }
        await this.hero?.dive();          // vuelo hacia dentro de la columna
        this.begin(new Quiz(questions));
    }

    review() {
        const mistakes = this.quiz.mistakes;
        if (mistakes.length === 0) {
            toast('¡No tienes errores que repasar!', { kind: 'ok' });
            return;
        }
        this.begin(new Quiz(mistakes));
    }

    /** Repasa los errores acumulados de todas las sesiones (los más fallados primero). */
    reviewWeak() {
        const count = parseInt(els.numQuestions.value, 10);
        const questions = weakQuestions(this.mastery).slice(0, count);
        if (questions.length === 0) {
            toast('No tienes errores pendientes.', { kind: 'ok' });
            return;
        }
        this.begin(new Quiz(questions));
    }

    begin(quiz) {
        this.quiz = quiz;
        this.elapsed = 0;
        this.hero?.setActive(false);
        view.showScreen('quiz');
        this.startTimer();
        this.show();
    }

    home() {
        view.renderMastery(this.mastery);
        view.showScreen('start');
        this.hero?.reset();
        this.hero?.setActive(true);
    }

    show() {
        if (this.quiz.finished) return this.end();

        this.answered = false;
        view.setSubmitDisabled(false);
        view.renderQuestion(this.quiz);

        if (this.quiz.isFirst && !storage.tutorialSeen()) {
            setTimeout(() => view.showTutorial(true), TUTORIAL_DELAY_MS);
        }
    }

    check() {
        if (this.answered) return;

        const text = els.answerInput.value.trim();
        if (!text) {
            toast('Por favor, escribe una respuesta.');
            return;
        }

        const question = this.quiz.current;
        const { isCorrect, near } = this.quiz.answer(text, Date.now() - this.startTime, { typos: this.prefs.typos });
        this.answered = true;

        view.renderFeedback(isCorrect, question.nombre, isCorrect ? [] : similarNames(this.data, question.nombre), { near, given: text });
        view.setSubmitDisabled(true);
        view.renderNav(this.quiz, true);
        view.renderProgress(this.quiz);

        storage.saveProgress(this.quiz);
        this.mastery = applyAnswer(this.mastery, question, isCorrect);
        storage.saveMastery(this.mastery);
    }

    skip() {
        // Si ya se verificó, «Saltar» solo avanza: no se registra dos veces la misma pregunta
        if (this.answered) return this.go('next');
        this.quiz.skip(Date.now() - this.startTime);
        this.show();
    }

    go(direction) {
        this.quiz[direction]();
        this.show();
    }

    end() {
        clearInterval(this.timerId);
        view.showTutorial(false);
        view.showScreen('summary');

        const summary = this.quiz.summary(this.elapsed);
        view.renderResults(summary, this.quiz.answers);

        this.stats = storage.recordQuiz(this.stats, summary);
        view.renderBest(this.stats);
    }

    // ---- cronómetro ----

    startTimer() {
        clearInterval(this.timerId);
        this.startTime = Date.now();
        view.renderTimer(formatTime(0));
        this.timerId = setInterval(() => {
            this.elapsed = Date.now() - this.startTime;
            view.renderTimer(formatTime(this.elapsed));
        }, 1000);
    }

    // ---- otras acciones ----

    download() {
        const report = this.quiz.report(this.elapsed);
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `resultados-anatomia-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async clearStorage() {
        if (!await confirmDialog('¿Seguro que quieres borrar todo el progreso guardado?')) return;
        storage.clearAll();
        this.stats = storage.loadStats();
        this.mastery = storage.loadMastery();
        view.renderBest(this.stats);
        view.renderMastery(this.mastery);
        toast('Progreso borrado correctamente.', { kind: 'ok' });
    }
}

new App().init();
