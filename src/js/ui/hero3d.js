// Escena 3D del inicio: una columna vertebral procedural (24 vértebras + sacro) con
// un escáner que la recorre, señales nerviosas por el canal medular y un retículo rojo
// que juega a «¿qué estructura es?», como la propia app. Todo se construye con
// geometrías simples (sin modelos externos). Three.js se carga bajo demanda.

const THREE_URL = new URL('../../../assets/vendor/three-lite.js', import.meta.url).href;

const GOLD_DARK = 0xf2b33d;
const GOLD_LIGHT = 0x8f5f00;

// 7 cervicales, 12 torácicas, 5 lumbares
const NAMES = [
    'Atlas (C1)', 'Axis (C2)', ...Array.from({ length: 5 }, (_, i) => `Vértebra cervical C${i + 3}`),
    ...Array.from({ length: 12 }, (_, i) => `Vértebra torácica T${i + 1}`),
    ...Array.from({ length: 5 }, (_, i) => `Vértebra lumbar L${i + 1}`),
];
const COUNT = NAMES.length;
const SPAN = 8.4;                    // alto de la columna en unidades de escena

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
const easeOutBack = (p) => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };

/** Línea media de la columna: curvas cervical, torácica y lumbar (z positiva = hacia delante). */
const spineZ = (t) => 0.55 * Math.sin(2 * Math.PI * (t * 1.25) + 0.3);
const spineY = (t) => SPAN / 2 - t * SPAN;

