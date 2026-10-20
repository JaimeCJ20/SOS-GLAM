// SOS GLAM · panel.js — agenda con datos reales desde la API de Cloudflare
(function () {
  var API_BASE = 'https://sos-glam-api.zircon-botany.workers.dev';
  var SHOP_SLUG = localStorage.getItem('shopSlug') || 'el-flaco';
  var agenda = document.getElementById('agenda');
  var token = localStorage.getItem('token');

  if (!token) {
    window.location.href = '../login.html';
    return;
  }

  function requestJson(url, options) {
    var requestOptions = options || {};
    requestOptions.headers = Object.assign({}, requestOptions.headers, { Authorization: 'Bearer ' + token });
    return fetch(url, requestOptions).then(function (response) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '../login.html';
        throw new Error('Sesión expirada');
      }
      return response.text().then(function (text) {
        var data = text ? JSON.parse(text) : {};
        if (!response.ok) {
          throw new Error(data.error || 'Error de la API');
        }
        return data;
      });
    });
  }

  function statusClass(status) {
    switch (status) {
      case 'confirmed': return 'confirmada';
      case 'arrived': return 'llego';
      case 'no_show': return 'novino';
      case 'cancelled': return 'cancelada';
      case 'pending':
      default: return 'pendiente';
    }
  }

  function statusLabel(status) {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'arrived': return 'Llegó';
      case 'no_show': return 'No vino';
      case 'cancelled': return 'Cancelada';
      case 'pending':
      default: return 'Por confirmar';
    }
  }

  function formatTimeRange(startIso, durationMinutes) {
    var start = new Date(startIso);
    var end = new Date(start.getTime() + durationMinutes * 60000);
    return start.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' – ' + end.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function buildAgenda(appointments) {
    if (!agenda) return;

    agenda.innerHTML = '<div class="corner"></div>';
    var barbers = [];
    appointments.forEach(function (appointment) {
      var barberName = appointment.barber_name || 'Barbero';
      if (barbers.indexOf(barberName) === -1) barbers.push(barberName);
    });

    barbers.forEach(function (barberName, index) {
      var head = document.createElement('div');
      head.className = 'col-head';
      head.style.gridColumn = String(index + 2);
      head.innerHTML = '<span class="avatar">' + barberName.charAt(0).toUpperCase() + '</span>' + barberName + ' · Silla ' + (index + 1);
      agenda.appendChild(head);
    });

    var hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    hours.forEach(function (hour) {
      var rowHour = document.createElement('div');
      rowHour.className = 'hour';
      rowHour.style.gridRow = String(2 + (hour - 10) * 2) + '/span 2';
      rowHour.textContent = hour < 12 ? hour + ' am' : (hour === 12 ? '12 pm' : (hour - 12) + ' pm');
      agenda.appendChild(rowHour);
    });

    agenda.appendChild(document.createElement('div'));

    if (!appointments.length) {
      var empty = document.createElement('div');
      empty.className = 'msg';
      empty.style.gridColumn = '2 / span 3';
      empty.style.gridRow = '2 / span 4';
      empty.textContent = 'No hay citas para este día.';
      agenda.appendChild(empty);
      return;
    }

    appointments.forEach(function (appointment) {
      var barberIndex = barbers.indexOf(appointment.barber_name || 'Barbero') + 2;
      if (barberIndex < 2) barberIndex = 2;

      var start = new Date(appointment.scheduled_at);
      var minutesFromTen = (start.getHours() * 60 + start.getMinutes()) - (10 * 60);
      var rowStart = Math.max(2, 2 + Math.floor(minutesFromTen / 30));
      var span = Math.max(1, Math.ceil((appointment.duration_minutes || 45) / 30));
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'appt ' + statusClass(appointment.status);
      button.style.gridColumn = String(barberIndex);
      button.style.gridRow = rowStart + '/span ' + span;
      button.setAttribute('aria-pressed', 'false');
      button.dataset.cliente = appointment.customer_name || 'Cliente';
      button.dataset.servicio = (appointment.service_name || 'Servicio') + ' · S/ ' + (appointment.service_price || 0);
      button.dataset.hora = formatTimeRange(appointment.scheduled_at, appointment.duration_minutes || 45);
      button.dataset.barbero = appointment.barber_name || 'Barbero';
      button.dataset.estado = statusLabel(appointment.status || 'pending');
      button.dataset.visitas = 'Cliente habitual';
      button.dataset.tel = appointment.customer_phone ? '+51 ' + String(appointment.customer_phone).replace(/\D/g, '').slice(-9) : '—';
      button.innerHTML = '<b>' + (appointment.customer_name || 'Cliente') + '</b><span>' + (appointment.service_name || 'Servicio') + '</span>';
      agenda.appendChild(button);
    });

    agenda.querySelectorAll('button.appt').forEach(function (button) {
      button.addEventListener('click', function () {
        agenda.querySelectorAll('button.appt').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        button.setAttribute('aria-pressed', 'true');
        ['cliente', 'visitas', 'servicio', 'hora', 'barbero', 'tel', 'estado'].forEach(function (key) {
          var el = document.getElementById('d-' + key);
          if (el) el.textContent = button.dataset[key] || '—';
        });
      });
    });
  }

  async function loadAgenda() {
    var date = new Date();
    var dateString = date.toISOString().slice(0, 10);

    try {
      var data = await requestJson(API_BASE + '/api/shops/' + SHOP_SLUG + '/agenda?date=' + dateString, { method: 'GET' });
      buildAgenda(data.appointments || []);
    } catch (error) {
      console.error('No se pudo cargar la agenda', error);
      if (agenda) {
        agenda.innerHTML = '<div class="msg" style="grid-column:2 / span 3; grid-row:2 / span 3;">No se pudo cargar la agenda desde la API.</div>';
      }
    }
  }

  var logoutButton = document.getElementById('logout');
  if (logoutButton) {
    logoutButton.addEventListener('click', function () {
      localStorage.removeItem('token');
      window.location.href = '../login.html';
    });
  }

  document.querySelectorAll('.seg').forEach(function (seg) {
    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
    });
  });

  var nav = document.querySelector('.settings-nav');
  if (nav) {
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      nav.querySelectorAll('a').forEach(function (x) { x.classList.remove('active'); });
      a.classList.add('active');
    });
  }

  loadAgenda();
})();
