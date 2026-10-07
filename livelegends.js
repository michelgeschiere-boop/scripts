/*! Live Legends site scripts v1.1.1 | built 2026-10-07 | source: src/ */

/* ---- src/core/core.js ---- */
/* =====================================================================
   Live Legends – core
   Shared helpers, motion settings, smooth scroll and the module registry.
   Every module registers itself with LL.register(name, fn, phase);
   src/main.js runs them in order once the DOM is ready.
   Phases: 'early' (before anything else) · 'ready' (site-wide) · 'page' (page specific) · 'afterLoader'.
   ===================================================================== */
(function () {
  'use strict';

  const html = document.documentElement;
  const LL = (window.LiveLegends = window.LiveLegends || {});

  LL.html = html;
  LL.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  LL.mobile = window.matchMedia('(max-width: 767px)');
  LL.canHover = () => window.matchMedia('(hover: hover)').matches;

  /* Registry */
  LL.modules = [];
  LL.register = (name, fn, phase) => LL.modules.push({ name, fn, phase: phase || 'ready' });
  LL.safe = (name, fn) => {
    try { fn(); } catch (err) { console.warn('[Live Legends] ' + name + ' failed:', err); }
  };

  /* Helpers */
  LL.slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  LL.onKeyActivate = (el, fn) => el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
  });
  LL.cssVar = (name) => getComputedStyle(html).getPropertyValue(name).trim();
  LL.easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* Motion settings (set up once GSAP is available, see main.js) */
  LL.EASE = 'll-out';
  LL.EASE_IO = 'll';
  LL.D = { fast: 0.45, base: 0.8, slow: 1.2 };
  LL.setupGsap = () => {
    gsap.registerPlugin(ScrollTrigger, SplitText, Flip, Observer, CustomEase);
    CustomEase.create('ll', '0.62, 0.05, 0, 1');
    CustomEase.create('ll-out', '0.16, 1, 0.3, 1');
    gsap.defaults({ ease: LL.EASE, duration: LL.D.base });
  };

  /* Smooth scroll (Lenis) */
  LL.stopScroll = () => LL.lenis && LL.lenis.stop();
  LL.startScroll = () => LL.lenis && LL.lenis.start();
  LL.smoothScrollTo = (target, offset = 0, duration = 1.2) => new Promise((resolve) => {
    const y = target.getBoundingClientRect().top + window.scrollY + offset;
    if (Math.abs(y - window.scrollY) < 8 || LL.reduceMotion) { if (LL.reduceMotion) window.scrollTo(0, y); return resolve(); }
    if (LL.lenis) LL.lenis.scrollTo(y, { duration, easing: LL.easeInOutCubic, onComplete: resolve });
    else { window.scrollTo({ top: y, behavior: 'smooth' }); setTimeout(resolve, duration * 1000); }
  });

  /* Run something once the homepage loader reveals the page (immediately on other pages).
     'loader:reveal' fires while the Flip is still landing, so text reveals overlap it instead of waiting. */
  LL.afterLoader = (cb) => {
    if (!html.classList.contains('is-loading')) { cb(); return; }
    let ran = false;
    const run = () => { if (!ran) { ran = true; cb(); } };
    window.addEventListener('loader:reveal', run, { once: true });
    window.addEventListener('loader:done', run, { once: true });
  };

  /* Read a URL from a CMS-bound element (link href or text) */
  LL.readUrl = (el) => (el ? ((el.getAttribute('href') || el.textContent || '').trim()) : '');

  /* YouTube / Vimeo → embed URL; anything else is treated as a video file */
  LL.getEmbedUrl = (url) => {
    let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1] + '?autoplay=1&rel=0&modestbranding=1';
    m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1] + '?autoplay=1&title=0&byline=0&portrait=0';
    return null;
  };
})();

/* ---- src/global/lenis.js ---- */
/* Lenis smooth scroll – off with reduced motion and on the Lab (infinite grid has its own scrolling) */
(function () {
  const LL = window.LiveLegends;
  LL.register('lenis', () => {
    if (LL.reduceMotion || typeof Lenis === 'undefined' || document.querySelector('[data-infinite-grid-init]')) return;
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, autoRaf: false, anchors: { offset: -48, duration: 1.2 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    LL.lenis = lenis;
    window.lenis = lenis;
  });
})();

/* ---- src/global/navbar.js ---- */
/* Navbar: site videos from the CMS, logo video, colour per part, wordmark on scroll, menu */
(function () {
  const LL = window.LiveLegends;

  /* Site videos from the CMS collection "Site Settings" (editable in the Editor).
     [data-logo-video] → logo · [data-site-showreel] → showreel film · [data-site-hero-video] → hero background.
     On mobile the logo video is not used: iOS draws its own play button over inline video,
     so there the four blocks are solid (see Global CSS). */
  LL.register('siteVideos', () => {
    if (!LL.mobile.matches) {
      const logoUrl = LL.readUrl(document.querySelector('[data-logo-video]'));
      if (logoUrl) {
        document.querySelectorAll('.navbar_logo-video').forEach((v) => {
          if (v.getAttribute('src') !== logoUrl) { v.setAttribute('src', logoUrl); v.load(); }
        });
      }
    }
    const showreel = LL.readUrl(document.querySelector('[data-site-showreel]'));
    if (showreel) {
      const holder = document.querySelector('.section_home-video [data-video-url]');
      if (holder) holder.textContent = showreel;
    }
    const heroVideo = LL.readUrl(document.querySelector('[data-site-hero-video]'));
    if (heroVideo) {
      const heroHolder = document.querySelector('.section_home-hero [data-video-url]');
      if (heroHolder) heroHolder.textContent = heroVideo;
    }
  }, 'early');

  /* Logo video: removed on mobile, kept playing on desktop */
  LL.register('logoVideo', () => {
    const videos = document.querySelectorAll('.navbar_logo-video');
    if (!videos.length) return;
    if (LL.mobile.matches) { videos.forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); }); return; }
    videos.forEach((v) => {
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true;
      v.addEventListener('error', () => {
        const fb = v.getAttribute('data-fallback-src');
        if (fb && v.getAttribute('src') !== fb) { v.setAttribute('src', fb); v.load(); v.play().catch(() => {}); }
      });
    });
    const play = () => videos.forEach((v) => { v.muted = true; v.play().catch(() => {}); });
    play();
    videos.forEach((v) => v.addEventListener('canplay', play, { once: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
    window.addEventListener('pageshow', play);
  }, 'early');

  /* Navbar colour per part: logo, "Get in touch" and the plus each look at what is behind them.
     Photo or video → white; dark colour → white; light colour → dark; data-nav-color="white|dark" wins. */
  LL.register('navbarColor', () => {
    const navs = document.querySelectorAll('.navbar_component');
    if (!navs.length) return;
    const WHITE = 'var(--_colors---neutral--white)';
    const DARK = 'var(--_colors---neutral--darkest)';
    const FADE = 'color .4s cubic-bezier(.16,1,.3,1), opacity .4s ease, visibility .4s ease';
    const SKIP = '.transition, .u-cursor-label, [data-section-dock-init], .navbar_overlay, .navbar_menu-panel';
    const isMedia = (el) => {
      if (/^(IMG|VIDEO|PICTURE|IFRAME|CANVAS)$/i.test(el.tagName)) return true;
      const bg = getComputedStyle(el).backgroundImage;
      return !!bg && bg.indexOf('url(') !== -1;
    };
    const colourBehind = (part, nav) => {
      const r = part.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      for (let i = 0; i < stack.length; i++) {
        const el = stack[i];
        if (nav.contains(el) || el.closest(SKIP)) continue;
        const forced = el.closest('[data-nav-color]');
        if (forced) return forced.getAttribute('data-nav-color') === 'dark' ? DARK : WHITE;
        for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
          if (isMedia(node)) return WHITE;
          const parts = getComputedStyle(node).backgroundColor.match(/[\d.]+/g);
          if (parts && (parts.length < 4 || parseFloat(parts[3]) > 0.5)) {
            const l = (0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]) / 255;
            return l < 0.55 ? WHITE : DARK;
          }
        }
        return DARK;
      }
      return DARK;
    };
    navs.forEach((nav) => {
      const parts = [nav.querySelector('.navbar_logo-link'), nav.querySelector('.navbar_link'), nav.querySelector('[data-menu-toggle]')].filter(Boolean);
      parts.forEach((p) => { p.style.transition = FADE; });
      const isOpen = () => nav.getAttribute('data-menu-status') === 'open';
      let ticking = false;
      const update = () => {
        ticking = false;
        if (isOpen()) { parts.forEach((p) => { p.style.color = ''; }); return; }
        parts.forEach((p) => { const c = colourBehind(p, nav); if (c) p.style.color = c; });
      };
      const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      window.addEventListener('load', update);
      window.addEventListener('loader:done', update);
      new MutationObserver(update).observe(nav, { attributes: true, attributeFilter: ['data-menu-status'] });
      update();
    });
  }, 'early');

  /* Wordmark only at the top of the page; the icon stays (styles in Global CSS) */
  LL.register('logoWordmark', () => {
    const navs = document.querySelectorAll('[data-navbar]');
    if (!navs.length) return;
    const update = () => { const scrolled = window.scrollY > 40; navs.forEach((n) => n.classList.toggle('is-scrolled', scrolled)); };
    update();
    window.addEventListener('scroll', update, { passive: true });
  });

  /* Menu open / close */
  LL.register('menu', () => {
    document.querySelectorAll('[data-navbar]').forEach((nav) => {
      const toggle = nav.querySelector('[data-menu-toggle]');
      const links = [...nav.querySelectorAll('.navbar_menu-link, .navbar_menu-contact')];
      const isOpen = () => nav.getAttribute('data-menu-status') === 'open';
      const setState = (open) => {
        nav.setAttribute('data-menu-status', open ? 'open' : 'closed');
        if (toggle) toggle.setAttribute('aria-expanded', String(open));
        open ? LL.stopScroll() : LL.startScroll();
        if (LL.reduceMotion || !links.length) return;
        if (open) gsap.fromTo(links, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: LL.D.base, ease: LL.EASE, stagger: 0.06, delay: 0.25, overwrite: true });
        else gsap.to(links, { autoAlpha: 0, duration: 0.2, overwrite: true });
      };
      if (toggle) { toggle.addEventListener('click', () => setState(!isOpen())); LL.onKeyActivate(toggle, () => setState(!isOpen())); }
      nav.querySelectorAll('[data-menu-close]').forEach((el) => el.addEventListener('click', () => setState(false)));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) setState(false); });
    });
  });
})();

/* ---- src/global/cubes.js ---- */
/* Pixel cubes on images: colour from the component setting, locked edge cubes, homepage build-up everywhere.
   Colours and positions live in the Global CSS; data-cube-color is also bound directly in the components. */
