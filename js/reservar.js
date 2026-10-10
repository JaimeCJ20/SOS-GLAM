// SOS GLAM · reservar.js — selección visual y resumen (sin backend)
(function () {
  function select(group, btn) {
    group.querySelectorAll('[aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    btn.setAttribute('aria-pressed', 'true');
  }

  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  document.querySelectorAll('[data-group]').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      var name = group.getAttribute('data-group');

      // Las horas están repartidas en dos grupos (tarde y noche): se limpian ambos
      if (name === 'hora') {
        document.querySelectorAll('[data-group="hora"] [aria-pressed]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
      } else {
        select(group, btn);
      }

      set('s-' + name, btn.dataset.name);
      if (name === 'servicio') {
        set('s-precio', 'S/ ' + btn.dataset.price);
        set('s-min', btn.dataset.min + ' min');
      }
    });
  });
})();