export async function initHero(stage) {
    const canvas = stage.querySelector('#hero-canvas');
    const reticle = stage.querySelector('#hero-reticle');
    const tag = stage.querySelector('#hero-tag');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let THREE;
    let renderer;
    try {
        THREE = await import(THREE_URL);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (error) {
        console.warn('Inicio 3D no disponible:', error);
        return null;
    }

    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    const root = new THREE.Group();          // lo que gira
    scene.add(root);

    // ---------- luces ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xfff1d6, 2.4);
    key.position.set(4, 6, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc9d6ff, 1.3);
    rim.position.set(-6, 2, -5);
    scene.add(rim);
    const scanLight = new THREE.PointLight(GOLD_DARK, 22, 6);
    scene.add(scanLight);

    // ---------- materiales (el tema los reajusta) ----------
    const boneMat = new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.45, metalness: 0.35 });
    const discMat = new THREE.MeshBasicMaterial({ color: GOLD_DARK, transparent: true, opacity: 0.3 });
    const canalMat = new THREE.MeshBasicMaterial({ color: GOLD_DARK, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending });

    // ---------- geometrías compartidas ----------
    const gBody = new THREE.CylinderGeometry(1, 1, 1, 26);
    const gArch = new THREE.TorusGeometry(1, 0.22, 8, 26, Math.PI);
    const gCone = new THREE.ConeGeometry(0.5, 1, 8);
    const gDisc = new THREE.CylinderGeometry(1, 1, 1, 26);
    const eBody = new THREE.EdgesGeometry(gBody, 28);
    const eArch = new THREE.EdgesGeometry(gArch, 28);
    const eCone = new THREE.EdgesGeometry(gCone, 28);

    const solids = [];                        // mallas sólidas para el raycast
    const vertebrae = [];

    const addPart = (group, geo, edges, scale, pos, rot, lineMat) => {
        const mesh = new THREE.Mesh(geo, boneMat);
        mesh.scale.set(...scale);
        mesh.position.set(...pos);
        mesh.rotation.set(...rot);
        const lines = new THREE.LineSegments(edges, lineMat);
        mesh.add(lines);
        group.add(mesh);
        return mesh;
    };

    for (let i = 0; i < COUNT; i++) {
        const t = (i + 0.5) / (COUNT + 2.5);
        const k = i / (COUNT - 1);                                 // 0 arriba → 1 abajo
        const r = 0.17 + 0.21 * k;                                 // radio del cuerpo
        const h = 0.16 + 0.08 * k;                                 // alto del cuerpo
        const region = i < 7 ? 'c' : i < 19 ? 't' : 'l';
        const lineMat = new THREE.LineBasicMaterial({ color: GOLD_DARK, transparent: true, opacity: 0.5 });

        const g = new THREE.Group();
        const y = spineY(t);
        const z = spineZ(t);
        const dz = (spineZ(t + 0.01) - spineZ(t - 0.01)) / (spineY(t + 0.01) - spineY(t - 0.01));
        const home = { y, z, rx: Math.atan(dz) };
        g.position.set(0, y, z);
        g.rotation.x = home.rx;

        const parts = [];
        // cuerpo + disco inferior
        parts.push(addPart(g, gBody, eBody, [r, h, r * 0.82], [0, 0, 0], [0, 0, 0], lineMat));
        const disc = new THREE.Mesh(gDisc, discMat);
        disc.scale.set(r * 0.93, 0.045, r * 0.76);
        disc.position.set(0, -(h / 2 + 0.035), 0);
        g.add(disc);

        // arco posterior
        const archR = r * 0.95;
        const archZ = -r * 0.3;
        parts.push(addPart(g, gArch, eArch, [archR, archR * 0.9, h * 3.4], [0, 0, archZ], [-Math.PI / 2, 0, 0], lineMat));

        // apófisis espinosa: corta en cervicales, larga y caída en torácicas
        const L = region === 'c' ? r * 1.5 : region === 't' ? r * 2.3 : r * 1.8;
        const theta = region === 'c' ? 0.15 : region === 't' ? 0.7 : 0.1;
        const backZ = archZ - archR * 0.9;
        const dir = new THREE.Vector3(0, -Math.sin(theta), -Math.cos(theta));
        const spin = addPart(g, gCone, eCone, [r * 0.4, L, r * 0.4],
            [0, dir.y * L / 2, backZ + dir.z * L / 2], [-(Math.PI / 2 + theta), 0, 0], lineMat);
        parts.push(spin);

        // apófisis transversas
        const TL = r * (region === 'l' ? 1.5 : 1.15);
        for (const s of [1, -1]) {
            parts.push(addPart(g, gCone, eCone, [r * 0.3, TL, r * 0.3],
                [s * (archR + TL / 2 - 0.02), 0, archZ - archR * 0.35], [0, 0, -s * Math.PI / 2], lineMat));
        }

        parts.forEach((m) => { m.userData.v = i; solids.push(m); });
        root.add(g);
        vertebrae.push({ g, home, lineMat, r, h, parts, seed: [Math.random() - 0.5, Math.random(), Math.random() - 0.5, Math.random() - 0.5] });
    }

    // sacro y cóccix
    const sacrumMat = new THREE.LineBasicMaterial({ color: GOLD_DARK, transparent: true, opacity: 0.5 });
    const sacrum = new THREE.Group();
    const tS = (COUNT + 0.9) / (COUNT + 2.5);
    sacrum.position.set(0, spineY(tS) - 0.15, spineZ(tS) - 0.05);
    sacrum.rotation.x = 0.35;
    const sac = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 6), boneMat);
    sac.scale.set(0.5, 0.85, 0.26);
    sac.rotation.z = Math.PI;
    sac.add(new THREE.LineSegments(new THREE.EdgesGeometry(sac.geometry, 28), sacrumMat));
    sacrum.add(sac);
    const coccyx = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 5), boneMat);
    coccyx.scale.set(0.1, 0.26, 0.08);
    coccyx.position.set(0, -0.55, -0.06);
    coccyx.rotation.z = Math.PI;
    coccyx.add(new THREE.LineSegments(new THREE.EdgesGeometry(coccyx.geometry, 28), sacrumMat));
    sacrum.add(coccyx);
    root.add(sacrum);

    // ---------- canal medular y señales ----------
    const canalPts = [];
    for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * ((COUNT + 0.2) / (COUNT + 2.5));
        canalPts.push(new THREE.Vector3(0, spineY(t + 0.02), spineZ(t + 0.02) - 0.2));
    }
    const canalCurve = new THREE.CatmullRomCurve3(canalPts);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(canalCurve, 240, 0.028, 8, false), canalMat));

    const pulses = Array.from({ length: 5 }, (_, i) => {
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14),
            new THREE.MeshBasicMaterial({ color: GOLD_DARK, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
        head.add(halo);
        root.add(head);
        return { head, u: i / 5, speed: 0.11 + i * 0.017 };
    });

    // ---------- escáner ----------
    const scanner = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: GOLD_DARK, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.012, 8, 120), ringMat);
    ring.rotation.x = Math.PI / 2;
    const plate = new THREE.Mesh(new THREE.CircleGeometry(1.55, 64),
        new THREE.MeshBasicMaterial({ color: GOLD_DARK, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    plate.rotation.x = Math.PI / 2;
    scanner.add(ring, plate);
    root.add(scanner);

    // ---------- polvo de luz ----------
    const N = 520;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
        const rad = 4 + Math.random() * 6;
        const a = Math.random() * Math.PI * 2;
        pos[i * 3] = Math.cos(a) * rad;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
        pos[i * 3 + 2] = Math.sin(a) * rad;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dustMat = new THREE.PointsMaterial({ color: GOLD_DARK, size: 0.045, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ---------- tema ----------
    const applyTheme = () => {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
        const light = /^#(?:[ef])/i.test(bg);                      // fondos claros: #F4F5F7
        const gold = light ? GOLD_LIGHT : GOLD_DARK;
        boneMat.color.set(light ? 0xe7e1d3 : 0x20242c);
        boneMat.metalness = light ? 0.05 : 0.35;
        boneMat.roughness = light ? 0.6 : 0.45;
        for (const m of [discMat, canalMat, ringMat, dustMat]) m.color.set(gold);
        plate.material.color.set(gold);
        scanLight.color.set(gold);
        sacrumMat.color.set(gold);
        vertebrae.forEach((v) => v.lineMat.color.set(gold));
        dustMat.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
        dustMat.needsUpdate = true;
    };
    applyTheme();
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

    // ---------- tamaño ----------
    const resize = () => {
        const w = stage.clientWidth || 1;
        const h = stage.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        baseZ = 18.5 / Math.min(1, camera.aspect * 1.25);
    };
    let baseZ = 18.5;
    new ResizeObserver(resize).observe(stage);
    resize();

    // ---------- interacción ----------
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const state = { rotY: 0.6, vel: 0, px: 0, py: 0, drag: null, hover: -1, active: false, diving: 0, last: 0 };
    let introStart = 0;                      // la entrada no empieza hasta play() (tras la bienvenida)

    stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
        state.px = ndc.x;
        state.py = ndc.y;
        if (state.drag) {
            state.vel = (e.clientX - state.drag.x) * 0.006;
            state.rotY += state.vel;
            state.drag.x = e.clientX;
        }
        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(solids, false)[0];
        state.hover = hit ? hit.object.userData.v : -1;
        stage.classList.toggle('hovering', state.hover >= 0);
        needsFrame();
    });
    stage.addEventListener('pointerleave', () => { state.hover = -1; state.px = 0; state.py = 0; state.drag = null; stage.classList.remove('hovering', 'dragging'); });
    stage.addEventListener('pointerdown', (e) => { state.drag = { x: e.clientX }; stage.classList.add('dragging'); stage.setPointerCapture?.(e.pointerId); });
    const endDrag = () => { state.drag = null; stage.classList.remove('dragging'); };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    // ---------- retículo «¿qué estructura es?» ----------
    const ret = { index: 0, t0: 0, phase: 'ask' };
    const v3 = new THREE.Vector3();
    const edge = new THREE.Vector3();
    const tagText = tag.querySelector('.tag-text');

    function updateReticle(now) {
        const target = state.hover >= 0 ? state.hover : ret.index;
        if (state.hover < 0) {
            const el = (now - ret.t0) / 1000;
            if (el > 1.7 && ret.phase === 'ask') ret.phase = 'reveal';
            if (el > 3.9) {
                ret.index = (ret.index + 1 + Math.floor(Math.random() * 5)) % COUNT;
                ret.t0 = now;
                ret.phase = 'ask';
                reticle.classList.remove('lock'); void reticle.offsetWidth; reticle.classList.add('lock');
            }
        }
        const v = vertebrae[target];
        v3.set(0, 0, v.r + 0.12);
        v.g.localToWorld(v3);
        v3.project(camera);
        const w = stage.clientWidth;
        const h = stage.clientHeight;
        const x = (v3.x * 0.5 + 0.5) * w;
        const y = (-v3.y * 0.5 + 0.5) * h;
        // el tamaño sigue al de la vértebra proyectada (el cuerpo mide 2·r de ancho)
        edge.set(v.r * 2.4, 0, 0);
        v.g.localToWorld(edge);
        edge.project(camera);
        const size = clamp(Math.abs(edge.x - v3.x) * 0.5 * w, 26, 74);
        reticle.style.setProperty('--size', `${size}px`);
        reticle.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        tag.style.transform = `translate(${Math.min(x + size * 0.8, w - tag.offsetWidth - 8)}px, ${y - size * 0.9}px)`;
        const label = state.hover >= 0 || ret.phase === 'reveal' ? NAMES[target] : '¿Qué estructura es?';
        if (tagText.textContent !== label) tagText.textContent = label;
        tag.classList.toggle('revealed', state.hover >= 0 || ret.phase === 'reveal');
    }

    // ---------- bucle ----------
    const t0 = performance.now();
    let raf = 0;

    function frame(now) {
        raf = 0;
        const t = (now - t0) / 1000;
        const dt = state.last ? Math.min((now - state.last) / 1000, 0.05) : 0.016;
        state.last = now;

        // entrada: las vértebras se ensamblan en cascada
        const intro = reduced ? 99 : introStart ? (now - introStart) / 1000 : -1;
        vertebrae.forEach((v, i) => {
            const p = clamp((intro - 0.15 - i * 0.045) / 1.4);
            const e = easeOutBack(p);
            const s = v.seed;
            v.g.position.set(s[0] * 7 * (1 - e), v.home.y + (3 + s[1] * 4) * (1 - e), v.home.z + s[2] * 4 * (1 - e));
            v.g.rotation.set(v.home.rx + s[3] * 4 * (1 - e), s[0] * 6 * (1 - e), s[2] * 3 * (1 - e));
            v.lineMat.opacity = clamp(p * 1.6) * (0.4 + 0.1 * Math.sin(t * 1.3 + i));
        });
        const assembled = clamp((intro - 0.4) / 1.8);
        sacrum.scale.setScalar(easeOutCubic(assembled));

        // escáner: sube y baja; las vértebras cercanas se iluminan
        const scanY = reduced ? 0 : Math.sin(t * 0.55) * (SPAN / 2 + 0.2);
        scanner.position.y = scanY;
        scanLight.position.set(0, scanY, 2.5);
        vertebrae.forEach((v, i) => {
            const d = scanY - v.g.position.y;
            const boost = Math.exp(-(d * d) / 0.35);
            const hov = state.hover === i ? 0.45 : 0;
            v.lineMat.opacity = Math.min(1, v.lineMat.opacity + 0.5 * boost + hov);
        });

        // señales nerviosas
        for (const p of pulses) {
            if (!reduced) p.u = (p.u + p.speed * dt) % 1;
            p.head.position.copy(canalCurve.getPointAt(p.u));
            p.head.visible = assembled > 0.6;
        }

        // giro: automático + arrastre con inercia + paralaje
        if (!state.drag) {
            state.rotY += state.vel;
            state.vel *= 0.94;
            if (!reduced && Math.abs(state.vel) < 0.002) state.rotY += dt * 0.16;
        }
        root.rotation.y += (state.rotY - root.rotation.y) * 0.12;
        root.rotation.x += (state.py * -0.08 - root.rotation.x) * 0.06;
        dust.rotation.y = -t * 0.02;

        // cámara: entrada con travelling y «inmersión» al empezar el quiz
        const dolly = reduced ? 0 : 5 * (1 - easeOutCubic(clamp(intro / 2.4)));
        const dive = state.diving ? easeOutCubic(clamp((now - state.diving) / 650)) : 0;
        camera.position.set(state.px * 0.5, 0.3 + state.py * 0.3, baseZ + dolly - dive * (baseZ - 5.5));
        camera.lookAt(0, 0, 0);

        updateReticle(now);
        renderer.render(scene, camera);

        if (state.active && !document.hidden && !reduced) raf = requestAnimationFrame(frame);
    }

    function needsFrame() {
        if (!raf) raf = requestAnimationFrame(frame);
    }

    function setActive(active) {
        state.active = active;
        if (active) { state.last = 0; needsFrame(); }
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) setActive(state.active); });
    new IntersectionObserver(([entry]) => { if (state.active) setActive(entry.isIntersecting); }, { threshold: 0.01 }).observe(stage);

    ret.t0 = performance.now();
    reticle.classList.add('lock');
    needsFrame();

    return {
        setActive,
        /** Arranca la entrada (vértebras ensamblándose) y muestra la escena. */
        play() {
            if (introStart) return;
            introStart = performance.now();
            ret.t0 = introStart;
            stage.classList.add('live');
            setActive(true);
        },
        /** Vuelo hacia dentro de la columna; resuelve al terminar. */
        dive() {
            if (reduced) return Promise.resolve();
            state.diving = performance.now();
            stage.classList.add('diving');
            needsFrame();
            return new Promise((resolve) => setTimeout(resolve, 650));
        },
        reset() {
            state.diving = 0;
            stage.classList.remove('diving');
            ret.t0 = performance.now();
            needsFrame();
        },
    };
}
