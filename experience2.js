// ──────────────────────────────────────────────────────────────────────────────
// After DOM load (single gate) + safe boot
// ──────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
// Register GSAP plugins once
if (typeof gsap !== 'undefined') {
// Register only what exists to avoid errors in partial bundles
const maybe = (...plug) => plug.filter(Boolean);
gsap.registerPlugin(
...maybe(
typeof ScrollTrigger !== 'undefined' ? ScrollTrigger : null,
typeof SplitText !== 'undefined' ? SplitText : null,
typeof Draggable !== 'undefined' ? Draggable : null,
typeof InertiaPlugin !== 'undefined' ? InertiaPlugin : null,
typeof CustomEase !== 'undefined' ? CustomEase : null
)
);
gsap.ticker.lagSmoothing(0);

// Create osmo-ease once (if CustomEase available)
if (typeof CustomEase !== 'undefined' && !window.__osmoEaseRegistered) {
try {
CustomEase.create('osmo-ease', '0.625,0.05,0,1');
window.__osmoEaseRegistered = true;
} catch (e) { /* no-op */ }
}
}

// Lenis setup (after DOM is ready to avoid timing glitches)
if (typeof Lenis !== 'undefined') {
const lenis = new Lenis();
// Keep a reference in case other scripts check it
window.lenis = lenis;
lenis.on('scroll', () => { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.update(); });
gsap?.ticker.add((time) => { lenis.raf(time * 1000); });
}

// ── Inits (order matters a bit because some refresh ScrollTrigger) ──────────
initHighlightText();
initGlobalParallax();
initGlowingInteractiveDotsGrid();
initDynamicCurrentYear();
initVimeoLightboxAdvanced();
initBasicFilterSetupMultiMatch();
initContentRevealScroll();
initMasonryGrid();
//initSliders();
initTabSystem();
initModals();
initCopyEmailClipboard();
initCustomSubmitButton();
initMobileNavMenu();
initThemedSVGCursor();

// One refresh after all ScrollTriggers are created
if (typeof ScrollTrigger !== 'undefined') {
// Batch with rAF to ensure layout is settled
requestAnimationFrame(() => ScrollTrigger.refresh());
}
});

