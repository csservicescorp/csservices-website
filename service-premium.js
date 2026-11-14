/* Premium effects for the service pages: scroll reveal, soft parallax on framed photos, before/after slider. */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.pv-reveal:not(.pv-hero .pv-reveal)');
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  var frames = document.querySelectorAll('.pv-frame img');
  if (!reduce && frames.length) {
    var ticking = false;
    var paint = function () {
      ticking = false;
      var vh = window.innerHeight;
      frames.forEach(function (img) {
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / vh; // -1..1 around the middle of the screen
        img.style.transform = 'translate3d(0,' + (-8 - p * 8).toFixed(2) + '%,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  document.querySelectorAll('.pv-ba').forEach(function (box) {
    var input = box.querySelector('input');
    if (!input) return;
    var set = function () { box.style.setProperty('--pos', input.value + '%'); };
    input.addEventListener('input', set);
    set();
  });
})();
