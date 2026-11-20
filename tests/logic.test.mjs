// Ejecutar: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizeText, getSimilarity, formatTime, escapeHtml } from '../src/js/text.js';
import { Quiz, buildQuestions, flattenParts, similarNames } from '../src/js/quiz.js';
import { emptyMastery, applyAnswer, weakQuestions, rows } from '../src/js/mastery.js';
import { webpFor } from '../src/js/config.js';

const data = JSON.parse(readFileSync(new URL('../data.json', import.meta.url), 'utf8'));

test('normalizeText ignora mayúsculas, tildes y signos', () => {
    assert.equal(normalizeText('Ángulo Esfenoidal'), 'angulo esfenoidal');
    assert.equal(normalizeText('  Hueso,  Parietal. '), 'hueso parietal');
});

test('getSimilarity', () => {
    assert.equal(getSimilarity('Nervio Vago', 'nervio vago'), 1);
    assert.ok(getSimilarity('Hueso Parietal Derecho', 'Hueso Parietal') > 0.4);
    assert.ok(getSimilarity('Atlas', 'Mandíbula') < 0.4);
});

test('formatTime y escapeHtml', () => {
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(125000), '2:05');
    assert.equal(escapeHtml('<b>"x"</b>'), '&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
});

test('data.json conserva su estructura', () => {
    assert.ok(data.length > 0);
    for (const lamina of data) {
        assert.equal(typeof lamina.imagen, 'string');
        for (const p of lamina.partes) {
            for (const k of ['nombre', 'x', 'y', 'width', 'height']) assert.ok(k in p, `${lamina.imagen}: falta ${k}`);
        }
    }
});

test('buildQuestions respeta cantidad y modo', () => {
    const total = flattenParts(data).length;
    assert.equal(buildQuestions(data, { count: 5 }).length, 5);
    assert.equal(buildQuestions(data, { count: 100000 }).length, total);

    const sistema = buildQuestions(data, { count: 100000, mode: 'system' });
    assert.equal(new Set(sistema.map((q) => q.sistema)).size, 1);

    const region = buildQuestions(data, { count: 100000, mode: 'region' });
    assert.equal(new Set(region.map((q) => q.region)).size, 1);
});

test('Quiz: acierto, fallo, salto, retroceso y resumen', () => {
    const qs = [
        { nombre: 'Hueso Parietal', image: 'a.png' },
        { nombre: 'Atlas', image: 'b.png' },
        { nombre: 'Axis', image: 'c.png' },
    ];
    const quiz = new Quiz(qs);

    assert.equal(quiz.answer('hueso parietal', 1000).isCorrect, true);
    quiz.next();
    assert.equal(quiz.answer('xxx', 2000).isCorrect, false);
    quiz.next();
    quiz.skip(3000);
    assert.ok(quiz.finished);

    const s = quiz.summary(60000);
    assert.deepEqual([s.correct, s.incorrect, s.skipped, s.total], [1, 1, 1, 3]);
    assert.equal(s.percentage, 33);
    assert.equal(s.accuracy, 50);
    assert.equal(s.grade, '1/3');
    assert.equal(s.time, '1:00');
    assert.equal(s.avgTime, '30 s');   // 60 s entre 2 respondidas
    assert.deepEqual(quiz.mistakes.map((q) => q.nombre), ['Atlas']);

    const report = quiz.report(60000, new Date('2026-01-01T00:00:00Z'));
    assert.equal(report.nota, '1/3');
    assert.equal(report.respuestas[2].saltada, true);
});

test('Quiz.prev deshace la respuesta y la puntuación sigue siendo coherente', () => {
    const quiz = new Quiz([{ nombre: 'A' }, { nombre: 'B' }]);
    quiz.answer('a', 0);
    quiz.next();
    quiz.prev();
    assert.equal(quiz.index, 0);
    assert.equal(quiz.score, 1);
});

test('resumen sin respuestas no produce NaN', () => {
    const s = new Quiz([{ nombre: 'A' }]).summary(0);
    assert.equal(s.accuracy, 0);
    assert.equal(s.avgTime, '—');
});

test('similarNames: sin repetidos, sin el propio nombre y como mucho 3', () => {
    const name = flattenParts(data)[0].nombre;
    const sugg = similarNames(data, name);
    assert.ok(sugg.length <= 3);
    assert.ok(!sugg.map(normalizeText).includes(normalizeText(name)));
    assert.equal(new Set(sugg.map(normalizeText)).size, sugg.length);
});

test('todos los id que usa el JS existen en index.html', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const dom = readFileSync(new URL('../src/js/ui/dom.js', import.meta.url), 'utf8');
    const ids = [...dom.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]);
    assert.ok(ids.length > 30);
    for (const id of ids) assert.ok(html.includes(`id="${id}"`), `falta #${id} en index.html`);
});

