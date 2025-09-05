  const lenis = new Lenis();
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {lenis.raf(time * 1000);});
  gsap.ticker.lagSmoothing(0);

  gsap.registerPlugin(ScrollTrigger, SplitText)

  function initHighlightText(){

    let splitHeadingTargets = document.querySelectorAll("[data-highlight-text]")
    splitHeadingTargets.forEach((heading) => {

      const scrollStart = heading.getAttribute("data-highlight-scroll-start") || "top 90%"
      const scrollEnd = heading.getAttribute("data-highlight-scroll-end") || "center 40%"
      const fadedValue = heading.getAttribute("data-highlight-fade") || 0.4 // Opacity of letter
      const staggerValue =  heading.getAttribute("data-highlight-stagger") || 0.1 // Smoother reveal

      new SplitText(heading, {
        type: "words, chars",
        autoSplit: true,
        onSplit(self) {
          let ctx = gsap.context(() => {
            let tl = gsap.timeline({
              scrollTrigger: {
                scrub: true,
                trigger: heading, 
                start: scrollStart,
                end: scrollEnd,
              }
            })
            tl.from(self.chars,{
              autoAlpha: fadedValue,
              stagger: staggerValue,
              ease: "linear"
            })
          });
          return ctx; // return our animations so GSAP can clean them up when onSplit fires
        }
      });    
    });
  }

  // Initialize Highlight Text on Scroll
  document.addEventListener("DOMContentLoaded", () =>{
    initHighlightText();
  });

  gsap.registerPlugin(ScrollTrigger)

  function initGlobalParallax() {
    const mm = gsap.matchMedia()

    mm.add(
      {
        isMobile: "(max-width:479px)",
        isMobileLandscape: "(max-width:767px)",
        isTablet: "(max-width:991px)",
        isDesktop: "(min-width:992px)"
      },
      (context) => {
        const { isMobile, isMobileLandscape, isTablet } = context.conditions

        const ctx = gsap.context(() => {
          document.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
            // Check if this trigger has to be disabled on smaller breakpoints
            const disable = trigger.getAttribute("data-parallax-disable")
            if (
              (disable === "mobile" && isMobile) ||
              (disable === "mobileLandscape" && isMobileLandscape) ||
              (disable === "tablet" && isTablet)
            ) {
              return
            }

            // Optional: you can target an element inside a trigger if necessary 
            const target = trigger.querySelector('[data-parallax="target"]') || trigger

            // Get the direction value to decide between xPercent or yPercent tween
            const direction = trigger.getAttribute("data-parallax-direction") || "vertical"
            const prop = direction === "horizontal" ? "xPercent" : "yPercent"

            // Get the scrub value, our default is 'true' because that feels nice with Lenis
            const scrubAttr = trigger.getAttribute("data-parallax-scrub")
            const scrub = scrubAttr ? parseFloat(scrubAttr) : true

            // Get the start position in % 
            const startAttr = trigger.getAttribute("data-parallax-start")
            const startVal = startAttr !== null ? parseFloat(startAttr) : 20

            // Get the end position in %
            const endAttr = trigger.getAttribute("data-parallax-end")
            const endVal = endAttr !== null ? parseFloat(endAttr) : -20

            // Get the start value of the ScrollTrigger
            const scrollStartRaw = trigger.getAttribute("data-parallax-scroll-start") || "top bottom"
            const scrollStart = `clamp(${scrollStartRaw})`

            // Get the end value of the ScrollTrigger  
            const scrollEndRaw = trigger.getAttribute("data-parallax-scroll-end") || "bottom top"
            const scrollEnd = `clamp(${scrollEndRaw})`

            gsap.fromTo(
              target,
              { [prop]: startVal },
              {
                [prop]: endVal,
                ease: "none",
                scrollTrigger: {
                  trigger,
                  start: scrollStart,
                  end: scrollEnd,
                  scrub,
                },
              }
            )
          })
        })

        return () => ctx.revert()
      }
    )
  }

  document.addEventListener("DOMContentLoaded", () => {
    initGlobalParallax()
  })

  // Register once somewhere central in your bundle:
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // --- Parallax image swapping ---
  function initParallaxImages() {
    const ctx = gsap.context(() => {
      const imgs = gsap.utils.toArray('[data-parallax-image]');
      const panels = gsap.utils.toArray('[data-parallax-text]');

      // 1) Stack & initialize visibility (1 is shown by default)
      imgs.forEach(img => {
        gsap.set(img, {
          // These help ensure images overlap and fade smoothly
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          objectFit: 'cover',
          willChange: 'opacity',
          autoAlpha: img.dataset.parallaxImage === '1' ? 1 : 0
        });
      });

      // 2) Swap helper
      function swap(idx) {
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
      }

      // 3) Create ScrollTriggers on each text panel
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

      // 4) Recalculate after everything is wired up (good with Lenis)
      ScrollTrigger.refresh();
    });

    // Return cleanup so you can call it before hot-swapping content if needed
    return () => ctx.revert();
  }

  // --- Init all on DOM ready ---
  document.addEventListener('DOMContentLoaded', () => {
    // Your existing inits
    initHighlightText();
    initGlobalParallax();

    // The missing piece:
    initParallaxImages();
  });

  gsap.registerPlugin(ScrollTrigger);

  function initStackingCardsParallax(){
    const cards = document.querySelectorAll("[data-stacking-cards-item]");

    if (cards.length < 2) return;

    cards.forEach((card, i) => {
      // Skip over the first section
      if (i === 0) return;

      // When current section is in view, target the PREVIOUS one
      const previousCard = cards[i - 1]
      if (!previousCard) return;

      // Find any element inside the previous card
      const previousCardImage = previousCard.querySelector("[data-stacking-cards-img]")

      let tl = gsap.timeline({
        defaults:{
          ease:"none",
          duration: 1
        },
        scrollTrigger: {
          trigger: card,
          start: "top bottom",
          end: "top top",
          scrub: true,
          invalidateOnRefresh: true
        }
      })

      tl.fromTo(previousCard,{ yPercent: 0 },{ yPercent: 50})
        .fromTo(previousCardImage,{ rotate: 0, yPercent:0 },{ rotate: -5, yPercent: -25 }, "<")

    });
  }

  document.addEventListener("DOMContentLoaded", () =>{
    initStackingCardsParallax();
  })

  gsap.registerPlugin(Draggable);

  function initStackedCardsSlider() {
    document.querySelectorAll('[data-stacked-cards]').forEach(function(container) {

      // animation presets
      let easeBeforeRelease = { duration: 0.2, ease: 'Power2.easeOut' };
      let easeAfterRelease  = { duration: 1, ease: 'elastic.out(1,0.75)' };

      let activeDeg   = 4;
      let inactiveDeg = -4;

      const list = container.querySelector('[data-stacked-cards-list]');
      if(!list) return;

      // Draggable instances & cached elements
      let dragFirst, dragSecond;
      let firstItem, secondItem, firstEl, secondEl;
      let full, t;

      function restack() {
        const items = Array.from(list.querySelectorAll('[data-stacked-cards-item]'));
        items.forEach(function(item) {
          item.classList.remove('is--active', 'is--second');
        });
        items[0].style.zIndex = 3;
        items[0].style.transform = `rotate(${activeDeg}deg)`;
        items[0].style.pointerEvents = 'auto';
        items[0].classList.add('is--active');

        items[1].style.zIndex = 2;
        items[1].style.transform = `rotate(${inactiveDeg}deg)`;
        items[1].style.pointerEvents = 'none';
        items[1].classList.add('is--second');

        items[2].style.zIndex = 1;
        items[2].style.transform = `rotate(${activeDeg}deg)`;

        items.slice(3).forEach(function(item) {
          item.style.zIndex = 0;
          item.style.transform = `rotate(${inactiveDeg}deg)`;
        });
      }

      function setupDraggables() {
        restack();

        // cache top two cards
        const items = Array.from(list.querySelectorAll(':scope > [data-stacked-cards-item]'));
        firstItem   = items[0];
        secondItem  = items[1];
        firstEl     = firstItem.querySelector('[data-stacked-cards-card]');
        secondEl    = secondItem.querySelector('[data-stacked-cards-card]');

        // compute thresholds
        const width = firstEl.getBoundingClientRect().width;
        full = width * 1.15;
        t    = width * 0.1;

        // kill old Draggables
        dragFirst?.kill();
        dragSecond?.kill();

        // --- First card draggable ---
        dragFirst = Draggable.create(firstEl, {
          type: 'x',
          onPress() {
            firstEl.classList.add('is--dragging');
          },
          onRelease() {
            firstEl.classList.remove('is--dragging');
          },
          onDrag() {
            let raw = this.x;
            if (Math.abs(raw) > full) {
              const over = Math.abs(raw) - full;
              raw = (raw > 0 ? 1 : -1) * (full + over * 0.1);
            }
            gsap.set(firstEl, { x: raw, rotation: 0 });
          },
          onDragEnd() {
            const x   = this.x;
            const dir = x > 0 ? 'right' : 'left';

            // hand control to second card
            this.disable?.();
            dragSecond?.enable?.();
            firstItem.style.pointerEvents = 'none';
            secondItem.style.pointerEvents = 'auto';

            if (Math.abs(x) <= t) {
              // small drag: just snap back
              gsap.to(firstEl, {
                x: 0, rotation: 0,
                ...easeBeforeRelease,
                onComplete: resetCycle
              });
            }
            else if (Math.abs(x) <= full) {
              flick(dir, false, x);
            }
            else {
              flick(dir, true);
            }
          }
        })[0];

        // --- Second card draggable ---
        dragSecond = Draggable.create(secondEl, {
          type: 'x',
          onPress() {
            secondEl.classList.add('is--dragging');
          },
          onRelease() {
            secondEl.classList.remove('is--dragging');
          },
          onDrag() {
            let raw = this.x;
            if (Math.abs(raw) > full) {
              const over = Math.abs(raw) - full;
              raw = (raw > 0 ? 1 : -1) * (full + over * 0.2);
            }
            gsap.set(secondEl, { x: raw, rotation: 0 });
          },
          onDragEnd() {
            gsap.to(secondEl, {
              x: 0, rotation: 0,
              ...easeBeforeRelease
            });
          }
        })[0];

        // start with first card active
        dragFirst?.enable?.();
        dragSecond?.disable?.();
        firstItem.style.pointerEvents = 'auto';
        secondItem.style.pointerEvents = 'none';
      }

      function flick(dir, skipHome = false, releaseX = 0) {
        if (!(dir === 'left' || dir === 'right')) {
          dir = activeDeg > 0 ? 'right' : 'left';
        }
        dragFirst?.disable?.();

        const item = list.querySelector('[data-stacked-cards-item]');
        const card = item.querySelector('[data-stacked-cards-card]');
        const exitX = dir === 'right' ? full : -full;

        if (skipHome) {
          const visualX = gsap.getProperty(card, 'x');
          list.appendChild(item);
          [activeDeg, inactiveDeg] = [inactiveDeg, activeDeg];
          restack();
          gsap.fromTo(
            card,
            { x: visualX, rotation: 0 },
            { x: 0, rotation: 0, ...easeAfterRelease, onComplete: resetCycle }
          );

        } else {
          gsap.fromTo(
            card,
            { x: releaseX, rotation: 0 },
            {
              x: exitX,
              ...easeBeforeRelease,
              onComplete() {
                gsap.set(card, { x: 0, rotation: 0 });
                list.appendChild(item);
                [activeDeg, inactiveDeg] = [inactiveDeg, activeDeg];
                resetCycle();
                const newCard = item.querySelector('[data-stacked-cards-card]');
                gsap.fromTo(
                  newCard,
                  { x: exitX },
                  { x: 0, ...easeAfterRelease, onComplete: resetCycle }
                );
              }
            }
          );
        }
      }

      function resetCycle() {
        list.querySelectorAll('[data-stacked-cards-card].is--dragging').forEach(function(el) {
          el.classList.remove('is--dragging');
        });
        setupDraggables();
      }

      setupDraggables();

      // “Next” button support
      container.querySelectorAll('[data-stacked-cards-control="next"]').forEach(function(btn) {
        btn.onclick = function() { flick(); };
      });
    });
  }

  // Initialize Stacked Cards Slider
  document.addEventListener("DOMContentLoaded", () => {
    initStackedCardsSlider();
  });

  gsap.registerPlugin(InertiaPlugin);

  function initGlowingInteractiveDotsGrid() {
    document.querySelectorAll('[data-dots-container-init]').forEach(container => {
      // ---- tunables -----------------------------------------------------------
      const colors         = { base: "#FFFFFF0D", active: "#FFFFFF" }; // 5% → 100% white
      const threshold      = 200;   // color/attract radius
      const speedThreshold = 100;
      const shockRadius    = 325;
      const shockPower     = 5;
      const maxSpeed       = 5000;
      const centerHole     = true;

      // NEW: density caps (reduce DOM size on large screens)
      const maxCols = 60;   // hard cap on columns (tweak)
      const maxRows = 40;   // hard cap on rows (tweak)

      // -------------------------------------------------------------------------
      const svgTemplate = container.querySelector('.dot-svg') || document.querySelector('.dot-svg');

      let dots = [];         // DOM elements (non-hole)
      let centers = [];      // {el,x,y,col,row}
      let hash = new Map();  // spatial hash: "cx:cy" -> array of indices into centers
      const cellSize = threshold; // each bucket ≈ threshold

      function keyFor(x, y) {
        return `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
      }

      function indexIntoHash(i, x, y) {
        const k = keyFor(x, y);
        let arr = hash.get(k);
        if (!arr) hash.set(k, (arr = []));
        arr.push(i);
      }

      function getNearbyIndices(x, y) {
        const cx = Math.floor(x / cellSize);
        const cy = Math.floor(y / cellSize);
        const out = [];
        // check this cell + 8 neighbors
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
        container.innerHTML = "";
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

        // --- subsample to avoid thousands of nodes on big screens --------------
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

          const d = document.createElement("div");
          d.className = "dot";
          // keep each dot sized by CSS; we only transform it
          d.style.willChange = "transform";

          if (isHole) {
            d.style.visibility = "hidden";
            d._isHole = true;
          } else {
            // inject SVG once per dot
            if (svgTemplate) {
              const svg = svgTemplate.cloneNode(true);
              svg.style.display = "";
              svg.setAttribute("aria-hidden", "true");
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

        // compute centers + spatial hash on next frame (layout settled)
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

      window.addEventListener("resize", buildGrid, { passive: true });
      buildGrid();

      let lastTime = 0, lastX = 0, lastY = 0;

      window.addEventListener("mousemove", e => {
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

        // only touch dots in nearby buckets
        const nearby = getNearbyIndices(e.pageX, e.pageY);
        if (!nearby.length) return;

        requestAnimationFrame(() => {
          for (let i = 0; i < nearby.length; i++) {
            const c = centers[nearby[i]];
            const el = c.el;
            const dist = Math.hypot(c.x - e.pageX, c.y - e.pageY);
            if (dist > threshold) continue;

            const t   = 1 - dist / threshold;
            const col = gsap.utils.interpolate(colors.base, colors.active, t);
            tintDot(el, col);

            if (speed > speedThreshold && !el._inertiaApplied) {
              el._inertiaApplied = true;
              const pushX = (c.x - e.pageX) + vx * 0.005;
              const pushY = (c.y - e.pageY) + vy * 0.005;
              gsap.to(el, {
                inertia: { x: pushX, y: pushY, resistance: 750 },
                onComplete() {
                  gsap.to(el, { x: 0, y: 0, duration: 1.5, ease: "elastic.out(1,0.75)" });
                  el._inertiaApplied = false;
                }
              });
            }
          }
        });
      }, { passive: true });

      window.addEventListener("click", e => {
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
              gsap.to(el, { x: 0, y: 0, duration: 1.5, ease: "elastic.out(1,0.75)" });
              el._inertiaApplied = false;
            }
          });
        }
      }, { passive: true });
    });
  }

  document.addEventListener('DOMContentLoaded', initGlowingInteractiveDotsGrid);


  function initDynamicCurrentYear() {  
    const currentYear = new Date().getFullYear();
    const currentYearElements = document.querySelectorAll('[data-current-year]');
    currentYearElements.forEach(currentYearElement => {
      currentYearElement.textContent = currentYear;
    });
  }

  // Initialize Dynamic Current Year
  document.addEventListener('DOMContentLoaded', () => {
    initDynamicCurrentYear();
  });

  (function() {
    const colors = [
      "var(--color-red)",
      "var(--color-green)",
      "var(--color-blue)",
      "var(--color-yellow)",
      "var(--color-orange)"
    ];

    // Try to load from session, otherwise set a new one
    let sessionColor = sessionStorage.getItem("randomColor");
    if (!sessionColor) {
      sessionColor = colors[Math.floor(Math.random() * colors.length)];
      sessionStorage.setItem("randomColor", sessionColor);
    }

    // Apply to all elements with data-color-random
    document.querySelectorAll("[data-color-random]").forEach((el) => {
      const type = el.getAttribute("data-color-random");
      if (type === "bg") {
        el.style.backgroundColor = sessionColor;
      } else if (type === "text") {
        el.style.color = sessionColor;
      }
    });
  })();

  function initVimeoLightboxAdvanced() {
    // Single lightbox container
    const lightbox = document.querySelector('[data-vimeo-lightbox-init]');
    if (!lightbox) return;

    // Open & close buttons
    const openButtons  = document.querySelectorAll('[data-vimeo-lightbox-control="open"]');
    const closeButtons = document.querySelectorAll('[data-vimeo-lightbox-control="close"]');

    // Core elements inside lightbox
    let iframe            = lightbox.querySelector('iframe');               // ← now let
    const placeholder     = lightbox.querySelector('.vimeo-lightbox__placeholder');
    const calcEl          = lightbox.querySelector('.vimeo-lightbox__calc');
    const wrapEl          = lightbox.querySelector('.vimeo-lightbox__calc-wrap');
    const playerContainer = lightbox.querySelector('[data-vimeo-lightbox-player]');

    // State
    let player = null;
    let currentVideoID = null;
    let videoAspectRatio = null;
    let globalMuted = lightbox.getAttribute('data-vimeo-muted') === 'true';
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const playedOnce = new Set();  // track first play on touch

    // Format time (seconds → "m:ss")
    function formatTime(s) {
      const m   = Math.floor(s / 60);
      const sec = Math.floor(s % 60).toString().padStart(2, '0');
      return `${m}:${sec}`;
    }

    // Clamp wrap height
    function clampWrapSize(ar) {
      const w = calcEl.offsetWidth;
      const h = calcEl.offsetHeight;
      wrapEl.style.maxWidth = Math.min(w, h / ar) + 'px';
    }

    // Adjust sizing in "cover" mode
    function adjustCoverSizing() {
      if (!videoAspectRatio) return;
      const cH = playerContainer.offsetHeight;
      const cW = playerContainer.offsetWidth;
      const r  = cH / cW;
      const wEl = lightbox.querySelector('.vimeo-lightbox__iframe');
      if (r > videoAspectRatio) {
        wEl.style.width  = (r / videoAspectRatio * 100) + '%';
        wEl.style.height = '100%';
      } else {
        wEl.style.height = (videoAspectRatio / r * 100) + '%';
        wEl.style.width  = '100%';
      }
    }

    // Close & pause lightbox
    function closeLightbox() {
      lightbox.setAttribute('data-vimeo-activated', 'false');
      if (player) {
        player.pause();
        lightbox.setAttribute('data-vimeo-playing', 'false');
      }
    }

    // Wire Escape key & close buttons
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeLightbox();
    });
    closeButtons.forEach(btn => btn.addEventListener('click', closeLightbox));

    // Setup Vimeo Player event handlers
    function setupPlayerEvents() {
      // Hide placeholder when playback starts
      player.on('play', () => {
        lightbox.setAttribute('data-vimeo-loaded', 'true');
        lightbox.setAttribute('data-vimeo-playing', 'true');
      });
      // Close on video end
      player.on('ended', closeLightbox);

      // Paused
      player.on('pause', () => {
        lightbox.setAttribute('data-vimeo-playing', 'false');
      });

      // Duration UI
      const durEl = lightbox.querySelector('[data-vimeo-duration]');
      player.getDuration().then(d => {
        if (durEl) durEl.textContent = formatTime(d);
        lightbox.querySelectorAll('[data-vimeo-control="timeline"],progress')
          .forEach(el => el.max = d);
      });

      // Timeline & progress updates
      const tl = lightbox.querySelector('[data-vimeo-control="timeline"]');
      const pr = lightbox.querySelector('progress');
      player.on('timeupdate', data => {
        if (tl) tl.value = data.seconds;
        if (pr) pr.value = data.seconds;
        if (durEl) durEl.textContent = formatTime(Math.trunc(data.seconds));
      });
      if (tl) {
        ['input','change'].forEach(evt =>
                                   tl.addEventListener(evt, e => {
          const v = e.target.value;
          player.setCurrentTime(v);
          if (pr) pr.value = v;
        })
                                  );
      }

      // Hover → hide controls after a timeout
      let hoverTimer;
      playerContainer.addEventListener('mousemove', () => {
        lightbox.setAttribute('data-vimeo-hover', 'true');
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          lightbox.setAttribute('data-vimeo-hover', 'false');
        }, 3000);
      });

      // Fullscreen toggle on player container
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
          } else {
            lightbox.setAttribute('data-vimeo-fullscreen', 'true');
            (playerContainer.requestFullscreen || playerContainer.webkitRequestFullscreen)
              .call(playerContainer);
          }
        });
        ['fullscreenchange','webkitfullscreenchange'].forEach(evt =>
                                                              document.addEventListener(evt, () =>
                                                                                        lightbox.setAttribute('data-vimeo-fullscreen', isFS() ? 'true' : 'false')
                                                                                       ));
      }
    }

    // Run sizing logic
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

    // Re-run sizing on viewport resize
    window.addEventListener('resize', () => {
      if (player) runSizing();
    });

    // Open or switch video
    async function openLightbox(id, placeholderBtn) {
      // Enter loading state immediately
      lightbox.setAttribute('data-vimeo-activated', 'loading');
      lightbox.setAttribute('data-vimeo-loaded',    'false');

      // — FULL RESET if new video ID —
      if (player && id !== currentVideoID) {
        await player.pause();
        await player.unload();

        // Replace old iframe with a fresh one
        const oldIframe = iframe;
        const newIframe = document.createElement('iframe');
        newIframe.className = oldIframe.className;
        newIframe.setAttribute('allow', oldIframe.getAttribute('allow'));
        newIframe.setAttribute('frameborder', '0');
        newIframe.setAttribute('allowfullscreen', 'true');
        newIframe.setAttribute('allow', 'autoplay; encrypted-media');
        oldIframe.parentNode.replaceChild(newIframe, oldIframe);

        // Reset state
        iframe         = newIframe;
        player         = null;
        currentVideoID = null;
        lightbox.setAttribute('data-vimeo-playing', 'false');
      }

      // Update placeholder image attributes
      if (placeholderBtn) {
        ['src','srcset','sizes','alt','width'].forEach(attr => {
          const val = placeholderBtn.getAttribute(attr);
          if (val != null) placeholder.setAttribute(attr, val);
        });
      }

      // Build a brand-new player if needed
      if (!player) {
        iframe.src = `https://player.vimeo.com/video/${id}?api=1&background=1&autoplay=0&loop=0&muted=0`;
        player = new Vimeo.Player(iframe);
        setupPlayerEvents();
        currentVideoID = id;
        await runSizing();
      }

      // Now sizing is ready — show lightbox
      lightbox.setAttribute('data-vimeo-activated', 'true');

      // Autoplay logic
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

    // Internal controls
    lightbox.querySelector('[data-vimeo-control="play"]').addEventListener('click', () => {
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

    lightbox.querySelector('[data-vimeo-control="pause"]').addEventListener('click', () => {
      player.pause();
    });

    lightbox.querySelector('[data-vimeo-control="mute"]').addEventListener('click', () => {
      globalMuted = !globalMuted;
      player.setVolume(globalMuted ? 0 : 1).then(() =>
                                                 lightbox.setAttribute('data-vimeo-muted', globalMuted ? 'true' : 'false')
                                                );
    });

    // Wire up open buttons
    openButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const vid = btn.getAttribute('data-vimeo-lightbox-id');
        const img = btn.querySelector('[data-vimeo-lightbox-placeholder]');
        openLightbox(vid, img);
      });
    });
  }

  // Initialize Vimeo Lightbox (Advanced)
  document.addEventListener('DOMContentLoaded', function() {
    initVimeoLightboxAdvanced();
  });

  (() => {
    const SELECTOR = '[data-button-offset]';
    // Tweak this if your header uses other classes/selectors
    const HEADER_SELECTOR = '[data-fixed-header], header.fixed, header.sticky, .fixed-header, .site-header';

    function parseOffset(value, ctx) {
      const ctxSize = parseFloat(getComputedStyle(ctx || document.documentElement).fontSize) || 16;
      const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const def = 4 * ctxSize; // default 4em
      if (!value) return def;
      const v = String(value).trim().toLowerCase();
      if (v.endsWith('px')) return parseFloat(v);
      if (v.endsWith('rem')) return parseFloat(v) * rootSize;
      if (v.endsWith('em')) return parseFloat(v) * ctxSize;
      if (v.endsWith('vh')) return window.innerHeight * (parseFloat(v) / 100);
      if (v.endsWith('vw')) return window.innerWidth * (parseFloat(v) / 100);
      const n = parseFloat(v);
      return isNaN(n) ? def : n; // bare number => px
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

      const baseOffset = parseOffset(btn.getAttribute('data-button-offset'), btn); // default 4em
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
  })();

  gsap.registerPlugin(ScrollTrigger);

  function initStickyFeatures(root){
    const wraps = Array.from((root || document).querySelectorAll("[data-sticky-feature-wrap]"));
    if(!wraps.length) return;

    wraps.forEach(w => {
      const visualWraps = Array.from(w.querySelectorAll("[data-sticky-feature-visual-wrap]"));
      const items = Array.from(w.querySelectorAll("[data-sticky-feature-item]"));
      const progressBar = w.querySelector("[data-sticky-feature-progress]");

      if (visualWraps.length !== items.length) {
        console.warn("[initStickyFeatures] visualWraps and items count do not match:", {
          visualWraps: visualWraps.length,
          items: items.length,
          wrap: w
        });
      }

      const count = Math.min(visualWraps.length, items.length);
      if(count < 1) return;

      const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const DURATION = rm ? 0.01 : 0.75; // If user prefers reduced motion, reduce duration
      const EASE = "power4.inOut";
      const SCROLL_AMOUNT = 0.9; // % of scroll used for step transitions

      const getTexts = el => Array.from(el.querySelectorAll("[data-sticky-feature-text]"));

      if(visualWraps[0]) gsap.set(visualWraps[0], { clipPath: "inset(0% round 0.75em)" });
      gsap.set(items[0], { autoAlpha: 1 });

      let currentIndex = 0;

      // Transition Function
      function transition(fromIndex, toIndex){
        if(fromIndex === toIndex) return;
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

        if(fromIndex < toIndex){
          tl.to(visualWraps[toIndex], { 
            clipPath: "inset(0% round 0.75em)",
            duration: DURATION,
            ease: EASE
          }, 0);
        } else {
          tl.to(visualWraps[fromIndex], { 
            clipPath: "inset(50% round 0.75em)",
            duration: DURATION,
            ease: EASE
          }, 0);
        }
        animateOut(items[fromIndex]);
        animateIn(items[toIndex]);
      }

      // Fade out text content items
      function animateOut(itemEl){
        const texts = getTexts(itemEl);
        gsap.to(texts, {
          autoAlpha: 0,
          y: -30,
          ease: "power4.out",
          duration: 0.4,
          onComplete: () => gsap.set(itemEl, { autoAlpha: 0 })
        });
      }

      // Reveal incoming text content items
      function animateIn(itemEl){
        const texts = getTexts(itemEl);
        gsap.set(itemEl, { autoAlpha: 1 });
        gsap.fromTo(texts, {
          autoAlpha: 0, 
          y: 30
        }, {
          autoAlpha: 1,
          y: 0,
          ease: "power4.out",
          duration: DURATION,
          stagger: 0.1
        });
      }

      const steps = Math.max(1, count - 1);

      ScrollTrigger.create({
        trigger: w,
        start: "center center",
        end: () => `+=${steps * 100}%`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: self => {
          const p = Math.min(self.progress, SCROLL_AMOUNT) / SCROLL_AMOUNT;
          let idx = Math.floor(p * steps + 1e-6);
          idx = Math.max(0, Math.min(steps, idx));

          gsap.to(progressBar,{
            scaleX: p,
            ease: "none"
          })

          if (idx !== currentIndex) {
            transition(currentIndex, idx);
            currentIndex = idx;
          }
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () =>{
    initStickyFeatures();
  })

  (function () {
    const SVG_MARKUP = `
<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="100" height="100" rx="50" fill="#E62D14"/>
<path d="M30.704 44.156H32.352L27.984 55.5H26.432L22.16 44.156H23.824L27.248 53.484L30.704 44.156ZM33.7956 55.5V47.804H35.2836V55.5H33.7956ZM33.4596 44.892C33.4596 44.5827 33.561 44.3267 33.7636 44.124C33.977 43.9107 34.233 43.804 34.5316 43.804C34.841 43.804 35.097 43.9107 35.2996 44.124C35.513 44.3267 35.6196 44.5827 35.6196 44.892C35.6196 45.1907 35.513 45.4467 35.2996 45.66C35.097 45.8627 34.841 45.964 34.5316 45.964C34.233 45.964 33.977 45.8627 33.7636 45.66C33.561 45.4467 33.4596 45.1907 33.4596 44.892ZM43.0265 50.86C43.0052 50.3053 42.8185 49.8413 42.4665 49.468C42.1145 49.084 41.5972 48.892 40.9145 48.892C40.5945 48.892 40.3065 48.9507 40.0505 49.068C39.8052 49.1747 39.5918 49.324 39.4105 49.516C39.2398 49.6973 39.1012 49.9053 38.9945 50.14C38.8878 50.3747 38.8292 50.6147 38.8185 50.86H43.0265ZM44.5465 53.308C44.4398 53.6493 44.2798 53.9693 44.0665 54.268C43.8638 54.556 43.6132 54.812 43.3145 55.036C43.0265 55.2493 42.6958 55.42 42.3225 55.548C41.9492 55.676 41.5385 55.74 41.0905 55.74C40.5785 55.74 40.0878 55.6493 39.6185 55.468C39.1492 55.2867 38.7332 55.02 38.3705 54.668C38.0185 54.316 37.7358 53.884 37.5225 53.372C37.3198 52.86 37.2185 52.2787 37.2185 51.628C37.2185 51.02 37.3198 50.4707 37.5225 49.98C37.7252 49.4787 37.9918 49.052 38.3225 48.7C38.6638 48.3373 39.0585 48.06 39.5065 47.868C39.9545 47.6653 40.4185 47.564 40.8985 47.564C41.4852 47.564 42.0078 47.6653 42.4665 47.868C42.9358 48.06 43.3252 48.332 43.6345 48.684C43.9438 49.036 44.1785 49.4627 44.3385 49.964C44.5092 50.4547 44.5945 50.9987 44.5945 51.596C44.5945 51.692 44.5892 51.7827 44.5785 51.868C44.5785 51.9533 44.5732 52.0227 44.5625 52.076H38.7705C38.7812 52.4173 38.8452 52.732 38.9625 53.02C39.0798 53.308 39.2398 53.5587 39.4425 53.772C39.6558 53.9747 39.9012 54.1347 40.1785 54.252C40.4665 54.3587 40.7705 54.412 41.0905 54.412C41.7198 54.412 42.1998 54.2627 42.5305 53.964C42.8612 53.6653 43.1012 53.2973 43.2505 52.86L44.5465 53.308ZM52.3243 47.804L54.3243 53.596L56.0203 47.804H57.6043L55.1083 55.5H53.5563L51.5083 49.644L49.5083 55.5H47.9243L45.3963 47.804H47.0443L48.7723 53.596L50.7723 47.804H52.3243Z" fill="white"/>
<path d="M70.0833 50L75.9166 50" stroke="white" stroke-width="0.833333" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M73 47.0846L75.9167 50.0013L73 52.918" stroke="white" stroke-width="0.833333" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  `;

    function resolveColor(token) {
      const probe = document.createElement('span');
      probe.style.color = token;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color || token;
      probe.remove();
      return resolved;
    }

    function recolorMainFill(svgString, color) {
      return svgString.replace(/fill="#e62d14"/i, `fill="${color}"`);
    }

    function ensureSize(svgString, w = 96, h = 96) { // 3× bigger than before
      let s = svgString;
      if (!/width="/i.test(s))  s = s.replace(/<svg\b/i, `<svg width="${w}"`);
      if (!/height="/i.test(s)) s = s.replace(/<svg\b/i, `<svg height="${h}"`);
      return s;
    }

    function svgToDataUrl(svgString) {
      const compact = svgString.replace(/\s{2,}/g, ' ').trim();
      const encoded = encodeURIComponent(compact)
      .replace(/%20/g, ' ')
      .replace(/%0A/g, '')
      .replace(/%3D/g, '=')
      .replace(/%3A/g, ':')
      .replace(/%2F/g, '/')
      .replace(/%22/g, "'");
      return `data:image/svg+xml;utf8,${encoded}`;
    }

    function buildCursorUrl() {
      const token = sessionStorage.getItem('randomColor') || '#ff4d4f';
      const color = resolveColor(token);
      let svg = recolorMainFill(SVG_MARKUP, color);
      svg = ensureSize(svg, 96, 96); // bigger size
      return svgToDataUrl(svg);
    }

    // ===== follower setup =====
    const style = document.createElement('style');
    style.textContent = `
    [data-cursor="custom"], [data-cursor="custom"] * { cursor: none !important; }
    .cursor-follow {
      position: fixed;
      left: 0; top: 0;
      width: 96px; height: 96px; /* bigger */
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.7);
      will-change: transform, opacity;
      z-index: 99999;
      transition: transform 250ms cubic-bezier(.22,.9,.24,1), opacity 180ms ease-out;
    }
  `;
    document.head.appendChild(style);

    const follower = document.createElement('div');
    follower.className = 'cursor-follow';
    document.body.appendChild(follower);

    function setFollowerImage() {
      follower.style.backgroundImage = `url("${buildCursorUrl()}")`;
      follower.style.backgroundSize = 'contain';
      follower.style.backgroundRepeat = 'no-repeat';
      follower.style.backgroundPosition = 'center';
    }
    setFollowerImage();

    let mx = 0, my = 0;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      follower.style.transform = `translate(${mx}px, ${my}px) scale(${inside ? 1 : 0.7})`;
    });

    let inside = false;
    function updateInsideFlag(target) {
      const now = !!target.closest?.('[data-cursor="custom"]');
      if (now !== inside) {
        inside = now;
        if (inside) {
          follower.style.opacity = '1';
          follower.style.transform = `translate(${mx}px, ${my}px) scale(1)`;
        } else {
          follower.style.opacity = '0';
          follower.style.transform = `translate(${mx}px, ${my}px) scale(0.7)`;
        }
      }
    }

    document.addEventListener('mouseover', (e) => updateInsideFlag(e.target));
    document.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget) {
        inside = false;
        follower.style.opacity = '0';
        follower.style.transform = `translate(${mx}px, ${my}px) scale(0.7)`;
      }
    });

    window.refreshCustomCursor = function(newToken) {
      if (newToken) sessionStorage.setItem('randomColor', newToken);
      setFollowerImage();
    };
  })();

  function initBasicFilterSetupMultiMatch() {
    const transitionDelay = 300;
    const groups = [...document.querySelectorAll('[data-filter-group]')];

    groups.forEach(group => {
      const buttons = [...group.querySelectorAll('[data-filter-target]')];
      const items = [...group.querySelectorAll('[data-filter-name]')];

      // collect names once (init only)
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

      // cache tokens
      const itemTokens = new Map();
      items.forEach(el => {
        const tokens = ((el.getAttribute('data-filter-name') || '').trim().toLowerCase().split(/\s+/)).filter(Boolean);
        itemTokens.set(el, new Set(tokens));
      });

      // state helpers
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
      const itemMatches = el => {
        if (!activeTarget || activeTarget === 'all') return true;
        return itemTokens.get(el).has(activeTarget);
      };

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

  // Initialize Basic Filter Setup (Multi Match)
  document.addEventListener('DOMContentLoaded', () => {
    initBasicFilterSetupMultiMatch();
  });
