// SOS GLAM · panel.js — interacciones visuales del panel (sin backend)
(function () {
  // Agenda: al tocar una cita se muestra en el panel lateral
  var agenda = document.getElementById('agenda');
  if (agenda) {
    agenda.addEventListener('click', function (e) {
      var appt = e.target.closest('button.appt');
      if (!appt) return;
      agenda.querySelectorAll('button.appt').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      appt.setAttribute('aria-pressed', 'true');
      ['cliente', 'visitas', 'servicio', 'hora', 'barbero', 'tel', 'estado'].forEach(function (k) {
        var el = document.getElementById('d-' + k);
        if (el) el.textContent = appt.dataset[k] || '—';
      });
    });
  }

  // Botones segmentados (Día / Semana, filtros)
  document.querySelectorAll('.seg').forEach(function (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
    });
  });

  // Configuración: resalta la sección activa del menú
  var nav = document.querySelector('.settings-nav');
  if (nav) {
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      nav.querySelectorAll('a').forEach(function (x) { x.classList.remove('active'); });
      a.classList.add('active');
    });
  }
})();
