// Case study pages (e.g. share.html).

// Footer pixel art: each click shows the next illustration, looping back to the first.
(function () {
  var mark = document.querySelector(".sf-mark");
  if (!mark) return;
  var count = mark.querySelectorAll("g[data-s]").length;
  mark.addEventListener("click", function () {
    mark.setAttribute("data-state", (+mark.getAttribute("data-state") + 1) % count);
  });
})();

// Header: hides while scrolling down, shows again on any scroll up (and always
// near the top of the page).
(function () {
  var nav = document.querySelector(".cs-nav");
  if (!nav) return;
  var lastY = window.scrollY;
  var ticking = false;
  var update = function () {
    ticking = false;
    var y = window.scrollY;
    if (Math.abs(y - lastY) < 4) return; // ignore jitter
    nav.classList.toggle("is-hidden", y > lastY && y > nav.offsetHeight);
    lastY = y;
  };
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  // Keyboard users tabbing into a hidden header should see it.
  nav.addEventListener("focusin", function () { nav.classList.remove("is-hidden"); });
})();

// Vimeo videos (.cs-video, made with tools/videotreatment/vimeo-embed.js).
// Vimeo's controls are hidden, so a tap anywhere on a video plays or pauses it.
// The play icon shows while paused; the pause icon on hover while playing.
// Ambient videos (.cs-video--ambient) have no button: muted, looping, playing
// only while on screen (and not at all for visitors who ask for reduced motion).
// Each video starts locked to 1080p; if a single stall lasts longer than
// STALL_MS, quality goes back to Vimeo's adaptive mode so it can drop down
// (unless the video has data-quality="locked": then it stays 1080p).
(function () {
  var boxes = [].filter.call(document.querySelectorAll(".cs-video"), function (b) { return b.querySelector("iframe"); });
  if (!boxes.length || !window.Vimeo) return;
  var STALL_MS = 2500;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var players = [];

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var player = e.target.vimeoPlayer;
      if (e.isIntersecting && !still.matches) player.play().catch(function () {});
      else player.pause().catch(function () {});
    });
  });

  boxes.forEach(function (box) {
    var player = new Vimeo.Player(box.querySelector("iframe"));
    var ambient = box.classList.contains("cs-video--ambient");
    var stall = null;

    player.on("bufferstart", function () {
      if (box.dataset.quality === "locked") return; // always 1080p
      clearTimeout(stall);
      stall = setTimeout(function () { player.setQuality("auto").catch(function () {}); }, STALL_MS);
    });
    player.on("bufferend", function () { clearTimeout(stall); });

    if (ambient) {
      box.vimeoPlayer = player;
      io.observe(box);
      return;
    }

    var toggle = box.querySelector(".cs-video-toggle");
    var playing = false;
    players.push(player);

    var set = function (on) {
      playing = on;
      box.classList.toggle("is-playing", on);
      toggle.setAttribute("aria-label", on ? "Pause video" : "Play video");
    };
    player.on("play", function () {
      set(true);
      box.classList.add("has-played");
      // Only one video plays at a time (self-hosted ones included).
      players.forEach(function (p) { if (p !== player) p.pause().catch(function () {}); });
      document.dispatchEvent(new CustomEvent("cs-video-play", { detail: box }));
    });
    player.on("pause", function () { set(false); });

    toggle.addEventListener("click", function () {
      playing ? player.pause() : player.play();
    });

    document.addEventListener("cs-video-play", function (e) {
      if (e.detail !== box && playing) player.pause().catch(function () {});
    });

    addProgressBar(box, player);
  });

  // Progress bar (custom player, Figma 1505:138850): follows playback, and a
  // click or drag on it jumps to that point. Keyboard: arrows move 5 s,
  // Home / End jump to the start / end.
  function addProgressBar(box, player) {
    var bar = document.createElement("div");
    bar.className = "cs-video-bar";
    bar.tabIndex = 0;
    bar.setAttribute("role", "slider");
    bar.setAttribute("aria-label", "Video position");
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", "0");
    bar.innerHTML = '<span class="cs-video-bar-fill"></span><span class="cs-video-bar-thumb"></span>';
    // The bar goes in a wrapper around the video, not inside it: many video
    // boxes clip their content (rounded corners), which would cut the handle
    // where it hangs below the bottom edge.
    var frame = document.createElement("div");
    frame.className = "cs-video-frame";
    box.parentNode.insertBefore(frame, box);
    frame.appendChild(box);
    frame.appendChild(bar);

    var duration = 0;
    var dragging = false;
    player.getDuration().then(function (d) { duration = d; }).catch(function () {});

    // Smooth movement: Vimeo reports the time only about 4 times a second, so
    // between reports the bar is moved every frame from the last known time.
    var last = { t: 0, at: 0 };
    var running = false;
    var raf = 0;
    var tick = function () {
      if (!running) return;
      if (!dragging && duration) {
        var t = last.t + (performance.now() - last.at) / 1000;
        show(Math.min(t, duration) / duration);
      }
      raf = requestAnimationFrame(tick);
    };
    var run = function (on) {
      running = on;
      cancelAnimationFrame(raf);
      if (on) raf = requestAnimationFrame(tick);
    };
    player.on("play", function () { last.at = performance.now(); run(true); });
    player.on("pause", function () { run(false); });
    player.on("ended", function () { run(false); });

    var show = function (p) {
      p = Math.min(1, Math.max(0, p));
      bar.style.setProperty("--p", p);
      bar.setAttribute("aria-valuenow", Math.round(p * 100));
    };
    var seek = function (p) {
      if (!duration) return;
      player.setCurrentTime(Math.min(1, Math.max(0, p)) * duration).catch(function () {});
    };
    var at = function (e) {
      var r = bar.getBoundingClientRect();
      return (e.clientX - r.left) / r.width;
    };

    player.on("timeupdate", function (d) {
      duration = d.duration || duration;
      last = { t: d.seconds, at: performance.now() };
      if (!dragging && !running) show(d.percent);
    });
    player.on("seeked", function (d) {
      last = { t: d.seconds, at: performance.now() };
      if (!dragging) show(d.percent);
    });

    bar.addEventListener("pointerdown", function (e) {
      dragging = true;
      bar.setPointerCapture(e.pointerId);
      show(at(e));
      e.preventDefault();
    });
    bar.addEventListener("pointermove", function (e) {
      if (dragging) show(at(e));
    });
    var end = function (e) {
      if (!dragging) return;
      dragging = false;
      seek(at(e));
    };
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", function () { dragging = false; });
    // Clicks on the bar must not reach the play/pause button underneath.
    bar.addEventListener("click", function (e) { e.stopPropagation(); });

    bar.addEventListener("keydown", function (e) {
      if (!duration) return;
      var now = parseFloat(bar.style.getPropertyValue("--p") || 0) * duration;
      var t = null;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") t = now + 5;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") t = now - 5;
      else if (e.key === "Home") t = 0;
      else if (e.key === "End") t = duration - 0.1;
      if (t === null) return;
      e.preventDefault();
      show(t / duration);
      seek(t / duration);
    });
  }
})();

