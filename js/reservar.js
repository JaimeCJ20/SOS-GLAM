// SOS GLAM · reservar.js — conecta la reserva con la API real de Cloudflare
(function () {
  var API_BASE = 'https://sos-glam-api.zircon-botany.workers.dev';
  var SHOP_SLUG = 'el-flaco';
  var state = {
    shop: null,
    services: [],
    barbers: [],
    selectedServices: [],
    selectedBarberId: 'any',
    selectedDate: null,
    selectedTime: null
  };

  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function formatMoney(value) {
    return 'S/ ' + Number(value || 0);
  }

  function formatDateKey(date) {
    return new Date(date).toISOString().slice(0, 10);
  }

  function parseHour(rawTime) {
    if (!rawTime) return '16:00';
    var cleaned = rawTime.replace(/\s+/g, '').replace(/\./g, '').toLowerCase();
    var match = cleaned.match(/(\d{1,2}):(\d{2})(am|pm)/i);
    if (!match) return '16:00';
    var hour = parseInt(match[1], 10);
    var minute = parseInt(match[2], 10);
    var period = match[3].toLowerCase();
    if (period === 'pm' && hour < 12) hour += 12;
    if (period === 'am' && hour === 12) hour = 0;
    return String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
  }

  function clearSelection(buttons) {
    buttons.forEach(function (button) {
      button.setAttribute('aria-pressed', 'false');
      button.classList.remove('active', 'selected', 'is-selected');
    });
  }

  function serviceFromButton(button) {
    return {
      id: button.dataset.id || button.dataset.name || '',
      name: button.dataset.name || button.textContent.trim(),
      price: Number(button.dataset.price || 0),
      duration_minutes: Number(button.dataset.min || 0)
    };
  }

  function updateServiceSummary() {
    var names = state.selectedServices.map(function (service) { return service.name; });
    var total = state.selectedServices.reduce(function (sum, service) { return sum + service.price; }, 0);
    var duration = state.selectedServices.reduce(function (sum, service) { return sum + service.duration_minutes; }, 0);
    set('s-servicio', names.length ? names.join(', ') : '-');
    set('s-precio', formatMoney(total));
    set('s-min', duration + ' min');
  }

  function bindGlobalControls() {
    document.addEventListener('click', function (event) {
      var btn = event.target.closest('button');
      if (!btn) return;
      var group = btn.closest('[data-group]');
      if (!group) return;
      if (group === btn) group = btn.parentElement;
      var groupName = group.getAttribute('data-group');
      var groupButtons = group.querySelectorAll('[aria-pressed]');

      if (groupName === 'hora') {
        groupButtons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        state.selectedTime = btn.dataset.time || parseHour((btn.dataset.name || btn.textContent.trim()) || '4:00 p. m.');
        set('s-hora', btn.dataset.name || btn.textContent.trim());
        return;
      }

      if (groupName === 'dia') {
        groupButtons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        state.selectedDate = btn.dataset.date || formatDateKey(new Date());
        set('s-dia', btn.dataset.name || btn.textContent.trim());
        return;
      }

      var wasSelected = btn.getAttribute('aria-pressed') === 'true' ||
        btn.classList.contains('active') ||
        btn.classList.contains('selected') ||
        btn.classList.contains('is-selected');

      if (groupName === 'servicio') {
        var service = serviceFromButton(btn);
        var serviceIndex = state.selectedServices.findIndex(function (item) { return item.id === service.id; });
        if (wasSelected || serviceIndex >= 0) {
          state.selectedServices.splice(serviceIndex >= 0 ? serviceIndex : 0, 1);
          btn.setAttribute('aria-pressed', 'false');
          btn.classList.remove('active', 'selected', 'is-selected');
        } else {
          state.selectedServices.push(service);
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('selected');
        }
        updateServiceSummary();
        return;
      }

      clearSelection(groupButtons);

      if (wasSelected) {
        if (groupName === 'barbero') {
          state.selectedBarberId = '';
          set('s-barbero', 'Cualquiera');
        }
        return;
      }

      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('selected');

      if (groupName === 'barbero') {
        state.selectedBarberId = btn.dataset.id || 'any';
        set('s-barbero', btn.dataset.name || 'Cualquiera');
      }
    });
  }

  function attachDateSlots() {
    var today = new Date();
    var days = document.querySelectorAll('[data-group="dia"] .chip');
    days.forEach(function (chip, index) {
      var clone = new Date(today);
      clone.setDate(today.getDate() + index);
      chip.dataset.date = formatDateKey(clone);
      chip.dataset.name = clone.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
      if (index === 0) {
        chip.setAttribute('aria-pressed', 'true');
        state.selectedDate = chip.dataset.date;
        set('s-dia', chip.dataset.name);
      }
    });

    var times = document.querySelectorAll('[data-group="hora"] .chip');
    times.forEach(function (chip) {
      var value = chip.textContent.trim();
      chip.dataset.name = value + ' p. m.';
      chip.dataset.time = parseHour(value + ' p. m.');
      if (chip.getAttribute('aria-pressed') === 'true') {
        state.selectedTime = chip.dataset.time;
        set('s-hora', chip.dataset.name);
      }
    });
  }

  function renderServices(services) {
    state.services = services || [];
    var container = document.querySelector('.svc-grid[data-group="servicio"]');
    if (!container) return;
    container.innerHTML = '';

    if (!services.length) {
      container.innerHTML = '<div class="msg">No hay servicios disponibles.</div>';
      return;
    }

    services.forEach(function (service, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'svc';
      button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
      if (index === 0) button.classList.add('selected');
      button.dataset.group = 'servicio';
      button.dataset.id = service.id;
      button.dataset.name = service.name;
      button.dataset.price = service.price;
      button.dataset.min = service.duration_minutes;
      button.innerHTML = '<span><b>' + service.name + '</b><small>' + service.duration_minutes + ' min</small></span><span class="price">S/ ' + service.price + '</span>';
      container.appendChild(button);
    });

    var initial = container.querySelector('button');
    if (initial) {
      state.selectedServices = [serviceFromButton(initial)];
      updateServiceSummary();
    }
  }

  function initializeServiceSelection() {
    var initial = document.querySelector('.svc-grid[data-group="servicio"] [aria-pressed="true"]');
    if (!initial) return;
    state.selectedServices = [serviceFromButton(initial)];
    initial.classList.add('selected');
    updateServiceSummary();
  }

  function renderBarbers(barbers) {
    state.barbers = barbers || [];
    var container = document.querySelector('.barbers[data-group="barbero"]');
    if (!container) return;
    container.innerHTML = '';

    var all = document.createElement('button');
    all.type = 'button';
    all.className = 'barber';
    all.setAttribute('aria-pressed', 'true');
    all.classList.add('selected');
    all.dataset.group = 'barbero';
    all.dataset.id = 'any';
    all.dataset.name = 'Cualquiera';
    all.innerHTML = '<span class="avatar">?</span><b>Cualquiera</b><small>El primero libre</small>';
    container.appendChild(all);

    barbers.forEach(function (barber) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'barber';
      button.setAttribute('aria-pressed', 'false');
      button.dataset.group = 'barbero';
      button.dataset.id = barber.id;
      button.dataset.name = barber.name;
      button.innerHTML = '<span class="avatar">' + (barber.name || 'B').charAt(0).toUpperCase() + '</span><b>' + barber.name + '</b><small>' + (barber.specialty || 'Especialista') + '</small>';
      container.appendChild(button);
    });

    state.selectedBarberId = 'any';
    set('s-barbero', 'Cualquiera');
  }

  function requestJson(url, options) {
    return fetch(url, options).then(function (response) {
      return response.text().then(function (text) {
        var data = text ? JSON.parse(text) : {};
        if (!response.ok) {
          throw new Error(data.error || 'Error de la API');
        }
        return data;
      });
    });
  }

  async function loadShop() {
    try {
      var data = await requestJson(API_BASE + '/api/shops/' + SHOP_SLUG, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      var shop = data.shop || null;
      state.shop = shop;
      renderServices(data.services || []);
      renderBarbers(data.barbers || []);

      if (shop) {
        var title = document.querySelector('.shop-meta h1');
        var meta = document.querySelector('.shop-meta p');
        if (title) title.textContent = shop.name;
        if (meta) meta.textContent = (shop.address || '') + (shop.district ? ' · ' + shop.district : '');
      }
    } catch (error) {
      console.error('No se pudo cargar la peluquería:', error);
      var statusText = document.getElementById('booking-status');
      if (statusText) {
        statusText.hidden = false;
        statusText.className = 'msg msg-warn';
        statusText.textContent = 'No se pudo cargar la peluquería desde la API.';
      }
    }
  }

  function bindConfirmButton() {
    var button = document.getElementById('btn-confirmar');
    if (!button) return;

    button.addEventListener('click', async function () {
      var name = document.getElementById('nom').value.trim();
      var phone = document.getElementById('tel').value.trim();
      var status = document.getElementById('booking-status');
      var serviceId = state.selectedServices.length ? state.selectedServices[0].id : '';
      var selectedServiceNames = state.selectedServices.map(function (service) { return service.name; });
      var barberId = state.selectedBarberId === 'any' ? '' : state.selectedBarberId;
      var date = state.selectedDate || formatDateKey(new Date());
      var time = state.selectedTime || '16:00';

      if (!name || !phone) {
        if (status) {
          status.hidden = false;
          status.className = 'msg msg-warn';
          status.textContent = 'Escribe tu nombre y tu WhatsApp para confirmar la reserva.';
        }
        return;
      }

      if (!serviceId) {
        if (status) {
          status.hidden = false;
          status.className = 'msg msg-warn';
          status.textContent = 'No hay servicios disponibles en este momento.';
        }
        return;
      }

      button.disabled = true;
      button.textContent = 'Guardando...';

      try {
        var response = await requestJson(API_BASE + '/api/shops/' + SHOP_SLUG + '/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName: name,
            phone: phone,
            serviceId: serviceId,
            barberId: barberId,
            scheduledAt: date + 'T' + time + ':00',
            notes: 'Reserva desde la web SOS GLAM. Servicios: ' + selectedServiceNames.join(', ')
          })
        });

        if (status) {
          status.hidden = false;
          status.className = 'msg msg-ok';
          status.textContent = 'Reserva creada correctamente. En breve te llegará la confirmación por WhatsApp.';
        }

        button.textContent = 'Reserva confirmada';
        window.setTimeout(function () {
          var appointmentId = response.appointment && response.appointment.id;
          window.location.href = appointmentId ? 'cita.html?id=' + encodeURIComponent(appointmentId) : 'cita.html';
        }, 1200);
      } catch (error) {
        console.error('Error al guardar la reserva:', error);
        if (status) {
          status.hidden = false;
          status.className = 'msg msg-warn';
          status.textContent = 'No se pudo guardar la reserva. Inténtalo de nuevo.';
        }
        button.disabled = false;
        button.textContent = 'Confirmar reserva';
      }
    });
  }

  attachDateSlots();
  bindGlobalControls();
  bindConfirmButton();
  initializeServiceSelection();
  loadShop();
})();
