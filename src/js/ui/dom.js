// Referencias al DOM. El script es un módulo (diferido), así que el HTML ya está listo.

const $ = (id) => document.getElementById(id);

export const els = {
    screens: { start: $('start-screen'), quiz: $('quiz-screen'), summary: $('summary-screen') },

    // cabecera y pie
    progress: $('progress'),
    score: $('score'),
    aboutLink: $('about-link'),
    helpLink: $('help-link'),
    infoModal: $('info-modal'),
    closeModal: document.querySelector('.close-modal'),

    // inicio
    numQuestions: $('num-questions'),
    quizMode: $('quiz-mode'),
    clearStorage: $('clear-storage'),
    startBtn: $('start-btn'),
    totalImages: $('total-images'),
    totalParts: $('total-parts'),
    bestScore: $('best-score'),

    // quiz
    image: $('anatomy-image'),
    canvas: $('highlight-canvas'),
    imageName: $('image-name'),
    hint: $('hint'),
    hintText: $('hint-text'),
    questionText: $('question-text'),
    timer: $('timer'),
    answerInput: $('answer-input'),
    submitBtn: $('submit-btn'),
    feedback: $('feedback'),
    feedbackText: $('feedback-text'),
    suggestions: $('suggestions'),
    skipBtn: $('skip-btn'),
    prevBtn: $('prev-btn'),
    nextBtn: $('next-btn'),
    tutorial: $('tutorial'),
    closeTutorial: $('close-tutorial'),

    // resultados
    scoreCircle: $('score-circle'),
    finalScore: $('final-score'),
    correctCount: $('correct-count'),
    incorrectCount: $('incorrect-count'),
    skippedCount: $('skipped-count'),
    totalTime: $('total-time'),
    accuracyRate: $('accuracy-rate'),
    avgTime: $('avg-time'),
    finalGrade: $('final-grade'),
    answersList: $('answers-list'),
    restartBtn: $('restart-btn'),
    reviewBtn: $('review-btn'),
    downloadBtn: $('download-btn'),

    // nuevo
    heroStage: $('hero-stage'),
    welcomeMode: $('welcome-mode'),
    welcomeReplay: $('welcome-replay'),
    themeBtn: $('theme-btn'),
    typoMode: $('typo-mode'),
    progressTrack: $('progress-track'),
    progressBars: $('progress-bars'),
    progressEmpty: $('progress-empty'),
    reviewWeakBtn: $('review-weak-btn'),
    weakCount: $('weak-count'),
    nextLabel: $('next-label'),
    markerClip: $('marker-clip'),
    marker: $('marker'),
    zoomBtn: $('zoom-btn'),
    zoom: $('zoom'),
    zoomStage: $('zoom-stage'),
    zoomImage: $('zoom-image'),
    zoomBox: $('zoom-box'),
    zoomIn: $('zoom-in'),
    zoomOut: $('zoom-out'),
    zoomReset: $('zoom-reset'),
    zoomClose: $('zoom-close'),

    // avisos
    toasts: $('toasts'),
    confirmDialog: $('confirm-dialog'),
    confirmText: $('confirm-text'),
};
