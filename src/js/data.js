import { DATA_URL, FALLBACK_DATA } from './config.js';

/** Carga data.json; si falla, usa una lámina de ejemplo y lo avisa en consola. */
export async function loadData() {
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error(`No se pudo cargar ${DATA_URL}`);
        return await response.json();
    } catch (error) {
        console.error('Error cargando datos:', error);
        console.warn('Usando datos de ejemplo.');
        return FALLBACK_DATA;
    }
}