(function () {
  const LL = window.LiveLegends;

  /* Fallback for the hidden "Blocks - Color" text holders (the attribute binding normally does this already) */
  LL.register('cubeColor', () => {
    document.querySelectorAll('[data-cube-color-value]').forEach((holder) => {
      const value = (holder.textContent || '').trim().toLowerCase();
      const scope = holder.closest('section') || holder.parentElement;
      if (value && scope) {
        scope.querySelectorAll('[data-cube-set]').forEach((set) => {
          if (!set.hasAttribute('data-cube-color-lock')) set.setAttribute('data-cube-color', value);
        });
      }
      holder.remove();
    });
  }, 'early');

  /* Cube grid: every cube set becomes a whole number of cubes wide and high; every cube snaps to that grid
     (right/bottom-anchored ones too) and a cube landing on an occupied cell is dropped. Re-runs on resize.
     Runs before cubeEdges and cubeBuildUp, which read the final cube positions. */
  LL.register('cubeGrid', () => {
    const sets = [...document.querySelectorAll('[data-cube-set]')];
    if (!sets.length) return;
    const PROPS = ['left', 'right', 'top', 'bottom', 'width', 'height', 'display'];
    const pct = (n, d) => (n / d) * 100 + '%';
    const cubeSize = (set) => {
      const probe = document.createElement('div');
      probe.className = 'u-cube';
      probe.style.cssText = 'position:absolute;visibility:hidden;left:0;top:0;width:3em;height:3em';
      set.appendChild(probe);
      const size = probe.offsetWidth;
      probe.remove();
      return size;
    };
    const snap = (set) => {
      const cubes = [...set.querySelectorAll('.u-cube')];
      cubes.forEach((c) => PROPS.forEach((p) => c.style.removeProperty(p)));
      const W = set.offsetWidth, H = set.offsetHeight, base = cubeSize(set);
      if (!W || !H || !base) return;
      const cols = Math.max(1, Math.round(W / base)), rows = Math.max(1, Math.round(H / base));
      const taken = new Set();
      cubes.forEach((c) => {
        if (!c.offsetWidth) return; // hidden by the CSS (e.g. on mobile)
        const x = c.offsetLeft, y = c.offsetTop, w = c.offsetWidth, h = c.offsetHeight;
        let spanX = Math.min(cols, Math.max(1, Math.round(w / base)));
        let spanY = Math.min(rows, Math.max(1, Math.round(h / base)));
        const fromRight = W - x - w < x - 0.5, fromBottom = H - y - h < y - 0.5;
        let col = fromRight ? cols - spanX - Math.round((W - x - w) / base) : Math.round(x / base);
        let row = fromBottom ? rows - spanY - Math.round((H - y - h) / base) : Math.round(y / base);
        if (col >= cols || row >= rows || col + spanX <= 0 || row + spanY <= 0) { c.style.display = 'none'; return; } // falls outside the frame
        if (col < 0) { spanX += col; col = 0; }
        if (row < 0) { spanY += row; row = 0; }
        spanX = Math.min(spanX, cols - col);
        spanY = Math.min(spanY, rows - row);
        const cells = [];
        for (let i = col; i < col + spanX; i++) for (let j = row; j < row + spanY; j++) cells.push(i + ',' + j);
        if (cells.some((k) => taken.has(k))) { c.style.display = 'none'; return; }
        cells.forEach((k) => taken.add(k));
        c.style.width = pct(spanX, cols);
        c.style.height = pct(spanY, rows);
        if (fromRight) { c.style.left = 'auto'; c.style.right = pct(cols - col - spanX, cols); }
        else { c.style.right = 'auto'; c.style.left = pct(col, cols); }
        if (fromBottom) { c.style.top = 'auto'; c.style.bottom = pct(rows - row - spanY, rows); }
        else { c.style.bottom = 'auto'; c.style.top = pct(row, rows); }
      });
      set.setAttribute('data-cube-grid', cols + 'x' + rows);
    };
    const ro = new ResizeObserver((entries) => entries.forEach((e) => snap(e.target)));
    sets.forEach((set) => { snap(set); ro.observe(set); });
  }, 'early');

  /* Cubes against the edge of a photo never animate on their own */
  LL.register('cubeEdges', () => {
    document.querySelectorAll('[data-cube-set^="edge"] [data-cube], .home-hero_cube').forEach((cube) => {
      const frame = cube.closest('[data-cube-set]') || cube.parentElement;
      if (!frame) return;
      const c = cube.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      if (!c.width || !f.width) return;
      if (Math.abs(c.left - f.left) < 2 || Math.abs(c.right - f.right) < 2) cube.removeAttribute('data-cube');
    });
  }, 'early');

  /* Build-up: cubes grow into place when the image enters the screen (homepage effect, every cube set) */
  LL.register('cubeBuildUp', () => {
    const sets = document.querySelectorAll('[data-cube-set]');
    sets.forEach((set) => set.querySelectorAll('[data-cube]').forEach((cube) => cube.removeAttribute('data-cube')));
    document.querySelectorAll('.home-video_cube, .home-video_bar').forEach((cube) => cube.removeAttribute('data-cube'));
    if (LL.reduceMotion) return;
    const reveal = (elements, trigger) => {
      if (!elements.length) return;
      elements.forEach((el) => gsap.set(el, { transformOrigin: getComputedStyle(el).top !== 'auto' ? 'center top' : 'center bottom' }));
      gsap.from(elements, { scaleY: 0, duration: 0.9, ease: 'expo.out', stagger: { each: 0.07, from: 'start' }, scrollTrigger: { trigger, start: 'top 80%', once: true } });
    };
    sets.forEach((set) => {
      if (getComputedStyle(set).display === 'none') return;
      reveal([...set.querySelectorAll('.u-cube')], set.parentElement || set);
    });
    const video = document.querySelector('.section_home-video');
    if (video) {
      reveal([...video.querySelectorAll('.home-video_cube')], video);
      const bars = video.querySelectorAll('.home-video_bar, .home-video_top-bar');
      if (bars.length) gsap.from(bars, { scaleX: 0, transformOrigin: 'left center', duration: 1.1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: video, start: 'top 80%', once: true } });
    }
  }, 'early');
})();

/* ---- src/global/transition.js ---- */
/* Page transition (Osmo Supply – Basic Pixelated Page Transition, without Barba) + homepage loader.
   Pixel size = the cube size on the images (--ll-cube: 3em, 1.5em on mobile), measured live.
   The tiny pre-paint part (covering the page on arrival) stays inline in the Webflow head. */
(function () {
  const LL = window.LiveLegends;
  const html = LL.html;

  const pixelHorizontalAmount = { desktop: 16, tablet: 12, mobileLandscape: 10, mobile: 8 };
  const transitionDuration = 0.05;
  const pixelStaggerAmount = 0.6;

  const heroColorFor = (pathname) => {
    const p = pathname.replace(/\/+$/, '') || '/';
    if (p === '/about') return LL.cssVar('--_colors---brand--red');
    if (p === '/people') return LL.cssVar('--_colors---brand--yellow');
    if (/^\/(projects|work)\/.+/.test(p)) return LL.cssVar('--_colors---neutral--darkest');
    return LL.cssVar('--_colors---neutral--lightest');
  };

  function ensureTransitionMarkup() {
    if (document.querySelector('[data-transition-wrap]')) return;
    const wrap = document.createElement('div'); wrap.className = 'transition'; wrap.setAttribute('data-transition-wrap', '');
    const panel = document.createElement('div'); panel.className = 'transition__panel'; panel.setAttribute('data-transition-panel', '');
    const col = document.createElement('div'); col.className = 'transition__col'; col.setAttribute('data-transition-col', '');
    const pixel = document.createElement('div'); pixel.className = 'transition__pixel'; pixel.setAttribute('data-transition-pixel', '');
    col.appendChild(pixel); panel.appendChild(col); wrap.appendChild(panel); document.body.appendChild(wrap);
  }

  function cubeSizePx() {
    const probe = document.createElement('div');
    probe.className = 'u-cube';
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;width:var(--ll-cube,3em);height:var(--ll-cube,3em);';
    (document.querySelector('.main-wrapper') || document.body).appendChild(probe);
    const size = probe.getBoundingClientRect().width;
    probe.remove();
    return size;
  }

  function fallbackColumns() {
    const width = window.innerWidth;
    const isLandscape = window.innerWidth > window.innerHeight;
    if (width <= 479) return pixelHorizontalAmount.mobile;
    if (width <= 767) return isLandscape ? pixelHorizontalAmount.mobileLandscape : pixelHorizontalAmount.mobile;
    if (width <= 991) return pixelHorizontalAmount.tablet;
    return pixelHorizontalAmount.desktop;
  }

  function pixelGrid() {
    const panel = document.querySelector('[data-transition-panel]');
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    let size = cubeSizePx();
    if (!size || size < 4) size = rect.width / fallbackColumns();
    const horizontalAmount = Math.ceil(rect.width / size);
    const crossAmount = Math.ceil(rect.height / size);
    Object.assign(panel.style, { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-start', overflow: 'hidden' });
    let lines = panel.querySelectorAll('[data-transition-col]');
    const lineTemplate = lines[0];
    const pixelTemplate = lineTemplate.querySelector('[data-transition-pixel]');
    if (lines.length !== horizontalAmount) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < horizontalAmount; i++) frag.appendChild(lineTemplate.cloneNode(false));
      panel.replaceChildren(frag);
      lines = panel.querySelectorAll('[data-transition-col]');
    }
    lines.forEach((line) => {
      Object.assign(line.style, { display: 'flex', flexDirection: 'column', flex: '0 0 ' + size + 'px', width: size + 'px', justifyContent: 'flex-start' });
      const diff = crossAmount - line.childElementCount;
      if (diff > 0) {
        const frag = document.createDocumentFragment();
        for (let i = 0; i < diff; i++) frag.appendChild(pixelTemplate.cloneNode(true));
        line.appendChild(frag);
      } else if (diff < 0) {
        for (let i = diff; i < 0; i++) line.lastElementChild.remove();
      }
      line.querySelectorAll('[data-transition-pixel]').forEach((px) => {
        Object.assign(px.style, { flex: '0 0 auto', width: size + 'px', height: size + 'px' });
      });
    });
  }

  function runPageLeaveAnimation(color) {
    pixelGrid();
    const wrap = document.querySelector('[data-transition-wrap]');
    if (color) wrap.style.setProperty('--_colors---brand--red', color);
    const panel = document.querySelector('[data-transition-panel]');
    const pixels = panel.querySelectorAll('[data-transition-pixel]');
    const tl = gsap.timeline();
    tl.set(panel, { opacity: 1, pointerEvents: 'none' }, 0);
    tl.set(pixels, { opacity: 0 }, 0);
    tl.to(pixels, { opacity: 1, duration: transitionDuration, ease: 'none', stagger: { amount: pixelStaggerAmount, from: 'random' } }, 0);
    return tl;
  }

  function runPageEnterAnimation() {
    pixelGrid();
    const panel = document.querySelector('[data-transition-panel]');
    const pixels = panel.querySelectorAll('[data-transition-pixel]');
    gsap.set(panel, { opacity: 1 });
    gsap.set(pixels, { opacity: 1 });
    html.classList.remove('is-transitioning');
    const tl = gsap.timeline({ onComplete: () => { gsap.set(panel, { opacity: 0 }); html.style.removeProperty('--_colors---brand--red'); } });
    tl.to(pixels, { opacity: 0, duration: transitionDuration, ease: 'none', stagger: { amount: pixelStaggerAmount, from: 'random' }, overwrite: 'auto' }, 0.05);
    return tl;
  }

  LL.register('pageTransition', () => {
    ensureTransitionMarkup();
    if (html.classList.contains('is-transitioning')) runPageEnterAnimation();
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || a.target === '_blank' || a.hasAttribute('download') || /^(mailto|tel|javascript):/i.test(href)) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (LL.reduceMotion) return;
      e.preventDefault();
      LL.stopScroll();
      const color = heroColorFor(url.pathname);
      try { sessionStorage.setItem('ll-transition', '1'); sessionStorage.setItem('ll-transition-color', color); } catch (err) {}
      runPageLeaveAnimation(color).eventCallback('onComplete', () => { window.location.href = url.href; });
    });
    window.addEventListener('pageshow', (e) => {
      if (!e.persisted) return;
      html.classList.remove('is-transitioning');
      html.style.removeProperty('--_colors---brand--red');
      const panel = document.querySelector('[data-transition-panel]');
      if (panel) gsap.set(panel, { opacity: 0 });
      LL.startScroll();
    });
  });

  /* Homepage loader: the hero video opens out of the logo shape */
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];
  const logoPolygon = (A, B, C, D2) => 'polygon(' + [...rect(...A), ...rect(...B), [0, 0], ...rect(...C), [0, 0], ...rect(...D2)].map((p) => p[0] + '% ' + p[1] + '%').join(', ') + ')';
  const LOGO_START = logoPolygon([0, 0, 30, 66.667], [40, 0, 70, 33.333], [70, 33.333, 100, 100], [30, 66.667, 60, 100]);
  const LOGO_END = logoPolygon([0, 0, 50, 66.667], [50, 0, 100, 33.333], [50, 33.333, 100, 100], [0, 66.667, 50, 100]);

  LL.register('loader', () => {
    const loader = document.querySelector('[data-loader]');
    const media = document.querySelector('[data-loader-target]');
    const content = [...document.querySelectorAll('.navbar_component, .home-hero_content-inner')];
    const cubes = [...document.querySelectorAll('.home-hero_cube')];
    const done = () => {
      html.classList.remove('is-loading');
      if (loader) loader.style.display = 'none';
      if (media) { media.classList.remove('is-loader-state'); gsap.set(media, { clearProps: 'opacity,visibility,zIndex,clipPath,transform,width,height' }); }
      gsap.set([...content, ...cubes], { clearProps: 'opacity,visibility,transform' });
      LL.startScroll();
      requestAnimationFrame(() => ScrollTrigger.refresh(true));
      window.dispatchEvent(new Event('loader:done'));
    };
    if (!html.classList.contains('is-loading')) return;
    if (!loader || !media || LL.reduceMotion) { done(); return; }
    LL.stopScroll();
    window.scrollTo(0, 0);
    gsap.set([...content, ...cubes], { autoAlpha: 0 });
    media.classList.add('is-loader-state');
    gsap.set(media, { clipPath: LOGO_START, autoAlpha: 0, scale: 0.94 });
    gsap.to(media, { autoAlpha: 1, scale: 1, duration: LL.D.slow, ease: LL.EASE });
    const progress = document.createElement('div');
    progress.className = 'loader_progress';
    loader.appendChild(progress);
    const progressTween = gsap.fromTo(progress, { scaleX: 0 }, { scaleX: 0.9, duration: 2.2, ease: 'power1.out', transformOrigin: 'left center' });
    const video = media.querySelector('video');
    const videoReady = new Promise((resolve) => {
      if (!video || video.readyState >= 3) return resolve();
      video.addEventListener('canplay', resolve, { once: true });
      setTimeout(resolve, 2000);
    });
    const hold = new Promise((resolve) => setTimeout(resolve, 600));
    Promise.all([videoReady, hold, document.fonts.ready]).then(() => {
      progressTween.kill();
      gsap.to(progress, { scaleX: 1, duration: 0.3, ease: LL.EASE, transformOrigin: 'left center' });
      gsap.set(media, { clearProps: 'scale,transform' });
      const state = Flip.getState(media);
      media.classList.remove('is-loader-state');
      gsap.set(media, { zIndex: 101, autoAlpha: 1 });
      gsap.timeline({ onComplete: done })
        .add(Flip.from(state, { duration: 1.5, ease: LL.EASE_IO, scale: false }), 0.25)
        .fromTo(media, { clipPath: LOGO_START }, { clipPath: LOGO_END, duration: 1.5, ease: LL.EASE_IO }, 0.25)
        .to(loader, { autoAlpha: 0, duration: 0.7, ease: LL.EASE }, 0.9)
        .call(() => window.dispatchEvent(new Event('loader:reveal')), null, 1.05)
        .fromTo(content, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: LL.D.base, ease: LL.EASE, stagger: 0.06 }, 1.1)
        .to(cubes, { autoAlpha: 1, duration: 0.01, stagger: { each: 0.06, from: 'random' } }, 1.3);
    });
  }, 'last');
})();

