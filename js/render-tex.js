/**
 * Render LaTeX in [data-tex] elements with KaTeX.
 * Use data-tex="..." so Hugo/Goldmark cannot eat backslashes or underscores.
 * Optional: data-display="true" for display math.
 */
(function () {
  'use strict';

  function renderAll() {
    if (typeof katex === 'undefined') return;
    document.querySelectorAll('[data-tex]').forEach(function (el) {
      var tex = el.getAttribute('data-tex');
      if (!tex) return;
      var display = el.getAttribute('data-display') === 'true' || el.classList.contains('math-block');
      try {
        katex.render(tex, el, {
          throwOnError: false,
          displayMode: display,
          output: 'html'
        });
      } catch (e) {
        el.textContent = tex;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAll);
  } else {
    renderAll();
  }
  // KaTeX is often loaded with defer; retry shortly if needed.
  window.addEventListener('load', renderAll);
})();
