// SOS GLAM - acciones de la cita
(function () {
  // 1. Detección automática del entorno (Local vs Producción)
  var API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8787'
    : 'https://sos-glam-api.zircon-botany.workers.dev';

  // 2. Obtener parámetros de la URL
  var urlParams = new URLSearchParams(window.location.search);
  var appointmentId = urlParams.get('id');
  var tokenParam = urlParams.get('token');
  var actionParam = urlParams.get('action');

  var statusElement = document.getElementById('appointment-status');
  var noticeElement = document.getElementById('appointment-notice');
  var confirmButton = document.getElementById('confirm-appointment');
  var cancelButton = document.getElementById('cancel-appointment');

  function showNotice(message, kind) {
    if (!noticeElement) return;
    noticeElement.hidden = false;
    noticeElement.className = 'msg ' + (kind === 'error' ? 'msg-warn' : 'msg-ok');
    noticeElement.textContent = message;
  }

  function setStatus(status) {
    if (!statusElement) return;
    var isConfirmed = status === 'confirmed' || status === 'confirmada';
    statusElement.className = 'tag ' + (isConfirmed ? 'tag-confirmada' : 'tag-cancelada');
    statusElement.textContent = isConfirmed ? 'Confirmado' : 'Cancelado';
    if (confirmButton) confirmButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
  }

  // 3. Ejecución de acción mediante el endpoint de tokens únicos de 1 clic (sin contraseña)
  async function executeTokenAction(action, token) {
    if (!token) {
      showNotice('No se encontró un token válido para procesar esta acción.', 'error');
      return;
    }

    if (confirmButton) confirmButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;

    try {
      var response = await fetch(API_BASE + '/api/appointments/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, action: action })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo procesar la solicitud.');

      setStatus(data.status);
      showNotice(
        data.status === 'confirmada' || data.status === 'confirmed'
          ? 'Tu cita quedó confirmada. ¡Te esperamos!'
          : 'La cita fue cancelada y el turno quedó liberado.',
        'success'
      );
    } catch (error) {
      if (confirmButton) confirmButton.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
      showNotice(error.message, 'error');
    }
  }

  // 4. Funciones para integración con Google Calendar
  function calendarDate(date, time) {
    return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
  }

  function addMinutes(date, minutes) {
    var result = new Date(date.getTime() + minutes * 60000);
    var year = result.getFullYear();
    var month = String(result.getMonth() + 1).padStart(2, '0');
    var day = String(result.getDate()).padStart(2, '0');
    var hour = String(result.getHours()).padStart(2, '0');
    var minute = String(result.getMinutes()).padStart(2, '0');
    return year + month + day + 'T' + hour + minute + '00';
  }

  function openCalendar(event) {
    event.preventDefault();
    var datetime = document.getElementById('appointment-datetime');
    var addressEl = document.getElementById('appointment-address');
    if (!datetime || !addressEl) return;

    var address = addressEl.textContent.trim();
    var date = datetime.dataset.date || new Date().toISOString().slice(0, 10);
    var time = datetime.dataset.time || '16:00';
    var start = calendarDate(date, time);
    var localDate = new Date(date + 'T' + time + ':00');
    var end = addMinutes(localDate, 45);
    var params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Cita en Barbería / Salón',
      dates: start + '/' + end,
      details: 'Reserva realizada desde SOS GLAM.',
      location: address
    });
    window.open('https://calendar.google.com/calendar/render?' + params.toString(), '_blank', 'noopener,noreferrer');
  }

  // 5. Función para integración con Google Maps
  function openDirections(event) {
    event.preventDefault();
    var addressEl = document.getElementById('appointment-address');
    if (!addressEl) return;
    var address = addressEl.textContent.trim();
    var url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // 6. Listeners para los botones
  if (confirmButton) {
    confirmButton.addEventListener('click', function () {
      var confirmToken = tokenParam || sessionStorage.getItem('confirmToken_' + appointmentId);
      executeTokenAction('confirm', confirmToken);
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', function () {
      var cancelToken = (actionParam === 'cancel' ? tokenParam : null) || sessionStorage.getItem('cancelToken_' + appointmentId);
      executeTokenAction('cancel', cancelToken);
    });
  }

  var addCalendarBtn = document.getElementById('add-calendar');
  if (addCalendarBtn) addCalendarBtn.addEventListener('click', openCalendar);

  var getDirectionsBtn = document.getElementById('get-directions');
  if (getDirectionsBtn) getDirectionsBtn.addEventListener('click', openDirections);

  // 7. Auto-procesamiento si se entra mediante enlace directo con token (ej. WhatsApp)
  if (tokenParam && actionParam) {
    executeTokenAction(actionParam, tokenParam);
  }
})();