/* ---- src/global/media.js ---- */
/* Media: image parallax, background + preview videos, fullscreen video player */
(function () {
  const LL = window.LiveLegends;

  /* Parallax on every photo (.u-cover). Skipped where another animation owns the image.
     Set up before the homepage loader (phase 'ready'), so the hero image does not jump after the Flip.
     No slide on load: every photo jumps straight to its scroll position on load, after the loader and after
     each refresh, so it never visibly moves against the text background. Photos already in view start at the
     beginning of their range (clamp). The shift (6%) stays inside the zoom margin (scale 1.16 = 8% per side),
     so no white edge appears while scrolling. */
  const PARALLAX = { shift: 6, scale: 1.16, scrub: 1 };
  const PARALLAX_SELECTOR = '.u-cover, [data-parallax]';
  const PARALLAX_SKIP = '[data-infinite-grid-init], .lab-modal, .team-card, .navbar_component, .thrive_image-item, .hero-split_preview, [data-no-parallax]';
  /* Shared check: does this photo get parallax? Also used by sectionReveal (interactions.js),
     because blocks with a parallax photo never get an entrance animation. */
  LL.isParallaxImage = (img) => !!img.parentElement && !img.closest(PARALLAX_SKIP);
  LL.hasParallaxImage = (scope) => [...scope.querySelectorAll(PARALLAX_SELECTOR)].some(LL.isParallaxImage);
  LL.register('imageMotion', () => {
    if (LL.reduceMotion) return;
    const tweens = [];
    document.querySelectorAll(PARALLAX_SELECTOR).forEach((img) => {
      const frame = img.parentElement;
      if (!LL.isParallaxImage(img)) return;
      if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
      frame.style.overflow = 'hidden';
      gsap.set(img, { scale: PARALLAX.scale, transformOrigin: 'center center', willChange: 'transform' });
      tweens.push(gsap.fromTo(img, { yPercent: -PARALLAX.shift }, {
        yPercent: PARALLAX.shift,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'clamp(top bottom)', end: 'bottom top', scrub: PARALLAX.scrub, invalidateOnRefresh: true }
      }));
    });
    const snap = () => tweens.forEach((t) => { if (t.scrollTrigger) t.progress(t.scrollTrigger.progress); });
    snap();
    ScrollTrigger.addEventListener('refresh', snap);
    window.addEventListener('loader:done', () => { ScrollTrigger.refresh(); snap(); }, { once: true });
  });

  /* Background videos ([data-hero-video]) and the small "Play video" preview cards ([data-hero-preview]) */
  LL.register('backgroundVideos', () => {
    document.querySelectorAll('[data-hero-video]').forEach((video) => {
      const scope = video.parentElement;
      const holder = scope.querySelector('[data-bg-video-url]') || scope.querySelector('[data-video-url]') || (video.closest('section') && video.closest('section').querySelector('[data-video-url]'));
      const url = holder ? holder.textContent.trim() : '';
      if (!url) { video.remove(); return; }
      video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true;
      video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
      if (holder && holder.hasAttribute('data-bg-video-url')) {
        video.style.opacity = '0'; video.style.transition = 'opacity 1s ease';
        video.addEventListener('playing', () => { video.style.opacity = '1'; }, { once: true });
      }
      video.src = url; video.load();
      const play = () => video.play().catch(() => {});
      play(); video.addEventListener('canplay', play, { once: true });
    });
    document.querySelectorAll('[data-hero-preview]').forEach((preview) => {
      const group = preview.closest('[data-video-modal-group]');
      const holder = group && group.querySelector('[data-video-url]');
      const url = holder ? holder.textContent.trim() : '';
      if (!url) { preview.style.display = 'none'; return; }
      const video = preview.querySelector('[data-hero-preview-video]');
      if (video && !LL.getEmbedUrl(url)) { video.muted = true; video.playsInline = true; video.loop = true; video.src = url; video.play().catch(() => {}); }
    });
  });

  /* Fullscreen video player: grows out of the clicked preview, YouTube/Vimeo or a video file */
  const ICON_PLAY = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="M8.5 5.8v12.4L18.5 12z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><rect x="7.5" y="5.5" width="2" height="13" fill="currentColor"/><rect x="14.5" y="5.5" width="2" height="13" fill="currentColor"/></svg>';
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  LL.register('videoModals', () => {
    document.querySelectorAll('[data-video-modal-group]').forEach((group) => {
      const trigger = group.querySelector('[data-video-modal-open]');
      const modal = group.querySelector('[data-video-modal]');
      if (!trigger || !modal) return;
      const holder = group.querySelector('[data-video-url]');
      const getUrl = () => (holder ? holder.textContent.trim() : '');
      if (trigger.hasAttribute('data-hero-preview') && !getUrl()) { trigger.style.display = 'none'; return; }
      document.body.appendChild(modal);
      modal.style.transition = 'none';
      const player = modal.querySelector('.video-modal_player') || modal.firstElementChild;
      const controls = modal.querySelectorAll('.video-modal_controls, .video-modal_close');
      const video = modal.querySelector('[data-video-modal-video]');
      const embed = modal.querySelector('[data-video-modal-embed]');
      const toggle = modal.querySelector('[data-video-toggle]');
      const progress = modal.querySelector('[data-video-progress]');
      const fill = modal.querySelector('[data-video-progress-fill]');
      const time = modal.querySelector('[data-video-time]');
      const mute = modal.querySelector('[data-video-mute]');
      if (toggle && toggle.children.length >= 2) { toggle.children[0].innerHTML = ICON_PLAY; toggle.children[1].innerHTML = ICON_PAUSE; }
      const setState = () => {
        const playing = !video.paused;
        modal.setAttribute('data-video-state', playing ? 'playing' : 'paused');
        if (toggle && toggle.children.length >= 2) { toggle.children[0].style.display = playing ? 'none' : 'flex'; toggle.children[1].style.display = playing ? 'flex' : 'none'; }
      };
      const sourceRect = () => (trigger.querySelector('img, video') || trigger).getBoundingClientRect();
      let tl = null;
      let isOpen = false;
      const open = () => {
        if (isOpen) return;
        isOpen = true;
        const url = getUrl();
        const embedUrl = url ? LL.getEmbedUrl(url) : null;
        if (embedUrl && embed) { modal.setAttribute('data-video-embed', 'true'); embed.innerHTML = '<iframe src="' + embedUrl + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Film"></iframe>'; }
        else { modal.setAttribute('data-video-embed', 'false'); if (url && video.getAttribute('src') !== url) video.src = url; if (url) video.play().catch(() => {}); }
        const from = sourceRect();
        if (tl) tl.kill();
        gsap.set(player, { clearProps: 'transform' });
        gsap.set(modal, { autoAlpha: 0 });
        modal.setAttribute('data-video-modal-status', 'active');
        modal.setAttribute('aria-hidden', 'false');
        LL.stopScroll();
        setState();
        if (LL.reduceMotion || !player) { gsap.set(modal, { autoAlpha: 1 }); return; }
        const to = player.getBoundingClientRect();
        gsap.set(player, { transformOrigin: '0 0', x: from.left - to.left, y: from.top - to.top, scaleX: from.width / to.width, scaleY: from.height / to.height });
        if (controls.length) gsap.set(controls, { autoAlpha: 0 });
        tl = gsap.timeline()
          .to(modal, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' }, 0)
          .to(player, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 1.1, ease: LL.EASE_IO }, 0)
          .to(controls, { autoAlpha: 1, duration: LL.D.base, ease: LL.EASE }, 0.7);
      };
      const close = () => {
        if (!isOpen) return;
        isOpen = false;
        video.pause();
        if (embed) embed.innerHTML = '';
        const finish = () => {
          modal.setAttribute('data-video-modal-status', 'not-active');
          modal.setAttribute('aria-hidden', 'true');
          gsap.set(player, { clearProps: 'transform' });
          gsap.set(controls, { clearProps: 'opacity,visibility' });
          gsap.set(modal, { clearProps: 'opacity,visibility' });
          LL.startScroll();
        };
        if (tl) tl.kill();
        if (LL.reduceMotion || !player) { gsap.set(modal, { autoAlpha: 0 }); finish(); return; }
        const cur = player.getBoundingClientRect();
        const to = sourceRect();
        const x = Number(gsap.getProperty(player, 'x')) || 0;
        const y = Number(gsap.getProperty(player, 'y')) || 0;
        const sx = Number(gsap.getProperty(player, 'scaleX')) || 1;
        const sy = Number(gsap.getProperty(player, 'scaleY')) || 1;
        gsap.set(player, { transformOrigin: '0 0' });
        tl = gsap.timeline({ onComplete: () => { gsap.set(modal, { autoAlpha: 0 }); finish(); } })
          .to(controls, { autoAlpha: 0, duration: 0.2 }, 0)
          .to(player, { x: x + (to.left - cur.left), y: y + (to.top - cur.top), scaleX: sx * (to.width / cur.width), scaleY: sy * (to.height / cur.height), duration: 0.8, ease: LL.EASE_IO }, 0)
          .to(modal, { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, 0.5);
      };
      trigger.addEventListener('click', open);
      LL.onKeyActivate(trigger, open);
      modal.querySelectorAll('[data-video-modal-close]').forEach((el) => el.addEventListener('click', close));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); });
      if (toggle) toggle.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
      video.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
      ['play', 'pause', 'ended'].forEach((ev) => video.addEventListener(ev, setState));
      video.addEventListener('timeupdate', () => {
        const p = video.duration ? video.currentTime / video.duration : 0;
        if (fill) fill.style.transform = 'scaleX(' + p + ')';
        if (time) time.textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration);
      });
      if (progress) progress.addEventListener('click', (e) => { const r = progress.getBoundingClientRect(); if (video.duration) video.currentTime = ((e.clientX - r.left) / r.width) * video.duration; });
      if (mute) mute.addEventListener('click', () => { video.muted = !video.muted; mute.textContent = video.muted ? 'Sound on' : 'Sound off'; });
      setState();
    });
  });
})();

