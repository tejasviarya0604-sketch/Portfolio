// Intro sequence, fired on page load:
// 1. Logo + nav links reveal from the top while, at the same time, the contact
//    links reveal from the bottom
// (The photo frame is visible from the start as a small red block at 15% size.)
// 3. Photo loop starts as they animate in (each image holds for 2s)
// 4. Once the first image is in, the frame grows to full width
// 5. "TEJASVI ARYA" letters pull up into view one by one
// 6. "Product Designer @ Microsoft" rises into view
// On scroll: the hero stays pinned while "TEJASVI" splits left and "ARYA" right.
// The Windows 95 desktop's taskbar clock shows the current time when it appears.
(function () {
  var time = document.querySelector(".win95-time");
  if (!time) return;
  // Delegated: the hovered word may be the white copy laid over the original.
  document.addEventListener("mouseover", function (e) {
    if (!e.target.closest || !e.target.closest(".about-ms")) return;
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    time.textContent = (h % 12 || 12) + ":" + (m < 10 ? "0" : "") + m + (h < 12 ? "AM" : "PM");
  });
})();

// Footer pixel art: each click shows the next illustration, looping back to the first.
(function () {
  var mark = document.querySelector(".sf-mark");
  if (!mark) return;
  var count = mark.querySelectorAll("g[data-s]").length;
  mark.addEventListener("click", function () {
    mark.setAttribute("data-state", (+mark.getAttribute("data-state") + 1) % count);
  });
})();

// Work page: each card's stage is laid out at Figma's 736 x 436 and scaled to
// whatever width the stage gets (see .wk-scene).
(function () {
  var stages = document.querySelectorAll(".wk-stage");
  if (!stages.length) return;
  var fit = function (stage) {
    stage.style.setProperty("--k", stage.clientWidth / 736);
  };
  Array.prototype.forEach.call(stages, function (stage) {
    fit(stage);
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(function () { fit(stage); }).observe(stage);
    else window.addEventListener("resize", function () { fit(stage); });
  });
})();

