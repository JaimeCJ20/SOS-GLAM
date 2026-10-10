// SOS GLAM · landing.js — demo del teléfono en el hero (solo visual)
(function () {
  var chat = document.getElementById('chat');
  var replies = document.getElementById('replies');
  var slot = document.getElementById('slot');
  if (!chat || !replies || !slot) return;

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
      [].slice.call(chat.querySelectorAll('.bubble')).slice(1).forEach(function (n) { n.remove(); });
      reset.remove();
      replies.style.display = '';
      slot.className = 'slot';
      slot.lastChild.textContent = 'Reservado';
    };
    chat.appendChild(reset);
  });
})();