// ──────────────────────────────────────────────────────────────────────────────
// Highlight Text on Scroll
// ──────────────────────────────────────────────────────────────────────────────
function initHighlightText() {
if (typeof SplitText === 'undefined' || typeof gsap === 'undefined') return;

const splitHeadingTargets = document.querySelectorAll('[data-highlight-text]');
if (!splitHeadingTargets.length) return;

for (const heading of splitHeadingTargets) {
const scrollStart  = heading.getAttribute('data-highlight-scroll-start') || 'top 90%';
const scrollEnd    = heading.getAttribute('data-highlight-scroll-end')   || 'center 40%';
const fadedValue   = parseFloat(heading.getAttribute('data-highlight-fade'))    || 0.4;
const staggerValue = parseFloat(heading.getAttribute('data-highlight-stagger')) || 0.1;

new SplitText(heading, {
type: 'words',
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
    }).from(self.words, { 
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
// Themed SVG Cursor (RAF-driven, stays active while scrolling over targets)
// Scope targets with [data-cursor="custom"]
// ──────────────────────────────────────────────────────────────────────────────
function initThemedSVGCursor() {
// Single-run + capability check
if (window.__svgCursorInit) return;
if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
window.__svgCursorInit = true;

const docEl = document.documentElement;

// Map themes → SVGs (keep your URLs)
const THEME_SVG = {
  red:    "https://cdn.prod.website-files.com/68a83a3484e9e0febc9ea13e/68baea0b5c5cb77349e66b48_view%20-%20red.svg",
  green:  "https://cdn.prod.website-files.com/68a83a3484e9e0febc9ea13e/68baea0bd2b62d2b97aef95f_view%20-%20green.svg",
  blue:   "https://cdn.prod.website-files.com/68a83a3484e9e0febc9ea13e/68baea0b6f45ad8d49cff623_view%20-%20blue.svg",
  yellow: "https://cdn.prod.website-files.com/68a83a3484e9e0febc9ea13e/68baea0bf22246585feb253d_view%20-%20yellow.svg",
  orange: "https://cdn.prod.website-files.com/68a83a3484e9e0febc9ea13e/68baea0ba47017180443ca93_view%20-%20orange.svg"
};

// Floating image
const img = document.createElement('img');
img.className = 'cursor-image';            // CSS below
img.alt = '';
img.setAttribute('aria-hidden', 'true');
img.style.transform = 'translate(-50%, -50%) scale(0)'; // start hidden
img.style.left = '0px';
img.style.top  = '0px';
document.body.appendChild(img);

// Apply theme from <html data-cursor-theme="...">
const applyTheme = () => {
  const t = docEl.getAttribute('data-cursor-theme') || 'red';
  img.src = THEME_SVG[t] || THEME_SVG.red;
};
applyTheme();

// React to theme changes
if (window.MutationObserver) {
  new MutationObserver(applyTheme).observe(docEl, {
    attributes: true,
    attributeFilter: ['data-cursor-theme']
  });
}

// Track the pointer (target position). We’ll *animate* toward it.
let targetX = 0, targetY = 0;
let x = 0, y = 0; // current
let visible = false;
let rafId = null;

// Lerp factor (feel free to tweak for snappier/slower follow)
const FOLLOW = 0.25;

// Mark whether the pointer is “over” any [data-cursor="custom"] node.
function updateZoneFromPoint(px, py) {
  const el = document.elementFromPoint(px, py);
  const inZone = !!el && !!el.closest?.('[data-cursor="custom"]');
  if (inZone && !visible) {
    visible = true;
    docEl.setAttribute('data-cursor-zone', 'on');
    img.style.transform = 'translate(-50%, -50%) scale(1)';
  } else if (!inZone && visible) {
    visible = false;
    docEl.removeAttribute('data-cursor-zone');
    img.style.transform = 'translate(-50%, -50%) scale(0)';
  }
}

// Keep targetX/targetY in client coordinates
document.addEventListener('pointermove', (e) => {
  targetX = e.clientX;
  targetY = e.clientY;
  // pointermove should also immediately re-evaluate zone
  updateZoneFromPoint(targetX, targetY);
}, { passive: true });

// When the pointer leaves the document, hide
document.addEventListener('pointerleave', () => {
  if (visible) {
    visible = false;
    docEl.removeAttribute('data-cursor-zone');
    img.style.transform = 'translate(-50%, -50%) scale(0)';
  }
}, { passive: true });

// IMPORTANT: While scrolling, the element under the fixed pointer can change.
// We re-check using elementFromPoint so the cursor stays visible on scroll.
const resyncZone = () => updateZoneFromPoint(targetX, targetY);
window.addEventListener('scroll', resyncZone, { passive: true });
window.addEventListener('resize', resyncZone, { passive: true });

// RAF loop for smooth follow (works even when mouse isn’t moving)
const tick = () => {
  // Ease current position toward target
  x += (targetX - x) * FOLLOW;
  y += (targetY - y) * FOLLOW;
  img.style.left = x + 'px';
  img.style.top  = y + 'px';

  // Even if the mouse isn't moving, the page might be.
  // Re-evaluate in-zone status each frame so scrolling updates visibility.
  updateZoneFromPoint(targetX, targetY);

  rafId = requestAnimationFrame(tick);
};
rafId = requestAnimationFrame(tick);

// Optional: expose a destroy method if you ever need to remove it
window.destroyThemedSVGCursor = () => {
  cancelAnimationFrame(rafId);
  window.removeEventListener('scroll', resyncZone);
  window.removeEventListener('resize', resyncZone);
  img.remove();
  delete window.__svgCursorInit;
};
}


// ──────────────────────────────────────────────────────────────────────────────
// Glowing Interactive Dots Grid (same behavior, less DOM + less per-frame work)
// ──────────────────────────────────────────────────────────────────────────────
function initGlowingInteractiveDotsGrid() {
  if (typeof gsap === 'undefined') return;

  const supportsHoverFine = !!(window.matchMedia &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches);

  if (!supportsHoverFine) {
    document.querySelectorAll('[data-dots-container-init]').forEach(el => {
      el.setAttribute('hidden', '');
      el.setAttribute('aria-hidden', 'true');
      el.style.display = 'none';
    });
    return;
  }

  document.querySelectorAll('[data-dots-container-init]').forEach(container => {
    const colors         = { base: '#FFFFFF0D', active: '#FFFFFF' };
    const threshold      = 200;
    const speedThreshold = 100;
    const shockRadius    = 325;
    const shockPower     = 5;
    const maxSpeed       = 5000;
    const centerHole     = true;

    // ↓↓↓ IMPORTANT: cap density (desktop) — same grid, just fewer elements
    const MAX_COLS = parseInt(container.getAttribute('data-dots-max-cols')) || 20;
    const MAX_ROWS = parseInt(container.getAttribute('data-dots-max-rows')) || 9;

    const svgTemplate = container.querySelector('.dot-svg') || document.querySelector('.dot-svg');

    let dots = [];
    let centers = [];
    let hash = new Map();
    const cellSize = threshold;

    const isDesktop = () => window.matchMedia('(min-width: 992px)').matches;

    // Only do work while on screen
    let isActive = true;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        isActive = !!entries[0]?.isIntersecting;
      }, { threshold: 0.05 });
      io.observe(container);
    }

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

    // BIG WIN: never loop _svgFillEls on every paint — use currentColor
    function tintDot(el, color) {
      if (el._hasSvg) {
        el.style.color = color;          // drives fill via CSS (see snippet below)
      } else {
        gsap.set(el, { backgroundColor: color });
      }
    }

    function buildGrid(computeCenters = true) {
      container.innerHTML = '';
      dots = [];
      centers = [];
      hash.clear();

      const style = getComputedStyle(container);
      const dotPx = parseFloat(style.fontSize) || 10;
      const gapPx = dotPx * 2;
      const contW = container.clientWidth;
      const contH = container.clientHeight;

      let cols  = Math.floor((contW + gapPx) / (dotPx + gapPx));
      let rows  = Math.floor((contH + gapPx) / (dotPx + gapPx));

      // ↓↓↓ cap on desktop to reduce DOM
      if (isDesktop()) {
        cols = Math.min(cols, MAX_COLS);
        rows = Math.min(rows, MAX_ROWS);
      }

      const total = cols * rows;

      const holeCols = centerHole ? (cols % 2 === 0 ? 4 : 5) : 0;
      const holeRows = centerHole ? (rows % 2 === 0 ? 4 : 5) : 0;
      const startCol = (cols - holeCols) / 2;
      const startRow = (rows - holeRows) / 2;

      const frag = document.createDocumentFragment();

      for (let i = 0; i < total; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const isHole =
          centerHole &&
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
            d._hasSvg = true;            // we’ll color via currentColor (CSS)
          }
          tintDot(d, colors.base);
        }

        frag.appendChild(d);
        if (!d._isHole) dots.push(d);
      }

      container.appendChild(frag);

      if (!computeCenters) return;

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

    window.addEventListener('resize', () => buildGrid(true), { passive: true });
    buildGrid(true);

    if (typeof InertiaPlugin === 'undefined') return; // keep original behavior gate

    let lastTime = 0, lastX = 0, lastY = 0;

    container.addEventListener('mousemove', (e) => {
      if (!isActive) return;

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

      // rAF one paint of tints (avoid per-move thrash)
      requestAnimationFrame(() => {
        for (let i = 0; i < nearby.length; i++) {
          const c = centers[nearby[i]];
          const el = c.el;
          const dist = Math.hypot(c.x - e.pageX, c.y - e.pageY);
          if (dist > threshold) {
            tintDot(el, colors.base);
            continue;
          }

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

    container.addEventListener('click', (e) => {
      if (!isActive) return;

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

    // Light refresh of centers after scroll/layout shifts
    let scrollTO;
    window.addEventListener('scroll', () => {
      if (!isActive) return;
      clearTimeout(scrollTO);
      scrollTO = setTimeout(() => {
        centers = dots.map(el => {
          const r = el.getBoundingClientRect();
          const x = r.left + window.scrollX + r.width / 2;
          const y = r.top  + window.scrollY + r.height / 2;
          return { el, x, y };
        });
        hash.clear();
        centers.forEach((c, i) => indexIntoHash(i, c.x, c.y));
      }, 120);
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
                                       lightbox.setAttribute('data-vimeo-fullscreen', (document.fullscreenElement || document.webkitFullscreenElement) ? 'true' : 'false')
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
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

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
// Random page-load color + cursor theme (no persistence)
// ──────────────────────────────────────────────────────────────────────────────

(() => {
const THEMES = [
{ name: 'red',    value: 'var(--color-red)' },
{ name: 'green',  value: 'var(--color-green)' },
{ name: 'blue',   value: 'var(--color-blue)' },
{ name: 'yellow', value: 'var(--color-yellow)' },
{ name: 'orange', value: 'var(--color-orange)' }
];

function pickTheme() {
const idx = Math.floor(Math.random() * THEMES.length);
return THEMES[idx];
}

function paint(theme) {
document.documentElement.setAttribute('data-cursor-theme', theme.name);

document.querySelectorAll('[data-color-random]').forEach((el) => {
const type = el.getAttribute('data-color-random');
if (type === 'bg') el.style.backgroundColor = theme.value;
else if (type === 'text') el.style.color = theme.value;
});
}

function setRandomCursorTheme() {
paint(pickTheme());
}

setRandomCursorTheme();
window.setRandomCursorTheme = setRandomCursorTheme;
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

// ──────────────────────────────────────────────────────────────────────────────
// Content Reveal on Scroll (added)
// ──────────────────────────────────────────────────────────────────────────────
function initContentRevealScroll(){
if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ctx = gsap.context(() => {
document.querySelectorAll('[data-reveal-group]').forEach(groupEl => {
// Config from attributes or defaults (group-level)
const groupStaggerSec = (parseFloat(groupEl.getAttribute('data-stagger')) || 100) / 1000; // ms → sec
const groupDistance = groupEl.getAttribute('data-distance') || '2em';
const triggerStart = groupEl.getAttribute('data-start') || 'top 80%';

const animDuration = 0.8;
const animEase = "power4.inOut";

// Reduced motion: show immediately
if (prefersReduced) {
gsap.set(groupEl, { clearProps: 'all', y: 0, autoAlpha: 1 });
return;
}

// If no direct children, animate the group element itself
const directChildren = Array.from(groupEl.children).filter(el => el.nodeType === 1);
if (!directChildren.length) {
gsap.set(groupEl, { y: groupDistance, autoAlpha: 0 });
ScrollTrigger.create({
trigger: groupEl,
start: triggerStart,
once: true,
onEnter: () => gsap.to(groupEl, {
y: 0,
autoAlpha: 1,
duration: animDuration,
ease: animEase,
onComplete: () => gsap.set(groupEl, { clearProps: 'all' })
})
});
return;
}

// Build animation slots: item or nested (deep layers allowed)
const slots = [];
directChildren.forEach(child => {
const nestedGroup = child.matches('[data-reveal-group-nested]')
? child
: child.querySelector(':scope [data-reveal-group-nested]');

if (nestedGroup) {
const includeParent = child.getAttribute('data-ignore') === 'false' || nestedGroup.getAttribute('data-ignore') === 'false';
slots.push({ type: 'nested', parentEl: child, nestedEl: nestedGroup, includeParent });
} else {
slots.push({ type: 'item', el: child });
}
});

// Initial hidden state
slots.forEach(slot => {
if (slot.type === 'item') {
const isNestedSelf = slot.el.matches('[data-reveal-group-nested]');
const d = isNestedSelf ? groupDistance : (slot.el.getAttribute('data-distance') || groupDistance);
gsap.set(slot.el, { y: d, autoAlpha: 0 });
} else {
if (slot.includeParent) gsap.set(slot.parentEl, { y: groupDistance, autoAlpha: 0 });
const nestedD = slot.nestedEl.getAttribute('data-distance') || groupDistance;
Array.from(slot.nestedEl.children).forEach(target => gsap.set(target, { y: nestedD, autoAlpha: 0 }));
}
});

// Extra safety: if a nested parent is included, re-assert its distance to the group's value
slots.forEach(slot => {
if (slot.type === 'nested' && slot.includeParent) {
gsap.set(slot.parentEl, { y: groupDistance });
}
});

// Reveal sequence
ScrollTrigger.create({
trigger: groupEl,
start: triggerStart,
once: true,
onEnter: () => {
const tl = gsap.timeline();

slots.forEach((slot, slotIndex) => {
const slotTime = slotIndex * groupStaggerSec;

if (slot.type === 'item') {
tl.to(slot.el, {
y: 0,
autoAlpha: 1,
duration: animDuration,
ease: animEase,
onComplete: () => gsap.set(slot.el, { clearProps: 'all' })
}, slotTime);
} else {
if (slot.includeParent) {
tl.to(slot.parentEl, {
y: 0,
autoAlpha: 1,
duration: animDuration,
ease: animEase,
onComplete: () => gsap.set(slot.parentEl, { clearProps: 'all' })
}, slotTime);
}
const nestedMs = parseFloat(slot.nestedEl.getAttribute('data-stagger'));
const nestedStaggerSec = isNaN(nestedMs) ? groupStaggerSec : nestedMs / 1000;
Array.from(slot.nestedEl.children).forEach((nestedChild, nestedIndex) => {
tl.to(nestedChild, {
y: 0,
autoAlpha: 1,
duration: animDuration,
ease: animEase,
onComplete: () => gsap.set(nestedChild, { clearProps: 'all' })
}, slotTime + nestedIndex * nestedStaggerSec);
});
}
});
}
});
});
});

return () => ctx.revert();
}

// ──────────────────────────────────────────────────────────────────────────────
/* Masonry Grid (added) */
// ──────────────────────────────────────────────────────────────────────────────
function initMasonryGrid() {
document.querySelectorAll('[data-masonry-list]').forEach(container => {
const shuffle = container.dataset.masonryShuffle !== 'false';
let cols, gapPx, colHeights;

// Take columns and gaps from CSS
const getVars = () => {
const cs = getComputedStyle(container);
cols = parseInt(cs.getPropertyValue('--masonry-col'));
const rawGap = cs.getPropertyValue('--masonry-gap').trim();
if (rawGap.endsWith('px')) {
gapPx = parseFloat(rawGap);
} else if (rawGap.endsWith('em')) {
gapPx = parseFloat(rawGap) * parseFloat(cs.fontSize);
} else if (rawGap.endsWith('rem')) {
gapPx = parseFloat(rawGap) * parseFloat(getComputedStyle(document.documentElement).fontSize);
} else {
gapPx = parseFloat(rawGap);
}
};

// Set the layout
const layout = () => {
getVars();
const wCalc = `(100% - ${(cols - 1)}*var(--masonry-gap)) / ${cols}`;
colHeights = Array(cols).fill(0);
container.style.position = 'relative';
const items = Array.from(container.children);

items.forEach(el => {
el.style.position = 'absolute';
el.style.width = `calc(${wCalc})`;
});

items.forEach((el, i) => {
const h = el.offsetHeight;
const idx = shuffle
? colHeights.indexOf(Math.min(...colHeights))
: (i % cols);
el.style.top  = `${colHeights[idx]}px`;
el.style.left = `calc(${wCalc}*${idx} + var(--masonry-gap)*${idx})`;
colHeights[idx] += h + gapPx;
});

container.style.height = `${Math.max(...colHeights)}px`;
if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); // keep ST in sync
};

// Debounce function to use on resize
const debounce = (fn, delay) => {
let t;
return () => {
clearTimeout(t);
t = setTimeout(fn, delay);
};
};

const onResize = debounce(layout, 100);
window.addEventListener('resize', onResize);

// Return promise if images are loaded
const imgLoad = () => {
const imgs = container.querySelectorAll('img');
return Promise.all(Array.from(imgs).map(img =>
(img.complete && img.naturalWidth) ? Promise.resolve() : new Promise(r => img.addEventListener('load', r, { once: true }))
));
};

// When images are ready, set the layout
imgLoad().then(layout);

// Constructor with destroy and recalc function
container._masonry = {
recalc: () => imgLoad().then(layout),
destroy: () => {
window.removeEventListener('resize', onResize);
const items = Array.from(container.children);
items.forEach(el => {
el.style.position =
el.style.width =
el.style.top =
el.style.left = '';
});
container.style.position =
container.style.height = '';
}
};
});
}

// ──────────────────────────────────────────────────────────────────────────────
/* Sliders + helper (added) */
// ──────────────────────────────────────────────────────────────────────────────
/*
function initSliders() {
if (typeof gsap === 'undefined') return;

const sliderWrappers = gsap.utils.toArray(document.querySelectorAll('[data-centered-slider="wrapper"]'));
if (!sliderWrappers.length) return;

sliderWrappers.forEach((sliderWrapper) => {
const slides = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="slide"]'));
const bullets = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="bullet"]'));
const prevButton = sliderWrapper.querySelector('[data-centered-slider="prev-button"]');
const nextButton = sliderWrapper.querySelector('[data-centered-slider="next-button"]');

let activeElement;
let activeBullet;
let currentIndex = 0;
let autoplay;

const autoplayEnabled = sliderWrapper.getAttribute('data-slider-autoplay') === 'true';
const autoplayDuration = autoplayEnabled ? parseFloat(sliderWrapper.getAttribute('data-slider-autoplay-duration')) || 0 : 0;

slides.forEach((slide, i) => {
slide.setAttribute("id", `slide-${i}`);
});

if (bullets && bullets.length > 0) {
bullets.forEach((bullet, i) => {
bullet.setAttribute("aria-controls", `slide-${i}`);
bullet.setAttribute("aria-selected", i === currentIndex ? "true" : "false");
});
}

const loop = horizontalLoop(slides, {
paused: true,
draggable: true,
center: true,
onChange: (element, index) => {
currentIndex = index;

if (activeElement) activeElement.classList.remove("active");
element.classList.add("active");
activeElement = element;

if (bullets && bullets.length > 0) {
if (activeBullet) activeBullet.classList.remove("active");
if (bullets[index]) {
bullets[index].classList.add("active");
activeBullet = bullets[index];
}
bullets.forEach((bullet, i) => {
bullet.setAttribute("aria-selected", i === index ? "true" : "false");
});
}
}
});

// On initialization, center the slider
loop.toIndex(2, { duration: 0.01 });

function startAutoplay() {
if (autoplayDuration > 0 && !autoplay) {
const repeat = () => {
loop.next({ ease: "osmo-ease", duration: 0.725 });
autoplay = gsap.delayedCall(autoplayDuration, repeat);
};
autoplay = gsap.delayedCall(autoplayDuration, repeat);
}
}

function stopAutoplay() {
if (autoplay) {
autoplay.kill();
autoplay = null;
}
}

if (typeof ScrollTrigger !== 'undefined') {
ScrollTrigger.create({
trigger: sliderWrapper,
start: "top bottom",
end: "bottom top",
onEnter: startAutoplay,
onLeave: stopAutoplay,
onEnterBack: startAutoplay,
onLeaveBack: stopAutoplay
});
} else if (autoplayEnabled) {
startAutoplay();
}

sliderWrapper.addEventListener("mouseenter", stopAutoplay);
sliderWrapper.addEventListener("mouseleave", () => {
if (typeof ScrollTrigger === 'undefined' || ScrollTrigger.isInViewport(sliderWrapper)) startAutoplay();
});

slides.forEach((slide, i) => {
slide.addEventListener("click", () => {
loop.toIndex(i, { ease: "osmo-ease", duration: 0.725 });
});
});

if (bullets && bullets.length > 0) {
bullets.forEach((bullet, i) => {
bullet.addEventListener("click", () => {
loop.toIndex(i, { ease: "osmo-ease", duration: 0.725 });
if (activeBullet) activeBullet.classList.remove("active");
bullet.classList.add("active");
activeBullet = bullet;
bullets.forEach((b, j) => {
b.setAttribute("aria-selected", j === i ? "true" : "false");
});
});
});
}

if (prevButton) {
prevButton.addEventListener("click", () => {
let newIndex = currentIndex - 1;
if (newIndex < 0) newIndex = slides.length - 1;
loop.toIndex(newIndex, { ease: "osmo-ease", duration: 0.725 });
});
}

if (nextButton) {
nextButton.addEventListener("click", () => {
let newIndex = currentIndex + 1;
if (newIndex >= slides.length) newIndex = 0;
loop.toIndex(newIndex, { ease: "osmo-ease", duration: 0.725 });
});
}
});
}

// GSAP Helper function to create a looping slider
// Read more: https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop
function horizontalLoop(items, config) {
let timeline;
items = gsap.utils.toArray(items);
config = config || {};
gsap.context(() => {
let onChange = config.onChange,
lastIndex = 0,
tl = gsap.timeline({repeat: config.repeat, onUpdate: onChange && function() {
let i = tl.closestIndex();
if (lastIndex !== i) {
lastIndex = i;
onChange(items[i], i);
}
}, paused: config.paused, defaults: {ease: "none"}, onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)}),
length = items.length,
startX = items[0].offsetLeft,
times = [],
widths = [],
spaceBefore = [],
xPercents = [],
curIndex = 0,
indexIsDirty = false,
center = config.center,
pixelsPerSecond = (config.speed || 1) * 100,
snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1),
timeOffset = 0,
container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
totalWidth,
getTotalWidth = () => items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + spaceBefore[0] + items[length-1].offsetWidth * gsap.getProperty(items[length-1], "scaleX") + (parseFloat(config.paddingRight) || 0),
populateWidths = () => {
let b1 = container.getBoundingClientRect(), b2;
items.forEach((el, i) => {
widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] * 100 + gsap.getProperty(el, "xPercent"));
b2 = el.getBoundingClientRect();
spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
b1 = b2;
});
gsap.set(items, {
xPercent: i => xPercents[i]
});
totalWidth = getTotalWidth();
},
timeWrap,
populateOffsets = () => {
timeOffset = center ? tl.duration() * (container.offsetWidth / 2) / totalWidth : 0;
center && times.forEach((t, i) => {
times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 / totalWidth - timeOffset);
});
},
getClosest = (values, value, wrap) => {
let i = values.length,
closest = 1e10,
index = 0, d;
while (i--) {
d = Math.abs(values[i] - value);
if (d > wrap / 2) {
d = wrap - d;
}
if (d < closest) {
closest = d;
index = i;
}
}
return index;
},
populateTimeline = () => {
let i, item, curX, distanceToStart, distanceToLoop;
tl.clear();
for (i = 0; i < length; i++) {
item = items[i];
curX = xPercents[i] / 100 * widths[i];
distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
.fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
.add("label" + i, distanceToStart / pixelsPerSecond);
times[i] = distanceToStart / pixelsPerSecond;
}
timeWrap = gsap.utils.wrap(0, tl.duration());
},
refresh = (deep) => {
let progress = tl.progress();
tl.progress(0, true);
populateWidths();
deep && populateTimeline();
populateOffsets();
deep && tl.draggable ? tl.time(times[curIndex], true) : tl.progress(progress, true);
},
onResize = () => refresh(true),
proxy;
gsap.set(items, {x: 0});
populateWidths();
populateTimeline();
populateOffsets();
window.addEventListener("resize", onResize);
function toIndex(index, vars) {
vars = vars || {};
(Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length); // always go in the shortest direction
let newIndex = gsap.utils.wrap(0, length, index),
time = times[newIndex];
if (time > tl.time() !== index > curIndex && index !== curIndex) { // if we're wrapping the timeline's playhead, make the proper adjustments
time += tl.duration() * (index > curIndex ? 1 : -1);
}
if (time < 0 || time > tl.duration()) {
vars.modifiers = {time: timeWrap};
}
curIndex = newIndex;
vars.overwrite = true;
gsap.killTweensOf(proxy);
return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
}
tl.toIndex = (index, vars) => toIndex(index, vars);
tl.closestIndex = setCurrent => {
let index = getClosest(times, tl.time(), tl.duration());
if (setCurrent) {
curIndex = index;
indexIsDirty = false;
}
return index;
};
tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
tl.next = vars => toIndex(tl.current()+1, vars);
tl.previous = vars => toIndex(tl.current()-1, vars);
tl.times = times;
tl.progress(1, true).progress(0, true); // pre-render for performance
if (config.reversed) {
tl.vars.onReverseComplete();
tl.reverse();
}
if (config.draggable && typeof(Draggable) === "function") {
proxy = document.createElement("div")
let wrap = gsap.utils.wrap(0, 1),
ratio, startProgress, draggable, dragSnap, lastSnap, initChangeX, wasPlaying,
align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
syncIndex = () => tl.closestIndex(true);
typeof(InertiaPlugin) === "undefined" && console.warn("InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club");
draggable = Draggable.create(proxy, {
trigger: items[0].parentNode,
type: "x",
onPressInit() {
let x = this.x;
gsap.killTweensOf(tl);
wasPlaying = !tl.paused();
tl.pause();
startProgress = tl.progress();
refresh();
ratio = 1 / totalWidth;
initChangeX = (startProgress / -ratio) - x;
gsap.set(proxy, {x: startProgress / -ratio});
},
onDrag: align,
onThrowUpdate: align,
overshootTolerance: 0,
inertia: true,
snap(value) {
if (Math.abs(startProgress / -ratio - this.x) < 10) {
return lastSnap + initChangeX
}
let time = -(value * ratio) * tl.duration(),
wrappedTime = timeWrap(time),
snapTime = times[getClosest(times, wrappedTime, tl.duration())],
dif = snapTime - wrappedTime;
Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
lastSnap = (time + dif) / tl.duration() / -ratio;
return lastSnap;
},
onRelease() {
syncIndex();
draggable.isThrowing && (indexIsDirty = true);
},
onThrowComplete: () => {
syncIndex();
wasPlaying && tl.play();
}
})[0];
tl.draggable = draggable;
}
tl.closestIndex(true);
lastIndex = curIndex;
onChange && onChange(items[curIndex], curIndex);
timeline = tl;
return () => window.removeEventListener("resize", onResize);
});
return timeline;
}
*/

// ──────────────────────────────────────────────────────────────────────────────
/* Tab System (added) */
// ──────────────────────────────────────────────────────────────────────────────
function initTabSystem() {
if (typeof gsap === 'undefined') return;

const wrappers = document.querySelectorAll('[data-tabs="wrapper"]');
if (!wrappers.length) return;

wrappers.forEach((wrapper) => {
const contentItems = wrapper.querySelectorAll('[data-tabs="content-item"]');
const visualItems = wrapper.querySelectorAll('[data-tabs="visual-item"]');

const autoplay = wrapper.dataset.tabsAutoplay === "true";
const autoplayDuration = parseInt(wrapper.dataset.tabsAutoplayDuration) || 5000;

let activeContent = null;
let activeVisual = null;
let isAnimating = false;
let progressBarTween = null;

function startProgressBar(index) {
if (progressBarTween) progressBarTween.kill();
const bar = contentItems[index].querySelector('[data-tabs="item-progress"]');
if (!bar) return;

gsap.set(bar, { scaleX: 0, transformOrigin: "left center" });
progressBarTween = gsap.to(bar, {
scaleX: 1,
duration: autoplayDuration / 1000,
ease: "power1.inOut",
onComplete: () => {
if (!isAnimating) {
const nextIndex = (index + 1) % contentItems.length;
switchTab(nextIndex);
}
},
});
}

function switchTab(index) {
if (isAnimating || contentItems[index] === activeContent) return;

isAnimating = true;
if (progressBarTween) progressBarTween.kill();

const outgoingContent = activeContent;
const outgoingVisual = activeVisual;
const outgoingBar = outgoingContent?.querySelector('[data-tabs="item-progress"]');

const incomingContent = contentItems[index];
const incomingVisual = visualItems[index];
const incomingBar = incomingContent.querySelector('[data-tabs="item-progress"]');

outgoingContent?.classList.remove("active");
outgoingVisual?.classList.remove("active");
incomingContent.classList.add("active");
incomingVisual.classList.add("active");

const tl = gsap.timeline({
defaults: { duration: 0.65, ease: "power3" },
onComplete: () => {
activeContent = incomingContent;
activeVisual = incomingVisual;
isAnimating = false;
if (autoplay) startProgressBar(index);
},
});

if (outgoingContent) {
outgoingContent.classList.remove("active");
outgoingVisual?.classList.remove("active");
tl.set(outgoingBar, { transformOrigin: "right center" })
.to(outgoingBar, { scaleX: 0, duration: 0.3 }, 0)
.to(outgoingVisual, { autoAlpha: 0, xPercent: 3 }, 0)
.to(outgoingContent.querySelector('[data-tabs="item-details"]'), { height: 0 }, 0);
}

incomingContent.classList.add("active");
incomingVisual.classList.add("active");
tl.fromTo(incomingVisual, { autoAlpha: 0, xPercent: 3 }, { autoAlpha: 1, xPercent: 0 }, 0.3)
.fromTo(
incomingContent.querySelector('[data-tabs="item-details"]'),
{ height: 0 },
{ height: "auto" },
0
)
.set(incomingBar, { scaleX: 0, transformOrigin: "left center" }, 0);
}

// on page load, set first to active
switchTab(0);

// switch tabs on click
contentItems.forEach((item, i) =>
item.addEventListener("click", () => {
if (item === activeContent) return;
switchTab(i);
})
);
});
}

// ──────────────────────────────────────────────────────────────────────────────
/* Modals (added) */
// ──────────────────────────────────────────────────────────────────────────────
function initModals() {
const openModal = (name) => {
const modal = document.querySelector(`[data-modal-name="${name}"]`);
if (modal) modal.setAttribute('data-modal-status', 'active');
};

const closeModals = () => {
document.querySelectorAll('[data-modal-name][data-modal-status="active"]')
.forEach(m => m.setAttribute('data-modal-status', 'not-active'));
};

document.addEventListener('click', (e) => {
const trigger = e.target.closest('[data-modal-target]');
if (trigger) {
openModal(trigger.getAttribute('data-modal-target'));
}
}, { passive: true });

document.addEventListener('click', (e) => {
if (e.target.closest('[data-modal-close]')) {
closeModals();
return;
}
if (e.target.matches('[data-modal-name][data-modal-status="active"]')) {
closeModals();
}
});

document.addEventListener('keydown', (e) => {
if (e.key === 'Escape') closeModals();
});
}

// ──────────────────────────────────────────────────────────────────────────────
/* Copy Email to Clipboard (added) */
// ──────────────────────────────────────────────────────────────────────────────
function initCopyEmailClipboard() {
const buttons = document.querySelectorAll('[data-copy-email]');
if (!buttons.length) return;

const copyEmail = (button) => {
const email =
button.getAttribute('data-copy-email') ||
button.querySelector('[data-copy-email-element]')?.textContent.trim();
if (email && navigator.clipboard?.writeText) {
navigator.clipboard.writeText(email).then(() => {
button.setAttribute('data-copy-button', 'copied');
button.setAttribute('aria-label', 'Email copied to clipboard!');
});
}
};

const handleInteraction = (e) => {
if (
e.type === 'click' ||
(e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))
) {
e.preventDefault();
copyEmail(e.currentTarget);
}
};

buttons.forEach((button) => {
button.addEventListener('click', handleInteraction);
button.addEventListener('keydown', handleInteraction);
button.addEventListener('mouseleave', () => {
button.removeAttribute('data-copy-button');
button.blur();
button.setAttribute('aria-label', 'Copy email to clipboard');
});
button.addEventListener('blur', () => {
button.removeAttribute('data-copy-button');
button.setAttribute('aria-label', 'Copy email to clipboard');
});
});
}

// ──────────────────────────────────────────────────────────────────────────────
/* Custom Submit Button (added) */
// ──────────────────────────────────────────────────────────────────────────────
function initCustomSubmitButton() {
const forms = document.querySelectorAll('[data-form-validate]');
if (!forms.length) return;

forms.forEach((form) => {
const submitButtonDiv = form.querySelector('[data-submit]');
const submitInput = submitButtonDiv?.querySelector('input[type="submit"]');

if (!submitButtonDiv || !submitInput) return;

submitButtonDiv.addEventListener('click', function () {
submitInput.click();
});

form.addEventListener('keydown', function (event) {
if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
event.preventDefault();
submitInput.click();
}
});
});
}

// ──────────────────────────────────────────────────────────────────────────────
/* Mobile Nav Menu (added) */
// ──────────────────────────────────────────────────────────────────────────────
function initMobileNavMenu() {
const nav = document.querySelector('.nav-menu-wrap');
const triggers = document.querySelectorAll('[data-menu-trigger]');
if (!nav || !triggers.length) return;

const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
const CLOSED_TOP = '-100vh';

if (!nav.dataset.menuOpen) nav.dataset.menuOpen = 'not-active';
nav.style.top = nav.dataset.menuOpen === 'active' ? '0' : CLOSED_TOP;

function setState(open) {
nav.dataset.menuOpen = open ? 'active' : 'not-active';
nav.style.top = open ? '0' : CLOSED_TOP;

triggers.forEach(btn => {
const label = btn.querySelector('[data-menu-label]') || btn;
if (!btn.dataset.label) btn.dataset.label = label.textContent.trim();
label.textContent = open ? 'close' : btn.dataset.label;
btn.setAttribute('aria-expanded', open ? 'true' : 'false');
});
}

function toggle() {
if (!isMobile()) return;
setState(nav.dataset.menuOpen !== 'active');
}

triggers.forEach(btn => btn.addEventListener('click', toggle));

window.addEventListener('resize', () => {
if (!isMobile()) setState(false);
});
}

