/**
 * StylisHub · registro.js
 * Manejo del formulario de registro B2B, Google Places Autocomplete y subida de archivos.
 */

var API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8787"
  : "";

var uploadedFiles = [];

// Inicialización de Google Places Autocomplete cuando carga el SDK
window.addEventListener('load', function () {
  var autocompleteInput = document.getElementById('maps-autocomplete');
  if (autocompleteInput && window.google && window.google.maps && window.google.maps.places) {
    var autocomplete = new google.maps.places.Autocomplete(autocompleteInput, {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: ['pe', 'co', 'mx'] } // Expandible según país
    });

    autocomplete.addListener('place_changed', function () {
      var place = autocomplete.getPlace();
      if (!place.address_components) return;

      var address = place.name || place.formatted_address || '';
      var district = '';

      place.address_components.forEach(function (component) {
        if (component.types.includes('locality') || component.types.includes('sublocality_level_1')) {
          district = component.long_name;
        }
      });

      if (address) document.getElementById('shop-address').value = address;
      if (district) document.getElementById('shop-district').value = district;
    });
  }
});

// Generar vista previa del Slug dinámicamente
function updateSlugPreview() {
  var shopName = document.getElementById('shop-name').value;
  var slugText = document.getElementById('slug-text');
  
  var slug = shopName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  slugText.textContent = slug || 'mi-local';
}

// Gestión de archivos adjuntos (PDFs / Imágenes)
function handleFileSelect(event) {
  var files = Array.from(event.target.files);
  files.forEach(function (file) {
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo ' + file.name + ' supera el límite de 5MB');
      return;
    }
    uploadedFiles.push(file);
  });
  renderFileList();
}

function renderFileList() {
  var container = document.getElementById('file-list');
  container.innerHTML = '';

  uploadedFiles.forEach(function (file, index) {
    var item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-item-name">
        📄 <span>${file.name}</span> <small class="muted">(${Math.round(file.size / 1024)} KB)</small>
      </div>
      <button type="button" class="file-item-remove" onclick="removeFile(${index})">✕</button>
    `;
    container.appendChild(item);
  });
}

function removeFile(index) {
  uploadedFiles.splice(index, 1);
  renderFileList();
}

// Agregar nueva fila de servicio dinámicamente
function addServiceRow() {
  var container = document.getElementById('svc-container');
  var row = document.createElement('div');
  row.className = 'svc-row';
  row.innerHTML = `
    <input type="checkbox" checked aria-label="Seleccionar Servicio">
    <input class="input" placeholder="Nombre del Servicio" style="font-weight:600;">
    <input class="input" value="30" placeholder="Precio S/" aria-label="Precio">
    <input class="input" value="30" placeholder="Minutos" aria-label="Duración">
  `;
  container.appendChild(row);
}

// Recopilar servicios del DOM
function collectServices() {
  var rows = Array.from(document.querySelectorAll('.svc-row'));
  return rows.map(function (row) {
    var checkbox = row.querySelector('input[type="checkbox"]');
    var inputs = row.querySelectorAll('.input');
    var name = inputs[0].tagName === 'INPUT' && inputs[0].type === 'text' 
      ? inputs[0].value.trim() 
      : row.querySelector('b') ? row.querySelector('b').textContent.trim() : '';

    var price = Number(inputs[inputs.length - 2].value);
    var duration = Number(inputs[inputs.length - 1].value);

    return {
      active: checkbox.checked,
      name: name || 'Servicio',
      price: !isNaN(price) ? price : 0,
      durationMinutes: !isNaN(duration) ? duration : 30
    };
  }).filter(function (s) { return s.active && s.name; });
}

// Envío del Formulario de Registro
async function handleRegistration(event) {
  event.preventDefault();
  
  var btnSubmit = document.getElementById('btn-submit');
  var errorMsg = document.getElementById('register-error');
  
  errorMsg.hidden = true;
  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Creando negocio...';

  var payload = {
    ownerName: document.getElementById('owner-name').value.trim(),
    email: document.getElementById('owner-email').value.trim(),
    password: document.getElementById('owner-password').value,
    shopName: document.getElementById('shop-name').value.trim(),
    address: document.getElementById('shop-address').value.trim(),
    district: document.getElementById('shop-district').value.trim(),
    phone: document.getElementById('shop-phone').value.trim(),
    taxId: document.getElementById('shop-tax').value.trim(),
    services: collectServices()
  };

  try {
    var response = await fetch(API_BASE + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    var data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo registrar el negocio');

    // Guardar sesión y redirigir
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('shopSlug', data.shop.slug);

    window.location.href = '/panel';
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.hidden = false;
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Crear mi Negocio en StylisHub';
  }
}