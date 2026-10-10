# SOS GLAM · maqueta visual

Diseño estático de las pantallas de SOS GLAM: SaaS de reservas y recordatorios para barberías.
**Solo es la parte visual.** Los datos son de ejemplo y no hay backend: los botones no guardan nada.

## Cómo verlo

No hay que instalar nada.

1. Abre la carpeta en VS Code.
2. Clic derecho sobre `index.html` → **Open with Live Server**.
3. Navega entre páginas con los enlaces.

## Estructura

```
SOS-GLAM/
├── index.html            Landing para dueños de barberías
├── reservar.html         Página pública del local: reserva en 4 pasos
├── cita.html             Enlace que llega por WhatsApp: confirmar / cancelar
├── login.html            Acceso del dueño (enlace mágico o Google)
├── registro.html         Asistente de alta del local (muestra el paso 2 de 5)
├── panel/
│   ├── agenda.html       Agenda del día, una columna por barbero
│   ├── clientes.html     Lista de clientes, visitas y faltas
│   ├── servicios.html    Servicios, precio, duración y visibilidad
│   └── configuracion.html Datos del local, horario, enlace, WhatsApp y plan
├── css/
│   ├── base.css          Colores, tipografía y componentes compartidos
│   ├── landing.css       Solo index.html
│   ├── public.css        reservar, cita, login y registro
│   └── panel.css         Páginas del panel
└── js/
    ├── landing.js        Demo del teléfono en la portada
    ├── reservar.js       Selección y resumen de la reserva
    └── panel.js          Selección de citas y filtros del panel
```

## Convenciones

- **Colores y tipografía** viven solo en las variables de `css/base.css` (`--gold`, `--ink`, etc.). No pongan colores sueltos en otras hojas.
- **Componentes compartidos** (`.btn`, `.card`, `.chip`, `.tag`, `.input`, `.table`, `.avatar`, `.switch`) están en `base.css`, cada uno marcado con `COMPONENTE`.
- **Estados de cita** (clases y etiquetas): `pendiente`, `confirmada`, `llego`, `novino`, `cancelada`.
- **La barra lateral del panel** está repetida en las 4 páginas: en el framework pasa a ser un solo componente de layout.
- **Agenda:** cada fila de la grilla es de 30 min y la fila 2 corresponde a las 10:00. Fila de una cita = `2 + (minutos desde las 10:00) / 30`.

## Paso a Next.js (sugerido)

| Archivo actual | Ruta en Next.js |
|---|---|
| `index.html` | `app/page.tsx` |
| `reservar.html` | `app/[slug]/page.tsx` |
| `cita.html` | `app/c/[token]/page.tsx` |
| `login.html` | `app/login/page.tsx` |
| `registro.html` | `app/registro/page.tsx` |
| `panel/*.html` | `app/panel/(agenda, clientes, servicios, configuracion)/page.tsx` con un `layout.tsx` para la barra lateral |
| `css/base.css` | `app/globals.css` o tokens de Tailwind |

## Pendiente de diseño

- Pasos 1, 3, 4 y 5 del registro
- Equipo (barberos y horarios por persona)
- Números (plan PRO)
- Recuperar acceso e invitación al equipo
- Vista semanal de la agenda
- Superadmin de SOS GLAM