// Self-hosted videos with our play/pause button (.cs-video holding a <video>
// with WebM + MP4 sources). Same behaviour as the Vimeo ones: a click anywhere
// on the tile plays or pauses; in .cs-video--center tiles the pause icon only
// shows over the central area (CSS). Pauses once less than a quarter is on
// screen, and only one video on the page plays at a time.
(function () {
  document.querySelectorAll(".cs-video").forEach(function (box) {
    var video = box.querySelector("video");
    var toggle = box.querySelector(".cs-video-toggle");
    if (!video || !toggle) return;

    var set = function (on) {
      box.classList.toggle("is-playing", on);
      toggle.setAttribute("aria-label", on ? "Pause video" : "Play video");
    };
    video.addEventListener("play", function () {
      set(true);
      box.classList.add("has-played");
      document.dispatchEvent(new CustomEvent("cs-video-play", { detail: box }));
    });
    video.addEventListener("pause", function () { set(false); });

    toggle.addEventListener("click", function () {
      if (video.paused) video.play().catch(function () {});
      else video.pause();
    });
    document.addEventListener("cs-video-play", function (e) {
      if (e.detail !== box && !video.paused) video.pause();
    });
    new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting && !video.paused) video.pause();
    }, { threshold: 0.25 }).observe(box);
  });
})();

