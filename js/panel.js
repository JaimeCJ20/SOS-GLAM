// SOS GLAM · panel.js — agenda con datos reales desde la API de Cloudflare
(function () {
  var API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:8787"
      : "https://sos-glam-api.zircon-botany.workers.dev";
  var SHOP_SLUG = localStorage.getItem("shopSlug") || "el-flaco";
  var agenda = document.getElementById("agenda");
  var token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "../login.html";
    return;
  }

  function requestJson(url, options) {
    var requestOptions = options || {};
    requestOptions.headers = Object.assign({}, requestOptions.headers, {
      Authorization: "Bearer " + token,
    });
    return fetch(url, requestOptions).then(function (response) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "../login.html";
        throw new Error("Sesión expirada");
      }
      return response.text().then(function (text) {
        var data = text ? JSON.parse(text) : {};
        if (!response.ok) {
          throw new Error(data.error || "Error de la API");
        }
        return data;
      });
    });
  }

  function bindWalkInButton() {
    var walkInBtn =
      document.querySelector('button:has-text("+ Cliente sin cita")') ||
      Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Cliente sin cita"),
      );

    if (!walkInBtn) return;

    walkInBtn.addEventListener("click", async function () {
      var customerName = prompt(
        "Nombre del cliente sin cita (Walk-in):",
        "Cliente Presencial",
      );
      if (!customerName) return;

      var date = new Date().toISOString().slice(0, 10);
      var now = new Date();
      var hours = String(now.getHours()).padStart(2, "0");
      var minutes = now.getMinutes() < 30 ? "00" : "30";
      var timeSlot = hours + ":" + minutes;

      try {
        // Registrar cita presencial de 30 min con el primer servicio disponible
        await requestJson(
          API_BASE + "/api/shops/" + SHOP_SLUG + "/appointments",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerName: customerName + " (Sin cita)",
              phone: "999999999",
              serviceId: "svc_001", // ID de servicio por defecto o seleccionado
              scheduledAt: date + "T" + timeSlot + ":00",
              notes: "Atención presencial sin cita previa (Walk-in)",
            }),
          },
        );

        alert("Cliente agregado a la agenda.");
        loadAgenda(); // Recargar la agenda en pantalla
      } catch (error) {
        alert("No se pudo registrar al cliente: " + error.message);
      }
    });
  }

  function bindWhatsAppReminderButton() {
    var waBtn = Array.from(
      document.querySelectorAll(".drawer .btns button"),
    ).find((b) => b.textContent.includes("WhatsApp"));
    if (!waBtn) return;

    waBtn.addEventListener("click", function () {
      var cliente = document.getElementById("d-cliente").textContent;
      var tel = document.getElementById("d-tel").textContent.replace(/\D/g, "");
      var servicio = document.getElementById("d-servicio").textContent;
      var hora = document.getElementById("d-hora").textContent;

      if (!tel || tel.length < 9) {
        alert("Esta cita no tiene un número de WhatsApp válido.");
        return;
      }

      var cleanPhone = tel.length === 9 ? "51" + tel : tel;
      var text = `Hola ${cliente}, te recordamos tu cita de ${servicio} hoy a las ${hora} en Barbería El Flaco. Si necesitas confirmar o liberar tu hora, ingresa aquí: ${window.location.origin}/cita.html`;

      var waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank");
    });
  }

  function statusClass(status) {
    switch (status) {
      case "confirmed":
        return "confirmada";
      case "arrived":
        return "llego";
      case "no_show":
        return "novino";
      case "cancelled":
        return "cancelada";
      case "pending":
      default:
        return "pendiente";
    }
  }

  function statusLabel(status) {
    switch (status) {
      case "confirmed":
        return "Confirmada";
      case "arrived":
        return "Llegó";
      case "no_show":
        return "No vino";
      case "cancelled":
        return "Cancelada";
      case "pending":
      default:
        return "Por confirmar";
    }
  }

  function formatTimeRange(startIso, durationMinutes) {
    var start = new Date(startIso);
    var end = new Date(start.getTime() + durationMinutes * 60000);
    return (
      start.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }) +
      " – " +
      end.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    );
  }

  function buildAgenda(appointments) {
    if (!agenda) return;

    agenda.innerHTML = '<div class="corner"></div>';
    var barbers = [];
    appointments.forEach(function (appointment) {
      var barberName = appointment.barber_name || "Barbero";
      if (barbers.indexOf(barberName) === -1) barbers.push(barberName);
    });

    barbers.forEach(function (barberName, index) {
      var head = document.createElement("div");
      head.className = "col-head";
      head.style.gridColumn = String(index + 2);
      head.innerHTML =
        '<span class="avatar">' +
        barberName.charAt(0).toUpperCase() +
        "</span>" +
        barberName +
        " · Silla " +
        (index + 1);
      agenda.appendChild(head);
    });

    var hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    hours.forEach(function (hour) {
      var rowHour = document.createElement("div");
      rowHour.className = "hour";
      rowHour.style.gridRow = String(2 + (hour - 10) * 2) + "/span 2";
      rowHour.textContent =
        hour < 12 ? hour + " am" : hour === 12 ? "12 pm" : hour - 12 + " pm";
      agenda.appendChild(rowHour);
    });

    agenda.appendChild(document.createElement("div"));

    if (!appointments.length) {
      var empty = document.createElement("div");
      empty.className = "msg";
      empty.style.gridColumn = "2 / span 3";
      empty.style.gridRow = "2 / span 4";
      empty.textContent = "No hay citas para este día.";
      agenda.appendChild(empty);
      return;
    }

    appointments.forEach(function (appointment) {
      var barberIndex =
        barbers.indexOf(appointment.barber_name || "Barbero") + 2;
      if (barberIndex < 2) barberIndex = 2;

      var start = new Date(appointment.scheduled_at);
      var minutesFromTen = start.getHours() * 60 + start.getMinutes() - 10 * 60;
      var rowStart = Math.max(2, 2 + Math.floor(minutesFromTen / 30));
      var span = Math.max(
        1,
        Math.ceil((appointment.duration_minutes || 45) / 30),
      );
      var button = document.createElement("button");
      button.type = "button";
      button.className = "appt " + statusClass(appointment.status);
      button.style.gridColumn = String(barberIndex);
      button.style.gridRow = rowStart + "/span " + span;
      button.setAttribute("aria-pressed", "false");
      button.dataset.cliente = appointment.customer_name || "Cliente";
      button.dataset.servicio =
        (appointment.service_name || "Servicio") +
        " · S/ " +
        (appointment.service_price || 0);
      button.dataset.hora = formatTimeRange(
        appointment.scheduled_at,
        appointment.duration_minutes || 45,
      );
      button.dataset.barbero = appointment.barber_name || "Barbero";
      button.dataset.estado = statusLabel(appointment.status || "pending");
      button.dataset.visitas = "Cliente habitual";
      button.dataset.tel = appointment.customer_phone
        ? "+51 " +
          String(appointment.customer_phone).replace(/\D/g, "").slice(-9)
        : "—";
      button.innerHTML =
        "<b>" +
        (appointment.customer_name || "Cliente") +
        "</b><span>" +
        (appointment.service_name || "Servicio") +
        "</span>";
      agenda.appendChild(button);
    });

    agenda.querySelectorAll("button.appt").forEach(function (button) {
      button.addEventListener("click", function () {
        agenda.querySelectorAll("button.appt").forEach(function (b) {
          b.setAttribute("aria-pressed", "false");
        });
        button.setAttribute("aria-pressed", "true");
        [
          "cliente",
          "visitas",
          "servicio",
          "hora",
          "barbero",
          "tel",
          "estado",
        ].forEach(function (key) {
          var el = document.getElementById("d-" + key);
          if (el) el.textContent = button.dataset[key] || "—";
        });
      });
    });
  }

  async function loadAgenda() {
    var date = new Date();
    var dateString = date.toISOString().slice(0, 10);

    try {
      var data = await requestJson(
        API_BASE + "/api/shops/" + SHOP_SLUG + "/agenda?date=" + dateString,
        { method: "GET" },
      );
      buildAgenda(data.appointments || []);
    } catch (error) {
      console.error("No se pudo cargar la agenda", error);
      if (agenda) {
        agenda.innerHTML =
          '<div class="msg" style="grid-column:2 / span 3; grid-row:2 / span 3;">No se pudo cargar la agenda desde la API.</div>';
      }
    }
  }

  var logoutButton = document.getElementById("logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      localStorage.removeItem("token");
      window.location.href = "../login.html";
    });
  }

  document.querySelectorAll(".seg").forEach(function (seg) {
    seg.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      seg.querySelectorAll("button").forEach(function (x) {
        x.setAttribute("aria-pressed", "false");
      });
      b.setAttribute("aria-pressed", "true");
    });
  });

  var nav = document.querySelector(".settings-nav");
  if (nav) {
    nav.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      nav.querySelectorAll("a").forEach(function (x) {
        x.classList.remove("active");
      });
      a.classList.add("active");
    });
  }

  loadAgenda();
  bindWalkInButton();
  bindWhatsAppReminderButton();
  
  // ACCIONES DEL PANEL DE ADMINISTRACIÓN

  // 1. Abrir y procesar "+ Cliente sin cita"
  function initWalkInModal() {
    var btnOpen = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Cliente sin cita"),
    );
    var modal = document.getElementById("modal-walkin");
    var btnClose = document.getElementById("close-walkin");
    var form = document.getElementById("form-walkin");

    if (!btnOpen || !modal) return;

    btnOpen.addEventListener("click", async function () {
      // Cargar servicios y barberos dinámicamente
      try {
        var data = await requestJson(API_BASE + "/api/shops/" + SHOP_SLUG);
        var svcSelect = document.getElementById("w-service");
        var barSelect = document.getElementById("w-barber");

        svcSelect.innerHTML = (data.services || [])
          .map(
            (s) => `<option value="${s.id}">${s.name} · S/ ${s.price}</option>`,
          )
          .join("");
        barSelect.innerHTML = (data.barbers || [])
          .map((b) => `<option value="${b.id}">${b.name}</option>`)
          .join("");

        modal.hidden = false;
      } catch (e) {
        alert("Error al obtener servicios: " + e.message);
      }
    });

    if (btnClose)
      btnClose.addEventListener("click", function () {
        modal.hidden = true;
      });

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        var now = new Date();
        var dateStr = now.toISOString().slice(0, 10);
        var timeStr =
          String(now.getHours()).padStart(2, "0") +
          ":" +
          (now.getMinutes() < 30 ? "00" : "30");

        try {
          await requestJson(
            API_BASE + "/api/shops/" + SHOP_SLUG + "/appointments",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerName:
                  document.getElementById("w-name").value.trim() +
                  " (Sin cita)",
                phone: "999999999",
                serviceId: document.getElementById("w-service").value,
                barberId: document.getElementById("w-barber").value,
                scheduledAt: dateStr + "T" + timeStr + ":00",
                notes: "Atención presencial directa (Walk-in)",
              }),
            },
          );

          modal.hidden = true;
          form.reset();
          loadAgenda(); // Recargar grilla
        } catch (err) {
          alert("No se pudo registrar la cita: " + err.message);
        }
      });
    }
  }

  // 2. Botón "Enviar recordatorio por WhatsApp" desde el Drawer
  function initWhatsAppReminder() {
    var waBtn = Array.from(
      document.querySelectorAll(".drawer .btns button"),
    ).find((b) => b.textContent.includes("WhatsApp"));
    if (!waBtn) return;

    waBtn.addEventListener("click", function () {
      var cliente = document.getElementById("d-cliente").textContent;
      var telRaw = document
        .getElementById("d-tel")
        .textContent.replace(/\D/g, "");
      var servicio = document.getElementById("d-servicio").textContent;
      var hora = document.getElementById("d-hora").textContent;

      if (!telRaw || telRaw.length < 9) {
        alert("Esta cita no cuenta con un número de WhatsApp registrado.");
        return;
      }

      var phone = telRaw.length === 9 ? "51" + telRaw : telRaw;
      var message = `Hola ${cliente}, te recordamos tu cita de ${servicio} hoy (${hora}) en Barbería El Flaco. Para confirmar o liberar tu turno en 1 clic, ingresa aquí: ${window.location.origin}/reservar.html?s=${SHOP_SLUG}`;

      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        "_blank",
      );
    });
  }

  // 3. Botón para copiar enlace rápido de la barbería
  function initCopyLink() {
    var copyBtns = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent.includes("Copiar"),
    );
    if (!copyBtns) return;

    copyBtns.addEventListener("click", function () {
      var link = `${window.location.origin}/reservar.html?s=${SHOP_SLUG}`;
      navigator.clipboard.writeText(link).then(function () {
        alert(
          "¡Enlace de reservas copiado! Ya puedes pegarlo en tu Instagram o WhatsApp.",
        );
      });
    });
  }

  // Inicializar funciones al cargar el script
  document.addEventListener("DOMContentLoaded", function () {
    initWalkInModal();
    initWhatsAppReminder();
    initCopyLink();
  });
})();