/* ---- src/global/interactions.js ---- */
/* Interactions: split text, section reveal, magnetic buttons, cursor label, marquee, On air dot */
(function () {
  const LL = window.LiveLegends;

  /* Headings with data-split reveal line by line */
  LL.register('splitText', () => {
    document.fonts.ready.then(() => LL.safe('splitText', () => {
      document.querySelectorAll('[data-split]').forEach((el) => {
        if (LL.reduceMotion) { gsap.set(el, { visibility: 'visible' }); return; }
        SplitText.create(el, {
          type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
          onSplit(self) {
            gsap.set(el, { visibility: 'visible' });
            const long = self.lines.length > 3;
            return gsap.from(self.lines, { yPercent: 110, duration: long ? 0.8 : LL.D.slow, ease: LL.EASE, stagger: long ? 0.04 : 0.12, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
          }
        });
      });
    }));
  }, 'afterLoader');

  /* Sections: content settles in. Never on a block with a parallax photo: the entrance (y + fade) on top of the
     parallax made the photo visibly slide up against the text background (feedback Bas/Gordana). Those blocks
     only get their parallax; headings with data-split inside them still reveal line by line. */
  const SECTION_SELECTOR = '.section_story, .section_image-wide, .section_cta-image, .section_home-split, .section_people-cta, .section_news';
  LL.register('sectionReveal', () => {
    if (LL.reduceMotion) return;
    document.querySelectorAll(SECTION_SELECTOR).forEach((section) => {
      if (LL.hasParallaxImage && LL.hasParallaxImage(section)) return;
      const inner = section.querySelector('.padding-global') || section.firstElementChild;
      if (!inner) return;
      gsap.from(inner, { y: 32, autoAlpha: 0, duration: LL.D.slow, ease: LL.EASE, scrollTrigger: { trigger: section, start: 'top 82%', once: true }, clearProps: 'opacity,visibility,transform' });
    });
  }, 'afterLoader');

  /* Subtle magnetic buttons */
  LL.register('magnetic', () => {
    if (LL.reduceMotion || !LL.canHover()) return;
    const STRENGTH = 0.12;
    const MAX = 4;
    document.querySelectorAll('.button, .link_component, .work-detail-gallery_button, .footer_cta-button').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: gsap.utils.clamp(-MAX, MAX, (e.clientX - (r.left + r.width / 2)) * STRENGTH), y: gsap.utils.clamp(-MAX, MAX, (e.clientY - (r.top + r.height / 2)) * STRENGTH), duration: LL.D.fast, ease: LL.EASE, overwrite: 'auto' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: LL.D.base, ease: LL.EASE, overwrite: 'auto' }));
    });
  });

  /* Cursor label on cards and video */
  const CURSOR_LABELS = [['.news-card', 'Read'], ['.work-card, .work-detail-related_item', 'View project'], ['[data-thrive-link]', 'View work'], ['.home-video_component', 'Play'], ['.hero-split_preview', 'Play tour']];
  LL.register('cursorLabel', () => {
    if (LL.reduceMotion || !LL.canHover()) return;
    const label = document.createElement('div');
    label.className = 'u-cursor-label';
    document.body.appendChild(label);
    const setX = gsap.quickTo(label, 'x', { duration: 0.35, ease: LL.EASE });
    const setY = gsap.quickTo(label, 'y', { duration: 0.35, ease: LL.EASE });
    gsap.set(label, { autoAlpha: 0, scale: 0.8, xPercent: -50, yPercent: -50 });
    let used = false;
    CURSOR_LABELS.forEach(([selector, text]) => {
      document.querySelectorAll(selector).forEach((el) => {
        used = true;
        el.addEventListener('mouseenter', () => { label.textContent = text; gsap.to(label, { autoAlpha: 1, scale: 1, duration: LL.D.fast, ease: LL.EASE }); });
        el.addEventListener('mouseleave', () => gsap.to(label, { autoAlpha: 0, scale: 0.8, duration: LL.D.fast, ease: LL.EASE }));
      });
    });
    if (!used) { label.remove(); return; }
    window.addEventListener('mousemove', (e) => { setX(e.clientX); setY(e.clientY); });
  });

  /* Marquee that speeds up with scroll velocity */
  LL.register('marquee', () => {
    document.querySelectorAll('[data-marquee]').forEach((marquee) => {
      const track = marquee.querySelector('[data-marquee-track]');
      if (!track || LL.reduceMotion) return;
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.parentElement.appendChild(clone);
      const loop = gsap.to([track, clone], { xPercent: -100, duration: parseFloat(marquee.getAttribute('data-marquee-duration')) || 40, ease: 'none', repeat: -1 });
      ScrollTrigger.create({
        trigger: marquee, start: 'top bottom', end: 'bottom top',
        onUpdate: (self) => {
          const boost = 1 + Math.min(4, Math.abs(self.getVelocity()) / 600);
          gsap.to(loop, { timeScale: boost, duration: 0.2, overwrite: true, onComplete: () => gsap.to(loop, { timeScale: 1, duration: 1.2 }) });
        }
      });
    });
  });

  /* On air: blinking dot */
  LL.register('onAir', () => {
    if (LL.reduceMotion) return;
    document.querySelectorAll('[data-onair]').forEach((el) => gsap.to(el, { opacity: 0.15, duration: 0.8, repeat: -1, yoyo: true, ease: 'steps(1)' }));
  });
})();