// Silent loops (.cs-loop, our own MP4s): play only while on screen and pause
// when scrolled away; stay on the first frame for visitors who ask for reduced
// motion. A loop without the autoplay attribute (preload="none") downloads
// nothing until it first comes into view. Loops marked data-restart start
// again from the beginning each time they come back into view.
(function () {
  var loops = document.querySelectorAll(".cs-loop");
  if (!loops.length) return;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting && !still.matches) {
        if (v.hasAttribute("data-restart") && v.currentTime > 0) v.currentTime = 0;
        v.play().catch(function () {});
      } else v.pause();
    });
  }, { threshold: 0.25 });
  loops.forEach(function (v) {
    // data-rate speeds a loop up (e.g. 1.5 = 50% faster); default rate too,
    // so it survives the browser reloading the video.
    var rate = parseFloat(v.dataset.rate);
    if (rate) v.defaultPlaybackRate = v.playbackRate = rate;
    if (still.matches) { v.removeAttribute("autoplay"); v.pause(); }
    io.observe(v);
  });
})();

// Video sequences (.cs-seq): silent ambient videos that play one after another
// (1, 2, 3, 4, then 1 again) while the group is on screen, and pause when it
// scrolls away (resuming the same video when it comes back). Every video starts
// loading once the group is near the screen so the hand-over has no gap.
// Visitors who ask for reduced motion just see the posters.
(function () {
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll(".cs-seq").forEach(function (group) {
    var videos = group.querySelectorAll("video");
    if (!videos.length) return;
    var i = 0;
    var visible = false;

    var play = function () {
      if (visible && !still.matches) videos[i].play().catch(function () {});
    };
    videos.forEach(function (v, k) {
      v.addEventListener("ended", function () {
        if (k !== i) return;
        i = (i + 1) % videos.length;
        videos[i].currentTime = 0;
        play();
      });
    });

    new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      videos.forEach(function (v) { v.preload = "auto"; });
    }, { rootMargin: "600px 0px" }).observe(group);

    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) play();
      else videos[i].pause();
    }, { threshold: 0.25 }).observe(group);
  });
})();

// Slideshows (.cs-slides): the arrows push the next image in while the current
// one is pushed out the other side, looping endlessly in both directions;
// swiping works on touch screens. Every slide starts loading once the
// slideshow is near the screen, so moving never shows a gap.
(function () {
  var PUSH = "transform 0.7s cubic-bezier(0.65, 0, 0.35, 1)";
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll(".cs-slides").forEach(function (box) {
    var slides = box.querySelectorAll(".cs-slides-track img");
    var n = slides.length;
    var i = 0;
    var busy = false;

    var show = function (k) {
      slides.forEach(function (s, j) {
        s.classList.toggle("is-active", j === k);
        s.setAttribute("aria-hidden", j === k ? "false" : "true");
      });
    };

    // dir: 1 = next (comes in from the right), -1 = previous (from the left).
    var go = function (dir) {
      if (busy) return;
      var out = slides[i];
      i = (i + dir + n) % n;
      var inc = slides[i];
      if (still.matches) { show(i); return; }

      busy = true;
      inc.style.transition = "none";
      inc.style.transform = "translateX(" + dir * 100 + "%)";
      inc.classList.add("is-active");
      void inc.offsetWidth; // start from the off-screen position
      inc.style.transition = out.style.transition = PUSH;
      inc.style.transform = "translateX(0)";
      out.style.transform = "translateX(" + -dir * 100 + "%)";

      // Finish on transitionend, or after the duration if that never fires
      // (e.g. in a background tab), so the slideshow can't get stuck.
      var finished = false;
      var finish = function () {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        inc.removeEventListener("transitionend", done);
        out.style.transition = "none";
        out.style.transform = "";
        show(i);
        busy = false;
      };
      var done = function (e) { if (e.target === inc && e.propertyName === "transform") finish(); };
      var timer = setTimeout(finish, 800);
      inc.addEventListener("transitionend", done);
    };

    box.querySelector(".cs-arrow--left").addEventListener("click", function () { go(-1); });
    box.querySelector(".cs-arrow--right").addEventListener("click", function () { go(1); });
    show(0);

    var startX = null;
    box.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      startX = null;
    });

    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      slides.forEach(function (s) { s.loading = "eager"; });
      io.disconnect();
    }, { rootMargin: "600px 0px" });
    io.observe(box);
  });
})();