test('las láminas de data.json existen en disco', () => {
    for (const lamina of data) {
        readFileSync(new URL(`../${lamina.imagen}`, import.meta.url));
    }
});

test('tolerancia a erratas: opcional, una errata y solo en nombres de 5+ letras', () => {
    const q = () => new Quiz([{ nombre: 'Nervio vago' }, { nombre: 'Atlas' }, { nombre: 'Axis' }]);

    const exacta = q();
    assert.deepEqual(exacta.answer('nervio vagu', 0), { isCorrect: false, near: false });

    const tolerante = q();
    assert.deepEqual(tolerante.answer('nervio vagu', 0, { typos: true }), { isCorrect: true, near: true });
    tolerante.next();
    assert.equal(tolerante.answer('atlsa', 0, { typos: true }).isCorrect, false);   // dos cambios
    tolerante.next();
    assert.equal(tolerante.answer('axix', 0, { typos: true }).isCorrect, false);    // nombre corto
    assert.equal(tolerante.answers[0].near, true);
});

test('dominio: acumula por sistema/región y gestiona errores pendientes', () => {
    const a = { image: 'a.png', nombre: 'Atlas', sistema: 'esqueletico', region: 'columna' };
    const b = { image: 'b.png', nombre: 'Vago', sistema: 'nervioso', region: 'cuello' };

    let m = emptyMastery();
    m = applyAnswer(m, a, false);
    m = applyAnswer(m, a, false);
    m = applyAnswer(m, b, true);
    assert.deepEqual(m.bySistema.esqueletico, { ok: 0, total: 2 });
    assert.deepEqual(m.byRegion.cuello, { ok: 1, total: 1 });
    assert.equal(weakQuestions(m).length, 1);
    assert.equal(m.weak['a.png|Atlas'].fails, 2);

    m = applyAnswer(m, a, true);                     // acertar lo quita de pendientes
    assert.equal(weakQuestions(m).length, 0);
    assert.deepEqual(rows(m.bySistema).map((r) => [r.name, r.pct]), [['esqueletico', 33], ['nervioso', 100]]);   // el más flojo primero
});

test('applyAnswer no muta el dominio anterior', () => {
    const m0 = emptyMastery();
    applyAnswer(m0, { image: 'a', nombre: 'A', sistema: 's', region: 'r' }, false);
    assert.deepEqual(m0, emptyMastery());
});

test('webpFor solo cambia las láminas de sin_nombres', () => {
    assert.equal(webpFor('images/sin_nombres/1.png'), 'images/sin_nombres/1.webp');
    assert.equal(webpFor('images/con_nombres/1.png'), 'images/con_nombres/1.png');
});

test('cada lámina de data.json tiene su WebP con las mismas coordenadas útiles', () => {
    for (const lamina of data) {
        readFileSync(new URL(`../${webpFor(lamina.imagen)}`, import.meta.url));
    }
});

test('pie de marca de Takumi-Organization, licencia y enlaces a las políticas', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /<footer class="tk-footer"/);
    assert.ok(html.includes('Web desarrollada por Takumi-Organization'));
    for (const url of ['https://takumi-organization.github.io"', '/privacidad/"', '/terminos/"', '/licencias/"']) {
        assert.ok(html.includes(url), `falta el enlace ${url}`);
    }
    assert.match(html, /rel="noopener"/);
    const license = readFileSync(new URL('../LICENSE', import.meta.url), 'utf8');
    assert.match(license, /MIT License/);
    assert.match(license, /Copyright \(c\) 2026 Takumi-Organization/);
});

test('escena 3D: módulos y three.js local con su licencia (sin CDN)', () => {
    for (const f of ['src/js/ui/hero3d.js', 'assets/vendor/three-lite.js', 'assets/vendor/LICENSE-three.txt']) {
        readFileSync(new URL(`../${f}`, import.meta.url));
    }
    const hero = readFileSync(new URL('../src/js/ui/hero3d.js', import.meta.url), 'utf8');
    assert.ok(!/https?:\/\//.test(hero.replace(/\/\/.*$/gm, '')), 'hero3d.js no carga nada externo');
});

test('bienvenida: markup, estilos y módulo presentes, y el <head> decide si se muestra', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.match(html, /id="splash"/);
    assert.match(html, /src\/css\/splash\.css/);
    assert.match(html, /dataset\.splash = 'on'/);
    assert.match(html, /nosplash/);
    readFileSync(new URL('../src/js/ui/splash.js', import.meta.url));
});
