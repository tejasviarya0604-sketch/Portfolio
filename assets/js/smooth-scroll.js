// Smooth scrolling for every page, using Lenis
// (https://github.com/darkroomengineering/lenis). Lenis is loaded from the CDN
// just before this file; it smooths mouse-wheel and trackpad scrolling while the
// page still scrolls natively (so position: sticky, scroll events and
// ScrollTrigger keep working). Touch scrolling is left native.
//
// The instance is exposed as window.lenis so other scripts can scroll with it
// (e.g. lenis.scrollTo(y)).
(function () {
  if (typeof Lenis === "undefined") return;
  // Visitors who ask for reduced motion keep the browser's own scrolling.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

  var lenis = new Lenis({
    lerp: 0.1, // lower = smoother / floatier
    wheelMultiplier: 1,
    anchors: true, // in-page #links scroll smoothly too
    allowNestedScroll: true, // scrollable boxes inside the page keep their own scroll
    autoRaf: !hasGsap, // with GSAP, GSAP's ticker drives Lenis (below)
  });
  window.lenis = lenis;

  // Keep ScrollTrigger (home page) in step with Lenis.
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // Home page: scrolling stays locked until the intro finishes (see the inline
  // script in index.html). Hold Lenis too, and release it with the page.
  var root = document.documentElement;
  if (root.classList.contains("scroll-locked")) {
    lenis.stop();
    var unlock = window.unlockScroll;
    window.unlockScroll = function () {
      if (unlock) unlock();
      lenis.start();
    };
    setTimeout(function () { lenis.start(); }, 8000); // same safety net as index.html
  }
})();
