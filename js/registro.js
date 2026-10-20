(function () {
  var API_BASE = 'https://sos-glam-api.zircon-botany.workers.dev';
  var params = new URLSearchParams(window.location.search);
  var stepParam = params.get('step');
  var step = stepParam === '1' ? 1 : (stepParam === '5' ? 5 : 2);
  var isNewRegistration = params.get('new') === '1';
  var localStep = document.getElementById('step-local');
  var servicesStep = document.getElementById('step-services');
  var accountStep = document.getElementById('step-account');
  var addService = document.getElementById('add-service');
  var eyebrow = document.getElementById('wizard-eyebrow');
  var title = document.getElementById('wizard-title');
  var lead = document.getElementById('wizard-lead');
  var progress = document.getElementById('wizard-progress');
  var back = document.getElementById('wizard-back');
  var next = document.getElementById('wizard-next');
  var continueButton = document.getElementById('continue-local');
  var finishButton = document.getElementById('finish-registration');
  var registrationStatus = document.getElementById('registration-status');
  var resetButton = document.getElementById('reset-registration');

  if (isNewRegistration) {
    localStorage.clear();
    step = 1;
    window.history.replaceState({}, document.title, 'registro.html?step=1');
  }

  function renderStep() {
    var firstStep = step === 1;
    var finalStep = step === 5;
    localStep.hidden = !firstStep;
    servicesStep.hidden = firstStep || finalStep;
    accountStep.hidden = !finalStep;
    addService.hidden = firstStep || finalStep;
    eyebrow.textContent = firstStep ? 'Paso 1 de 5' : (finalStep ? 'Paso 5 de 5' : 'Paso 2 de 5');
    title.textContent = firstStep ? 'Cuéntanos sobre tu local' : (finalStep ? 'Crea tu acceso al panel' : '¿Qué servicios ofreces?');
    lead.textContent = firstStep
      ? 'Empecemos por lo básico. Luego podrás completar tu equipo, fotos y enlace.'
      : (finalStep ? 'Crea tu cuenta y entra directamente a la agenda de tu nuevo local.' : 'Marca los que haces y ajusta precio y duración. La duración define qué horas se muestran libres.');
    progress.style.width = firstStep ? '20%' : (finalStep ? '100%' : '40%');
    back.hidden = firstStep;
    next.hidden = firstStep || finalStep;

    var steps = document.querySelectorAll('.wizard-steps li');
    steps.forEach(function (item, index) {
      item.classList.toggle('current', index === (firstStep ? 0 : (finalStep ? 4 : 1)));
      item.classList.toggle('done', index < (firstStep ? 0 : (finalStep ? 4 : 1)));
      var marker = item.querySelector('span');
      if (index === 0 && !firstStep) marker.textContent = '✓';
      if (index === 0 && firstStep) marker.textContent = '1';
      if (index === 4 && finalStep) marker.textContent = '5';
    });
  }

  resetButton.addEventListener('click', function () {
    localStorage.clear();
    window.location.replace('registro.html?step=1');
  });

  continueButton.addEventListener('click', function () {
    step = 2;
    renderStep();
  });

  next.addEventListener('click', function () {
    if (step !== 2) return;
    step = 5;
    renderStep();
  });

  back.addEventListener('click', function (event) {
    event.preventDefault();
    step = step === 5 ? 2 : 1;
    renderStep();
  });

  function collectServices() {
    return Array.prototype.slice.call(document.querySelectorAll('.svc-row')).map(function (row) {
      var checkbox = row.querySelector('input[type="checkbox"]');
      var inputs = row.querySelectorAll('.input');
      var price = Number(String(inputs[0].value).replace(/[^0-9.]/g, ''));
      var duration = Number(String(inputs[1].value).replace(/[^0-9]/g, ''));
      return {
        active: checkbox.checked,
        name: row.querySelector('b').textContent.trim(),
        price: Number.isFinite(price) ? Math.round(price) : 0,
        durationMinutes: Number.isFinite(duration) ? Math.round(duration) : 45
      };
    }).filter(function (service) { return service.active; });
  }

  finishButton.addEventListener('click', async function () {
    registrationStatus.hidden = true;
    finishButton.disabled = true;
    try {
      var response = await fetch(API_BASE + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: document.getElementById('shop-name').value.trim(),
          district: document.getElementById('shop-district').value.trim(),
          phone: document.getElementById('shop-phone').value.trim(),
          ownerName: document.getElementById('owner-name').value.trim(),
          email: document.getElementById('owner-email').value.trim(),
          password: document.getElementById('owner-password').value,
          services: collectServices()
        })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la cuenta.');
      localStorage.setItem('token', data.token);
      localStorage.setItem('shopSlug', data.shop.slug);
      window.location.href = 'panel/agenda.html';
    } catch (error) {
      registrationStatus.hidden = false;
      registrationStatus.textContent = error.message;
      finishButton.disabled = false;
    }
  });

  renderStep();
})();