/* ---- src/global/components.js ---- */
/* Component helpers: empty CMS fields, read more, related project, Split Content carousel, mailto links */
(function () {
  const LL = window.LiveLegends;

  /* Phone links from text, hide empty CMS links and buttons, mailto from text */
  LL.register('emptyFields', () => {
    document.querySelectorAll('[data-tel]').forEach((a) => { const n = a.textContent.replace(/[^+\d]/g, ''); if (n) a.setAttribute('href', 'tel:' + n); });
    document.querySelectorAll('[data-mailto]').forEach((a) => { const email = a.textContent.trim(); if (email) a.setAttribute('href', 'mailto:' + email); });
    document.querySelectorAll('[data-hide-empty]').forEach((el) => {
      const href = el.getAttribute('href');
      const txt = el.textContent.replace('>', '').trim();
      if (!txt || href === 'mailto:' || href === 'tel:' || href === '#') el.style.display = 'none';
    });
  });

  /* Read more with the plus (project pages and Split Content). Hidden when there is no text. */
  LL.register('readMore', () => {
    document.querySelectorAll('[data-readmore]').forEach((group) => {
      const toggle = group.querySelector('[data-readmore-toggle]');
      const content = group.querySelector('[data-readmore-content]');
      const label = group.querySelector('[data-readmore-label]');
      if (!toggle || !content) return;
      if (!content.textContent.trim()) { toggle.style.display = 'none'; return; }
      let open = false;
      const set = (state) => {
        open = state;
        group.setAttribute('data-readmore-status', open ? 'open' : 'closed');
        toggle.setAttribute('aria-expanded', String(open));
        if (label) label.textContent = open ? 'Read less' : 'Read more';
        const inner = content.firstElementChild;
        if (LL.reduceMotion) { gsap.set(content, { height: open ? 'auto' : 0 }); ScrollTrigger.refresh(); return; }
        if (open) {
          gsap.fromTo(content, { height: content.offsetHeight }, { height: content.scrollHeight, duration: LL.D.slow, ease: LL.EASE_IO, onComplete: () => { gsap.set(content, { height: 'auto' }); ScrollTrigger.refresh(); } });
          if (inner) gsap.fromTo(inner, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: LL.D.base, ease: LL.EASE, delay: 0.25 });
        } else {
          if (inner) gsap.to(inner, { autoAlpha: 0, y: -8, duration: 0.3, ease: LL.EASE });
          gsap.fromTo(content, { height: content.offsetHeight }, { height: 0, duration: LL.D.base, ease: LL.EASE_IO, delay: 0.1, onComplete: () => ScrollTrigger.refresh() });
        }
      };
      toggle.addEventListener('click', () => set(!open));
      LL.onKeyActivate(toggle, () => set(!open));
    });
    document.querySelectorAll('[data-download-link]').forEach((a) => { const href = a.getAttribute('href'); if (!href || href === '#') a.style.display = 'none'; });
  });

  /* Related project: show one, never the current one */
  LL.register('related', () => {
    const blocks = [...document.querySelectorAll('[data-related-item]')];
    if (!blocks.length) return;
    let shown = 0;
    blocks.forEach((block) => {
      const item = block.closest('.w-dyn-item') || block;
      const link = block.querySelector('[data-related-link]');
      const isCurrent = link && new URL(link.href, window.location.href).pathname === window.location.pathname;
      if (isCurrent || shown >= 1) item.style.display = 'none'; else shown++;
    });
    if (!shown) { const s = document.querySelector('.section_work-detail-related'); if (s) s.style.display = 'none'; }
  });

  /* Split Content carousel: crossfade, autoplay 5 s, swipe, arrows. Shown only when "Use carousel" is on (CSS). */
  LL.register('carousel', () => {
    const SLIDES = '[data-carousel-slide], .carousel_slide';
    document.querySelectorAll('[data-carousel]').forEach((c) => {
      const slides = [...c.querySelectorAll(SLIDES)];
      if (!slides.length) { c.style.display = 'none'; return; }
      let i = 0;
      let timer;
      const go = (n) => {
        i = (n + slides.length) % slides.length;
        slides.forEach((s, k) => { s.style.opacity = k === i ? '1' : '0'; s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      };
      const play = () => { clearInterval(timer); if (slides.length > 1 && !LL.reduceMotion) timer = setInterval(() => go(i + 1), 5000); };
      const prev = c.querySelector('[data-carousel-prev]');
      const next = c.querySelector('[data-carousel-next]');
      if (slides.length < 2) { if (prev) prev.style.display = 'none'; if (next) next.style.display = 'none'; }
      const bind = (btn, d) => {
        if (!btn) return;
        btn.addEventListener('click', () => { go(i + d); play(); });
        LL.onKeyActivate(btn, () => { go(i + d); play(); });
      };
      bind(prev, -1);
      bind(next, 1);
      let startX = null;
      c.addEventListener('pointerdown', (e) => { startX = e.clientX; });
      c.addEventListener('pointerup', (e) => {
        if (startX === null) return;
        const d = e.clientX - startX;
        startX = null;
        if (Math.abs(d) > 40) { go(d < 0 ? i + 1 : i - 1); play(); }
      });
      c.addEventListener('mouseenter', () => clearInterval(timer));
      c.addEventListener('mouseleave', play);
      go(0);
      play();
    });
  });
})();

/* ---- src/global/section-dock.js ---- */
/* Section anchor dock (Osmo Supply) – the bottom menu on Services and Facilities.
   Hidden on the hero, shown from the second section, hidden again over the footer.
   The Work page uses its own simple bottom bar (src/pages/work.js). */
(function () {
  const LL = window.LiveLegends;

  LL.register('sectionDock', () => {
    if (document.querySelector('[data-work-list]')) return;
    const footer = document.querySelector('.footer_component');
    if (footer) footer.setAttribute('data-section-dock-hide', '');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canHover = window.matchMedia('(hover: hover)');

    document.querySelectorAll('[data-section-dock-init]').forEach((dock) => {
      const pill = dock.querySelector('[data-section-dock-pill]');
      const toggle = dock.querySelector('[data-section-dock-toggle]');
      const labelWrap = dock.querySelector('[data-section-dock-label-wrap]');
      const list = dock.querySelector('[data-section-dock-list]');
      const indicator = dock.querySelector('[data-section-dock-indicator]');
      const links = list ? Array.from(list.querySelectorAll('[data-section-dock-link]')) : [];
      const sections = links.map((link) => { const href = link.getAttribute('href'); return href && href.charAt(0) === '#' ? document.querySelector(href) : null; });
      const labelTemplate = labelWrap ? labelWrap.firstElementChild : null;
      if (!pill || !toggle || !labelWrap || !labelTemplate || !list || !indicator || links.length < 2 || sections.some((s) => !s)) return;

      let activeIndex = Math.max(0, links.findIndex((l) => l.hasAttribute('data-active')));
      let open = false;
      let dockTl = null;
      const rect = { x: 0, y: 0, w: 0, h: 0 };
      const motion = 'bouncy'; // 'bouncy' | 'smooth'
      const smooth = () => motion === 'smooth' || reduceMotion.matches;
      const dur = (d) => (reduceMotion.matches ? 0 : d);
      const ease = (bouncy, calm) => (smooth() ? calm : bouncy);

      gsap.set(pill, { transformOrigin: '50% 100%' });

      const syncLinkState = () => links.forEach((l, i) => {
        l.toggleAttribute('data-active', i === activeIndex);
        if (i === activeIndex) l.setAttribute('aria-current', 'location');
        else l.removeAttribute('aria-current');
      });
      const buildLabel = (index) => { const span = labelTemplate.cloneNode(false); span.innerHTML = links[index].innerHTML; return span; };
      const setLabel = (index) => { labelWrap.textContent = ''; labelWrap.appendChild(buildLabel(index)); gsap.set(labelWrap, { width: 'auto' }); };

      function swapLabel(index, movingDown) {
        const olds = Array.from(labelWrap.children);
        const startWidth = labelWrap.offsetWidth;
        gsap.killTweensOf(labelWrap);
        olds.forEach((old) => {
          gsap.killTweensOf(old);
          gsap.set(old, { position: 'absolute', top: 0, left: 0 });
          gsap.to(old, { yPercent: movingDown ? -120 : 120, autoAlpha: 0, duration: dur(0.35), ease: 'power2.out', onComplete: () => old.remove() });
        });
        const next = buildLabel(index);
        labelWrap.appendChild(next);
        gsap.set(labelWrap, { width: 'auto' });
        const targetWidth = next.offsetWidth;
        gsap.fromTo(labelWrap, { width: startWidth }, { width: targetWidth, duration: dur(0.45), ease: ease('back.out(1.6)', 'power3.out') });
        gsap.fromTo(next, { yPercent: movingDown ? 120 : -120, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: dur(0.45), ease: 'power3.out' });
        if (!smooth()) {
          gsap.killTweensOf(pill, 'scaleY');
          gsap.timeline().to(pill, { scaleY: 0.85, duration: 0.15, ease: 'power2.out' }).to(pill, { scaleY: 1, duration: 0.45, ease: 'back.out(2.5)' });
        }
      }

      const rectFor = (link) => ({ x: link.offsetLeft, y: link.offsetTop, w: link.offsetWidth, h: link.offsetHeight });
      const render = () => gsap.set(indicator, { x: rect.x, y: rect.y, width: rect.w, height: rect.h });
      const placeIndicator = (index) => {
        Object.assign(rect, rectFor(links[index]));
        gsap.killTweensOf(rect);
        gsap.killTweensOf(indicator);
        gsap.set(indicator, { scaleX: 1, scaleY: 1 });
        render();
      };

      function hopIndicator(index) {
        const target = rectFor(links[index]);
        gsap.killTweensOf(rect);
        gsap.killTweensOf(indicator);
        if (smooth()) {
          gsap.set(indicator, { scaleX: 1, scaleY: 1 });
          gsap.to(rect, { x: target.x, y: target.y, w: target.w, h: target.h, duration: dur(0.35), ease: 'power3.out', onUpdate: render });
          return;
        }
        const delta = target.y - rect.y;
        const sign = delta === 0 ? 1 : Math.sign(delta);
        const overshoot = gsap.utils.clamp(6, 12, Math.abs(delta) * 0.08) * sign;
        const apexY = gsap.utils.clamp(0, list.clientHeight - target.h, target.y + overshoot);
        gsap.set(indicator, { transformOrigin: '50% 50%' });
        gsap.timeline()
          .to(rect, { x: target.x, y: apexY, w: target.w, h: target.h, duration: 0.35, ease: 'power3.out', onUpdate: render })
          .to(rect, { y: target.y, duration: 0.25, ease: 'power2.inOut', onUpdate: render });
        gsap.timeline()
          .to(indicator, { scaleX: 0.78, duration: 0.15, ease: 'power2.out' })
          .to(indicator, { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'back.out(2.5)' });
      }

      function setActive(index, movingDown) {
        if (index === activeIndex) return;
        activeIndex = index;
        syncLinkState();
        if (open) { setLabel(index); hopIndicator(index); } else { swapLabel(index, movingDown); placeIndicator(index); }
      }

      function openDock() {
        if (open) return;
        open = true;
        toggle.setAttribute('aria-expanded', 'true');
        placeIndicator(activeIndex);
        const fromW = pill.offsetWidth;
        const fromH = pill.offsetHeight;
        if (dockTl) dockTl.kill();
        gsap.set(list, { visibility: 'inherit' });
        gsap.set(pill, { width: fromW, height: fromH });
        gsap.set(links[activeIndex], { yPercent: 0, opacity: 1 });
        dockTl = gsap.timeline()
          .to(pill, { width: list.offsetWidth, height: list.offsetHeight, duration: dur(0.45), ease: ease('back.out(1.4)', 'power3.out') }, 0)
          .to(toggle, { autoAlpha: 0, duration: dur(0.15), ease: 'power1.out' }, 0)
          .to(list, { opacity: 1, duration: dur(0.25), ease: 'power1.out' }, dur(0.05))
          .fromTo(links.filter((l, i) => i !== activeIndex), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: dur(0.25), ease: 'power2.out', stagger: { each: dur(0.05), from: 'end' } }, dur(0.05));
      }

      function closeDock() {
        if (!open) return;
        open = false;
        toggle.setAttribute('aria-expanded', 'false');
        if (dockTl) dockTl.kill();
        dockTl = gsap.timeline({ onComplete: () => { gsap.set(pill, { clearProps: 'width,height' }); gsap.set(list, { visibility: 'hidden' }); gsap.set(links, { yPercent: 0, opacity: 1 }); } })
          .to(pill, { width: toggle.offsetWidth, height: toggle.offsetHeight, duration: dur(0.3), ease: 'power3.out' }, 0)
          .to(list, { opacity: 0, duration: dur(0.15), ease: 'power1.out' }, 0)
          .to(toggle, { autoAlpha: 1, duration: dur(0.25), ease: 'power1.out' }, dur(0.1));
      }

      sections.forEach((section, i) => {
        ScrollTrigger.create({ trigger: section, start: 'top 45%', end: 'bottom 45%', onToggle: (self) => { if (self.isActive) setActive(i, self.direction !== -1); } });
      });

      let isHidden = true;
      let hideTriggers = [];
      let rangeTrigger = null;
      gsap.set(dock, { yPercent: 40, autoAlpha: 0 });
      dock.toggleAttribute('data-hidden', true);

      function updateHidden() {
        const inRange = rangeTrigger ? rangeTrigger.isActive : true;
        const hidden = !inRange || hideTriggers.some((t) => t.isActive);
        if (hidden === isHidden) return;
        isHidden = hidden;
        if (hidden && open) closeDock();
        dock.toggleAttribute('data-hidden', hidden);
        gsap.to(dock, { yPercent: hidden ? 40 : 0, autoAlpha: hidden ? 0 : 1, duration: dur(0.3), ease: hidden ? 'power2.out' : ease('back.out(1.4)', 'power3.out') });
      }

      rangeTrigger = ScrollTrigger.create({ trigger: sections[0], endTrigger: sections[sections.length - 1], start: 'top 45%', end: 'bottom 45%', onToggle: updateHidden });
      hideTriggers = Array.from(document.querySelectorAll('[data-section-dock-hide]')).map((zone) => {
        const offset = parseFloat(zone.getAttribute('data-section-dock-hide'));
        const line = 100 - gsap.utils.clamp(0, 100, Number.isNaN(offset) ? 10 : offset);
        return ScrollTrigger.create({ trigger: zone, start: 'top ' + line + '%', end: 'bottom top', onToggle: updateHidden });
      });

      links.forEach((link) => link.addEventListener('click', () => closeDock()));
      toggle.addEventListener('click', () => { if (open) { closeDock(); return; } openDock(); links[activeIndex].focus(); });
      if (canHover.matches) { dock.addEventListener('mouseenter', openDock); dock.addEventListener('mouseleave', closeDock); }
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && open) { closeDock(); gsap.delayedCall(0.15, () => toggle.focus()); } });
      document.addEventListener('click', (event) => { if (open && !dock.contains(event.target)) closeDock(); });
      dock.addEventListener('focusout', (event) => { if (open && !dock.contains(event.relatedTarget)) closeDock(); });

      function refreshLayout() {
        setLabel(activeIndex);
        placeIndicator(activeIndex);
        if (open) gsap.set(pill, { width: list.offsetWidth, height: list.offsetHeight });
      }
      window.addEventListener('resize', refreshLayout);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshLayout);
      syncLinkState();
      refreshLayout();
    });
  }, 'page');

  /* Step-by-step timeline (Osmo Supply) – for the Process Timeline component, wherever it is placed */
  LL.register('stepTimeline', () => {
    const root = document.querySelector('[data-step-timeline-init]');
    if (!root) return;
    const line = root.querySelector('[data-step-timeline-line]');
    const fill = root.querySelector('[data-step-timeline-fill]');
    const items = Array.from(root.querySelectorAll('[data-step-timeline-item]'));
    if (!line || !fill || !items.length) return;
    const anchors = items.map((item) => item.querySelector('[data-step-timeline-marker]') || item);
    const activationInput = parseFloat(root.dataset.stepTimelineActivation);
    const activation = Number.isNaN(activationInput) ? 0.5 : Math.min(Math.max(activationInput, 0), 1);
    const activationPercent = activation * 100;
    const lastIndex = items.length - 1;
    let anchorFractions = [0];
    function measureLine() {
      if (items.length < 2) { line.style.height = '0px'; anchorFractions = [0]; return; }
      const base = line.parentElement.getBoundingClientRect().top;
      const centers = anchors.map((anchor) => { const box = anchor.getBoundingClientRect(); return box.top + box.height / 2 - base; });
      const firstCenter = centers[0];
      const span = centers[lastIndex] - firstCenter;
      line.style.top = firstCenter + 'px';
      line.style.height = span + 'px';
      anchorFractions = centers.map((center) => (span > 0 ? (center - firstCenter) / span : 0));
    }
    let currentIndex = -2;
    function setCurrentIndex(index) {
      if (index === currentIndex) return;
      currentIndex = index;
      items.forEach((item, i) => {
        const status = index >= 0 && i <= index ? 'active' : 'inactive';
        if (item.getAttribute('data-status') !== status) item.setAttribute('data-status', status);
        item.toggleAttribute('data-current', i === index);
        item.toggleAttribute('data-previous', i === index - 1);
        item.toggleAttribute('data-next', i === index + 1);
      });
    }
    const indexForProgress = (reached, progress) => {
      if (!reached) return -1;
      let index = 0;
      for (let i = 0; i < anchorFractions.length; i++) if (progress + 0.0001 >= anchorFractions[i]) index = i;
      return index;
    };
    const updateFromScroll = (self) => setCurrentIndex(indexForProgress(self.isActive || self.progress >= 1, self.progress));
    setCurrentIndex(-1);
    gsap.set(fill, { transformOrigin: 'top', scaleY: 0 });
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      measureLine();
      ScrollTrigger.addEventListener('refreshInit', measureLine);
      if (items.length > 1) {
        gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: line, start: 'top ' + activationPercent + '%', end: 'bottom ' + activationPercent + '%', scrub: true, onUpdate: updateFromScroll, onToggle: updateFromScroll, onRefresh: updateFromScroll } });
      } else setCurrentIndex(0);
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener('load', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      ScrollTrigger.refresh();
      return () => { window.removeEventListener('load', refresh); ScrollTrigger.removeEventListener('refreshInit', measureLine); };
    });
    mm.add('(prefers-reduced-motion: reduce)', () => { measureLine(); gsap.set(fill, { scaleY: 1 }); setCurrentIndex(lastIndex); });
  }, 'page');
})();

