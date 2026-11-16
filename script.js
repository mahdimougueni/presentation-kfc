/* حين يصبح الدجاج المقرمش وقودًا لصاروخ — cinematic presentation engine
   Vanilla JS + Three.js (procedural shuttle, flames and crispy-chicken smoke) */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad = n => String(n).padStart(2, '0');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  const root = document.documentElement;
  if (coarse) root.classList.add('lowfx');

  const slides = $$('.slide');
  const N = slides.length;
  const veil = $('#veil');
  let cur = -1;
  let scene3d = null;

  /* ───────────── Typography: word-by-word headline ───────────── */
  function splitWords(el) {
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            const o = document.createElement('span'); o.className = 'w';
            const i = document.createElement('span'); i.textContent = p;
            o.appendChild(i); frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    $$('.w > span', el).forEach((s, i) => s.style.setProperty('--wi', i));
  }
  $$('.split').forEach(splitWords);

  /* stagger reveal delays per slide */
  slides.forEach(s => $$('.rv', s).forEach((el, i) => el.style.setProperty('--d', (0.3 + i * 0.11).toFixed(2) + 's')));

  /* ───────────── Navigation ───────────── */
  const counterB = $('#counter b'), counterE = $('#counter em'), bar = $('#progress i');
  const prevBtn = $('#prev'), nextBtn = $('#next');
  counterE.textContent = pad(N);
  let photoTimer = 0;

  function go(i) {
    i = clamp(i, 0, N - 1);
    if (i === cur) return;
    const leavingFirst = cur === 0;
    cur = i;
    slides.forEach((s, k) => {
      s.dataset.state = k < cur ? 'before' : k > cur ? 'after' : 'active';
      s.setAttribute('aria-hidden', k !== cur ? 'true' : 'false');
      s.inert = k !== cur;
    });
    const wrap = $('.wrap', slides[cur]); if (wrap) wrap.scrollTop = 0;
    counterB.textContent = pad(cur + 1);
    bar.style.width = ((cur + 1) / N * 100) + '%';
    prevBtn.disabled = cur === 0; nextBtn.disabled = cur === N - 1;
    try { history.replaceState(null, '', '#' + (cur + 1)); } catch (e) { /* file:// quirks */ }

    clearTimeout(photoTimer);
    const s1 = slides[0];
    if (cur === 0) {
      s1.classList.remove('show-photo');
      veil.style.setProperty('--v', '0');
      if (scene3d) scene3d.restartIntro();
      const reveal = () => { s1.classList.add('show-photo'); veil.style.setProperty('--v', '.6'); };
      if (reduce || !scene3d) photoTimer = setTimeout(reveal, reduce ? 0 : 1200);
      else photoTimer = setTimeout(reveal, 5600);
    } else {
      veil.style.setProperty('--v', slides[cur].dataset.veil || '.65');
      if (leavingFirst) s1.classList.add('show-photo');
    }
    if (scene3d) scene3d.setSlide(cur);
    $$('.ov').forEach((o, k) => o.classList.toggle('cur', k === cur));
  }
  const next = () => go(cur + 1);
  const prev = () => go(cur - 1);
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  /* keyboard — RTL deck: ← advances, → goes back */
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const ov = !$('#overview').hidden;
    switch (e.key) {
      case 'ArrowLeft': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter':
        if (ov && e.key === 'Enter') return;
        e.preventDefault(); if (!ov) next(); break;
      case 'ArrowRight': case 'ArrowUp': case 'PageUp': case 'Backspace':
        e.preventDefault(); if (!ov) prev(); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(N - 1); break;
      case 'f': case 'F': toggleFS(); break;
      case 'o': case 'O': toggleOverview(); break;
      case 'Escape': if (ov) toggleOverview(false); break;
    }
  });

  /* touch swipe */
  let tx = 0, ty = 0, tt = 0;
  addEventListener('touchstart', e => { const t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; tt = Date.now(); }, { passive: true });
  addEventListener('touchend', e => {
    const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    if (Date.now() - tt < 700 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) dx < 0 ? next() : prev();
  }, { passive: true });

  /* fullscreen */
  const fsBtn = $('#fsBtn');
  function toggleFS() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  if (!document.fullscreenEnabled) fsBtn.hidden = true;
  fsBtn.addEventListener('click', toggleFS);

  /* overview */
  const ov = $('#overview'), ovGrid = $('#ovGrid');
  slides.forEach((s, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ov' + (k === 8 ? ' s9o' : '');
    const t = s.dataset.title;
    b.setAttribute('aria-label', 'الشريحة ' + (k + 1) + (t ? ': ' + t : ''));
    const n = document.createElement('span'); n.className = 'n'; n.textContent = pad(k + 1); b.appendChild(n);
    if (k === 0) { const im = document.createElement('img'); im.src = 'assets/ad.jpg'; im.alt = ''; b.appendChild(im); }
    else { const tt2 = document.createElement('span'); tt2.textContent = t; b.appendChild(tt2); }
    b.addEventListener('click', () => { toggleOverview(false); go(k); });
    ovGrid.appendChild(b);
  });
  function toggleOverview(force) {
    const show = typeof force === 'boolean' ? force : ov.hidden;
    ov.hidden = !show;
    if (show) { const c = $('.ov.cur', ov) || $('.ov', ov); c && c.focus(); }
  }
  $('#ovBtn').addEventListener('click', () => toggleOverview());
  ov.addEventListener('click', e => { if (e.target === ov || e.target === ovGrid) toggleOverview(false); });

  /* idle auto-hide of the controls */
  let idleT = 0;
  const wake = () => { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => document.body.classList.add('idle'), 4200); };
  ['pointermove', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, wake, { passive: true }));
  wake();

  /* pointer parallax (CSS 3D tilt + camera) */
  const mouse = { x: 0, y: 0 };
  if (!reduce && !coarse) {
    addEventListener('pointermove', e => {
      mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5;
      root.style.setProperty('--mx', mouse.x.toFixed(3));
      root.style.setProperty('--my', mouse.y.toFixed(3));
    }, { passive: true });
  }

  /* ───────────── Three.js scene ───────────── */
  function initScene() {
    const T = window.THREE;
    if (!T) return null;
    const canvas = $('#stage');
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: !coarse, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.6));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !coarse;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    const scene = new T.Scene();
    const cam = new T.PerspectiveCamera(42, 1, 0.5, 1200);

    /* lights */
    scene.add(new T.HemisphereLight(0x8fa8d8, 0x1d130b, 0.6));
    const key = new T.DirectionalLight(0xffd9a8, 1.15);
    key.position.set(-40, 70, 40); key.target.position.set(0, 18, 0);
    key.castShadow = !coarse;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -50, right: 50, top: 70, bottom: -20, near: 10, far: 220 });
    scene.add(key, key.target);
    const rim = new T.DirectionalLight(0x6f94ff, 0.55); rim.position.set(50, 30, -60); scene.add(rim);
    const flameLight = new T.PointLight(0xff8a30, 0, 120, 1.5); scene.add(flameLight);

    /* helpers */
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,200,120,.8)');
      r.addColorStop(.6, 'rgba(255,120,40,.25)'); r.addColorStop(1, 'rgba(255,80,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128);
      const t = new T.CanvasTexture(c); return t;
    })();

    /* ── Space shuttle stack (procedural) ── */
    const stack = new T.Group(); scene.add(stack);
    const mWhite = new T.MeshStandardMaterial({ color: 0xeeece6, roughness: .55, metalness: .05, side: T.DoubleSide });
    const mTank  = new T.MeshStandardMaterial({ color: 0xc4622b, roughness: .85 });
    const mDark  = new T.MeshStandardMaterial({ color: 0x15171b, roughness: .5, metalness: .35 });
    const part = (geo, mat, x, y, z) => {
      const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !coarse; stack.add(m); return m;
    };
    part(new T.CylinderGeometry(2.2, 2.2, 14, 32), mTank, 0, 8.5, 0);
    part(new T.CylinderGeometry(.25, 2.2, 3.6, 32), mTank, 0, 17.3, 0);
    [-1, 1].forEach(s => {
      part(new T.CylinderGeometry(.95, .95, 11.5, 24), mWhite, s * 3.5, 6.65, 0);
      part(new T.CylinderGeometry(.08, .95, 2.6, 24), mWhite, s * 3.5, 13.7, 0);
      part(new T.CylinderGeometry(.7, 1, .9, 20), mDark, s * 3.5, .45, 0);
    });
    part(new T.CylinderGeometry(1.05, 1.05, 8.5, 28), mWhite, 0, 8, 3.3);
    part(new T.CylinderGeometry(.12, 1.05, 2.4, 28), mDark, 0, 13.45, 3.3);
    const wingShape = new T.Shape();
    wingShape.moveTo(.9, 9.2); wingShape.lineTo(5.6, 4.1); wingShape.lineTo(5.6, 3.7); wingShape.lineTo(.9, 3.7); wingShape.closePath();
    const wingGeo = new T.ExtrudeGeometry(wingShape, { depth: .22, bevelEnabled: false });
    const wR = part(wingGeo, mWhite, 0, 0, 3.2);
    const wL = part(wingGeo, mWhite, 0, 0, 3.2); wL.scale.x = -1;
    const finShape = new T.Shape();
    finShape.moveTo(0, 6.8); finShape.lineTo(2.9, 4.7); finShape.lineTo(2.9, 3.9); finShape.lineTo(0, 3.9); finShape.closePath();
    const fin = part(new T.ExtrudeGeometry(finShape, { depth: .18, bevelEnabled: false }), mWhite, .09, 0, 3.9);
    fin.rotation.y = -Math.PI / 2;

    /* flames */
    const flames = [];
    const mkFlame = (x, y, z, r, len, col) => {
      const g = new T.Group(); g.position.set(x, y, z);
      const outer = new T.Mesh(new T.ConeGeometry(r, len, 18, 1, true),
        new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .75, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      outer.rotation.x = Math.PI; outer.position.y = -len / 2;
      const core = new T.Mesh(new T.ConeGeometry(r * .5, len * .72, 14, 1, true),
        new T.MeshBasicMaterial({ color: 0xfff1cf, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      core.rotation.x = Math.PI; core.position.y = -len * .36;
      g.add(outer, core); stack.add(g); flames.push({ g, len }); return g;
    };
    mkFlame(-3.5, .3, 0, .85, 12, 0xff8a2a);
    mkFlame(3.5, .3, 0, .85, 12, 0xff8a2a);
    mkFlame(-.55, 3.75, 3.1, .42, 7, 0xa8c8ff);
    mkFlame(.55, 3.75, 3.1, .42, 7, 0xa8c8ff);
    mkFlame(0, 3.75, 3.8, .42, 7, 0xa8c8ff);
    const flareSprite = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true }));
    flareSprite.position.set(0, 2, 1.5); stack.add(flareSprite);

    /* ground + pad + tower */
    const ground = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshStandardMaterial({ color: 0x0c130e, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const padM = new T.Mesh(new T.CylinderGeometry(11, 12, .6, 40), new T.MeshStandardMaterial({ color: 0x2b2d32, roughness: .9 }));
    padM.position.y = -.28; padM.receiveShadow = true; scene.add(padM);
    const towerM = new T.MeshStandardMaterial({ color: 0x6b2c18, roughness: .7, metalness: .2 });
    const tower = new T.Group(); tower.position.set(-11.5, 0, -1); scene.add(tower);
    const tb = (w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), towerM); m.position.set(x, y, z); m.castShadow = !coarse; tower.add(m); };
    tb(1.1, 38, 1.1, 0, 19, -1); tb(1.1, 38, 1.1, 0, 19, 1.4);
    for (let h = 4; h <= 36; h += 4) tb(1.1, .35, 3.2, 0, h, .2);
    [14, 24, 32].forEach(h => tb(7, .5, .5, 3.4, h, .2));
    const groundGlow = new T.Mesh(new T.CircleGeometry(34, 48),
      new T.MeshBasicMaterial({ map: glowTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity: 0 }));
    groundGlow.rotation.x = -Math.PI / 2; groundGlow.position.y = .08; scene.add(groundGlow);

    /* stars */
    const starN = coarse ? 350 : 900, sp = new Float32Array(starN * 3);
    for (let i = 0; i < starN; i++) {
      const r = 520, th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * .92 + .06);
      sp.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 1.1 + 20, r * Math.sin(ph) * Math.sin(th) - 150], i * 3);
    }
    const starGeo = new T.BufferGeometry(); starGeo.setAttribute('position', new T.BufferAttribute(sp, 3));
    const stars = new T.Points(starGeo, new T.PointsMaterial({ color: 0xcfe0ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: .6, depthWrite: false }));
    scene.add(stars);

    /* embers / sparks */
    const EN = coarse ? 70 : 150, ep = new Float32Array(EN * 3), ev = new Float32Array(EN * 3), el = new Float32Array(EN);
    const emberGeo = new T.BufferGeometry(); emberGeo.setAttribute('position', new T.BufferAttribute(ep, 3));
    const embers = new T.Points(emberGeo, new T.PointsMaterial({ map: glowTex, color: 0xffb454, size: 1.1, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false }));
    embers.frustumCulled = false; scene.add(embers);
    for (let i = 0; i < EN; i++) ep[i * 3 + 1] = -999;

    /* ── Crispy chicken pieces: the smoke trail ── */
    function chickenGeo() {
      const g = new T.IcosahedronGeometry(1, 2), p = g.attributes.position, col = new Float32Array(p.count * 3);
      const v = new T.Vector3(), c = new T.Color();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const n = Math.sin(v.x * 5.1 + 1.3) * Math.cos(v.y * 4.7) + Math.sin(v.z * 6.3 + v.x * 2.1) * .7 + Math.sin((v.x + v.y + v.z) * 11) * .35;
        v.multiplyScalar(1 + n * .13); v.y *= .84;
        p.setXYZ(i, v.x, v.y, v.z);
        const t = clamp((n + 1.6) / 3.2, 0, 1);
        c.setHSL(.07 + .025 * t, .8, .27 + .3 * t);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new T.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    }
    const PN = coarse ? 110 : 210;
    const chicken = new T.InstancedMesh(chickenGeo(),
      new T.MeshStandardMaterial({ vertexColors: true, roughness: .8, metalness: 0, flatShading: true, emissive: 0x4a1a05, emissiveIntensity: .9 }), PN);
    chicken.frustumCulled = false; chicken.castShadow = false; scene.add(chicken);
    const dummy = new T.Object3D(), tint = new T.Color();
    const P = Array.from({ length: PN }, () => ({ age: 9, life: 1, p: new T.Vector3(), v: new T.Vector3(), r: new T.Vector3(), s: new T.Vector3(), size: 1 }));
    for (let i = 0; i < PN; i++) { tint.setHSL(.99 + Math.random() * .03, .9, .85 + Math.random() * .3); chicken.setColorAt(i, tint); }
    chicken.instanceColor.needsUpdate = true;
    let pi = 0;
    function spawn(x, y, z, burst, alt) {
      const q = P[pi]; pi = (pi + 1) % PN;
      q.age = 0; q.life = burst ? 7 + Math.random() * 4 : 6 + Math.random() * 4;
      q.p.set(x + (Math.random() - .5) * 3, y + (Math.random() - .5) * 2, z + (Math.random() - .5) * 3);
      const a = Math.random() * Math.PI * 2, low = clamp(1 - alt / 40, 0, 1);
      const sp = burst ? 9 + Math.random() * 13 : (3 + Math.random() * 5) * (.35 + low);
      q.v.set(Math.cos(a) * sp, burst ? Math.random() * 7 : (Math.random() * 3 - 1) * (.4 + low), Math.sin(a) * sp * .9);
      q.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      q.s.set((Math.random() - .5) * 1.4, (Math.random() - .5) * 1.4, (Math.random() - .5) * 1.4);
      q.size = burst ? 2.6 + Math.random() * 3.2 : 1.5 + Math.random() * 2.3;
    }

    /* ── Simulation state ── */
    const HOLD0 = 2.6, HOLD = 1.1, ACC = 1.9, YMAX = 150;
    const RISE = Math.sqrt(YMAX / ACC);
    let ct = 0, hold = HOLD0, introT = 0, introOn = true, burstDone = false, emitAcc = 0, y = 0, fl = 0, slide = 0, t0 = 0;
    const camPos = new T.Vector3(10, 3, 40), camLook = new T.Vector3(0, 8, 0);
    const tmpP = new T.Vector3(), tmpL = new T.Vector3();

    const POSES = [
      { o: [14, -3, 46], l: [0, 10, 0] },                 // 1 opening (after intro)
      { o: [34, 6, 66],  l: [0, 6, 0] },                  // 2
      { o: [-30, -2, 60], l: [0, 8, 0] },                 // 3
      { o: [26, 10, 72], l: [0, 4, 0] },                  // 4
      { o: [-40, 14, 78], l: [0, 2, 0] },                 // 5
      { o: [44, -6, 82], l: [0, 10, 0] },                 // 6
      { o: [-22, 18, 64], l: [0, 6, 0] },                 // 7
      { o: [30, 2, 58],  l: [0, 4, 0] },                  // 8
      { o: [0, 6, 34],   l: [0, 4, 0], f: .04, base: 14 },// 9 myth — close on the cloud
      { o: [38, 8, 76],  l: [0, 10, 0] },                 // 10
      { o: [-34, 6, 90], l: [0, 22, 0], f: .55 }          // 11 — shuttle into the stars
    ];

    function updateSim(dt) {
      ct += dt; introT += dt;
      const tr = ct - hold;
      y = tr > 0 ? ACC * tr * tr : 0;
      const ign = ct > hold - 1.5;
      const alive = y < YMAX;
      if (ign && !burstDone) { burstDone = true; for (let i = 0; i < Math.floor(PN * .38); i++) spawn(0, 1.5, 0, true, 0); }
      if (ign && alive) {
        emitAcc += dt * (y < 3 ? 34 : 22);
        while (emitAcc >= 1) { emitAcc -= 1; spawn(0, y + .5, 0, false, y); }
      }
      if (ct > hold + RISE + 2.4) { ct = 0; hold = HOLD; burstDone = false; introOn = false; }
      const target = ign && alive ? clamp((ct - (hold - 1.5)) / .9, 0, 1) : 0;
      fl += (target - fl) * clamp(dt * 6, 0, 1);

      stack.position.y = y; stack.visible = y < YMAX + 10;
      flames.forEach((f, i) => {
        const flick = .85 + Math.random() * .3, boost = 1 + clamp(y / 50, 0, 1) * .6;
        f.g.scale.set(1 + Math.random() * .08, fl * flick * boost + .001, 1 + Math.random() * .08);
        f.g.visible = fl > .01;
      });
      flareSprite.scale.setScalar(fl * (20 + Math.random() * 4) + .001);
      flameLight.position.set(0, y + 3, 6);
      flameLight.intensity = fl * (3.2 + Math.random() * .6) * 40;
      groundGlow.material.opacity = fl * clamp(1 - y / 60, 0, 1) * .85;

      /* embers */
      for (let i = 0; i < EN; i++) {
        if (el[i] <= 0) {
          if (fl > .3 && Math.random() < dt * 5) {
            el[i] = 1 + Math.random() * 1.5;
            ep.set([(Math.random() - .5) * 6, y + Math.random() * 2, (Math.random() - .5) * 6], i * 3);
            ev.set([(Math.random() - .5) * 14, -Math.random() * 8 - 2, (Math.random() - .5) * 14], i * 3);
          } else ep[i * 3 + 1] = -999;
        } else {
          el[i] -= dt;
          ep[i * 3] += ev[i * 3] * dt; ep[i * 3 + 1] += ev[i * 3 + 1] * dt; ep[i * 3 + 2] += ev[i * 3 + 2] * dt;
          ev[i * 3 + 1] -= 6 * dt;
          if (ep[i * 3 + 1] < 0) { ep[i * 3 + 1] = 0; ev[i * 3 + 1] *= -.3; }
        }
      }
      emberGeo.attributes.position.needsUpdate = true;

      /* chicken smoke */
      for (let i = 0; i < PN; i++) {
        const q = P[i];
        if (q.age >= q.life) { dummy.scale.setScalar(0); dummy.position.set(0, -999, 0); dummy.updateMatrix(); chicken.setMatrixAt(i, dummy.matrix); continue; }
        q.age += dt;
        const k = q.age / q.life, drag = Math.exp(-.55 * dt);
        q.v.multiplyScalar(drag); q.v.y += .5 * dt;
        q.p.addScaledVector(q.v, dt);
        if (q.p.y < q.size * .5) { q.p.y = q.size * .5; q.v.y = Math.abs(q.v.y) * .2; }
        q.r.addScaledVector(q.s, dt);
        const grow = 1 - Math.pow(1 - clamp(k * 3.2, 0, 1), 3);
        const fade = 1 - clamp((k - .72) / .28, 0, 1);
        const sc = q.size * (.3 + grow * .9) * fade + .001;
        dummy.position.copy(q.p); dummy.rotation.set(q.r.x, q.r.y, q.r.z); dummy.scale.set(sc, sc, sc); dummy.updateMatrix();
        chicken.setMatrixAt(i, dummy.matrix);
      }
      chicken.instanceMatrix.needsUpdate = true;
      stars.material.opacity = clamp(.35 + y / 260, .35, .95);
    }

    function pose() {
      const portrait = innerWidth / innerHeight < 1 ? 1.45 : 1;
      if (slide === 0 && introOn) {
        const t = introT;
        tmpP.set(10 - t * .35, 2.4 + y * .5, 40 - t * .6).multiplyScalar(1);
        tmpP.z *= portrait; tmpP.x *= portrait;
        tmpL.set(0, 7 + y * .78 + Math.min(t, 3) * .8, 0);
        return 3.2;
      }
      const P0 = POSES[slide], f = P0.f ?? .42, base = P0.base ?? 12;
      const fy = base + y * f;
      tmpP.set(P0.o[0] * portrait, fy + P0.o[1], P0.o[2] * portrait);
      tmpL.set(P0.l[0], fy + P0.l[1], P0.l[2]);
      return 1.7;
    }

    function updateCam(dt, snap) {
      const speed = pose();
      if (!reduce && !coarse) { tmpP.x += mouse.x * 5; tmpP.y -= mouse.y * 3; }
      const k = snap ? 1 : 1 - Math.exp(-dt * speed);
      camPos.lerp(tmpP, k); camLook.lerp(tmpL, k);
      cam.position.copy(camPos);
      if (!reduce && fl > .05 && y < 12) {
        const s = fl * (1 - y / 12) * .22;
        cam.position.x += (Math.random() - .5) * s; cam.position.y += (Math.random() - .5) * s;
      }
      cam.lookAt(camLook);
      cam.fov = innerWidth / innerHeight < 1 ? 58 : 42; cam.updateProjectionMatrix();
    }

    function resize() {
      renderer.setSize(innerWidth, innerHeight, false);
      cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
      if (reduce) { updateCam(0, true); renderer.render(scene, cam); }
    }
    addEventListener('resize', resize); resize();

    /* loop */
    let last = performance.now(), raf = 0, running = false;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      updateSim(dt); updateCam(dt, false);
      renderer.render(scene, cam);
    }
    function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    function resetSim(intro) {
      ct = 0; introT = 0; hold = intro ? HOLD0 : HOLD; introOn = intro; burstDone = false; emitAcc = 0; y = 0; fl = 0;
      P.forEach(q => { q.age = q.life = 1; });
      el.fill(0);
    }
    function staticFrame() {
      resetSim(false); hold = 1.0;
      for (let i = 0; i < 360; i++) updateSim(1 / 60);
      updateCam(0, true); renderer.render(scene, cam);
    }

    const api = {
      setSlide(i) { slide = i; if (reduce) { staticFrame(); } },
      restartIntro() { resetSim(true); if (reduce) staticFrame(); },
      start, stop
    };
    resetSim(true);
    if (reduce) staticFrame(); else start();
    return api;
  }

  try { scene3d = initScene(); } catch (err) { console.warn('3D scene disabled:', err); scene3d = null; }
  if (!scene3d) document.body.classList.add('no3d');

  /* boot */
  const hash = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(hash) ? clamp(hash - 1, 0, N - 1) : 0);
  if (cur === 0 && !scene3d) slides[0].classList.add('show-photo');
})();
