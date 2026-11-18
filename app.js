(() => {
  'use strict';

  const PASSCODE = '2123';
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reducedMotionQuery.matches;
  let unlocked = false;
  let particleFrameId = null;

  const gate = document.getElementById('passcode-gate');
  const gateCard = gate.querySelector('.gate-card');
  const gateForm = document.getElementById('gate-form');
  const passcodeInput = document.getElementById('passcode-input');
  const togglePasscodeBtn = document.getElementById('toggle-passcode');
  const passcodeError = document.getElementById('passcode-error');
  const passcodeErrorText = document.getElementById('passcode-error-text');
  const mainContent = document.getElementById('main-content');
  const liveAnnouncer = document.getElementById('live-announcer');

  const bouquetSvg = document.getElementById('bouquet-svg');
  const stemsGroup = document.getElementById('bouquet-stems');
  const foliageGroup = document.getElementById('bouquet-foliage');
  const babysBreathGroup = document.getElementById('bouquet-babysbreath');
  const flowersGroup = document.getElementById('bouquet-flowers');
  const ribbonGroup = document.getElementById('bouquet-ribbon');

  const rebloomBtn = document.getElementById('rebloom-btn');
  const motionToggleBtn = document.getElementById('motion-toggle-btn');
  const pollenCanvas = document.getElementById('pollen-canvas');

  document.body.classList.add('is-locked');

  // ---------------- ACCESSIBLE VALIDATION ----------------
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

  passcodeInput.addEventListener('input', clearPasscodeError);

  passcodeInput.addEventListener('blur', () => {
    const val = passcodeInput.value.trim();
    if (!val) return;
    if (!/^\d{4}$/.test(val)) {
      showPasscodeError('Please enter 4 digits — hint: your and mine birthday.', true);
    }
  });

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
      passcodeInput.setCustomValidity('Please enter 4 digits.');
      showPasscodeError('Please enter 4 digits — hint: your and mine birthday.', false);
      passcodeInput.focus();
      return;
    }

    if (value !== PASSCODE) {
      passcodeInput.setCustomValidity('Incorrect passcode.');
      showPasscodeError('Not quite right — hint: your and mine birthday.', true);
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
    mainContent.removeAttribute('inert');
    document.body.classList.remove('is-locked');
    gate.classList.add('is-unlocked');
    gate.setAttribute('inert', '');
    gate.setAttribute('aria-hidden', 'true');

    buildBouquet();
    animateBouquetBloom();
    initParticles();

    setTimeout(() => {
      mainContent.focus({ preventScroll: true });
      announce('Unlocked. A bouquet is blooming on screen: I love you, Ava.', 200);
    }, 300);
  }

  // ---------------- BOTANICAL BOUQUET ----------------
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  const STEMS = [
    { d: 'M300 605 Q298 525 300 148', delay: 0.05 },
    { d: 'M300 605 Q296 520 300 242', delay: 0.0 },
    { d: 'M300 605 Q275 470 212 204', delay: 0.1 },
    { d: 'M300 605 Q325 470 388 208', delay: 0.12 },
    { d: 'M300 605 Q255 475 166 294', delay: 0.16 },
    { d: 'M300 605 Q345 475 434 292', delay: 0.18 },
    { d: 'M300 605 Q282 510 256 346', delay: 0.22 },
    { d: 'M300 605 Q318 510 344 342', delay: 0.24 },
    { d: 'M300 605 Q232 490 140 232', delay: 0.14 },
    { d: 'M300 605 Q368 490 460 232', delay: 0.15 }
  ];

  const LEAVES = [
    { x: 184, y: 342, rot: -46, scale: 1.0, fill: '#4b6b56', delay: 0.55 },
    { x: 162, y: 298, rot: 22, scale: 0.9, fill: '#61826c', delay: 0.65 },
    { x: 152, y: 262, rot: -40, scale: 0.85, fill: '#4e6f59', delay: 0.75 },
    { x: 142, y: 226, rot: 14, scale: 0.72, fill: '#6c8e77', delay: 0.85 },
    { x: 416, y: 342, rot: 46, scale: 1.0, fill: '#4b6b56', delay: 0.58 },
    { x: 438, y: 298, rot: -22, scale: 0.9, fill: '#61826c', delay: 0.68 },
    { x: 448, y: 262, rot: 40, scale: 0.85, fill: '#4e6f59', delay: 0.78 },
    { x: 458, y: 226, rot: -14, scale: 0.72, fill: '#6c8e77', delay: 0.88 },
    { x: 242, y: 405, rot: -55, scale: 1.25, fill: '#3f5a48', delay: 0.45 },
    { x: 358, y: 405, rot: 55, scale: 1.25, fill: '#3f5a48', delay: 0.48 },
    { x: 214, y: 365, rot: -65, scale: 1.1, fill: '#52735d', delay: 0.6 },
    { x: 386, y: 365, rot: 65, scale: 1.1, fill: '#52735d', delay: 0.62 },
    { x: 280, y: 392, rot: -28, scale: 1.0, fill: '#4c6b56', delay: 0.52 },
    { x: 320, y: 392, rot: 28, scale: 1.0, fill: '#4c6b56', delay: 0.54 }
  ];

  const FLOWERS = [
    { type: 'tulip', x: 300, y: 144, scale: 0.96, grad: 'url(#petal-champagne)', delay: 1.25 },
    { type: 'rose', x: 212, y: 204, scale: 0.95, grad: 'url(#petal-rose)', delay: 1.35 },
    { type: 'rose', x: 388, y: 208, scale: 0.92, grad: 'url(#petal-champagne)', delay: 1.45 },
    { type: 'ranunculus', x: 166, y: 294, scale: 0.88, grad: 'url(#petal-peony)', delay: 1.55 },
    { type: 'ranunculus', x: 434, y: 292, scale: 0.88, grad: 'url(#petal-rose)', delay: 1.62 },
    { type: 'peony', x: 300, y: 244, scale: 1.15, grad: 'url(#petal-peony)', delay: 1.15 },
    { type: 'rose', x: 256, y: 346, scale: 0.84, grad: 'url(#petal-champagne)', delay: 1.72 },
    { type: 'rose', x: 344, y: 342, scale: 0.84, grad: 'url(#petal-rose)', delay: 1.8 }
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
      g.append(
        svgEl('path', {
          d: 'M0 8 C-26 -4, -26 -38, -4 -48 C0 -32, 4 -12, 0 8 Z',
          fill: spec.grad,
          stroke: 'rgba(255,255,255,0.2)',
          'stroke-width': '0.7',
          class: 'bloom-layer'
        }),
        svgEl('path', {
          d: 'M0 8 C26 -4, 26 -38, 4 -48 C0 -32, -4 -12, 0 8 Z',
          fill: spec.grad,
          stroke: 'rgba(255,255,255,0.2)',
          'stroke-width': '0.7',
          class: 'bloom-layer'
        }),
        svgEl('path', {
          d: 'M0 10 C-18 -8, -14 -44, 0 -54 C14 -44, 18 -8, 0 10 Z',
          fill: 'url(#petal-peony)',
          stroke: 'rgba(255,255,255,0.25)',
          'stroke-width': '0.7',
          class: 'bloom-layer'
        })
      );
    }

    rings.forEach((ring) => {
      const ringGroup = svgEl('g', { class: 'bloom-layer' });
      for (let i = 0; i < ring.count; i++) {
        const angle = (360 / ring.count) * i + ring.offset;
        ringGroup.appendChild(svgEl('path', {
          d: createPetalPath(ring.rx, ring.ry),
          fill: ring.fill,
          opacity: ring.opacity,
          stroke: 'rgba(255, 255, 255, 0.18)',
          'stroke-width': '0.6',
          transform: `rotate(${angle})`
        }));
      }
      g.appendChild(ringGroup);
    });

    if (spec.type !== 'tulip') {
      g.appendChild(svgEl('circle', {
        cx: 0,
        cy: 0,
        r: spec.type === 'peony' ? 6.5 : 4.5,
        fill: '#f1d4a4',
        opacity: 0.92,
        class: 'bloom-layer'
      }));
    }

    return g;
  }

  function buildBouquet() {
    stemsGroup.innerHTML = '';
    foliageGroup.innerHTML = '';
    babysBreathGroup.innerHTML = '';
    flowersGroup.innerHTML = '';
    ribbonGroup.innerHTML = '';

    STEMS.forEach((stem) => {
      stemsGroup.appendChild(svgEl('path', {
        d: stem.d,
        fill: 'none',
        stroke: 'url(#stem-grad)',
        'stroke-width': '3.2',
        'stroke-linecap': 'round',
        'data-delay': stem.delay,
        class: 'bouquet-stem'
      }));
    });

    LEAVES.forEach((leaf) => {
      const lg = svgEl('g', {
        transform: `translate(${leaf.x}, ${leaf.y}) rotate(${leaf.rot}) scale(${leaf.scale})`
      });
      const inner = svgEl('g', {
        class: 'bouquet-leaf',
        'data-delay': leaf.delay
      });
      inner.append(
        svgEl('path', {
          d: 'M0 0 C-12 -14, -10 -34, 0 -42 C10 -34, 12 -14, 0 0 Z',
          fill: leaf.fill,
          opacity: '0.88',
          stroke: 'rgba(255,255,255,0.1)',
          'stroke-width': '0.5'
        }),
        svgEl('path', {
          d: 'M0 -2 L0 -35',
          stroke: 'rgba(255,255,255,0.16)',
          'stroke-width': '0.6',
          fill: 'none'
        })
      );
      lg.appendChild(inner);
      foliageGroup.appendChild(lg);
    });

    BABYS_BREATH.forEach(([x, y], idx) => {
      const outer = svgEl('g', { transform: `translate(${x}, ${y})` });
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

    FLOWERS.forEach((spec) => {
      flowersGroup.appendChild(createFlowerGroup(spec));
    });

    const ribbon = svgEl('g', { class: 'bouquet-ribbon-wrap' });
    ribbon.append(
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
      svgEl('path', {
        d: 'M295 488 C258 468, 242 492, 264 504 C276 510, 288 498, 295 490 Z',
        fill: 'url(#ribbon-grad)'
      }),
      svgEl('path', {
        d: 'M305 488 C342 468, 358 492, 336 504 C324 510, 312 498, 305 490 Z',
        fill: 'url(#ribbon-grad)'
      }),
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

    if (motionPaused || typeof gsap === 'undefined') {
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

  // ---------------- AMBIENT PARTICLES ----------------
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

    const motes = Array.from({ length: 20 }, () => ({
      x: Math.random() * pollenCanvas.clientWidth,
      y: Math.random() * pollenCanvas.clientHeight,
      r: 0.8 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.14 - Math.random() * 0.22,
      a: 0.14 + Math.random() * 0.32
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

  // Controls
  rebloomBtn.addEventListener('click', animateBouquetBloom);

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
})();