/* ---- src/pages/work.js ---- */
/* Home "Where we thrive" segment menu + Work page: segment filter and bottom bar */
(function () {
  const LL = window.LiveLegends;

  /* Home: hovering a segment swaps the image; links go to the filtered Work page */
  LL.register('thrive', () => {
    document.querySelectorAll('[data-thrive]').forEach((section) => {
      const links = [...section.querySelectorAll('[data-thrive-link]')];
      const images = [...section.querySelectorAll('.thrive_image-item')];
      if (!links.length) return;
      const activate = (i) => {
        links.forEach((l, j) => l.classList.toggle('is-active', i === j));
        images.forEach((img, j) => img.classList.toggle('is-active', i === j));
      };
      links.forEach((link, i) => {
        link.setAttribute('href', '/work?category=' + LL.slugify(link.textContent.replace('>', '')));
        link.addEventListener('mouseenter', () => activate(i));
        link.addEventListener('focus', () => activate(i));
      });
      activate(0);
    });
  });

  /* Work: segment filter chips, built from the Categories CMS intros */
  const WORK_TIMING = { scroll: 1.1, content: LL.D.base, items: LL.D.base, stagger: 0.07 };
  LL.register('workFilter', () => {
    const listWrap = document.querySelector('[data-work-list]');
    const chipWrap = document.querySelector('[data-work-filters]');
    if (!listWrap || !chipWrap) return;
    const introWrap = document.querySelector('[data-work-intros]');
    const results = document.querySelector('[data-work-results]') || listWrap;
    const items = [...listWrap.querySelectorAll('[data-work-item]')];
    const intros = [...document.querySelectorAll('[data-work-intro]')].map((el) => {
      const nameEl = el.querySelector('[data-work-intro-name]');
      const slugEl = el.querySelector('[data-work-intro-slug]');
      const name = nameEl ? nameEl.textContent.trim() : '';
      return { el, name, slug: slugEl && slugEl.textContent.trim() ? slugEl.textContent.trim() : LL.slugify(name) };
    });
    items.forEach((item) => { const cat = item.querySelector('[data-work-item-category]'); item.dataset.category = cat ? cat.textContent.trim() : ''; });
    const showAll = chipWrap.querySelector('[data-work-filter-reset]');
    intros.forEach((c) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'work-hero_chip';
      chip.dataset.workFilter = c.slug;
      chip.setAttribute('aria-pressed', 'false');
      const label = document.createElement('div');
      label.className = 'work-hero_chip-text';
      label.textContent = c.name;
      chip.appendChild(label);
      chipWrap.insertBefore(chip, showAll);
    });
    const chips = [...chipWrap.querySelectorAll('[data-work-filter]')];
    let active = null;
    const setChips = (slug) => chips.forEach((chip) => { const on = chip.dataset.workFilter === slug; chip.classList.toggle('is-active', on); chip.setAttribute('aria-pressed', String(on)); });
    const setUrl = (slug) => { const url = new URL(window.location.href); slug ? url.searchParams.set('category', slug) : url.searchParams.delete('category'); window.history.replaceState(null, '', url); };
    const introOf = (slug) => intros.find((c) => c.slug === slug);
    const render = (slug, animate) => {
      intros.forEach((c) => c.el.classList.toggle('is-active', c.slug === slug));
      items.forEach((item) => item.classList.toggle('is-hidden', !!slug && item.dataset.category !== slug));
      ScrollTrigger.refresh();
      const next = introOf(slug);
      window.dispatchEvent(new CustomEvent('work:filter', { detail: { slug, name: next ? next.name : null } }));
      if (!animate || LL.reduceMotion) return;
      if (next) gsap.fromTo(next.el.children, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: WORK_TIMING.content, ease: LL.EASE, stagger: 0.09, overwrite: true, clearProps: 'opacity,visibility,transform' });
      const visible = items.filter((item) => !item.classList.contains('is-hidden'));
      gsap.fromTo(visible, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: WORK_TIMING.items, ease: LL.EASE, stagger: WORK_TIMING.stagger, delay: 0.1, overwrite: true, clearProps: 'opacity,visibility,transform' });
    };
    const apply = (slug) => {
      slug = slug || null;
      if (slug === active) return;
      active = slug;
      setChips(slug);
      setUrl(slug);
      render(slug, true);
      LL.smoothScrollTo(introWrap || results, -48, WORK_TIMING.scroll);
    };
    chips.forEach((chip) => chip.addEventListener('click', () => apply(chip.dataset.workFilter === active ? null : chip.dataset.workFilter)));
    document.querySelectorAll('[data-work-filter-reset]').forEach((el) => {
      const reset = (e) => { e.preventDefault(); apply(null); };
      el.addEventListener('click', reset);
      LL.onKeyActivate(el, reset);
    });
    const initial = new URLSearchParams(window.location.search).get('category');
    if (initial && introOf(initial)) {
      active = initial;
      setChips(initial);
      setTimeout(() => render(initial, true), 0);
      const go = () => LL.smoothScrollTo(introWrap || results, -48, 1.2);
      if (document.readyState === 'complete') setTimeout(go, 450);
      else window.addEventListener('load', () => setTimeout(go, 250), { once: true });
    }
  });

  /* Work: simple bottom bar. Left: back to the filters. Right: the segment you are looking at. */
  LL.register('workBar', () => {
    if (!document.querySelector('[data-work-list]')) return;
    const dock = document.querySelector('[data-section-dock-init]');
    const projects = document.getElementById('projects');
    if (!dock || !projects) return;
    const toggle = dock.querySelector('[data-section-dock-toggle]');
    const list = dock.querySelector('[data-section-dock-list]');
    const indicator = dock.querySelector('[data-section-dock-indicator]');
    const items = dock.querySelector('.section-dock__items');
    const links = [...dock.querySelectorAll('[data-section-dock-link]')];
    if (!list || !items || links.length < 2) return;
    if (toggle) toggle.style.display = 'none';
    if (indicator) indicator.style.display = 'none';
    Object.assign(list.style, { position: 'static', opacity: '1', visibility: 'visible', padding: '0.375em', width: 'auto' });
    Object.assign(items.style, { flexDirection: 'row', alignItems: 'center', gap: '0.375em' });
    links.forEach((l) => Object.assign(l.style, { color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75em', height: '3.125em', padding: '0 2em', textAlign: 'center', whiteSpace: 'nowrap' }));
    dock.querySelectorAll('.section-dock__link-num').forEach((n) => { n.style.display = 'none'; });
    const back = links[0].querySelector('span:not(.section-dock__link-num), div:not(.section-dock__link-num)');
    if (back && !links[0].querySelector('[data-dock-arrow]')) {
      back.textContent = 'Back to filters';
      const arrow = document.createElement('span');
      arrow.textContent = '\u2191';
      arrow.setAttribute('data-dock-arrow', '');
      links[0].insertBefore(arrow, back);
    }
    Object.assign(links[0].style, { opacity: '0.75' });
    Object.assign(links[1].style, { backgroundColor: 'var(--_colors---brand--red)', opacity: '1', cursor: 'default' });
    links[1].removeAttribute('href');
    const label = dock.querySelector('[data-dock-category]');
    window.addEventListener('work:filter', (e) => { if (label) label.textContent = (e.detail && e.detail.name) || 'All work'; });
    gsap.set(dock, { yPercent: 40, autoAlpha: 0 });
    const show = (on) => gsap.to(dock, { yPercent: on ? 0 : 40, autoAlpha: on ? 1 : 0, duration: 0.5, ease: 'power3.out', overwrite: true });
    ScrollTrigger.create({ trigger: projects, start: 'top 55%', end: 'bottom 75%', onToggle: (self) => show(self.isActive) });
  }, 'page');
})();

/* ---- src/pages/project.js ---- */
/* Project page: gallery layout switch Large / Small (Osmo Supply Layout Grid Flip) */
(function () {
  const LL = window.LiveLegends;

  LL.register('galleryLayout', () => {
    const ACTIVE_CLASS = 'is--active';
    document.querySelectorAll('[data-layout-group]').forEach((group) => {
      let activeTween = null;
      const buttons = group.querySelectorAll('[data-layout-button]');
      const grid = group.querySelector('[data-layout-grid]');
      const collection = group.querySelector('[data-layout-grid-collection]');
      if (!buttons.length || !grid || !collection) return;
      const setButtons = (btn) => buttons.forEach((b) => { const a = b === btn; b.classList.toggle(ACTIVE_CLASS, a); b.setAttribute('aria-pressed', String(a)); });
      const refresh = () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); if (LL.lenis) LL.lenis.resize(); };
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.classList.contains(ACTIVE_CLASS))));
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const targetLayout = btn.getAttribute('data-layout-button');
          if (group.getAttribute('data-layout-status') === targetLayout) return;
          if (activeTween) { activeTween.kill(); activeTween = null; }
          if (LL.reduceMotion) { group.setAttribute('data-layout-status', targetLayout); setButtons(btn); refresh(); return; }
          const items = grid.querySelectorAll('[data-layout-grid-item]');
          const state = Flip.getState(items, { simple: true });
          collection.getBoundingClientRect();
          const prevH = collection.offsetHeight;
          group.setAttribute('data-layout-status', targetLayout);
          setButtons(btn);
          collection.getBoundingClientRect();
          const nextH = collection.offsetHeight;
          gsap.set(collection, { height: prevH });
          const tl = gsap.timeline({
            onStart: () => group.setAttribute('data-transitioning', 'true'),
            onInterrupt: () => { group.removeAttribute('data-transitioning'); gsap.set(collection, { clearProps: 'height' }); },
            onComplete: () => { group.removeAttribute('data-transitioning'); gsap.set(collection, { clearProps: 'height' }); refresh(); activeTween = null; }
          });
          tl.add(Flip.from(state, { duration: 0.65, ease: 'power4.inOut', absolute: true, nested: true, prune: true, stagger: targetLayout === 'large' ? { each: 0.03, from: 'end' } : { each: 0.03, from: 'start' } }), 0)
            .to(collection, { height: nextH, duration: 0.65, ease: 'power4.inOut' }, 0);
          activeTween = tl;
        });
      });
    });
  }, 'page');
})();

