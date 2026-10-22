/**
 * StylisHub · Guard de Autenticación Centralizado
 * Verifica si existe un token o usuario guardado en localStorage/sessionStorage.
 * Si no existe sesión, redirige automáticamente a login.html.
 */
(function () {
  // Páginas públicas que NO requieren autenticación previa
  const PUBLIC_PAGES = ['login.html', 'registro.html', "index.html"];
  
  // Obtener la página actual
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const isPublicPage = PUBLIC_PAGES.some(page => currentPath.endsWith(page));

  // Verificar la existencia del token o datos de sesión guardados
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || localStorage.getItem('sh_token');
  const user = localStorage.getItem('user') || sessionStorage.getItem('user');

  const isAuthenticated = Boolean(token || user);

  // Redirigir a login si no hay usuario guardado y la página requiere sesión
  if (!isAuthenticated && !isPublicPage) {
    // Guardar la URL a la que intentaba acceder para redirigir después del login
    sessionStorage.setItem('redirect_after_login', window.location.href);
    window.location.replace('login.html');
  }
})();