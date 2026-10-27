// StylisHub · landing.js — Demo interactiva, buscador de locales y gestión de estado de sesión
(function () {
  // 1. Manejo del estado de sesión del usuario en la Navbar
  var token = localStorage.getItem('token') || sessionStorage.getItem('token');
  var navLoginBtn = document.getElementById('nav-login-btn');
  var navActionBtn = document.getElementById('nav-action-btn');

  if (token && navLoginBtn) {
    navLoginBtn.textContent = 'Ir a mi Panel';
    navLoginBtn.href = '/panel';
    if (navActionBtn) {
      navActionBtn.style.display = 'none'; // Ocultar "Crear mi página" si ya inició sesión
    }
  }

  // 2. Demo Interactiva del Teléfono (Hero)
  var chat = document.getElementById('chat');
  var replies = document.getElementById('replies');
  var slot = document.getElementById('slot');

  if (chat && replies && slot) {
    function bubble(text, mine) {
      var d = document.createElement('div');
      d.className = mine ? 'bubble me' : 'bubble';
      d.textContent = text;
      chat.insertBefore(d, slot);
    }

    replies.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var no = b.getAttribute('data-a') === 'no';
      replies.style.display = 'none';
      bubble(no ? 'No podré asistir' : 'Confirmo mi cita', true);
      bubble(no ? 'Gracias por avisar, Carlos. Liberamos tu horario.' : 'Listo, te esperamos mañana a las 4:00 p. m.', false);
      slot.className = 'slot' + (no ? ' free' : '');
      slot.lastChild.textContent = no ? 'Horario libre para otro cliente' : 'Confirmada';

      var reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'reset';
      reset.textContent = 'Volver a probar';
      reset.onclick = function () {
        var bubbles = chat.querySelectorAll('.bubble');
        for (var i = 1; i < bubbles.length; i++) {
          bubbles[i].remove();
        }
        reset.remove();
        replies.style.display = '';
        slot.className = 'slot';
        slot.lastChild.textContent = 'Reservado';
      };
      chat.appendChild(reset);
    });
  }
})();

// 3. Función global de búsqueda de locales para Clientes
function handleSearch(event) {
  event.preventDefault();
  var input = document.getElementById('search-slug');
  var errorMsg = document.getElementById('search-error');
  if (!input) return;

  var slug = input.value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (!slug) {
    if (errorMsg) errorMsg.hidden = false;
    return;
  }

  if (errorMsg) errorMsg.hidden = true;
  // Redirección limpia al perfil del local (ej: /el-flaco)
  window.location.href = '/' + slug;
}