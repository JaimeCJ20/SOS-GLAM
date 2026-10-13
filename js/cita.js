// SOS GLAM - acciones de la cita
(function () {
  var API_BASE = 'https://sos-glam-api.zircon-botany.workers.dev';
  var appointmentId = new URLSearchParams(window.location.search).get('id');
  var statusElement = document.getElementById('appointment-status');
  var noticeElement = document.getElementById('appointment-notice');
  var confirmButton = document.getElementById('confirm-appointment');
  var cancelButton = document.getElementById('cancel-appointment');

  function showNotice(message, kind) {
    noticeElement.hidden = false;
    noticeElement.className = 'msg ' + (kind === 'error' ? 'msg-warn' : 'msg-ok');
    noticeElement.textContent = message;
  }

  function setStatus(status) {
    var isConfirmed = status === 'confirmed';
    statusElement.className = 'tag ' + (isConfirmed ? 'tag-confirmada' : 'tag-cancelada');
    statusElement.textContent = isConfirmed ? 'Confirmado' : 'Cancelado';
    confirmButton.disabled = true;
    cancelButton.disabled = true;
  }

  async function updateStatus(status) {
    if (!appointmentId) {
      showNotice('No se encontró el identificador de esta cita.', 'error');
      return;
    }

    confirmButton.disabled = true;
    cancelButton.disabled = true;

    try {
      var response = await fetch(API_BASE + '/api/appointments/' + encodeURIComponent(appointmentId) + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la cita.');

      setStatus(status);
      showNotice(status === 'confirmed'
        ? 'Tu cita quedó confirmada. ¡Te esperamos!'
        : 'La cita fue cancelada y el turno quedó liberado.', 'success');
    } catch (error) {
      confirmButton.disabled = false;
      cancelButton.disabled = false;
      showNotice(error.message, 'error');
    }
  }

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
    var address = document.getElementById('appointment-address').textContent.trim();
    var date = datetime.dataset.date;
    var time = datetime.dataset.time;
    var start = calendarDate(date, time);
    var localDate = new Date(date + 'T' + time + ':00');
    var end = addMinutes(localDate, 45);
    var params = new URLSearchParams({
      action: 'TEMPLATE',
      text: 'Cita en Barbería El Flaco',
      dates: start + '/' + end,
      details: 'Reserva realizada en SOS GLAM.',
      location: address
    });
    window.open('https://calendar.google.com/calendar/render?' + params.toString(), '_blank', 'noopener,noreferrer');
  }

  function openDirections(event) {
    event.preventDefault();
    var address = document.getElementById('appointment-address').textContent.trim();
    var url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  confirmButton.addEventListener('click', function () { updateStatus('confirmed'); });
  cancelButton.addEventListener('click', function () { updateStatus('cancelled'); });
  document.getElementById('add-calendar').addEventListener('click', openCalendar);
  document.getElementById('get-directions').addEventListener('click', openDirections);
})();