(function () {
  var root = document.documentElement;
  var title = document.querySelector(".hero-title");
  var photo = document.querySelector(".hero-photo");
  var frames = document.querySelectorAll(".hero-photo-frame");

  // Split the wordmark into per-letter spans, keeping the italic wrappers intact.
  var chars = [];
  function splitLetters(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === Node.TEXT_NODE) {
        var text = child.textContent.trim();
        if (!text) return;
        var frag = document.createDocumentFragment();
        text.split("").forEach(function (letter) {
          var span = document.createElement("span");
          span.className = "char";
          span.textContent = letter;
          frag.appendChild(span);
          chars.push(span);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        splitLetters(child);
      }
    });
  }
  if (title) {
    title.setAttribute("aria-label", title.textContent.replace(/\s+/g, " ").trim());
    splitLetters(title);
  }

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // No GSAP or reduced motion: just show everything, no intro and no loop.
  var unlockScroll = function () {
    if (window.unlockScroll) window.unlockScroll();
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  };

  if (prefersReducedMotion || typeof gsap === "undefined") {
    unlockScroll();
    root.classList.remove("js");
    return;
  }

  var HOLD = 2; // seconds each image stays on screen
  var SLIDE = 0.8; // seconds for the slide between images
  var FIRST_SLIDE = 0.6; // seconds for the first image to slide into the small frame

  // The loop is one repeating timeline so the scroll sequence can pause and
  // resume it (see setLoopHeld below). Each cycle: hold, then the current image
  // slides out the bottom as the next slides in from the top.
  var loopTl = gsap.timeline({ repeat: -1, paused: true });
  if (frames.length > 1) {
    Array.prototype.forEach.call(frames, function (frame, i) {
      var nextFrame = frames[(i + 1) % frames.length];
      loopTl
        .to(frame, { yPercent: 100, duration: SLIDE, ease: "power3.inOut" }, "+=" + HOLD)
        .fromTo(nextFrame, { yPercent: -100 }, { yPercent: 0, duration: SLIDE, ease: "power3.inOut" }, "<");
    });
  }
  var loopStarted = false; // true once the first image is in and the loop may run
  var loopHeld = false; // true while the scroll sequence has the loop stopped

  function setLoopHeld(held) {
    if (held === loopHeld) return;
    loopHeld = held;
    if (!loopStarted) return;
    held ? loopTl.pause() : loopTl.resume();
  }

  // All frames start above the red block; the first slides in when the loop starts.
  function startLoop() {
    if (!frames.length) return;
    // First image eases out (not in-out) so it's visibly moving straight away,
    // in step with the contact links.
    gsap.fromTo(
      frames[0],
      { yPercent: -100 },
      {
        yPercent: 0,
        duration: FIRST_SLIDE,
        ease: "power3.out",
        onComplete: function () {
          loopStarted = true;
          if (!loopHeld) loopTl.play();
        },
      }
    );
  }

  // Initial (hidden) states. autoAlpha also flips the CSS visibility:hidden.
  gsap.set([".logo", ".nav-links a"], { autoAlpha: 0, yPercent: -100 });
  gsap.set(".contact a", { autoAlpha: 0, yPercent: 100 });
  gsap.set(frames, { y: 0, yPercent: -100 }); // y:0 clears the CSS translateY so it isn't doubled
  gsap.set(photo, { xPercent: -50, yPercent: -50, x: 0, y: 0, scale: 0.15 });
  gsap.set(".hero-sub-inner", { autoAlpha: 0, y: 20 });
  gsap.set(title, { autoAlpha: 1 });
  gsap.set(chars, { opacity: 0, y: 20 });

  var tl = gsap.timeline({ delay: 0.3 });

  tl.to([".logo", ".nav-links a"], {
    autoAlpha: 1,
    yPercent: 0,
    duration: 0.8,
    ease: "power3.out",
    stagger: 0.08,
  })
    .to(
      ".contact a",
      {
        autoAlpha: 1,
        yPercent: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.08,
      },
      "<"
    )
    // The loop starts together with the nav and contact links.
    .addLabel("loop", "<")
    .add(startLoop, "loop")
    // Nav and contact reveals are finished by now; enables their cover fade (CSS).
    .call(function () { root.classList.add("intro-done"); }, null, "loop+=1")
    // Grow as soon as the first image has slid into the small frame.
    .to(photo, { scale: 1, duration: 1.2, ease: "power3.inOut" }, "loop+=" + FIRST_SLIDE)
    // Letters pull up: each one rises 20px and fades in, 0.05s apart.
    .to(
      chars,
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.05,
        // Scrolling stays locked until the whole name is in.
        onComplete: unlockScroll,
      },
      "-=0.3"
    )
    .to(".hero-sub-inner", { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, "+=0.1");

  // Scroll sequence: the page stays pinned through four equal scroll steps.
  // Step 1: "TEJASVI" splits left and "ARYA" right, out to the side gutters.
  // Steps 2-4: both words keep rising until they're fully off the top of the page.
  // Step 2: the photo frame also grows 50% larger, pinned at its top centre,
  // and "Product Designer @ Microsoft" fades out.
  // Step 3: the frame grows another 50% (to 225%).
  // Both grows are capped so the frame never passes the page's bottom or side
  // gutters; the cap is recalculated on resize.
  // Step 4: the photo loop stops and the frame turns solid red (#EA3826, the
  // frame's own background, revealed as the photos fade out), then stretches
  // down to the bottom of the screen and out to its full width.
  // Step 5: the red frame slides up until it fills the whole page.
  // Step 6: the about text (Figma "secondfold") appears line by line, at 20% white.
  // Steps 7-9: the text turns 100% white two lines per step: lines 1-2, then 3-4,
  // then 5 (Figma "secondfold1", "2", "3").
  // Every tween is scrubbed to the scroll position, so scrolling back reverses it.
  // The "SCROLL" pill (Figma "secondfold3") fades in under the text as line 5
  // finishes, in the second half of step 9; there is no empty step after it.
  // Steps 10-11: the work page (Figma "Work") rises from the bottom and pushes
  // the red page up and out (scrubbed, edge to edge, no overlap), a full
  // screen height over two steps, the same way the footer arrives.
  // Step 12: an empty scroll; the work page holds, fully in view.
  // Steps 13-16: the project tiles scroll sideways (scrubbed) until the last
  // one is fully in view.
  // Steps 17-18: the footer (Figma "footer") pushes the work page up and out
  // as it rises in from the bottom (scrubbed, edge to edge, no overlap), a full
  // screen height over two steps.
  var SCROLL_STEP = 50; // % of viewport height per scroll step
  var STEPS = 18;
  var WORK_HOLD = 1; // step 12
  var TILES_STEPS = 4; // steps 13-16
  // The slide starts right after the last about line turns white; there is no
  // empty step on the red page (the SCROLL pill fades in with that last line).
  var SLIDE_STEP = 9;
  var words = title ? title.querySelectorAll(".word") : [];
  if (typeof ScrollTrigger !== "undefined" && words.length === 2) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.clearScrollMemory("manual");
    var page = document.querySelector(".page");
    var sidePad = function () {
      return parseFloat(getComputedStyle(page).paddingLeft) || 0;
    };
    // Measure from the word's untransformed position so refreshes stay correct.
    var restLeft = function (el) {
      return el.getBoundingClientRect().left - gsap.getProperty(el, "x");
    };
    var restRight = function (el) {
      return el.getBoundingClientRect().right - gsap.getProperty(el, "x");
    };
    // Distance from the top of the (pinned) page to the word's bottom edge.
    var restBottom = function (el) {
      return (
        el.getBoundingClientRect().bottom -
        page.getBoundingClientRect().top -
        gsap.getProperty(el, "y")
      );
    };

    // Largest scale (up to `max`) at which the photo frame, grown from its top
    // centre, still fits inside the page gutters: side padding left/right and the
    // page's vertical padding at the bottom. Never shrinks below its normal size.
    var heroVisual = document.querySelector(".hero-visual");
    var fitScale = function (max) {
      var w = photo.offsetWidth;
      var h = photo.offsetHeight;
      if (!w || !h) return max;
      var top = heroVisual.getBoundingClientRect().top - page.getBoundingClientRect().top;
      var bottomPad = parseFloat(getComputedStyle(page.querySelector(".contact")).paddingBottom) || 0;
      var fitW = (window.innerWidth - 2 * sidePad()) / w;
      var fitH = (window.innerHeight - bottomPad - top) / h;
      return Math.max(1, Math.min(max, fitW, fitH));
    };
    // Hide any nav/contact element the growing frame covers; show it again once
    // the frame moves off it. Runs on every frame of the scrubbed timeline.
    var guarded = document.querySelectorAll(".logo, .nav-links a, .contact a");
    var hideCovered = function () {
      var f = photo.getBoundingClientRect();
      Array.prototype.forEach.call(guarded, function (el) {
        var r = el.getBoundingClientRect();
        var overlaps =
          r.right > f.left && r.left < f.right && r.bottom > f.top && r.top < f.bottom;
        el.classList.toggle("is-covered", overlaps);
      });
    };
    // Frame's resting top edge, measured from the top of the (pinned) page.
    var frameTop = function () {
      return heroVisual.getBoundingClientRect().top - page.getBoundingClientRect().top;
    };
    // Vertical scale at which the frame's bottom edge meets the bottom of the screen.
    var toBottomScale = function () {
      var h = photo.offsetHeight;
      // +4px overshoot so sub-pixel rounding never leaves a hairline gap.
      return h ? (window.innerHeight - frameTop() + 4) / h : 1;
    };
    // Vertical scale at which the frame covers the full screen height.
    var toFullHeightScale = function () {
      var h = photo.offsetHeight;
      return h ? (window.innerHeight + 8) / h : 1;
    };
    var aboutIntro = document.querySelector(".about-intro");
    var aboutLines = document.querySelectorAll(".about-line");
    gsap.set(aboutLines, { opacity: 0, y: 24 });
    // Each about line is split into per-letter spans, then gets a white duplicate
    // laid exactly over it. Splitting the dim line too gives both layers the same
    // structure, so they always lay out and wrap identically. The duplicate is
    // revealed by the --w custom property (0 -> 1, see .about-line-white).
    var splitLetters = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === Node.TEXT_NODE) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            part.split("").forEach(function (c) {
              var span = document.createElement("span");
              span.className = "about-letter";
              span.textContent = c;
              frag.appendChild(span);
            });
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains("about-icon")) {
          splitLetters(child);
        }
      });
    };
    Array.prototype.forEach.call(aboutLines, function (line) {
      splitLetters(line);
      var white = document.createElement("span");
      white.className = "about-line-white";
      white.setAttribute("aria-hidden", "true");
      white.innerHTML = line.innerHTML;
      line.appendChild(white);
    });
    gsap.set(".about-line-white", { "--w": 0 });
    gsap.set(".work", { y: 0, yPercent: 100 }); // y:0 clears the CSS translateY so it isn't doubled
    // Everything on the pinned page that belongs to the red page (not the
    // work page or footer); steps 10-11 push it up together.
    var redPage = [".grid-lines", ".nav", ".hero", ".about-intro", ".contact"].map(function (sel) {
      return page.querySelector(":scope > " + sel);
    }).filter(Boolean);
    gsap.set(".site-footer", { y: 0, yPercent: 100 }); // likewise its translateY

    var workCards = document.querySelector(".work-cards");

    // The about text is centred, so its left edge moves with the viewport (and
    // as its illustrations open); line the SCROLL pill up with it as it shows.
    var aboutPill = document.querySelector(".about-scroll");
    var aboutTextEl = document.querySelector(".about-text");
    var placeAboutPill = function () {
      if (!aboutPill || !aboutTextEl) return;
      var left = aboutTextEl.getBoundingClientRect().left - aboutIntro.getBoundingClientRect().left;
      aboutPill.style.left = left + "px";
    };
    window.addEventListener("resize", placeAboutPill);


    // Each illustration starts collapsed (e.g. "design buildings," reads as one
    // phrase); as its line turns white, the words part and the illustration
    // appears in the gap. Both layers' icons resize together so the white copy
    // stays aligned with the dim line.
    // The visible illustration is the white copy's, so the same top-to-bottom
    // mask reveals it with the text; the dim line's icon only holds the space.
    var splitPairs = Array.prototype.map.call(aboutLines, function (line) {
      var copies = line.querySelectorAll(".about-line-white .about-icon");
      return Array.prototype.map.call(line.querySelectorAll(":scope > .about-icon"), function (icon, k) {
        return { icon: icon, copy: copies[k], both: [icon, copies[k]].filter(Boolean) };
      });
    });
    var iconWidth = function (icon) {
      var h = parseFloat(getComputedStyle(icon).height);
      return h * (+icon.getAttribute("width") / +icon.getAttribute("height"));
    };
    // Width of the space after the icon; pulling it back closes the double gap.
    var spaceWidth = function (icon) {
      var next = icon.nextSibling;
      if (!next || next.nodeType !== Node.TEXT_NODE) return 0;
      var r = document.createRange();
      r.selectNodeContents(next);
      return r.getBoundingClientRect().width;
    };
    // The text block keeps the width it has with every illustration open, so the
    // left-aligned lines never shift as illustrations appear.
    var aboutText = document.querySelector(".about-text");
    var allIcons = Array.prototype.slice.call(document.querySelectorAll(".about-intro .about-icon"));
    var lockTextWidth = function () {
      if (!aboutText) return;
      var saved = allIcons.map(function (el) { return [el.style.width, el.style.marginRight]; });
      aboutText.style.width = "";
      allIcons.forEach(function (el) { el.style.width = ""; el.style.marginRight = ""; });
      aboutText.style.width = Math.ceil(aboutText.getBoundingClientRect().width) + "px";
      allIcons.forEach(function (el, k) { el.style.width = saved[k][0]; el.style.marginRight = saved[k][1]; });
    };
    lockTextWidth();
    ScrollTrigger.addEventListener("refreshInit", lockTextWidth);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(lockTextWidth);

    splitPairs.forEach(function (pairs) {
      pairs.forEach(function (pair) {
        gsap.set(pair.both, { width: 0, marginRight: -spaceWidth(pair.icon) });
        if (pair.copy) gsap.set(pair.copy, { scale: 0.6 });
      });
    });
    var splitWords = function (i, dur) {
      var t = gsap.timeline();
      (splitPairs[i] || []).forEach(function (pair) {
        t.fromTo(pair.both, {
          width: 0,
          marginRight: function () { return -spaceWidth(pair.icon); },
        }, {
          width: function () { return iconWidth(pair.icon); },
          marginRight: 0,
          duration: dur,
          ease: "power1.inOut",
          immediateRender: false,
        }, 0);
        if (pair.copy) {
          t.fromTo(pair.copy, { scale: 0.6 }, { scale: 1, duration: dur, ease: "power1.out", immediateRender: false }, 0);
        }
      });
      return t;
    };

    // One scroll step of whitening for the given lines.
    var whitenLines = function (indexes, dur) {
      dur = dur || 1;
      // A white mask sweeps down each line in turn, so the step's text reveals
      // top to bottom.
      // Each line's illustrations open and reveal at the same time as its text.
      var lines = indexes.filter(function (i) { return aboutLines[i]; });
      var each = dur / lines.length;
      var t = gsap.timeline();
      lines.forEach(function (i, k) {
        var white = aboutLines[i].querySelector(".about-line-white");
        t.fromTo(white, { "--w": 0 }, { "--w": 1, duration: each, ease: "none", immediateRender: false }, k * each);
        t.add(splitWords(i, each), k * each);
      });
      return t;
    };
    // Horizontal scale at which the (centred) frame spans the full screen width.
    var toFullWidthScale = function () {
      var w = photo.offsetWidth;
      // +4px overshoot, as above; the page clips anything past its edges.
      return w ? (window.innerWidth + 4) / w : 1;
    };
    var STEP2_SCALE = 1.5; // +50%
    var STEP3_SCALE = 2.25; // another +50%

    var seq = gsap
      .timeline({
        scrollTrigger: {
          trigger: page,
          start: "top top",
          end: "+=" + SCROLL_STEP * STEPS + "%",
          pin: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
          // Stop the photo loop once step 4 begins; restart it when scrolling back.
          onUpdate: function (self) {
            setLoopHeld(self.progress >= 3 / STEPS);
          },
          onRefresh: hideCovered,
        },
        onUpdate: hideCovered,
      })
      // Step 1: split
      .to(words[0], {
        x: function () { return sidePad() - restLeft(words[0]); },
        duration: 1,
        ease: "none",
      }, 0)
      .to(words[1], {
        x: function () {
          return window.innerWidth - sidePad() - restRight(words[1]);
        },
        duration: 1,
        ease: "none",
      }, 0)
      // Steps 2-4: rise up and out of the page
      .to(words, {
        y: function (i, el) { return -restBottom(el) - 20; },
        duration: 3,
        ease: "none",
      }, 1)
      // Step 2: photo frame grows to 150% (or as far as fits), anchored at its top centre
      .fromTo(photo, { scale: 1 }, {
        scale: function () { return fitScale(STEP2_SCALE); },
        transformOrigin: "50% 0%",
        duration: 1,
        ease: "none",
        immediateRender: false,
      }, 1)
      // Step 2: subtitle fades out in the first half, before the frame reaches it
      .fromTo(".hero-sub", { autoAlpha: 1 }, {
        autoAlpha: 0,
        duration: 0.5,
        ease: "none",
        immediateRender: false,
      }, 1)
      // Step 3: frame grows another 50% (or as far as fits), still anchored at its top centre
      .fromTo(photo, { scale: function () { return fitScale(STEP2_SCALE); } }, {
        scale: function () { return fitScale(STEP3_SCALE); },
        transformOrigin: "50% 0%",
        duration: 1,
        ease: "none",
        immediateRender: false,
      }, 2)
      // Step 4, first half: photos fade away, leaving the frame's red background
      .fromTo(frames, { opacity: 1 }, {
        opacity: 0,
        duration: 0.5,
        ease: "none",
        immediateRender: false,
      }, 3)
      // Step 4, second half: the now-solid red frame stretches (top edge fixed) down
      // to the bottom of the screen and out to its left and right edges
      .fromTo(photo, {
        scaleX: function () { return fitScale(STEP3_SCALE); },
        scaleY: function () { return fitScale(STEP3_SCALE); },
      }, {
        scaleX: function () { return toFullWidthScale(); },
        scaleY: function () { return toBottomScale(); },
        transformOrigin: "50% 0%",
        duration: 0.5,
        ease: "none",
        immediateRender: false,
      }, 3.5)
      // Step 5: red frame slides up (bottom stays put) until it covers the whole page
      .fromTo(photo, {
        y: 0,
        scaleY: function () { return toBottomScale(); },
      }, {
        y: function () { return -frameTop() - 4; },
        scaleY: function () { return toFullHeightScale(); },
        duration: 1,
        ease: "none",
        immediateRender: false,
      }, 4)
      // Step 6: about text appears, each line rising slightly as it fades in
      .set(aboutIntro, { autoAlpha: 1 }, 5)
      .fromTo(aboutLines, { opacity: 0, y: 24 }, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
        immediateRender: false,
      }, 5)
      // Steps 7-9: whiten two lines per step; each line's illustrations open
      // and reveal along with its text
      .add(whitenLines([0, 1]), 6)
      .add(whitenLines([2, 3]), 7)
      .add(whitenLines([4]), 8)
      // Second half of step 9: the "SCROLL" pill fades in under the text as
      // the last line finishes turning white (no empty step after it)
      .fromTo(aboutPill, { autoAlpha: 0, y: 12 }, {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        immediateRender: false,
        onStart: placeAboutPill,
      }, SLIDE_STEP - 0.5)
      // Steps 10-11: the work page pushes the red page up and out; both move
      // together, so the work page's top edge stays on the red page's bottom
      .fromTo(redPage, { y: 0 }, {
        y: function () { return -page.offsetHeight; },
        duration: 2,
        ease: "none",
        immediateRender: false,
      }, SLIDE_STEP)
      .fromTo(".work", { yPercent: 100 }, {
        yPercent: 0,
        duration: 2,
        ease: "none",
        immediateRender: false,
      }, SLIDE_STEP)
      // Step 12: empty scroll room before the tiles start moving
      .to({}, { duration: WORK_HOLD }, SLIDE_STEP + 2)
      // Steps 13-16: the tiles row moves left until its last tile meets the
      // right gutter
      .fromTo(workCards, { x: 0 }, {
        x: function () {
          var last = workCards.lastElementChild;
          return Math.min(0, workCards.clientWidth - (last.offsetLeft + last.offsetWidth));
        },
        duration: TILES_STEPS,
        ease: "none",
        immediateRender: false,
      }, SLIDE_STEP + 2 + WORK_HOLD)
      // Steps 17-18: the footer rises and pushes the work page up by its own
      // height; both move together, so the footer's top edge stays on the work
      // page's bottom edge
      .fromTo(".work", { y: 0 }, {
        y: function () { return -document.querySelector(".site-footer").offsetHeight; },
        duration: STEPS - SLIDE_STEP - 2 - WORK_HOLD - TILES_STEPS,
        ease: "none",
        immediateRender: false,
      }, SLIDE_STEP + 2 + WORK_HOLD + TILES_STEPS)
      .fromTo(".site-footer", { yPercent: 100 }, {
        yPercent: 0,
        duration: STEPS - SLIDE_STEP - 2 - WORK_HOLD - TILES_STEPS,
        ease: "none",
        immediateRender: false,
      }, SLIDE_STEP + 2 + WORK_HOLD + TILES_STEPS);

    // The page is pinned, so in-page links can't jump to their targets: "WORK"
    // scrolls to where the work page has slid in; the logo and every "ABOUT ME"
    // (header and footer) go to the top, the first fold with the name and photo.
    document.addEventListener("click", function (e) {
      var link = e.target.closest && e.target.closest('a[href="#work"], a[href="#top"], a[href="#about"]');
      if (!link) return;
      e.preventDefault();
      var st = seq.scrollTrigger;
      var at = function (step) { return st.start + (st.end - st.start) * step / STEPS; };
      var href = link.getAttribute("href");
      window.scrollTo({ top: href === "#work" ? at(SLIDE_STEP + 2) : 0, behavior: "smooth" });
    });

    // Arriving from another page at index.html#work or #about (e.g. the case
    // study's nav): skip the intro and go straight to that point (#about is the
    // first fold, with the name and photo).
    var deepLink = location.hash;
    if (deepLink === "#work" || deepLink === "#about") {
      // Drop the hash so a reload starts from the first fold again.
      history.replaceState(null, "", location.pathname + location.search);
      tl.progress(1);
      unlockScroll();
      requestAnimationFrame(function () {
        ScrollTrigger.refresh();
        var st = seq.scrollTrigger;
        window.scrollTo(0, deepLink === "#work" ? st.start + (st.end - st.start) * (SLIDE_STEP + 2) / STEPS : 0);
      });
    }
  }
})();
