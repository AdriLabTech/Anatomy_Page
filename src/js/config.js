// Constantes de la aplicación. Las claves de localStorage son las de siempre:
// así el progreso y la mejor nota guardados antes del rediseño siguen valiendo.

export const DATA_URL = 'data.json';

export const TUTORIAL_DELAY_MS = 1000;
export const SIMILARITY_THRESHOLD = 0.4;
export const MAX_SUGGESTIONS = 3;

export const STORAGE_KEYS = {
    progress: 'anatomyQuizProgress',
    stats: 'anatomyQuizStats',
    tutorial: 'tutorialShown',
    mastery: 'anatomyQuizMastery',   // dominio por sistema/región y errores pendientes
};

// Preferencias de interfaz: no las borra «Limpiar progreso».
export const PREFS_KEY = 'anatomyQuizPrefs';

export const TYPO_MIN_LENGTH = 5;     // la tolerancia a erratas solo vale para nombres de 5+ letras

// Las láminas se sirven en WebP (≈ 8× más ligeras) con las mismas dimensiones que el PNG
// original, así que las coordenadas de data.json siguen valiendo. Si falta el .webp se usa el original.
export function webpFor(path) {
    return path.startsWith('images/sin_nombres/') ? path.replace(/\.(png|jpe?g)$/i, '.webp') : path;
}

// Solo se usa si data.json no se puede cargar.
export const FALLBACK_DATA = [
    {
        imagen: 'images/sin_nombres/1.png',
        sistema: 'esqueletico',
        region: 'cabeza',
        partes: [
            {
                nombre: 'Hueso Parietal',
                x: 468,
                y: 375,
                width: 100,
                height: 100,
                hint: 'Hueso par del cráneo que forma los laterales y techo',
            },
        ],
    },
];
