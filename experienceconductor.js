// ──────────────────────────────────────────────────────────────────────────────
// After DOM load (single gate) + safe boot
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Register GSAP plugins once
  if (typeof gsap !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);
    gsap.ticker.lagSmoothing(0);
  }

  // Lenis setup (after DOM is ready to avoid timing glitches)
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis();
    // Keep a reference in case other scripts check it
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  }

  // ── Inits (order matters a bit because some refresh ScrollTrigger) ──────────
  initHighlightText();
  initGlobalParallax();
  initParallaxImages();
  initStackingCardsParallax();
  initStackedCardsSlider();
  initGlowingInteractiveDotsGrid();
  initDynamicCurrentYear();
  initVimeoLightboxAdvanced();
  initButtonOffsetSmoothScroll();
  initStickyFeatures();

  // One refresh after all ScrollTriggers are created
  if (typeof ScrollTrigger !== 'undefined') {
    // Batch with rAF to ensure layout is settled
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Highlight Text on Scroll
// ──────────────────────────────────────────────────────────────────────────────
function initHighlightText(){
  if (typeof SplitText === 'undefined') return;

  const splitHeadingTargets = document.querySelectorAll('[data-highlight-text]');
  if (!splitHeadingTargets.length) return;

  for (const heading of splitHeadingTargets) {
    const scrollStart  = heading.getAttribute('data-highlight-scroll-start') || 'top 90%';
    const scrollEnd    = heading.getAttribute('data-highlight-scroll-end')   || 'center 40%';
    const fadedValue   = parseFloat(heading.getAttribute('data-highlight-fade'))    || 0.4;
    const staggerValue = parseFloat(heading.getAttribute('data-highlight-stagger')) || 0.1;

    new SplitText(heading, {
      type: 'words, chars',
      autoSplit: true,
      onSplit(self) {
        const ctx = gsap.context(() => {
          gsap.timeline({
            scrollTrigger: {
              scrub: true,
              trigger: heading,
              start: scrollStart,
              end: scrollEnd,
            }
          }).from(self.chars, {
            autoAlpha: fadedValue,
            stagger: staggerValue,
            ease: 'linear'
          });
        });
        return ctx;
      }
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Global Parallax
// ──────────────────────────────────────────────────────────────────────────────
function initGlobalParallax() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const mm = gsap.matchMedia();
  mm.add(
    {
      isMobile:           '(max-width:479px)',
      isMobileLandscape:  '(max-width:767px)',
      isTablet:           '(max-width:991px)',
      isDesktop:          '(min-width:992px)'
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet } = context.conditions;

      const ctx = gsap.context(() => {
        document.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
          const disable = trigger.getAttribute('data-parallax-disable');
          if (
            (disable === 'mobile' && isMobile) ||
            (disable === 'mobileLandscape' && isMobileLandscape) ||
            (disable === 'tablet' && isTablet)
          ) return;

          const target = trigger.querySelector('[data-parallax="target"]') || trigger;
          const direction = trigger.getAttribute('data-parallax-direction') || 'vertical';
          const prop = direction === 'horizontal' ? 'xPercent' : 'yPercent';

          const scrubAttr = trigger.getAttribute('data-parallax-scrub');
          const scrub = scrubAttr ? parseFloat(scrubAttr) : true;

          const startVal = trigger.hasAttribute('data-parallax-start')
            ? parseFloat(trigger.getAttribute('data-parallax-start')) : 20;

          const endVal = trigger.hasAttribute('data-parallax-end')
            ? parseFloat(trigger.getAttribute('data-parallax-end')) : -20;

          const scrollStartRaw = trigger.getAttribute('data-parallax-scroll-start') || 'top bottom';
          const scrollEndRaw   = trigger.getAttribute('data-parallax-scroll-end')   || 'bottom top';

          gsap.fromTo(
            target,
            { [prop]: startVal },
            {
              [prop]: endVal,
              ease: 'none',
              scrollTrigger: {
                trigger,
                start: `clamp(${scrollStartRaw})`,
                end:   `clamp(${scrollEndRaw})`,
                scrub,
              },
            }
          );
        });
      });

      return () => ctx.revert();
    }
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Parallax image swapping
// ──────────────────────────────────────────────────────────────────────────────
function initParallaxImages() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const ctx = gsap.context(() => {
    const imgs   = gsap.utils.toArray('[data-parallax-image]');
    const panels = gsap.utils.toArray('[data-parallax-text]');

    if (!imgs.length || !panels.length) return;

    // Stack & init visibility (1 is shown by default)
    imgs.forEach(img => {
      gsap.set(img, {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        objectFit: 'cover',
        willChange: 'opacity',
        autoAlpha: img.dataset.parallaxImage === '1' ? 1 : 0
      });
    });

    const swap = (idx) => {
      const targetIdx = String(idx);
      imgs.forEach(img => {
        const isMatch = String(img.dataset.parallaxImage) === targetIdx;
        gsap.to(img, {
          autoAlpha: isMatch ? 1 : 0,
          duration: 0.8,
          ease: 'power2.inOut',
          overwrite: 'auto'
        });
      });
    };

    panels.forEach(panel => {
      const idx = panel.dataset.parallaxText;
      ScrollTrigger.create({
        trigger: panel,
        start: 'top 75%',
        end: 'bottom 50%',
        onEnter: () => swap(idx),
        onEnterBack: () => swap(idx)
      });
    });
  });

  return () => ctx.revert();
}

// ──────────────────────────────────────────────────────────────────────────────
// Stacking Cards Parallax
// ──────────────────────────────────────────────────────────────────────────────
function initStackingCardsParallax(){
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const cards = document.querySelectorAll('[data-stacking-cards-item]');
  if (cards.length < 2) return;

  cards.forEach((card, i) => {
    if (i === 0) return;

    const previousCard = cards[i - 1];
    if (!previousCard) return;

    const previousCardImage = previousCard.querySelector('[data-stacking-cards-img]');

    gsap.timeline({
      defaults: { ease: 'none', duration: 1 },
      scrollTrigger: {
        trigger: card,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
        invalidateOnRefresh: true
      }
    })
    .fromTo(previousCard, { yPercent: 0 }, { yPercent: 50 })
    .fromTo(previousCardImage, { rotate: 0, yPercent: 0 }, { rotate: -5, yPercent: -25 }, '<');
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Stacked Cards Slider (Draggable)
// ──────────────────────────────────────────────────────────────────────────────
function initStackedCardsSlider() {
  if (typeof Draggable === 'undefined' || typeof gsap === 'undefined') return;

  document.querySelectorAll('[data-stacked-cards]').forEach((container) => {
    const list = container.querySelector('[data-stacked-cards-list]');
    if (!list) return;

    let dragFirst, dragSecond;
    let firstItem, secondItem, firstEl, secondEl;
    let full, t;

    const easeBeforeRelease = { duration: 0.2, ease: 'power2.out' };
    const easeAfterRelease  = { duration: 1,   ease: 'elastic.out(1,0.75)' };
    let activeDeg = 4, inactiveDeg = -4;

    function restack() {
      const items = Array.from(list.querySelectorAll('[data-stacked-cards-item]'));
      if (items.length < 3) return;

      items.forEach((item) => item.classList.remove('is--active', 'is--second'));

      items[0].style.zIndex = 3;
      items[0].style.transform = `rotate(${activeDeg}deg)`;
      items[0].style.pointerEvents = 'auto';
      items[0].classList.add('is--active');

      items[1].style.zIndex = 2;
      items[1].style.transform = `rotate(${inactiveDeg}deg)`;
      items[1].style.pointerEvents = 'none';
      items[1].classList.add('is--second');

      if (items[2]) {
        items[2].style.zIndex = 1;
        items[2].style.transform = `rotate(${activeDeg}deg)`;
      }

      for (let i = 3; i < items.length; i++) {
        items[i].style.zIndex = 0;
        items[i].style.transform = `rotate(${inactiveDeg}deg)`;
      }
    }

    function setupDraggables() {
      restack();

      const items = Array.from(list.querySelectorAll(':scope > [data-stacked-cards-item]'));
      if (items.length < 2) return;

      firstItem  = items[0];
      secondItem = items[1];
      firstEl    = firstItem.querySelector('[data-stacked-cards-card]');
      secondEl   = secondItem.querySelector('[data-stacked-cards-card]');
      if (!firstEl || !secondEl) return;

      const width = firstEl.getBoundingClientRect().width || 0;
      full = width * 1.15;
      t    = width * 0.1;

      dragFirst?.kill();
      dragSecond?.kill();

      dragFirst = Draggable.create(firstEl, {
        type: 'x',
        onPress()   { firstEl.classList.add('is--dragging'); },
        onRelease() { firstEl.classList.remove('is--dragging'); },
        onDrag() {
          let raw = this.x;
          if (Math.abs(raw) > full) {
            const over = Math.abs(raw) - full;
            raw = (raw > 0 ? 1 : -1) * (full + over * 0.1);
          }
          gsap.set(firstEl, { x: raw, rotation: 0 });
        },
        onDragEnd() {
          const x = this.x;
          const dir = x > 0 ? 'right' : 'left';

          this.disable?.();
          dragSecond?.enable?.();
          firstItem.style.pointerEvents = 'none';
          secondItem.style.pointerEvents = 'auto';

          if (Math.abs(x) <= t) {
            gsap.to(firstEl, { x: 0, rotation: 0, ...easeBeforeRelease, onComplete: resetCycle });
          } else if (Math.abs(x) <= full) {
            flick(dir, false, x);
          } else {
            flick(dir, true);
          }
        }
      })[0];

      dragSecond = Draggable.create(secondEl, {
        type: 'x',
        onPress()   { secondEl.classList.add('is--dragging'); },
        onRelease() { secondEl.classList.remove('is--dragging'); },
        onDrag() {
          let raw = this.x;
          if (Math.abs(raw) > full) {
            const over = Math.abs(raw) - full;
            raw = (raw > 0 ? 1 : -1) * (full + over * 0.2);
          }
          gsap.set(secondEl, { x: raw, rotation: 0 });
        },
        onDragEnd() {
          gsap.to(secondEl, { x: 0, rotation: 0, ...easeBeforeRelease });
        }
      })[0];

      dragFirst?.enable?.();
      dragSecond?.disable?.();
      firstItem.style.pointerEvents = 'auto';
      secondItem.style.pointerEvents = 'none';
    }

    function flick(dir, skipHome = false, releaseX = 0) {
      if (!(dir === 'left' || dir === 'right')) dir = activeDeg > 0 ? 'right' : 'left';
      dragFirst?.disable?.();

      const item = list.querySelector('[data-stacked-cards-item]');
      const card = item?.querySelector('[data-stacked-cards-card]');
      if (!item || !card) return;
      const exitX = dir === 'right' ? full : -full;

      if (skipHome) {
        const visualX = gsap.getProperty(card, 'x');
        list.appendChild(item);
        [activeDeg, inactiveDeg] = [inactiveDeg, activeDeg];
        restack();
        gsap.fromTo(card, { x: visualX, rotation: 0 }, { x: 0, rotation: 0, ...easeAfterRelease, onComplete: resetCycle });
      } else {
        gsap.fromTo(card, { x: releaseX, rotation: 0 }, {
          x: exitX, ...easeBeforeRelease,
          onComplete() {
            gsap.set(card, { x: 0, rotation: 0 });
            list.appendChild(item);
            [activeDeg, inactiveDeg] = [inactiveDeg, activeDeg];
            resetCycle();
            const newCard = item.querySelector('[data-stacked-cards-card]');
            if (newCard) gsap.fromTo(newCard, { x: exitX }, { x: 0, ...easeAfterRelease, onComplete: resetCycle });
          }
        });
      }
    }

    function resetCycle() {
      list.querySelectorAll('[data-stacked-cards-card].is--dragging')
        .forEach((el) => el.classList.remove('is--dragging'));
      setupDraggables();
    }

    setupDraggables();

    container.querySelectorAll('[data-stacked-cards-control="next"]').forEach((btn) => {
      btn.addEventListener('click', () => flick());
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Glowing Interactive Dots Grid (InertiaPlugin)
// ──────────────────────────────────────────────────────────────────────────────
function initGlowingInteractiveDotsGrid() {
  if (typeof gsap === 'undefined' || typeof InertiaPlugin === 'undefined') return;

  document.querySelectorAll('[data-dots-container-init]').forEach(container => {
    const colors         = { base: '#FFFFFF0D', active: '#FFFFFF' };
    const threshold      = 200;
    const speedThreshold = 100;
    const shockRadius    = 325;
    const shockPower     = 5;
    const maxSpeed       = 5000;
    const centerHole     = true;

    const maxCols = 60;
    const maxRows = 40;

    const svgTemplate = container.querySelector('.dot-svg') || document.querySelector('.dot-svg');

    let dots = [];
    let centers = [];
    let hash = new Map();
    const cellSize = threshold;

    const keyFor = (x, y) => `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;

    function indexIntoHash(i, x, y) {
      const k = keyFor(x, y);
      const arr = hash.get(k) || [];
      if (!arr.length) hash.set(k, arr);
      arr.push(i);
    }

    function getNearbyIndices(x, y) {
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      const out = [];
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const arr = hash.get(`${cx + ox}:${cy + oy}`);
          if (arr) out.push(...arr);
        }
      }
      return out;
    }

    function tintDot(el, color) {
      if (el._svg && el._svgFillEls?.length) {
        el._svgFillEls.forEach(n => n.setAttribute('fill', color));
      } else {
        gsap.set(el, { backgroundColor: color });
      }
    }

    function buildGrid() {
      container.innerHTML = '';
      dots = [];
      centers = [];
      hash.clear();

      const style = getComputedStyle(container);
      const dotPx = parseFloat(style.fontSize);
      const gapPx = dotPx * 2;
      const contW = container.clientWidth;
      const contH = container.clientHeight;

      let cols  = Math.floor((contW + gapPx) / (dotPx + gapPx));
      let rows  = Math.floor((contH + gapPx) / (dotPx + gapPx));

      const colStep = Math.max(1, Math.ceil(cols / maxCols));
      const rowStep = Math.max(1, Math.ceil(rows / maxRows));
      cols = Math.ceil(cols / colStep);
      rows = Math.ceil(rows / rowStep);

      const total = cols * rows;

      const holeCols = centerHole ? (cols % 2 === 0 ? 4 : 5) : 0;
      const holeRows = centerHole ? (rows % 2 === 0 ? 4 : 5) : 0;
      const startCol = (cols - holeCols) / 2;
      const startRow = (rows - holeRows) / 2;

      for (let i = 0; i < total; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const isHole = centerHole &&
          row >= startRow && row < startRow + holeRows &&
          col >= startCol && col < startCol + holeCols;

        const d = document.createElement('div');
        d.className = 'dot';
        d.style.willChange = 'transform';

        if (isHole) {
          d.style.visibility = 'hidden';
          d._isHole = true;
        } else {
          if (svgTemplate) {
            const svg = svgTemplate.cloneNode(true);
            svg.style.display = '';
            svg.setAttribute('aria-hidden', 'true');
            d.appendChild(svg);
            d._svg = svg;

            const fillMarked = svg.querySelectorAll('[data-dot-fill]');
            const withFillAttr = svg.querySelectorAll('[fill]');
            d._svgFillEls = fillMarked.length ? fillMarked :
              (withFillAttr.length ? withFillAttr :
               svg.querySelectorAll('path, rect, circle, polygon, ellipse'));
          }
          d._inertiaApplied = false;
          tintDot(d, colors.base);
        }

        container.appendChild(d);
        if (!d._isHole) dots.push(d);
      }

      requestAnimationFrame(() => {
        centers = dots.map(el => {
          const r = el.getBoundingClientRect();
          const x = r.left + window.scrollX + r.width / 2;
          const y = r.top  + window.scrollY + r.height / 2;
          return { el, x, y };
        });
        centers.forEach((c, i) => indexIntoHash(i, c.x, c.y));
      });
    }

    window.addEventListener('resize', buildGrid, { passive: true });
    buildGrid();

    let lastTime = 0, lastX = 0, lastY = 0;

    window.addEventListener('mousemove', (e) => {
      const now = performance.now();
      const dt  = now - lastTime || 16;
      let dx = e.pageX - lastX;
      let dy = e.pageY - lastY;
      let vx = dx / dt * 1000;
      let vy = dy / dt * 1000;
      let speed = Math.hypot(vx, vy);

      if (speed > maxSpeed) {
        const s = maxSpeed / speed;
        vx *= s; vy *= s; speed = maxSpeed;
      }

      lastTime = now; lastX = e.pageX; lastY = e.pageY;

      const nearby = getNearbyIndices(e.pageX, e.pageY);
      if (!nearby.length) return;

      requestAnimationFrame(() => {
        for (let i = 0; i < nearby.length; i++) {
          const c = centers[nearby[i]];
          const el = c.el;
          const dist = Math.hypot(c.x - e.pageX, c.y - e.pageY);
          if (dist > threshold) continue;

          const t = 1 - dist / threshold;
          const col = gsap.utils.interpolate(colors.base, colors.active, t);
          tintDot(el, col);

          if (speed > speedThreshold && !el._inertiaApplied) {
            el._inertiaApplied = true;
            const pushX = (c.x - e.pageX) + vx * 0.005;
            const pushY = (c.y - e.pageY) + vy * 0.005;
            gsap.to(el, {
              inertia: { x: pushX, y: pushY, resistance: 750 },
              onComplete() {
                gsap.to(el, { x: 0, y: 0, duration: 1.5, ease: 'elastic.out(1,0.75)' });
                el._inertiaApplied = false;
              }
            });
          }
        }
      });
    }, { passive: true });

    window.addEventListener('click', (e) => {
      const nearby = getNearbyIndices(e.pageX, e.pageY);
      if (!nearby.length) return;

      for (let i = 0; i < nearby.length; i++) {
        const c = centers[nearby[i]];
        const el = c.el;
        const dist = Math.hypot(c.x - e.pageX, c.y - e.pageY);
        if (dist >= shockRadius || el._inertiaApplied) continue;

        el._inertiaApplied = true;
        const falloff = 1 - dist / shockRadius;
        const pushX   = (c.x - e.pageX) * shockPower * falloff;
        const pushY   = (c.y - e.pageY) * shockPower * falloff;

        gsap.to(el, {
          inertia: { x: pushX, y: pushY, resistance: 750 },
          onComplete() {
            gsap.to(el, { x: 0, y: 0, duration: 1.5, ease: 'elastic.out(1,0.75)' });
            el._inertiaApplied = false;
          }
        });
      }
    }, { passive: true });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Dynamic Current Year
// ──────────────────────────────────────────────────────────────────────────────
function initDynamicCurrentYear() {
  const currentYear = new Date().getFullYear();
  document.querySelectorAll('[data-current-year]').forEach(el => { el.textContent = currentYear; });
}

// ──────────────────────────────────────────────────────────────────────────────
// Vimeo Lightbox (Advanced)
// ──────────────────────────────────────────────────────────────────────────────
function initVimeoLightboxAdvanced() {
  const lightbox = document.querySelector('[data-vimeo-lightbox-init]');
  if (!lightbox || typeof Vimeo === 'undefined') return;

  const openButtons  = document.querySelectorAll('[data-vimeo-lightbox-control="open"]');
  const closeButtons = document.querySelectorAll('[data-vimeo-lightbox-control="close"]');

  let iframe            = lightbox.querySelector('iframe');
  const placeholder     = lightbox.querySelector('.vimeo-lightbox__placeholder');
  const calcEl          = lightbox.querySelector('.vimeo-lightbox__calc');
  const wrapEl          = lightbox.querySelector('.vimeo-lightbox__calc-wrap');
  const playerContainer = lightbox.querySelector('[data-vimeo-lightbox-player]');

  let player = null;
  let currentVideoID = null;
  let videoAspectRatio = null;
  let globalMuted = lightbox.getAttribute('data-vimeo-muted') === 'true';
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const playedOnce = new Set();

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  function clampWrapSize(ar) {
    if (!calcEl || !wrapEl) return;
    const w = calcEl.offsetWidth;
    const h = calcEl.offsetHeight;
    wrapEl.style.maxWidth = Math.min(w, h / ar) + 'px';
  }

  function adjustCoverSizing() {
    if (!videoAspectRatio || !playerContainer) return;
    const cH = playerContainer.offsetHeight;
    const cW = playerContainer.offsetWidth;
    const r  = cH / cW;
    const wEl = lightbox.querySelector('.vimeo-lightbox__iframe');
    if (!wEl) return;
    if (r > videoAspectRatio) {
      wEl.style.width  = (r / videoAspectRatio * 100) + '%';
      wEl.style.height = '100%';
    } else {
      wEl.style.height = (videoAspectRatio / r * 100) + '%';
      wEl.style.width  = '100%';
    }
  }

  function closeLightbox() {
    lightbox.setAttribute('data-vimeo-activated', 'false');
    if (player) {
      player.pause();
      lightbox.setAttribute('data-vimeo-playing', 'false');
    }
  }

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); }, { passive: true });
  closeButtons.forEach(btn => btn.addEventListener('click', closeLightbox));

  function setupPlayerEvents() {
    player.on('play', () => {
      lightbox.setAttribute('data-vimeo-loaded', 'true');
      lightbox.setAttribute('data-vimeo-playing', 'true');
    });

    player.on('ended', closeLightbox);
    player.on('pause', () => lightbox.setAttribute('data-vimeo-playing', 'false'));

    const durEl = lightbox.querySelector('[data-vimeo-duration]');
    player.getDuration().then(d => {
      if (durEl) durEl.textContent = formatTime(d);
      lightbox.querySelectorAll('[data-vimeo-control="timeline"],progress')
        .forEach(el => { el.max = d; });
    });

    const tl = lightbox.querySelector('[data-vimeo-control="timeline"]');
    const pr = lightbox.querySelector('progress');
    player.on('timeupdate', data => {
      if (tl) tl.value = data.seconds;
      if (pr) pr.value = data.seconds;
      if (durEl) durEl.textContent = formatTime(Math.trunc(data.seconds));
    });
    if (tl) {
      ['input','change'].forEach(evt => tl.addEventListener(evt, (e) => {
        const v = e.target.value;
        player.setCurrentTime(v);
        if (pr) pr.value = v;
      }));
    }

    let hoverTimer;
    if (playerContainer) {
      playerContainer.addEventListener('mousemove', () => {
        lightbox.setAttribute('data-vimeo-hover', 'true');
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => { lightbox.setAttribute('data-vimeo-hover', 'false'); }, 3000);
      });
    }

    const fsBtn = lightbox.querySelector('[data-vimeo-control="fullscreen"]');
    if (fsBtn) {
      const isFS = () => document.fullscreenElement || document.webkitFullscreenElement;
      if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
        fsBtn.style.display = 'none';
      }
      fsBtn.addEventListener('click', () => {
        if (isFS()) {
          lightbox.setAttribute('data-vimeo-fullscreen', 'false');
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else if (playerContainer) {
          lightbox.setAttribute('data-vimeo-fullscreen', 'true');
          (playerContainer.requestFullscreen || playerContainer.webkitRequestFullscreen).call(playerContainer);
        }
      });
      ['fullscreenchange','webkitfullscreenchange'].forEach(evt =>
        document.addEventListener(evt, () =>
          lightbox.setAttribute('data-vimeo-fullscreen', isFS() ? 'true' : 'false')
        )
      );
    }
  }

  async function runSizing() {
    const mode = lightbox.getAttribute('data-vimeo-update-size');
    const w    = await player.getVideoWidth();
    const h    = await player.getVideoHeight();
    const ar   = h / w;
    const bef  = lightbox.querySelector('.vimeo-lightbox__before');

    if (mode === 'true') {
      if (bef) bef.style.paddingTop = (ar * 100) + '%';
      clampWrapSize(ar);
    } else if (mode === 'cover') {
      videoAspectRatio = ar;
      if (bef) bef.style.paddingTop = '0%';
      adjustCoverSizing();
    } else {
      clampWrapSize(ar);
    }
  }

  window.addEventListener('resize', () => { if (player) runSizing(); }, { passive: true });

  async function openLightbox(id, placeholderBtn) {
    lightbox.setAttribute('data-vimeo-activated', 'loading');
    lightbox.setAttribute('data-vimeo-loaded', 'false');

    if (player && id !== currentVideoID) {
      await player.pause();
      await player.unload();

      const oldIframe = iframe;
      const newIframe = document.createElement('iframe');
      newIframe.className = oldIframe.className;
      newIframe.setAttribute('allow', oldIframe.getAttribute('allow') || 'autoplay; encrypted-media');
      newIframe.setAttribute('frameborder', '0');
      newIframe.setAttribute('allowfullscreen', 'true');
      oldIframe.parentNode.replaceChild(newIframe, oldIframe);

      iframe         = newIframe;
      player         = null;
      currentVideoID = null;
      lightbox.setAttribute('data-vimeo-playing', 'false');
    }

    if (placeholderBtn && placeholder) {
      ['src','srcset','sizes','alt','width'].forEach(attr => {
        const val = placeholderBtn.getAttribute(attr);
        if (val != null) placeholder.setAttribute(attr, val);
      });
    }

    if (!player) {
      iframe.src = `https://player.vimeo.com/video/${id}?api=1&background=1&autoplay=0&loop=0&muted=0`;
      player = new Vimeo.Player(iframe);
      setupPlayerEvents();
      currentVideoID = id;
      await runSizing();
    }

    lightbox.setAttribute('data-vimeo-activated', 'true');

    if (!isTouch) {
      player.setVolume(globalMuted ? 0 : 1).then(() => {
        lightbox.setAttribute('data-vimeo-playing', 'true');
        setTimeout(() => player.play(), 50);
      });
    } else if (playedOnce.has(currentVideoID)) {
      player.setVolume(globalMuted ? 0 : 1).then(() => {
        lightbox.setAttribute('data-vimeo-playing', 'true');
        player.play();
      });
    }
  }

  const playBtn = lightbox.querySelector('[data-vimeo-control="play"]');
  const pauseBtn = lightbox.querySelector('[data-vimeo-control="pause"]');
  const muteBtn  = lightbox.querySelector('[data-vimeo-control="mute"]');

  playBtn?.addEventListener('click', () => {
    if (!player) return;
    if (isTouch) {
      if (!playedOnce.has(currentVideoID)) {
        player.setVolume(0).then(() => {
          lightbox.setAttribute('data-vimeo-playing', 'true');
          player.play();
          if (!globalMuted) {
            setTimeout(() => {
              player.setVolume(1);
              lightbox.setAttribute('data-vimeo-muted', 'false');
            }, 100);
          }
          playedOnce.add(currentVideoID);
        });
      } else {
        player.setVolume(globalMuted ? 0 : 1).then(() => {
          lightbox.setAttribute('data-vimeo-playing', 'true');
          player.play();
        });
      }
    } else {
      player.setVolume(globalMuted ? 0 : 1).then(() => {
        lightbox.setAttribute('data-vimeo-playing', 'true');
        setTimeout(() => player.play(), 50);
      });
    }
  });

  pauseBtn?.addEventListener('click', () => { player?.pause(); });

  muteBtn?.addEventListener('click', () => {
    if (!player) return;
    globalMuted = !globalMuted;
    player.setVolume(globalMuted ? 0 : 1).then(() =>
      lightbox.setAttribute('data-vimeo-muted', globalMuted ? 'true' : 'false')
    );
  });

  openButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const vid = btn.getAttribute('data-vimeo-lightbox-id');
      const img = btn.querySelector('[data-vimeo-lightbox-placeholder]');
      if (vid) openLightbox(vid, img);
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
/** Offset-aware smooth scroll for buttons using [data-button-offset] */
function initButtonOffsetSmoothScroll() {
  const SELECTOR = '[data-button-offset]';
  const HEADER_SELECTOR = '[data-fixed-header], header.fixed, header.sticky, .fixed-header, .site-header';

  function parseOffset(value, ctx) {
    const ctxSize  = parseFloat(getComputedStyle(ctx || document.documentElement).fontSize) || 16;
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const def = 4 * ctxSize;
    if (!value) return def;
    const v = String(value).trim().toLowerCase();
    if (v.endsWith('px'))  return parseFloat(v);
    if (v.endsWith('rem')) return parseFloat(v) * rootSize;
    if (v.endsWith('em'))  return parseFloat(v) * ctxSize;
    if (v.endsWith('vh'))  return window.innerHeight * (parseFloat(v) / 100);
    if (v.endsWith('vw'))  return window.innerWidth  * (parseFloat(v) / 100);
    const n = parseFloat(v);
    return isNaN(n) ? def : n;
  }

  function headerHeight() {
    const els = Array.from(document.querySelectorAll(HEADER_SELECTOR));
    let h = 0;
    for (const el of els) {
      const cs = getComputedStyle(el);
      const isTop = ['fixed', 'sticky'].includes(cs.position) && (parseFloat(cs.top) || 0) <= 0;
      if (!isTop) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none') h += r.height;
    }
    return h;
  }

  function getTarget(el) {
    const explicit = el.getAttribute('data-target') || el.dataset.target;
    let id = explicit || ((el.getAttribute('href') || '').split('#')[1] || '');
    if (!id) return null;
    try { id = decodeURIComponent(id); } catch {}
    return document.getElementById(id) || document.querySelector(`[name="${CSS.escape(id)}"]`);
  }

  const pageTop = el => el.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest(SELECTOR);
    if (!btn) return;
    const target = getTarget(btn);
    if (!target) return;
    e.preventDefault();

    const baseOffset  = parseOffset(btn.getAttribute('data-button-offset'), btn);
    const totalOffset = headerHeight() + baseOffset;

    if (window.lenis && typeof window.lenis.scrollTo === 'function') {
      window.lenis.scrollTo(target, { offset: -totalOffset, immediate: false });
    } else {
      const y = Math.max(0, pageTop(target) - totalOffset);
      window.scrollTo({ top: y, behavior: 'smooth' });
    }

    if (target.id) {
      history.pushState(null, '', `#${encodeURIComponent(target.id)}`);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }, { passive: false });
}

// ──────────────────────────────────────────────────────────────────────────────
// Sticky Features
// ──────────────────────────────────────────────────────────────────────────────
function initStickyFeatures(root){
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const wraps = Array.from((root || document).querySelectorAll('[data-sticky-feature-wrap]'));
  if (!wraps.length) return;

  wraps.forEach(w => {
    const visualWraps = Array.from(w.querySelectorAll('[data-sticky-feature-visual-wrap]'));
    const items       = Array.from(w.querySelectorAll('[data-sticky-feature-item]'));
    const progressBar = w.querySelector('[data-sticky-feature-progress]');

    const count = Math.min(visualWraps.length, items.length);
    if (count < 1) return;

    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const DURATION = rm ? 0.01 : 0.75;
    const EASE     = 'power4.inOut';
    const SCROLL_AMOUNT = 0.9;

    const getTexts = el => Array.from(el.querySelectorAll('[data-sticky-feature-text]'));

    visualWraps[0] && gsap.set(visualWraps[0], { clipPath: 'inset(0% round 0.75em)' });
    gsap.set(items[0], { autoAlpha: 1 });

    let currentIndex = 0;

    function transition(fromIndex, toIndex){
      if (fromIndex === toIndex) return;
      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

      if (fromIndex < toIndex){
        tl.to(visualWraps[toIndex], { clipPath: 'inset(0% round 0.75em)', duration: DURATION, ease: EASE }, 0);
      } else {
        tl.to(visualWraps[fromIndex], { clipPath: 'inset(50% round 0.75em)', duration: DURATION, ease: EASE }, 0);
      }
      animateOut(items[fromIndex]);
      animateIn(items[toIndex]);
    }

    function animateOut(itemEl){
      const texts = getTexts(itemEl);
      gsap.to(texts, {
        autoAlpha: 0,
        y: -30,
        ease: 'power4.out',
        duration: 0.4,
        onComplete: () => gsap.set(itemEl, { autoAlpha: 0 })
      });
    }

    function animateIn(itemEl){
      const texts = getTexts(itemEl);
      gsap.set(itemEl, { autoAlpha: 1 });
      gsap.fromTo(texts, { autoAlpha: 0, y: 30 }, {
        autoAlpha: 1,
        y: 0,
        ease: 'power4.out',
        duration: DURATION,
        stagger: 0.1
      });
    }

    const steps = Math.max(1, count - 1);

    ScrollTrigger.create({
      trigger: w,
      start: 'center center',
      end: () => `+=${steps * 100}%`,
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: self => {
        const p = Math.min(self.progress, SCROLL_AMOUNT) / SCROLL_AMOUNT;
        let idx = Math.floor(p * steps + 1e-6);
        idx = Math.max(0, Math.min(steps, idx));

        if (progressBar) {
          gsap.to(progressBar, { scaleX: p, ease: 'none' });
        }

        if (idx !== currentIndex) {
          transition(currentIndex, idx);
          currentIndex = idx;
        }
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Random session color (kept behavior; runs on first DOM ready via top gate)
// ──────────────────────────────────────────────────────────────────────────────
(() => {
  const colors = [
    'var(--color-red)',
    'var(--color-green)',
    'var(--color-blue)',
    'var(--color-yellow)',
    'var(--color-orange)'
  ];
  let sessionColor = sessionStorage.getItem('randomColor');
  if (!sessionColor) {
    sessionColor = colors[Math.floor(Math.random() * colors.length)];
    sessionStorage.setItem('randomColor', sessionColor);
  }
  document.querySelectorAll('[data-color-random]').forEach((el) => {
    const type = el.getAttribute('data-color-random');
    if (type === 'bg')   el.style.backgroundColor = sessionColor;
    else if (type === 'text') el.style.color = sessionColor;
  });
})();

// ──────────────────────────────────────────────────────────────────────────────
// Basic Filter Setup (Multi Match)
// ──────────────────────────────────────────────────────────────────────────────
function initBasicFilterSetupMultiMatch() {
  const transitionDelay = 300;
  const groups = [...document.querySelectorAll('[data-filter-group]')];
  if (!groups.length) return;

  groups.forEach(group => {
    const buttons = [...group.querySelectorAll('[data-filter-target]')];
    const items   = [...group.querySelectorAll('[data-filter-name]')];

    items.forEach(item => {
      const cs = item.querySelectorAll('[data-filter-name-collect]');
      if (!cs.length) return;
      const seen = new Set(), out = [];
      cs.forEach(c => {
        const v = (c.getAttribute('data-filter-name-collect') || '').trim().toLowerCase();
        if (v && !seen.has(v)) { seen.add(v); out.push(v); }
      });
      if (out.length) item.setAttribute('data-filter-name', out.join(' '));
    });

    const itemTokens = new Map();
    items.forEach(el => {
      const tokens = ((el.getAttribute('data-filter-name') || '').trim().toLowerCase().split(/\s+/)).filter(Boolean);
      itemTokens.set(el, new Set(tokens));
    });

    const setItemState = (el, on) => {
      const next = on ? 'active' : 'not-active';
      if (el.getAttribute('data-filter-status') !== next) {
        el.setAttribute('data-filter-status', next);
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      }
    };
    const setButtonState = (btn, on) => {
      const next = on ? 'active' : 'not-active';
      if (btn.getAttribute('data-filter-status') !== next) {
        btn.setAttribute('data-filter-status', next);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    };

    let activeTarget = null;
    const itemMatches = el => (!activeTarget || activeTarget === 'all') ? true : itemTokens.get(el).has(activeTarget);

    const paint = rawTarget => {
      const target = (rawTarget || '').trim().toLowerCase();
      activeTarget = (!target || target === 'all') ? 'all' : target;

      items.forEach(el => {
        if (el._ft) clearTimeout(el._ft);
        const next = itemMatches(el);
        const cur = el.getAttribute('data-filter-status');
        if (cur === 'active' && transitionDelay > 0) {
          el.setAttribute('data-filter-status', 'transition-out');
          el._ft = setTimeout(() => { setItemState(el, next); el._ft = null; }, transitionDelay);
        } else if (transitionDelay > 0) {
          el._ft = setTimeout(() => { setItemState(el, next); el._ft = null; }, transitionDelay);
        } else {
          setItemState(el, next);
        }
      });

      buttons.forEach(btn => {
        const t = (btn.getAttribute('data-filter-target') || '').trim().toLowerCase();
        setButtonState(btn, (activeTarget === 'all' && t === 'all') || (t && t === activeTarget));
      });
    };

    group.addEventListener('click', e => {
      const btn = e.target.closest('[data-filter-target]');
      if (btn && group.contains(btn)) paint(btn.getAttribute('data-filter-target'));
    });
  });
}
// keep original init for filters
document.addEventListener('DOMContentLoaded', () => { initBasicFilterSetupMultiMatch(); });