/* ---- src/pages/people.js ---- */
/* People: hover pixels on the team photos – site-size cubes (--ll-cube: 3em, 1.5em on mobile) along the photo edge, in the background colour */
(function () {
  const LL = window.LiveLegends;

  const cubeSize = (el) => {
    const probe = document.createElement('div');
    probe.className = 'u-cube';
    probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--ll-cube,3em);height:var(--ll-cube,3em)';
    el.appendChild(probe);
    const s = probe.getBoundingClientRect().width;
    probe.remove();
    return s || 48;
  };

  LL.register('peoplePixels', () => {
    const SHARE = 0.4;   // share of the edge cubes that appear on hover
    const STEP = 0.3;    // seconds for all of them to appear
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    document.querySelectorAll('[data-pixelated-image-reveal]').forEach((card) => {
      const grid = card.querySelector('[data-pixelated-image-reveal-grid]');
      if (!grid) return;
      let edge = [];
      let on = false;
      const build = () => {
        grid.querySelectorAll('.pixelated-image-card__pixel').forEach((p) => p.remove());
        edge = [];
        const r = grid.getBoundingClientRect();
        const s = cubeSize(grid);
        if (!r.width) return;
        const cols = Math.max(1, Math.round(r.width / s));
        const rows = Math.max(1, Math.round(r.height / s));
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (!(y === 0 || x === 0 || y === rows - 1 || x === cols - 1)) continue;
            const p = document.createElement('div');
            p.className = 'pixelated-image-card__pixel';
            p.style.width = s + 'px';
            p.style.height = s + 'px';
            p.style.left = (x === cols - 1 ? r.width - s : x * s) + 'px';
            p.style.top = (y === rows - 1 ? r.height - s : y * s) + 'px';
            grid.appendChild(p);
            edge.push(p);
          }
        }
      };
      build();
      window.addEventListener('resize', () => { if (!on) build(); });
      const pick = () => {
        const a = edge.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a.slice(0, Math.round(edge.length * SHARE));
      };
      const set = (state) => {
        on = state;
        const list = state ? pick() : edge;
        if (LL.reduceMotion) {
          edge.forEach((p) => { p.style.display = 'none'; });
          if (state) list.forEach((p) => { p.style.display = 'block'; });
          return;
        }
        gsap.killTweensOf(edge);
        if (!state) { gsap.to(edge, { display: 'none', duration: 0, stagger: { each: STEP / edge.length, from: 'random' } }); return; }
        gsap.set(edge, { display: 'none' });
        gsap.to(list, { display: 'block', duration: 0, stagger: { each: STEP / list.length, from: 'random' } });
      };
      if (touch) card.addEventListener('click', () => set(!on));
      else { card.addEventListener('mouseenter', () => set(true)); card.addEventListener('mouseleave', () => set(false)); }
    });
  }, 'page');

  /* About values (component kept for reuse): auto-advancing tabs with a progress bar */
  LL.register('values', () => {
    document.querySelectorAll('[data-values]').forEach((wrap) => {
      const items = [...wrap.querySelectorAll('[data-value-item]')];
      if (!items.length) return;
      const DURATION = parseFloat(wrap.getAttribute('data-values-duration')) || 7;
      let tween = null;
      const activate = (i) => {
        if (tween) tween.kill();
        items.forEach((item, j) => {
          item.classList.toggle('is-active', j === i);
          const bar = item.querySelector('[data-value-progress]');
          if (bar && j !== i) gsap.to(bar, { scaleX: 0, duration: 0.3, ease: LL.EASE });
        });
        const bar = items[i].querySelector('[data-value-progress]');
        const text = items[i].querySelector('[data-value-text]');
        if (text && !LL.reduceMotion) gsap.fromTo(text, { opacity: 0.5 }, { opacity: 1, duration: 0.25, ease: 'power1.out', overwrite: true, clearProps: 'opacity' });
        if (!bar || LL.reduceMotion) return;
        tween = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: DURATION, ease: 'none', onComplete: () => activate((i + 1) % items.length) });
      };
      items.forEach((item, i) => { item.addEventListener('click', () => activate(i)); LL.onKeyActivate(item, () => activate(i)); });
      ScrollTrigger.create({ trigger: wrap, start: 'top 85%', once: true, onEnter: () => activate(0) });
    });
  });
})();

