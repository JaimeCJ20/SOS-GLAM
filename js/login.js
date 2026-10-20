// SOS GLAM - inicio de sesion
(function () {
  var API_BASE =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:8787"
      : "https://sos-glam-api.zircon-botany.workers.dev";
  var form = document.getElementById("login-form");
  var status = document.getElementById("login-status");

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.hidden = true;

    try {
      var response = await fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("mail").value.trim(),
          password: document.getElementById("password").value,
        }),
      });
      var data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No se pudo iniciar sesión.");

      localStorage.setItem("token", data.token);
      window.location.href = "panel/agenda.html";
    } catch (error) {
      status.hidden = false;
      status.className = "msg msg-warn";
      status.textContent = error.message;
      button.disabled = false;
    }
  });
})();
