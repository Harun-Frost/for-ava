(() => {
  'use strict';

  const PASSCODE = '2123';
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reducedMotionQuery.matches;
  let unlocked = false;
  let lenisInstance = null;
  let particleFrameId = null;

  // DOM References
  const gate = document.getElementById('passcode-gate');
  const gateCard = gate.querySelector('.gate-card');
  const gateForm = document.getElementById('gate-form');
  const passcodeInput = document.getElementById('passcode-input');
  const togglePasscodeBtn = document.getElementById('toggle-passcode');
  const passcodeError = document.getElementById('passcode-error');
  const passcodeErrorText = document.getElementById('passcode-error-text');
  const showcaseRoot = document.getElementById('showcase-root');
  const mainContent = document.getElementById('main-content');
  const liveAnnouncer = document.getElementById('live-announcer');

  const bouquetSvg = document.getElementById('bouquet-svg');
  const stemsGroup = document.getElementById('bouquet-stems');
  const foliageGroup = document.getElementById('bouquet-foliage');
  const babysBreathGroup = document.getElementById('bouquet-babysbreath');
  const flowersGroup = document.getElementById('bouquet-flowers');
  const ribbonGroup = document.getElementById('bouquet-ribbon');
  const whisperEl = document.getElementById('flower-whisper');

  const rebloomBtn = document.getElementById('rebloom-btn');
  const outroRebloomBtn = document.getElementById('outro-rebloom-btn');
  const motionToggleBtn = document.getElementById('motion-toggle-btn');
  const pollenCanvas = document.getElementById('pollen-canvas');

  document.body.classList.add('is-locked');

  // ---------------- ACCESSIBILITY ANNOUNCER & VALIDATION ----------------
  let announceTimer = null;

  function announce(message, delay = 250) {
    clearTimeout(announceTimer);
    liveAnnouncer.textContent = '';
    announceTimer = setTimeout(() => {
      liveAnnouncer.textContent = message;
    }, delay);
  }

  function linkError(el, shown) {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const ids = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  }

  function showPasscodeError(message, shouldAnnounce = true) {
    passcodeErrorText.textContent = message;
    passcodeError.classList.add('is-visible');
    passcodeInput.classList.add('user-invalid-fallback');
    passcodeInput.classList.remove('user-valid-fallback');
    passcodeInput.setAttribute('aria-invalid', 'true');
    linkError(passcodeInput, true);
    if (shouldAnnounce) announce(message, 450);
  }

  function clearPasscodeError() {
    passcodeInput.setCustomValidity('');
    passcodeError.classList.remove('is-visible');
    passcodeInput.classList.remove('user-invalid-fallback');
    passcodeInput.setAttribute('aria-invalid', 'false');
    linkError(passcodeInput, false);
  }

  // Fallback tracking for browsers without :user-invalid
  const dirtyState = new WeakMap();
  if (!CSS.supports('selector(:user-invalid)')) {
    dirtyState.set(passcodeInput, { interacted: false, blurred: false });
  }

  passcodeInput.addEventListener('input', () => {
    clearPasscodeError();
    const state = dirtyState.get(passcodeInput);
    if (state) state.interacted = true;
  });

  passcodeInput.addEventListener('blur', () => {
    const val = passcodeInput.value.trim();
    if (!val) return;
    if (!/^\d{4}$/.test(val)) {
      showPasscodeError('Please enter all 4 digits.', true);
    }
  });

  // Show / Hide passcode button
  togglePasscodeBtn.addEventListener('click', () => {
    const isHidden = passcodeInput.type === 'password';
    passcodeInput.type = isHidden ? 'text' : 'password';
    togglePasscodeBtn.setAttribute('aria-pressed', String(isHidden));
    togglePasscodeBtn.setAttribute('aria-label', isHidden ? 'Hide passcode' : 'Show passcode');
    const eye = togglePasscodeBtn.querySelector('.icon-eye');
    const eyeOff = togglePasscodeBtn.querySelector('.icon-eye-off');
    if (eye && eyeOff) {
      eye.hidden = isHidden;
      eyeOff.hidden = !isHidden;
    }
  });

  gateForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = passcodeInput.value.trim();

    if (!/^\d{4}$/.test(value)) {
      passcodeInput.setCustomValidity('Please enter the 4-digit passcode.');
      showPasscodeError('Please enter the 4-digit passcode.', false);
      passcodeInput.focus();
      return;
    }

    if (value !== PASSCODE) {
      passcodeInput.setCustomValidity('Incorrect passcode.');
      showPasscodeError('Not quite right — try again.', true);
      if (!motionPaused) {
        gateCard.classList.remove('is-shaking');
        void gateCard.offsetWidth;
        gateCard.classList.add('is-shaking');
      }
      passcodeInput.focus();
      passcodeInput.select();
      return;
    }

    unlockExperience();
  });

  function unlockExperience() {
    if (unlocked) return;
    unlocked = true;
    clearPasscodeError();

    document.title = 'I Love You, Ava';
    showcaseRoot.removeAttribute('inert');
    document.body.classList.remove('is-locked');
    gate.classList.add('is-unlocked');
    gate.setAttribute('inert', '');
    gate.setAttribute('aria-hidden', 'true');

    buildBouquet();
    animateBouquetBloom();
    initMotionEngine();
    initParticles();
    initInteractiveSections();

    setTimeout(() => {
      mainContent.focus({ preventScroll: true });
      announce('Unlocked. A bouquet is blooming for Ava: I love you, Ava.', 200);
    }, 300);
  }

  // ---------------- BOTANICAL BOUQUET GENERATOR ----------------
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  const STEMS = [
    { d: 'M300 605 Q298 525 300 148', delay: 0.05 }, // Crown tulip
    { d: 'M300 605 Q296 520 300 242', delay: 0.0 },  // Center peony
    { d: 'M300 605 Q275 470 212 204', delay: 0.1 },  // Upper left rose
    { d: 'M300 605 Q325 470 388 208', delay: 0.12 }, // Upper right rose
    { d: 'M300 605 Q255 475 166 294', delay: 0.16 }, // Mid left ranunculus
    { d: 'M300 605 Q345 475 434 292', delay: 0.18 }, // Mid right ranunculus
    { d: 'M300 605 Q282 510 256 346', delay: 0.22 }, // Lower left rose
    { d: 'M300 605 Q318 510 344 342', delay: 0.24 }, // Lower right rose
    { d: 'M300 605 Q232 490 140 232', delay: 0.14 }, // Left eucalyptus branch
    { d: 'M300 605 Q368 490 460 232', delay: 0.15 }  // Right eucalyptus branch
  ];

  const LEAVES = [
    // Left eucalyptus sprig leaves
    { x: 184, y: 342, rot: -46, scale: 1.0, fill: '#4b6b56', delay: 0.55 },
    { x: 162, y: 298, rot: 22, scale: 0.9, fill: '#61826c', delay: 0.65 },
    { x: 152, y: 262, rot: -40, scale: 0.85, fill: '#4e6f59', delay: 0.75 },
    { x: 142, y: 226, rot: 14, scale: 0.72, fill: '#6c8e77', delay: 0.85 },
    // Right eucalyptus sprig leaves
    { x: 416, y: 342, rot: 46, scale: 1.0, fill: '#4b6b56', delay: 0.58 },
    { x: 438, y: 298, rot: -22, scale: 0.9, fill: '#61826c', delay: 0.68 },
    { x: 448, y: 262, rot: 40, scale: 0.85, fill: '#4e6f59', delay: 0.78 },
    { x: 458, y: 226, rot: -14, scale: 0.72, fill: '#6c8e77', delay: 0.88 },
    // Inner lush rose leaves framing the collar
    { x: 242, y: 405, rot: -55, scale: 1.25, fill: '#3f5a48', delay: 0.45 },
    { x: 358, y: 405, rot: 55, scale: 1.25, fill: '#3f5a48', delay: 0.48 },
    { x: 214, y: 365, rot: -65, scale: 1.1, fill: '#52735d', delay: 0.6 },
    { x: 386, y: 365, rot: 65, scale: 1.1, fill: '#52735d', delay: 0.62 },
    { x: 280, y: 392, rot: -28, scale: 1.0, fill: '#4c6b56', delay: 0.52 },
    { x: 320, y: 392, rot: 28, scale: 1.0, fill: '#4c6b56', delay: 0.54 }
  ];

  const FLOWERS = [
    { type: 'tulip', x: 300, y: 144, scale: 0.96, grad: 'url(#petal-champagne)', delay: 1.25, label: 'Ivory crown tulip', whisper: 'You are my favorite thought.' },
    { type: 'rose', x: 212, y: 204, scale: 0.95, grad: 'url(#petal-rose)', delay: 1.35, label: 'Blush garden rose', whisper: 'Every petal, for you.' },
    { type: 'rose', x: 388, y: 208, scale: 0.92, grad: 'url(#petal-champagne)', delay: 1.45, label: 'Champagne rose', whisper: 'Quietly, deeply, endlessly.' },
    { type: 'ranunculus', x: 166, y: 294, scale: 0.88, grad: 'url(#petal-peony)', delay: 1.55, label: 'Pearl ranunculus', whisper: '2123 — just ours.' },
    { type: 'ranunculus', x: 434, y: 292, scale: 0.88, grad: 'url(#petal-rose)', delay: 1.62, label: 'Blush ranunculus', whisper: 'You make dark rooms glow.' },
    { type: 'peony', x: 300, y: 244, scale: 1.15, grad: 'url(#petal-peony)', delay: 1.15, label: 'Center ivory peony', whisper: 'I love you, Ava.' },
    { type: 'rose', x: 256, y: 346, scale: 0.84, grad: 'url(#petal-champagne)', delay: 1.72, label: 'Soft champagne bloom', whisper: 'Always on my mind.' },
    { type: 'rose', x: 344, y: 342, scale: 0.84, grad: 'url(#petal-rose)', delay: 1.8, label: 'Dusty rose bloom', whisper: 'Forever yours.' }
  ];

  const BABYS_BREATH = [
    [136, 200], [154, 174], [176, 152], [248, 154], [268, 176],
    [334, 174], [358, 150], [426, 156], [446, 180], [464, 204],
    [130, 260], [470, 258], [204, 386], [396, 386]
  ];

  function createPetalPath(rx, ry) {
    return `M 0 0 C ${-rx} ${-ry * 0.35}, ${-rx * 0.9} ${-ry}, 0 ${-ry} C ${rx * 0.9} ${-ry}, ${rx} ${-ry * 0.35}, 0 0 Z`;
  }

  function createFlowerGroup(spec) {
    const g = svgEl('g', {
      class: 'bouquet-flower',
      transform: `translate(${spec.x}, ${spec.y}) scale(${spec.scale})`,
      tabindex: '0',
      role: 'button',
      'aria-label': `${spec.label} — activate to read note`,
      'data-whisper': spec.whisper,
      'data-delay': spec.delay
    });

    const rings = [];

    if (spec.type === 'peony') {
      rings.push({ count: 8, rx: 25, ry: 44, offset: 0, opacity: 0.88, fill: spec.grad });
      rings.push({ count: 7, rx: 20, ry: 34, offset: 18, opacity: 0.94, fill: 'url(#petal-rose)' });
      rings.push({ count: 6, rx: 14, ry: 23, offset: 32, opacity: 0.98, fill: 'url(#petal-peony)' });
    } else if (spec.type === 'rose') {
      rings.push({ count: 6, rx: 21, ry: 36, offset: 10, opacity: 0.9, fill: spec.grad });
      rings.push({ count: 5, rx: 16, ry: 26, offset: 36, opacity: 0.95, fill: spec.grad });
      rings.push({ count: 4, rx: 10, ry: 17, offset: 60, opacity: 1, fill: 'url(#petal-peony)' });
    } else if (spec.type === 'ranunculus') {
      rings.push({ count: 9, rx: 16, ry: 30, offset: 0, opacity: 0.88, fill: spec.grad });
      rings.push({ count: 7, rx: 13, ry: 22, offset: 20, opacity: 0.95, fill: 'url(#petal-champagne)' });
      rings.push({ count: 5, rx: 8, ry: 14, offset: 40, opacity: 1, fill: spec.grad });
    } else {
      // Sculptural tulip / crown bud
      const leftCup = svgEl('path', {
        d: 'M0 8 C-26 -4, -26 -38, -4 -48 C0 -32, 4 -12, 0 8 Z',
        fill: spec.grad,
        stroke: 'rgba(255,255,255,0.2)',
        'stroke-width': '0.7',
        class: 'bloom-layer'
      });
      const rightCup = svgEl('path', {
        d: 'M0 8 C26 -4, 26 -38, 4 -48 C0 -32, -4 -12, 0 8 Z',
        fill: spec.grad,
        stroke: 'rgba(255,255,255,0.2)',
        'stroke-width': '0.7',
        class: 'bloom-layer'
      });
      const centerCup = svgEl('path', {
        d: 'M0 10 C-18 -8, -14 -44, 0 -54 C14 -44, 18 -8, 0 10 Z',
        fill: 'url(#petal-peony)',
        stroke: 'rgba(255,255,255,0.25)',
        'stroke-width': '0.7',
        class: 'bloom-layer'
      });
      g.append(leftCup, rightCup, centerCup);
    }

    rings.forEach((ring) => {
      const ringGroup = svgEl('g', { class: 'bloom-layer' });
      for (let i = 0; i < ring.count; i++) {
        const angle = (360 / ring.count) * i + ring.offset;
        const petal = svgEl('path', {
          d: createPetalPath(ring.rx, ring.ry),
          fill: ring.fill,
          opacity: ring.opacity,
          stroke: 'rgba(255, 255, 255, 0.18)',
          'stroke-width': '0.6',
          transform: `rotate(${angle})`
        });
        ringGroup.appendChild(petal);
      }
      g.appendChild(ringGroup);
    });

    if (spec.type !== 'tulip') {
      const heart = svgEl('circle', {
        cx: 0,
        cy: 0,
        r: spec.type === 'peony' ? 6.5 : 4.5,
        fill: '#f1d4a4',
        opacity: 0.92,
        class: 'bloom-layer'
      });
      g.appendChild(heart);
    }

    const triggerWhisper = () => {
      whisperEl.textContent = spec.whisper;
      announce(spec.whisper, 50);
    };

    g.addEventListener('click', triggerWhisper);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerWhisper();
      } else if (e.key === ' ') {
        e.preventDefault();
      }
    });
    g.addEventListener('keyup', (e) => {
      if (e.key === ' ') triggerWhisper();
    });

    return g;
  }

  function buildBouquet() {
    stemsGroup.innerHTML = '';
    foliageGroup.innerHTML = '';
    babysBreathGroup.innerHTML = '';
    flowersGroup.innerHTML = '';
    ribbonGroup.innerHTML = '';

    // 1. Stems
    STEMS.forEach((stem) => {
      const path = svgEl('path', {
        d: stem.d,
        fill: 'none',
        stroke: 'url(#stem-grad)',
        'stroke-width': '3.2',
        'stroke-linecap': 'round',
        'data-delay': stem.delay,
        class: 'bouquet-stem'
      });
      stemsGroup.appendChild(path);
    });

    // 2. Foliage leaves
    LEAVES.forEach((leaf) => {
      const lg = svgEl('g', {
        transform: `translate(${leaf.x}, ${leaf.y}) rotate(${leaf.rot}) scale(${leaf.scale})`
      });
      const inner = svgEl('g', {
        class: 'bouquet-leaf',
        'data-delay': leaf.delay
      });
      const blade = svgEl('path', {
        d: 'M0 0 C-12 -14, -10 -34, 0 -42 C10 -34, 12 -14, 0 0 Z',
        fill: leaf.fill,
        opacity: '0.88',
        stroke: 'rgba(255,255,255,0.1)',
        'stroke-width': '0.5'
      });
      const vein = svgEl('path', {
        d: 'M0 -2 L0 -35',
        stroke: 'rgba(255,255,255,0.16)',
        'stroke-width': '0.6',
        fill: 'none'
      });
      inner.append(blade, vein);
      lg.appendChild(inner);
      foliageGroup.appendChild(lg);
    });

    // 3. Baby's breath delicate starlets
    BABYS_BREATH.forEach(([x, y], idx) => {
      const outer = svgEl('g', {
        transform: `translate(${x}, ${y})`
      });
      const bg = svgEl('g', {
        class: 'bouquet-starlet',
        'data-delay': (2.1 + idx * 0.045).toFixed(2)
      });
      for (let i = 0; i < 5; i++) {
        bg.appendChild(svgEl('ellipse', {
          cx: 0,
          cy: -4.2,
          rx: 2.1,
          ry: 3.4,
          fill: '#fff9fb',
          opacity: '0.85',
          transform: `rotate(${i * 72})`
        }));
      }
      bg.appendChild(svgEl('circle', { cx: 0, cy: 0, r: 1.8, fill: '#f3d6a4' }));
      outer.appendChild(bg);
      babysBreathGroup.appendChild(outer);
    });

    // 4. Focal flowers
    FLOWERS.forEach((spec) => {
      flowersGroup.appendChild(createFlowerGroup(spec));
    });

    // 5. Champagne silk ribbon knot & flowing tails at (300, 488)
    const ribbon = svgEl('g', { class: 'bouquet-ribbon-wrap' });
    ribbon.append(
      // Left & right ribbon tails
      svgEl('path', {
        d: 'M296 492 C276 534, 260 568, 250 612 C260 606, 268 602, 274 608 C280 572, 288 532, 298 494 Z',
        fill: 'url(#ribbon-grad)',
        opacity: '0.92'
      }),
      svgEl('path', {
        d: 'M304 492 C324 534, 340 568, 350 612 C340 606, 332 602, 326 608 C320 572, 312 532, 302 494 Z',
        fill: 'url(#ribbon-grad)',
        opacity: '0.88'
      }),
      // Bow loops
      svgEl('path', {
        d: 'M295 488 C258 468, 242 492, 264 504 C276 510, 288 498, 295 490 Z',
        fill: 'url(#ribbon-grad)'
      }),
      svgEl('path', {
        d: 'M305 488 C342 468, 358 492, 336 504 C324 510, 312 498, 305 490 Z',
        fill: 'url(#ribbon-grad)'
      }),
      // Wrap collar + center knot
      svgEl('rect', {
        x: '286',
        y: '482',
        width: '28',
        height: '13',
        rx: '6',
        fill: '#e8d2b8'
      })
    );
    ribbonGroup.appendChild(ribbon);
  }

  function animateBouquetBloom() {
    const stems = bouquetSvg.querySelectorAll('.bouquet-stem');
    const leaves = bouquetSvg.querySelectorAll('.bouquet-leaf');
    const starlets = bouquetSvg.querySelectorAll('.bouquet-starlet');
    const flowers = bouquetSvg.querySelectorAll('.bouquet-flower');
    const ribbonWrap = bouquetSvg.querySelector('.bouquet-ribbon-wrap');

    bouquetSvg.classList.remove('is-swaying');
    whisperEl.textContent = 'Every stem, picked for you.';

    if (motionPaused || typeof gsap === 'undefined') {
      // Static final state — always visible
      stems.forEach((s) => {
        s.style.strokeDasharray = 'none';
        s.style.strokeDashoffset = '0';
        s.style.opacity = '1';
      });
      [...leaves, ...starlets, ...flowers].forEach((el) => {
        el.style.opacity = '1';
      });
      if (ribbonWrap) ribbonWrap.style.opacity = '1';
      return;
    }

    // Prepare stem lengths for draw-in
    stems.forEach((stem) => {
      const len = stem.getTotalLength();
      stem.style.strokeDasharray = `${len}`;
      stem.style.strokeDashoffset = `${len}`;
      gsap.to(stem, {
        strokeDashoffset: 0,
        duration: 1.05,
        delay: parseFloat(stem.dataset.delay || '0'),
        ease: 'power2.out'
      });
    });

    leaves.forEach((leaf) => {
      gsap.fromTo(
        leaf,
        { opacity: 0, scale: 0.15, svgOrigin: '0 0' },
        {
          opacity: 1,
          scale: 1,
          duration: 0.75,
          delay: parseFloat(leaf.dataset.delay || '0.5'),
          ease: 'back.out(1.4)'
        }
      );
    });

    flowers.forEach((flower) => {
      const baseDelay = parseFloat(flower.dataset.delay || '1.1');
      const layers = flower.querySelectorAll('.bloom-layer');
      gsap.set(flower, { opacity: 1 });
      gsap.fromTo(
        layers,
        { opacity: 0, scale: 0.15, svgOrigin: '0 0' },
        {
          opacity: 1,
          scale: 1,
          duration: 0.9,
          delay: baseDelay,
          stagger: 0.12,
          ease: 'power3.out'
        }
      );
    });

    starlets.forEach((star) => {
      gsap.fromTo(
        star,
        { opacity: 0, scale: 0.1, svgOrigin: '0 0' },
        {
          opacity: 1,
          scale: 1,
          duration: 0.55,
          delay: parseFloat(star.dataset.delay || '2.1'),
          ease: 'back.out(1.8)'
        }
      );
    });

    if (ribbonWrap) {
      gsap.fromTo(
        ribbonWrap,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          delay: 2.35,
          ease: 'power2.out',
          onComplete: () => {
            if (!motionPaused) bouquetSvg.classList.add('is-swaying');
          }
        }
      );
    }
  }

  // ---------------- SOFT LUMINOUS POLLEN / DEW PARTICLES ----------------
  function initParticles() {
    if (!pollenCanvas) return;
    const ctx = pollenCanvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      pollenCanvas.width = pollenCanvas.clientWidth * dpr;
      pollenCanvas.height = pollenCanvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const motes = Array.from({ length: 24 }, () => ({
      x: Math.random() * pollenCanvas.clientWidth,
      y: Math.random() * pollenCanvas.clientHeight,
      r: 0.8 + Math.random() * 1.6,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -0.15 - Math.random() * 0.25,
      a: 0.15 + Math.random() * 0.35
    }));

    const renderFrame = () => {
      const w = pollenCanvas.clientWidth;
      const h = pollenCanvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      for (const m of motes) {
        if (!motionPaused) {
          m.x += m.vx;
          m.y += m.vy;
          if (m.y < -10) m.y = h + 10;
          if (m.x < -10) m.x = w + 10;
          if (m.x > w + 10) m.x = -10;
        }
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(243, 196, 206, ${m.a})`;
        ctx.fill();
      }

      if (!motionPaused) {
        particleFrameId = requestAnimationFrame(renderFrame);
      }
    };

    cancelAnimationFrame(particleFrameId);
    renderFrame();
  }

  // Pause / Play motion toggle (label switches without aria-pressed, per WCAG 2.2.2 guidance)
  function syncMotionButton() {
    motionToggleBtn.textContent = motionPaused ? 'Play motion' : 'Pause motion';
  }
  syncMotionButton();

  motionToggleBtn.addEventListener('click', () => {
    motionPaused = !motionPaused;
    syncMotionButton();
    if (motionPaused) {
      bouquetSvg.classList.remove('is-swaying');
      cancelAnimationFrame(particleFrameId);
    } else {
      bouquetSvg.classList.add('is-swaying');
      initParticles();
    }
  });

  // ---------------- LENIS + GSAP SCROLLTRIGGER ----------------
  function initMotionEngine() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    if (!motionPaused && typeof Lenis !== 'undefined' && !lenisInstance) {
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false
      });

      lenisInstance.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    initScrollytelling();
    ScrollTrigger.refresh();
  }

  function initScrollytelling() {
    const container = document.querySelector('#scrolly-container');
    const chapters = gsap.utils.toArray('.scrolly-chapter');
    const visuals = gsap.utils.toArray('.scrolly-visual');
    if (!container || chapters.length < 2) return;

    if (motionPaused) {
      // In reduced-motion mode, keep chapters cleanly stacked/visible instead of scroll-pinning
      chapters.forEach((c) => {
        c.style.position = 'relative';
        c.style.opacity = '1';
        c.style.marginBlock = '2rem';
      });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        pin: true,
        start: 'top top',
        end: () => `+=${chapters.length * 90}%`,
        scrub: 1,
        anticipatePin: 1
      }
    });

    chapters.forEach((chapter, i) => {
      if (i > 0) {
        tl.to(chapters[i - 1], { opacity: 0, y: -32, duration: 0.5 }, `step-${i}`)
          .to(visuals[i - 1], { opacity: 0, scale: 0.94, duration: 0.5 }, `step-${i}`)
          .fromTo(
            chapter,
            { opacity: 0, y: 32 },
            { opacity: 1, y: 0, duration: 0.5 },
            `step-${i}+=0.2`
          )
          .fromTo(
            visuals[i],
            { opacity: 0, scale: 1.06 },
            { opacity: 1, scale: 1, duration: 0.5 },
            `step-${i}+=0.2`
          );
      }
    });
  }

  // ---------------- INTERACTIVE SECTIONS ----------------
  const TEMPORAL_MODES = {
    morning: {
      glow: 'rgba(251, 191, 36, 0.08)',
      accent: 'rgba(251, 191, 36, 0.3)',
      tag: '07:30 AM / DAWN BLUSH',
      title: 'First Light on Petals',
      desc: 'Soft amber warmth touching every rose before the day begins.'
    },
    noon: {
      glow: 'rgba(255, 255, 255, 0.08)',
      accent: 'rgba(255, 255, 255, 0.32)',
      tag: '12:00 PM / PURE DAYLIGHT',
      title: 'Clarity in Every Stem',
      desc: 'Unfiltered light tracing every ivory peony and eucalyptus leaf.'
    },
    evening: {
      glow: 'rgba(167, 139, 250, 0.09)',
      accent: 'rgba(243, 196, 206, 0.3)',
      tag: '09:15 PM / OBSIDIAN DUSK',
      title: 'Stillness After Dark',
      desc: 'Quiet midnight indigo where the bouquet softly glows for you.'
    }
  };

  function initInteractiveSections() {
    // Rebloom handlers
    const replay = () => {
      if (lenisInstance) {
        lenisInstance.scrollTo('#hero', { immediate: false });
      } else {
        document.getElementById('hero').scrollIntoView({ behavior: motionPaused ? 'auto' : 'smooth' });
      }
      setTimeout(() => animateBouquetBloom(), 250);
    };

    rebloomBtn.addEventListener('click', replay);
    outroRebloomBtn.addEventListener('click', replay);

    // Temporal Bento tabs
    const temporalSection = document.getElementById('temporal-bento');
    const tabs = document.querySelectorAll('.temporal-tab');
    const tagEl = document.getElementById('temporal-tag');
    const titleEl = document.getElementById('temporal-title');
    const descEl = document.getElementById('temporal-desc');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = TEMPORAL_MODES[tab.dataset.mode];
        if (!mode) return;

        tabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', String(active));
        });

        temporalSection.style.setProperty('--ambient-glow', mode.glow);
        temporalSection.style.setProperty('--ambient-accent', mode.accent);

        if (typeof gsap !== 'undefined' && !motionPaused) {
          gsap.to([tagEl, titleEl, descEl], {
            opacity: 0,
            y: 6,
            duration: 0.18,
            onComplete: () => {
              tagEl.textContent = mode.tag;
              titleEl.textContent = mode.title;
              descEl.textContent = mode.desc;
              gsap.to([tagEl, titleEl, descEl], { opacity: 1, y: 0, duration: 0.28, stagger: 0.04 });
            }
          });
        } else {
          tagEl.textContent = mode.tag;
          titleEl.textContent = mode.title;
          descEl.textContent = mode.desc;
        }
      });
    });

    // Spaces Navigator
    const navItems = document.querySelectorAll('.space-nav-item');
    const mediaItems = document.querySelectorAll('.space-media-item');

    const activateSpace = (index) => {
      navItems.forEach((btn, i) => btn.classList.toggle('is-active', i === index));
      mediaItems.forEach((panel, i) => panel.classList.toggle('is-active', i === index));
    };

    navItems.forEach((btn, idx) => {
      btn.addEventListener('click', () => activateSpace(idx));
      btn.addEventListener('mouseenter', () => activateSpace(idx));
    });

    // Spec Bento cursor-following radial lighting
    document.querySelectorAll('.spec-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      });
    });
  }
})();