/* ---- src/pages/lab.js ---- */
/* Lab (hidden at launch): Osmo Supply Infinite Draggable Grid + popup with image, text and an optional looping video */
(function () {
  const LL = window.LiveLegends;
  const CDN = 'https://cdn.prod.website-files.com/6a75c235cfd2210bd7053acb/';
  const LASER = 'https://videos.pexels.com/video-files/33540449/14261770_1440_2560_24fps.mp4';
  const CUBES = 'https://videos.pexels.com/video-files/16685816/16685816-uhd_2560_1440_30fps.mp4';

  /* Fallback content per Lab item (by name), mirroring the CMS. The popup always prefers what it finds
     in the clicked card; this only fills gaps so an item never opens empty. */
  const LAB = {
    'confetti': { image: CDN + '6ab256128b7861b50f52aeb3_pexels-photo-3385614.jpeg', video: LASER },
    'club grid': { image: CDN + '6ab256128b7861b50f52aecf_pexels-photo-6782458.jpeg', video: LASER },
    'spotlight': { image: CDN + '6ab256128b7861b50f52aef0_pexels-photo-976862.jpeg', video: LASER },
    'arena mapping': { image: CDN + '6ab256118b7861b50f52aea6_pexels-photo-761543.jpeg', video: CUBES },
    'reveal': { image: CDN + '6ab256128b7861b50f52aedd_pexels-photo-1763068.jpeg', video: CUBES },
    'portal': { image: CDN + '6ab256128b7861b50f52aebb_pexels-photo-2263435.jpeg', video: CUBES },
    'pyro timing': { image: CDN + '6ab256118b7861b50f52aeac_pexels-photo-1190298.jpeg', video: LASER },
    'beam study': { image: CDN + '6ab256128b7861b50f52aeb7_pexels-photo-736355.jpeg', video: LASER },
    'fragments': { image: CDN + '6ab256128b7861b50f52aef6_pexels-photo-3319726.jpeg', video: CUBES }
  };

  function initInfiniteCardsGrid() {
    const wrappers = document.querySelectorAll('[data-infinite-grid-init]');
    const wheelSpeed = 0.6, dragSpeed = 1.2, gridOverscan = 1, startOffsetY = 0.33, positionLerp = 0.05, xToYInfluence = 0.2, columnSpeedPattern = [1, 1, 0.9], minCardScale = 0.5, scaleLerp = 0.02;
    wrappers.forEach((wrapper) => {
      const collection = wrapper.querySelector('[data-infinite-grid-collection]');
      const sourceList = wrapper.querySelector('[data-infinite-grid-list]');
      if (!collection || !sourceList) { wrapper.setAttribute('data-infinite-grid-status', 'idle'); return; }
      const originalItems = Array.from(sourceList.querySelectorAll('[data-infinite-grid-item]')).map((item) => item.cloneNode(true));
      if (!originalItems.length) { wrapper.setAttribute('data-infinite-grid-status', 'idle'); return; }
      let observer; let cards = []; let cardElements = []; let tries = 0;
      const timers = {}; const size = {}; const pos = {}; const scale = { current: 1, target: 1 };
      const setStatus = (status) => wrapper.setAttribute('data-infinite-grid-status', status);
      const wrapValue = (value, s) => ((value % s) + s) % s;
      const createColumnSpeeds = (columns) => Array.from({ length: columns }, (_, i) => columnSpeedPattern[i % columnSpeedPattern.length]);
      function createItemIndexes(columns, rows) {
        const total = originalItems.length;
        const indexes = Array.from({ length: rows }, () => []);
        const used = Array(total).fill(0);
        const centerColumn = Math.floor(columns / 2), centerRow = Math.floor(rows / 2);
        const cells = [];
        for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) cells.push({ row, column, distance: Math.abs(row - centerRow) + Math.abs(column - centerColumn) });
        cells.sort((a, b) => a.distance - b.distance);
        cells.forEach(({ row, column }) => {
          const blocked = [indexes[row][column - 1], indexes[row][column + 1], row > 0 ? indexes[row - 1][column] : undefined, row < rows - 1 ? indexes[row + 1][column] : undefined, row > 0 ? indexes[row - 1][column - 1] : undefined, row > 0 ? indexes[row - 1][column + 1] : undefined, row < rows - 1 ? indexes[row + 1][column - 1] : undefined, row < rows - 1 ? indexes[row + 1][column + 1] : undefined];
          const seed = (row * 17 + column * 31) % total;
          let bestIndex = 0, bestScore = Infinity;
          for (let i = 0; i < total; i++) {
            const itemIndex = (i + seed) % total;
            let score = used[itemIndex] * 10 + Math.abs(itemIndex - seed) * 0.01;
            if (total > 1 && blocked.includes(itemIndex)) score += 1000;
            if (score < bestScore) { bestScore = score; bestIndex = itemIndex; }
          }
          indexes[row][column] = bestIndex; used[bestIndex]++;
        });
        return indexes;
      }
      function buildGrid() {
        if (observer) observer.kill();
        clearTimeout(timers.resize); clearTimeout(timers.scroll); clearTimeout(timers.scale);
        gsap.ticker.remove(updateGrid);
        setStatus('loading');
        sourceList.innerHTML = '';
        const measureItem = originalItems[0].cloneNode(true);
        measureItem.style.position = 'absolute'; measureItem.style.visibility = 'hidden'; measureItem.style.pointerEvents = 'none';
        wrapper.appendChild(measureItem);
        const r = measureItem.getBoundingClientRect();
        size.itemW = r.width; size.itemH = r.height;
        measureItem.remove();
        if (!size.itemW || !size.itemH) {
          if (tries++ < 10) { timers.retry = setTimeout(buildGrid, 150); return; }
          sourceList.append(...originalItems.map((i) => i.cloneNode(true)));
          setStatus('idle');
          return;
        }
        const columns = Math.max(1, Math.ceil(wrapper.clientWidth / size.itemW) + gridOverscan * 2);
        const rows = Math.max(Math.ceil(wrapper.clientHeight / size.itemH) + gridOverscan * 2, Math.ceil(originalItems.length / columns));
        const itemIndexes = createItemIndexes(columns, rows);
        const columnSpeeds = createColumnSpeeds(columns);
        const fragment = document.createDocumentFragment();
        const centerColumn = Math.floor(columns / 2), centerRow = Math.floor(rows / 2);
        size.totalW = columns * size.itemW; size.totalH = rows * size.itemH;
        cards = []; cardElements = [];
        gsap.set(collection, { x: 0, y: 0, force3D: true });
        collection.style.width = size.totalW + 'px'; collection.style.height = size.totalH + 'px';
        for (let row = 0; row < rows; row++) {
          for (let column = 0; column < columns; column++) {
            const item = originalItems[itemIndexes[row][column]].cloneNode(true);
            const card = item.querySelector('[data-infinite-grid-card]');
            cards.push({ baseX: column * size.itemW, baseY: row * size.itemH, startY: (column - centerColumn) * size.itemH * startOffsetY, ySpeed: columnSpeeds[column], xSetter: gsap.quickSetter(item, 'x', 'px'), ySetter: gsap.quickSetter(item, 'y', 'px') });
            if (card) cardElements.push(card);
            if (cards.length > originalItems.length) item.setAttribute('aria-hidden', 'true');
            fragment.appendChild(item);
          }
        }
        sourceList.appendChild(fragment);
        gsap.set(cardElements, { force3D: true });
        pos.startX = wrapper.clientWidth * 0.5 - centerColumn * size.itemW - size.itemW * 0.5;
        pos.startY = wrapper.clientHeight * 0.5 - centerRow * size.itemH - size.itemH * 0.5;
        pos.x = pos.startX; pos.y = pos.startY; pos.targetX = pos.x; pos.targetY = pos.y;
        scale.current = 1; scale.target = 1;
        updateGrid();
        gsap.ticker.add(updateGrid);
        requestAnimationFrame(() => setStatus('idle'));
        observer = Observer.create({ target: wrapper, type: 'wheel,touch,pointer', preventDefault: true, dragMinimum: 3, onPress() { setStatus('dragging'); }, onRelease() { setStatus('idle'); }, onStop() { setStatus('idle'); }, onChange: handleMovement });
      }
      function updateGrid() {
        pos.x += (pos.targetX - pos.x) * positionLerp;
        pos.y += (pos.targetY - pos.y) * positionLerp;
        scale.current += (scale.target - scale.current) * scaleLerp;
        const offsetX = size.itemW * gridOverscan, offsetY = size.itemH * gridOverscan, scrollY = pos.y - pos.startY;
        cards.forEach(({ baseX, baseY, startY, ySpeed, xSetter, ySetter }) => {
          xSetter(wrapValue(baseX + pos.x + offsetX, size.totalW) - offsetX);
          ySetter(wrapValue(baseY + pos.startY + startY + scrollY * ySpeed + offsetY, size.totalH) - offsetY);
        });
        gsap.set(cardElements, { scale: scale.current });
      }
      function handleMovement(self) {
        const isWheel = self.event.type === 'wheel';
        const speed = isWheel ? wheelSpeed : dragSpeed;
        const deltaX = gsap.utils.clamp(-80, 80, self.deltaX * speed);
        const deltaY = gsap.utils.clamp(-80, 80, self.deltaY * speed);
        const moveX = isWheel ? -deltaX : deltaX;
        const moveY = isWheel ? -deltaY : deltaY;
        const strength = gsap.utils.clamp(0, 1, Math.max(Math.abs(deltaX), Math.abs(deltaY)) / 80);
        if (isWheel) { setStatus('scrolling'); clearTimeout(timers.scroll); timers.scroll = setTimeout(() => setStatus('idle'), 200); }
        scale.target = gsap.utils.interpolate(1, minCardScale, strength);
        clearTimeout(timers.scale); timers.scale = setTimeout(() => { scale.target = 1; }, 120);
        pos.targetX += moveX; pos.targetY += moveY + moveX * xToYInfluence;
      }
      function handleMouseLeave() { setStatus('idle'); scale.target = 1; if (observer) { observer.disable(); observer.enable(); } }
      window.addEventListener('resize', () => { clearTimeout(timers.resize); timers.resize = setTimeout(() => { tries = 0; buildGrid(); }, 200); });
      document.documentElement.addEventListener('mouseleave', handleMouseLeave);
      buildGrid();
      setTimeout(() => { if (wrapper.getAttribute('data-infinite-grid-status') === 'loading') setStatus('idle'); }, 3000);
    });
  }

  /* Finds the photo of a card, whatever the markup: <img src>, srcset, lazy data-src or a CSS background */
  function pickImage(item) {
    for (const im of item.querySelectorAll('img')) {
      const src = im.currentSrc || im.getAttribute('src') || im.getAttribute('data-src') || '';
      if (src && !src.startsWith('data:') && !/placeholder\.(svg|png)/i.test(src)) return { src, alt: im.getAttribute('alt') || '' };
      const set = im.getAttribute('srcset');
      if (set) return { src: set.split(',').pop().trim().split(' ')[0], alt: im.getAttribute('alt') || '' };
    }
    for (const el of item.querySelectorAll('*')) {
      const m = (getComputedStyle(el).backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);
      if (m && m[1] && !m[1].startsWith('data:')) return { src: m[1], alt: '' };
    }
    return null;
  }

  function initLabModal() {
    const grid = document.querySelector('[data-infinite-grid-init]');
    const modal = document.querySelector('[data-lab-modal]');
    if (!grid || !modal) return;
    document.body.appendChild(modal);
    const card = modal.querySelector('[data-lab-modal-card]');
    const img = modal.querySelector('[data-lab-modal-image]');
    const title = modal.querySelector('[data-lab-modal-title]');
    const text = modal.querySelector('[data-lab-modal-text]');
    const button = modal.querySelector('[data-lab-modal-button]');
    let video = null;
    if (img) {
      const frame = img.parentElement;
      if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
      frame.style.overflow = 'hidden';
      Object.assign(img.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', objectFit: 'cover', display: 'block' });
      img.removeAttribute('srcset'); img.removeAttribute('sizes'); img.removeAttribute('loading');
      video = document.createElement('video');
      video.className = 'lab-modal_video';
      video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.preload = 'none';
      video.setAttribute('muted', ''); video.setAttribute('playsinline', ''); video.setAttribute('loop', ''); video.setAttribute('aria-hidden', 'true');
      Object.assign(video.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', objectFit: 'cover', opacity: '0', transition: 'opacity .6s ease', pointerEvents: 'none' });
      frame.appendChild(video);
      video.addEventListener('playing', () => { video.style.opacity = '1'; });
      video.addEventListener('error', () => { video.style.opacity = '0'; });
    }
    const stopVideo = () => { if (!video) return; video.pause(); video.style.opacity = '0'; video.removeAttribute('src'); video.load(); };
    const close = () => {
      if (modal.getAttribute('data-lab-modal-status') !== 'active') return;
      const done = () => { modal.setAttribute('data-lab-modal-status', 'not-active'); modal.setAttribute('aria-hidden', 'true'); stopVideo(); };
      if (LL.reduceMotion || !card) { done(); return; }
      gsap.to(card, { autoAlpha: 0, scale: 0.96, y: 12, duration: 0.35, ease: 'power2.in', onComplete: done });
    };
    grid.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }, true);
    let down = null;
    grid.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    grid.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return;
      const item = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest && el.closest('[data-infinite-grid-item]')).find(Boolean);
      if (!item) return;
      const get = (sel) => { const el = item.querySelector(sel); return el ? el.textContent.trim() : ''; };
      const name = get('[data-lab-title]');
      const fallback = LAB[name.toLowerCase()] || {};
      const picked = pickImage(item);
      if (img) {
        const src = (picked && picked.src) || fallback.image || '';
        img.onerror = () => { if (fallback.image && img.src !== fallback.image) img.src = fallback.image; };
        img.src = src;
        img.alt = (picked && picked.alt) || name;
      }
      if (title) title.textContent = name;
      if (text) text.textContent = get('[data-lab-text]');
      const btn = item.querySelector('[data-lab-button]');
      if (button) {
        const label = btn ? btn.textContent.trim() : '';
        const href = btn ? btn.getAttribute('href') : '';
        if (label && href && href !== '#') { button.style.display = ''; button.setAttribute('href', href); const t = button.querySelector('[data-lab-modal-button-text]'); if (t) t.textContent = label; }
        else button.style.display = 'none';
      }
      const videoUrl = get('[data-lab-video]') || fallback.video || '';
      if (video) { stopVideo(); if (videoUrl) { video.src = videoUrl; video.load(); video.play().catch(() => {}); } }
      modal.setAttribute('data-lab-modal-status', 'active');
      modal.setAttribute('aria-hidden', 'false');
      if (!LL.reduceMotion && card) gsap.fromTo(card, { autoAlpha: 0, scale: 0.94, y: 20 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: 'expo.out', overwrite: true });
    });
    modal.querySelectorAll('[data-lab-modal-close]').forEach((el) => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  LL.register('lab', () => {
    if (!document.querySelector('[data-infinite-grid-init]')) return;
    initInfiniteCardsGrid();
    initLabModal();
  }, 'page');
})();

/* ---- src/main.js ---- */
/* =====================================================================
   Live Legends – boot
   Runs every registered module in phase order once the DOM is ready:
   early → ready → last → page → afterLoader (after the homepage loader).
   All scripts are loaded with defer, so GSAP and Lenis are already there.
   ===================================================================== */
(function () {
  const LL = window.LiveLegends;
  const PHASES = ['early', 'ready', 'last', 'page'];
  const run = (phase) => LL.modules.filter((m) => m.phase === phase).forEach((m) => LL.safe(m.name, m.fn));

  function boot() {
    if (typeof gsap === 'undefined') { console.warn('[Live Legends] GSAP is not loaded, scripts skipped.'); return; }
    LL.safe('gsap', LL.setupGsap);
    PHASES.forEach(run);
    LL.afterLoader(() => run('afterLoader'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
