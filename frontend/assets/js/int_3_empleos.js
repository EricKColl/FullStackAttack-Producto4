import {
  graphqlRequest,
  obtenerTokenAdminObligatorio,
  obtenerTokenSesionObligatorio,
  obtenerUsuarioAutenticado
} from "./api.js";
import {
  capitalizarTexto,
  configurarBotonCerrarSesion,
  confirmarAccion,
  mostrarAlerta,
  obtenerEtiquetaRol,
  pintarUsuarioEnNavbar,
  protegerPantallaConSesion,
  usuarioEsAdmin,
  usuarioEsCandidato,
  usuarioEsEmpresa
} from "./ui.js";

/*
  Referencias a elementos del HTML de la pantalla de publicaciones.
*/
const formPublicacion = document.getElementById("form-publicacion");
const tipoPublicacion = document.getElementById("tipo-publicacion");
const tituloPublicacion = document.getElementById("titulo-publicacion");
const categoriaPublicacion = document.getElementById("categoria-publicacion");
const autorPublicacion = document.getElementById("autor-publicacion");
const ubicacionPublicacion = document.getElementById("ubicacion-publicacion");
const fechaPublicacion = document.getElementById("fecha-publicacion");
const descripcionPublicacion = document.getElementById("descripcion-publicacion");
const emailPublicacion = document.getElementById("email-publicacion");
const tablaPublicacionesBody = document.getElementById("tabla-publicaciones-body");
const mensajePublicacion = document.getElementById("mensaje-publicacion");
const canvasGrafico = document.getElementById("grafico-publicaciones");
const estadoGrafico = document.getElementById("estado-grafico");

const buscadorPublicaciones = document.getElementById("buscador-publicaciones");
const filtroTipoPublicaciones = document.getElementById("filtro-tipo-publicaciones");
const botonLimpiarFiltrosPublicaciones = document.getElementById("btn-limpiar-filtros-publicaciones");
const contadorPublicaciones = document.getElementById("contador-publicaciones");

const LISTAR_PUBLICACIONES = `
  query ListarPublicaciones {
    listarPublicaciones {
      id
      titulo
      descripcion
      tipo
      categoria
      autor
      ubicacion
      emailContacto
      fecha
    }
  }
`;

const CREAR_PUBLICACION = `
  mutation CrearPublicacion($datos: CrearPublicacionInput!) {
    crearPublicacion(datos: $datos) {
      id
      titulo
      descripcion
      tipo
      categoria
      autor
      ubicacion
      emailContacto
      fecha
    }
  }
`;

const ELIMINAR_PUBLICACION = `
  mutation EliminarPublicacion($id: ID!) {
    eliminarPublicacion(id: $id) {
      id
      titulo
    }
  }
`;

/*
  Estado local de la pantalla.
*/
let publicacionesCache = [];
let resizeTimeoutId = null;
let refrescoPublicacionesTimeoutId = null;
let socketPublicaciones = null;

/*
  Devuelve el usuario activo de forma centralizada.
*/
function obtenerUsuarioActual() {
  return obtenerUsuarioAutenticado();
}

/*
  Devuelve el email del usuario activo normalizado.
*/
function obtenerEmailUsuarioActual() {
  return String(obtenerUsuarioActual()?.email || "").trim().toLowerCase();
}

/*
  Indica el tipo de publicación que puede crear cada rol no administrador.
*/
function obtenerTipoForzadoPorRol() {
  if (usuarioEsEmpresa()) {
    return "oferta";
  }

  if (usuarioEsCandidato()) {
    return "demanda";
  }

  return null;
}

/*
  Define qué publicaciones tienen sentido para cada rol.
*/
function publicacionVisibleParaRol(publicacion) {
  if (usuarioEsAdmin()) {
    return true;
  }

  const emailUsuario = obtenerEmailUsuarioActual();
  const emailPublicacionActual = String(publicacion.emailContacto || "").trim().toLowerCase();
  const esPublicacionPropia = emailUsuario && emailUsuario === emailPublicacionActual;

  if (usuarioEsEmpresa()) {
    return publicacion.tipo === "demanda" || (publicacion.tipo === "oferta" && esPublicacionPropia);
  }

  if (usuarioEsCandidato()) {
    return publicacion.tipo === "oferta" || (publicacion.tipo === "demanda" && esPublicacionPropia);
  }

  return false;
}

/*
  Filtra una lista de publicaciones según el rol activo.
*/
function filtrarPublicacionesPorRol(publicaciones) {
  return publicaciones.filter(publicacionVisibleParaRol);
}

/*
  Adapta textos, formulario y filtros de la pantalla según el rol.
*/
function adaptarPaginaPublicacionesAlRol() {
  const usuario = obtenerUsuarioActual();

  if (!usuario) {
    return;
  }

  insertarPanelContextoPublicaciones(usuario);
  adaptarTextosPublicacionesPorRol();
  adaptarFormularioPublicacionPorRol(usuario);
  adaptarFiltrosPublicacionesPorRol();
  adaptarCabeceraAccionTabla();
}

/*
  Inserta un panel contextual para explicar qué está viendo cada rol.
*/
function insertarPanelContextoPublicaciones(usuario) {
  const intro = document.querySelector(".page-intro");

  if (!intro) {
    return;
  }

  let panel = document.getElementById("panel-contexto-rol-publicaciones");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "panel-contexto-rol-publicaciones";
    panel.className = "role-context-panel";
    intro.insertAdjacentElement("afterend", panel);
  }

  let titulo = "Vista personalizada de publicaciones";
  let descripcion = "La información visible se adapta al rol activo de la sesión.";

  if (usuarioEsAdmin()) {
    titulo = "Gestión global de ofertas y demandas";
    descripcion = "Como administrador puedes consultar, crear y eliminar publicaciones de todo el sistema.";
  } else if (usuarioEsEmpresa()) {
    titulo = "Vista de empresa";
    descripcion = "Como empresa puedes crear ofertas, consultar demandas de candidatos y revisar tus propias ofertas publicadas.";
  } else if (usuarioEsCandidato()) {
    titulo = "Vista de candidato";
    descripcion = "Como candidato puedes crear demandas, consultar ofertas de empresas y revisar tus propias demandas publicadas.";
  }

  panel.innerHTML = `
    <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
      <div>
        <span class="role-chip mb-3">${escaparHTML(obtenerEtiquetaRol(usuario.rol))}</span>
        <h2 class="h4">${escaparHTML(titulo)}</h2>
        <p>${escaparHTML(descripcion)}</p>
      </div>
      <div class="text-end">
        <p class="mb-1 text-muted">Sesión activa</p>
        <strong>${escaparHTML(usuario.nombre)} ${escaparHTML(usuario.apellidos)}</strong>
      </div>
    </div>
  `;
}

/*
  Actualiza títulos y subtítulos principales de la pantalla.
*/
function adaptarTextosPublicacionesPorRol() {
  const tituloPagina = document.querySelector(".page-heading");
  const subtituloPagina = document.querySelector(".page-subtitle");
  const titulosSeccion = document.querySelectorAll(".section-title");
  const subtitulosSeccion = document.querySelectorAll(".section-subtitle");

  if (usuarioEsAdmin()) {
    if (tituloPagina) tituloPagina.textContent = "Gestión administrativa de ofertas y demandas";
    if (subtituloPagina) subtituloPagina.textContent = "Administra todas las publicaciones laborales conectadas al backend real de JobConnect.";
    return;
  }

  if (usuarioEsEmpresa()) {
    if (tituloPagina) tituloPagina.textContent = "Ofertas de empresa y demandas de candidatos";
    if (subtituloPagina) subtituloPagina.textContent = "Publica ofertas laborales y consulta demandas de candidatos disponibles en JobConnect.";
    if (titulosSeccion[0]) titulosSeccion[0].textContent = "Nueva oferta de empresa";
    if (subtitulosSeccion[0]) subtitulosSeccion[0].textContent = "Registra una oferta laboral asociada a tu sesión de empresa.";
    if (titulosSeccion[2]) titulosSeccion[2].textContent = "Publicaciones visibles para empresa";
    if (subtitulosSeccion[2]) subtitulosSeccion[2].textContent = "Consulta demandas de candidatos y tus propias ofertas publicadas.";
    return;
  }

  if (usuarioEsCandidato()) {
    if (tituloPagina) tituloPagina.textContent = "Ofertas disponibles y demanda profesional";
    if (subtituloPagina) subtituloPagina.textContent = "Consulta ofertas de empresas y publica tu demanda profesional como candidato.";
    if (titulosSeccion[0]) titulosSeccion[0].textContent = "Nueva demanda de candidato";
    if (subtitulosSeccion[0]) subtitulosSeccion[0].textContent = "Registra tu perfil, disponibilidad o necesidad profesional asociada a tu sesión.";
    if (titulosSeccion[2]) titulosSeccion[2].textContent = "Publicaciones visibles para candidato";
    if (subtitulosSeccion[2]) subtitulosSeccion[2].textContent = "Consulta ofertas de empresas y tus propias demandas publicadas.";
  }
}

/*
  Adapta el formulario para impedir opciones que no corresponden al rol.
*/
function adaptarFormularioPublicacionPorRol(usuario) {
  const tipoForzado = obtenerTipoForzadoPorRol();

  if (tipoForzado) {
    tipoPublicacion.value = tipoForzado;
    tipoPublicacion.disabled = true;
  } else {
    tipoPublicacion.disabled = false;
  }

  autorPublicacion.value = `${usuario.nombre} ${usuario.apellidos}`;
  emailPublicacion.value = usuario.email;

  if (!usuarioEsAdmin()) {
    autorPublicacion.readOnly = true;
    emailPublicacion.readOnly = true;
  } else {
    autorPublicacion.readOnly = false;
    emailPublicacion.readOnly = false;
  }
}

/*
  Ajusta filtro por tipo según rol.
*/
function adaptarFiltrosPublicacionesPorRol() {
  if (!filtroTipoPublicaciones) {
    return;
  }

  Array.from(filtroTipoPublicaciones.options).forEach((opcion) => {
    opcion.hidden = false;
    opcion.disabled = false;
  });

  filtroTipoPublicaciones.value = "todas";
}

/*
  Cambia la cabecera de acción según los permisos reales.
*/
function adaptarCabeceraAccionTabla() {
  const cabeceraAccion = document.querySelector(".tabla-publicaciones th.columna-accion");

  if (!cabeceraAccion) {
    return;
  }

  cabeceraAccion.textContent = usuarioEsAdmin() ? "Acción" : "Permiso";
}

async function cargarPublicacionesBackend() {
  const data = await graphqlRequest(LISTAR_PUBLICACIONES);
  return data.listarPublicaciones;
}

async function crearPublicacionBackend(datosPublicacion) {
  const token = obtenerTokenSesionObligatorio();

  const data = await graphqlRequest(
    CREAR_PUBLICACION,
    { datos: datosPublicacion },
    token
  );

  return data.crearPublicacion;
}

async function eliminarPublicacionBackend(idPublicacion) {
  const token = obtenerTokenAdminObligatorio();

  const data = await graphqlRequest(
    ELIMINAR_PUBLICACION,
    { id: String(idPublicacion) },
    token
  );

  return data.eliminarPublicacion;
}

/*
  Función principal de arranque de la página de ofertas y demandas.
*/
async function inicializarPaginaPublicaciones() {
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();

  if (!protegerPantallaConSesion()) {
    return;
  }

  completarDatosSugeridos();
  adaptarPaginaPublicacionesAlRol();
  configurarCalendarioFecha();
  configurarFiltrosPublicaciones();
  configurarSocketPublicaciones();

  try {
    await refrescarPublicacionesDesdeBackend();
    await pintarGraficoCanvas();
  } catch (error) {
    mostrarAlerta(mensajePublicacion, error.message, "danger", 0);
  }

  formPublicacion.addEventListener("submit", gestionarAltaPublicacion);

  window.addEventListener("resize", () => {
    if (resizeTimeoutId) {
      window.clearTimeout(resizeTimeoutId);
    }

    resizeTimeoutId = window.setTimeout(() => {
      pintarGraficoCanvas();
    }, 150);
  });
}

/*
  Descarga las publicaciones desde GraphQL, actualiza la caché local
  y repinta la tabla aplicando los filtros actuales.
*/
async function refrescarPublicacionesDesdeBackend() {
  publicacionesCache = await cargarPublicacionesBackend();
  pintarTablaPublicaciones();
}

/*
  Programa un repintado de tabla y gráfico.
*/
function programarRepintadoPublicaciones() {
  if (refrescoPublicacionesTimeoutId) {
    window.clearTimeout(refrescoPublicacionesTimeoutId);
  }

  refrescoPublicacionesTimeoutId = window.setTimeout(async () => {
    try {
      await refrescarPublicacionesDesdeBackend();
      await pintarGraficoCanvas();
    } catch (error) {
      mostrarAlerta(mensajePublicacion, error.message, "danger");
    }
  }, 120);
}

/*
  Configura Socket.io para mantener esta pantalla sincronizada con el backend.
*/
function configurarSocketPublicaciones() {
  if (typeof window.io !== "function") {
    return;
  }

  if (socketPublicaciones) {
    return;
  }

  socketPublicaciones = window.io("http://localhost:4000");

  socketPublicaciones.on("publicaciones:actualizadas", programarRepintadoPublicaciones);
}

/*
  Configura el buscador, el filtro por tipo y el botón de limpieza.
*/
function configurarFiltrosPublicaciones() {
  if (buscadorPublicaciones) {
    buscadorPublicaciones.addEventListener("input", pintarTablaPublicaciones);
  }

  if (filtroTipoPublicaciones) {
    filtroTipoPublicaciones.addEventListener("change", pintarTablaPublicaciones);
  }

  if (botonLimpiarFiltrosPublicaciones) {
    botonLimpiarFiltrosPublicaciones.addEventListener("click", () => {
      if (buscadorPublicaciones) {
        buscadorPublicaciones.value = "";
      }

      if (filtroTipoPublicaciones) {
        filtroTipoPublicaciones.value = "todas";
      }

      pintarTablaPublicaciones();
    });
  }
}

/*
  Hace que el icono blanco personalizado del input fecha abra el calendario.
*/
function configurarCalendarioFecha() {
  if (!fechaPublicacion) {
    return;
  }

  fechaPublicacion.addEventListener("click", (evento) => {
    const rect = fechaPublicacion.getBoundingClientRect();
    const distanciaDesdeDerecha = rect.right - evento.clientX;

    if (distanciaDesdeDerecha <= 56 && typeof fechaPublicacion.showPicker === "function") {
      fechaPublicacion.showPicker();
    }
  });

  fechaPublicacion.addEventListener("keydown", (evento) => {
    if ((evento.key === "Enter" || evento.key === " ") && typeof fechaPublicacion.showPicker === "function") {
      evento.preventDefault();
      fechaPublicacion.showPicker();
    }
  });
}

/*
  Rellena automáticamente algunos campos del formulario.
*/
function completarDatosSugeridos() {
  fechaPublicacion.value = new Date().toISOString().split("T")[0];

  const usuarioActivo = obtenerUsuarioActual();

  if (!usuarioActivo) {
    return;
  }

  const tipoForzado = obtenerTipoForzadoPorRol();

  if (tipoForzado) {
    tipoPublicacion.value = tipoForzado;
  }

  autorPublicacion.value = `${usuarioActivo.nombre} ${usuarioActivo.apellidos}`;
  emailPublicacion.value = usuarioActivo.email;
}

/*
  Recoge los datos del formulario para enviarlos al backend.
*/
function obtenerDatosFormulario() {
  const usuarioActivo = obtenerUsuarioActual();
  const tipoForzado = obtenerTipoForzadoPorRol();

  return {
    tipo: tipoForzado || tipoPublicacion.value,
    titulo: tituloPublicacion.value,
    categoria: categoriaPublicacion.value,
    autor: autorPublicacion.value,
    ubicacion: ubicacionPublicacion.value,
    fecha: fechaPublicacion.value,
    descripcion: descripcionPublicacion.value,
    emailContacto: usuarioEsAdmin() ? emailPublicacion.value : usuarioActivo?.email
  };
}

/*
  Normaliza texto para buscar sin depender de mayúsculas, minúsculas o acentos.
*/
function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/*
  Evita inyectar HTML directamente desde datos de usuario o backend.
*/
function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
  Devuelve las publicaciones que cumplen los filtros actuales.
*/
function obtenerPublicacionesFiltradas() {
  const textoBusqueda = normalizarTexto(buscadorPublicaciones?.value || "");
  const filtroTipo = filtroTipoPublicaciones?.value || "todas";
  const publicacionesPorRol = filtrarPublicacionesPorRol(publicacionesCache);

  return publicacionesPorRol.filter((publicacion) => {
    const coincideTipo = filtroTipo === "todas" || publicacion.tipo === filtroTipo;

    const textoPublicacion = normalizarTexto([
      publicacion.id,
      publicacion.tipo,
      publicacion.titulo,
      publicacion.categoria,
      publicacion.autor,
      publicacion.ubicacion,
      publicacion.emailContacto,
      publicacion.fecha,
      publicacion.descripcion
    ].join(" "));

    const coincideTexto = !textoBusqueda || textoPublicacion.includes(textoBusqueda);

    return coincideTipo && coincideTexto;
  });
}

/*
  Actualiza el contador de resultados visibles.
*/
function actualizarContadorPublicaciones(totalVisibles, totalPublicacionesVisiblesPorRol) {
  if (!contadorPublicaciones) {
    return;
  }

  if (totalPublicacionesVisiblesPorRol === 0) {
    if (usuarioEsEmpresa()) {
      contadorPublicaciones.textContent = "No hay demandas de candidatos ni ofertas propias visibles.";
      return;
    }

    if (usuarioEsCandidato()) {
      contadorPublicaciones.textContent = "No hay ofertas de empresas ni demandas propias visibles.";
      return;
    }

    contadorPublicaciones.textContent = "No hay publicaciones registradas.";
    return;
  }

  if (totalVisibles === totalPublicacionesVisiblesPorRol) {
    contadorPublicaciones.textContent = `Mostrando ${totalPublicacionesVisiblesPorRol} publicaciones visibles para tu rol.`;
    return;
  }

  contadorPublicaciones.textContent = `Mostrando ${totalVisibles} de ${totalPublicacionesVisiblesPorRol} publicaciones visibles para tu rol.`;
}

/*
  Pinta la tabla HTML usando la caché local y los filtros activos.
*/
function pintarTablaPublicaciones() {
  const publicacionesFiltradas = obtenerPublicacionesFiltradas();
  const publicacionesVisiblesPorRol = filtrarPublicacionesPorRol(publicacionesCache);
  const colspan = 8;

  actualizarContadorPublicaciones(publicacionesFiltradas.length, publicacionesVisiblesPorRol.length);

  if (publicacionesVisiblesPorRol.length === 0) {
    tablaPublicacionesBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="${colspan}" class="text-center text-muted">No hay publicaciones visibles para el rol actual.</td>
      </tr>
    `;
    return;
  }

  if (publicacionesFiltradas.length === 0) {
    tablaPublicacionesBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="${colspan}" class="text-center text-muted">
          No hay publicaciones que coincidan con la búsqueda o el filtro seleccionado.
        </td>
      </tr>
    `;
    return;
  }

  tablaPublicacionesBody.innerHTML = "";

  publicacionesFiltradas.forEach((publicacion) => {
    const fila = document.createElement("tr");
    const badgeClase = publicacion.tipo === "oferta" ? "badge-oferta" : "badge-demanda";
    const accionHtml = usuarioEsAdmin()
      ? `<button class="btn btn-sm btn-action-delete" data-id="${escaparHTML(publicacion.id)}">Eliminar</button>`
      : `<span class="badge text-bg-secondary">Consulta</span>`;

    fila.innerHTML = `
      <td>${escaparHTML(publicacion.id)}</td>
      <td><span class="badge ${badgeClase}">${escaparHTML(capitalizarTexto(publicacion.tipo))}</span></td>
      <td>${escaparHTML(publicacion.titulo)}</td>
      <td>${escaparHTML(publicacion.fecha)}</td>
      <td class="columna-email">${escaparHTML(publicacion.emailContacto)}</td>
      <td class="columna-descripcion">${escaparHTML(publicacion.descripcion)}</td>
      <td>${escaparHTML(publicacion.ubicacion)}</td>
      <td class="columna-accion">${accionHtml}</td>
    `;

    const botonEliminar = fila.querySelector("button[data-id]");

    if (botonEliminar) {
      botonEliminar.addEventListener("click", async () => {
        await gestionarBorradoPublicacion(publicacion.id, publicacion.titulo);
      });
    }

    tablaPublicacionesBody.appendChild(fila);
  });
}

/*
  Gestiona el alta de una publicación nueva.
*/
async function gestionarAltaPublicacion(evento) {
  evento.preventDefault();

  try {
    await crearPublicacionBackend(obtenerDatosFormulario());
    await refrescarPublicacionesDesdeBackend();
    await pintarGraficoCanvas();
    formPublicacion.reset();
    completarDatosSugeridos();
    adaptarFormularioPublicacionPorRol(obtenerUsuarioActual());

    mostrarAlerta(
      mensajePublicacion,
      "Publicación guardada correctamente según los permisos del rol activo.",
      "success"
    );
  } catch (error) {
    mostrarAlerta(mensajePublicacion, error.message, "danger");
  }
}

/*
  Elimina una publicación por su id usando el modal visual propio.
*/
async function gestionarBorradoPublicacion(idPublicacion, tituloPublicacion) {
  if (!usuarioEsAdmin()) {
    mostrarAlerta(mensajePublicacion, "Solo el administrador puede eliminar publicaciones globales.", "warning");
    return;
  }

  const confirmarBorrado = await confirmarAccion({
    titulo: "Eliminar publicación",
    mensaje: `¿Seguro que quieres eliminar la publicación "${tituloPublicacion}"?`,
    textoConfirmar: "Eliminar",
    textoCancelar: "Cancelar",
    variante: "danger"
  });

  if (!confirmarBorrado) {
    mostrarAlerta(mensajePublicacion, "Eliminación cancelada por el usuario.", "secondary");
    return;
  }

  try {
    await eliminarPublicacionBackend(idPublicacion);
    await refrescarPublicacionesDesdeBackend();
    await pintarGraficoCanvas();

    mostrarAlerta(
      mensajePublicacion,
      `Publicación "${tituloPublicacion}" eliminada correctamente.`,
      "success"
    );
  } catch (error) {
    mostrarAlerta(mensajePublicacion, error.message, "danger");
  }
}

/*
  Ajusta el tamaño interno del canvas para que se vea nítido.
*/
function prepararCanvasHD(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const contenedor = canvas.closest(".canvas-wrapper");

  const anchoVisual = canvas.clientWidth || contenedor?.clientWidth || canvas.width || 760;
  const altoContenedor = contenedor?.clientHeight || canvas.clientHeight || canvas.height || 620;
  const altoVisual = Math.max(altoContenedor, 620);

  canvas.style.width = "100%";
  canvas.style.height = `${altoVisual}px`;

  canvas.width = Math.round(anchoVisual * dpr);
  canvas.height = Math.round(altoVisual * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  return {
    ctx,
    ancho: anchoVisual,
    alto: altoVisual
  };
}

/*
  Dibuja un rectángulo con esquinas redondeadas.
*/
function dibujarRectanguloRedondeado(ctx, x, y, ancho, alto, radio) {
  const radioSeguro = Math.min(radio, ancho / 2, alto / 2);

  ctx.beginPath();
  ctx.moveTo(x + radioSeguro, y);
  ctx.lineTo(x + ancho - radioSeguro, y);
  ctx.quadraticCurveTo(x + ancho, y, x + ancho, y + radioSeguro);
  ctx.lineTo(x + ancho, y + alto - radioSeguro);
  ctx.quadraticCurveTo(x + ancho, y + alto, x + ancho - radioSeguro, y + alto);
  ctx.lineTo(x + radioSeguro, y + alto);
  ctx.quadraticCurveTo(x, y + alto, x, y + alto - radioSeguro);
  ctx.lineTo(x, y + radioSeguro);
  ctx.quadraticCurveTo(x, y, x + radioSeguro, y);
  ctx.closePath();
}

function calcularPorcentaje(valor, total) {
  if (total === 0) {
    return 0;
  }

  return Math.round((valor / total) * 100);
}

/*
  Actualiza el chip superior del gráfico.
*/
function actualizarEstadoGrafico(totalOfertas, totalDemandas) {
  if (!estadoGrafico) {
    return;
  }

  const totalPublicaciones = totalOfertas + totalDemandas;

  if (totalPublicaciones === 0) {
    estadoGrafico.textContent = "Sin publicaciones registradas";
    return;
  }

  estadoGrafico.textContent = `${totalOfertas} ofertas · ${totalDemandas} demandas · ${totalPublicaciones} en total`;
}

/*
  Fondo limpio y tecnológico.
*/
function dibujarFondoPanel(ctx, ancho, alto) {
  const fondo = ctx.createLinearGradient(0, 0, ancho, alto);
  fondo.addColorStop(0, "#061833");
  fondo.addColorStop(0.48, "#081225");
  fondo.addColorStop(1, "#040915");

  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ancho, alto);

  const brilloCentral = ctx.createRadialGradient(
    ancho / 2,
    alto * 0.47,
    0,
    ancho / 2,
    alto * 0.47,
    Math.min(ancho, alto) * 0.62
  );

  brilloCentral.addColorStop(0, "rgba(66, 214, 255, 0.14)");
  brilloCentral.addColorStop(0.45, "rgba(79, 240, 190, 0.05)");
  brilloCentral.addColorStop(1, "rgba(66, 214, 255, 0)");

  ctx.fillStyle = brilloCentral;
  ctx.fillRect(0, 0, ancho, alto);

  ctx.save();
  ctx.globalAlpha = 0.11;
  ctx.strokeStyle = "rgba(88, 231, 255, 0.24)";
  ctx.lineWidth = 1;

  const separacion = 38;

  for (let x = 24; x < ancho; x += separacion) {
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, alto - 24);
    ctx.stroke();
  }

  for (let y = 24; y < alto; y += separacion) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(ancho - 24, y);
    ctx.stroke();
  }

  ctx.restore();

  ctx.strokeStyle = "rgba(108, 209, 255, 0.22)";
  ctx.lineWidth = 1.2;
  dibujarRectanguloRedondeado(ctx, 18, 18, ancho - 36, alto - 36, 22);
  ctx.stroke();
}

/*
  Título centrado, sin texto decorativo innecesario.
*/
function dibujarTituloPanel(ctx, ancho) {
  ctx.textAlign = "center";

  ctx.fillStyle = "#f4fbff";
  ctx.font = "900 18px Inter";
  ctx.fillText("Distribución de ofertas y demandas", ancho / 2, 48);

  ctx.fillStyle = "#91a9ca";
  ctx.font = "600 13px Inter";
  ctx.fillText("Comparativa real de publicaciones registradas", ancho / 2, 70);
}

/*
  Dibuja un arco circular proporcional.
*/
function dibujarArcoProporcional(ctx, centroX, centroY, radio, grosor, inicio, fin, color1, color2, sombra) {
  if (fin <= inicio) {
    return;
  }

  const gradiente = ctx.createLinearGradient(
    centroX - radio,
    centroY - radio,
    centroX + radio,
    centroY + radio
  );

  gradiente.addColorStop(0, color1);
  gradiente.addColorStop(1, color2);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centroX, centroY, radio, inicio, fin);
  ctx.strokeStyle = gradiente;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.shadowColor = sombra;
  ctx.shadowBlur = 22;
  ctx.stroke();
  ctx.restore();
}

/*
  Dibuja el medidor radial central.
*/
function dibujarMedidorCentral(ctx, ancho, alto, totalOfertas, totalDemandas) {
  const totalPublicaciones = totalOfertas + totalDemandas;
  const porcentajeOfertas = totalPublicaciones === 0 ? 0 : totalOfertas / totalPublicaciones;
  const porcentajeDemandas = totalPublicaciones === 0 ? 0 : totalDemandas / totalPublicaciones;

  const centroX = ancho / 2;
  const centroY = alto * 0.43;
  const radio = Math.min(145, Math.max(105, Math.min(ancho, alto) * 0.25));
  const grosor = Math.min(30, Math.max(22, radio * 0.21));

  ctx.save();

  ctx.beginPath();
  ctx.arc(centroX, centroY, radio, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(142, 166, 200, 0.18)";
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.stroke();

  const inicio = -Math.PI / 2;
  const finOfertas = inicio + (Math.PI * 2 * porcentajeOfertas);
  const finDemandas = finOfertas + (Math.PI * 2 * porcentajeDemandas);

  dibujarArcoProporcional(
    ctx,
    centroX,
    centroY,
    radio,
    grosor,
    inicio,
    finOfertas,
    "#72f0ff",
    "#1799ff",
    "rgba(66, 214, 255, 0.46)"
  );

  dibujarArcoProporcional(
    ctx,
    centroX,
    centroY,
    radio,
    grosor,
    finOfertas,
    finDemandas,
    "#7dffd5",
    "#23bd95",
    "rgba(79, 240, 190, 0.42)"
  );

  const halo = ctx.createRadialGradient(centroX, centroY, 0, centroX, centroY, radio * 1.25);
  halo.addColorStop(0, "rgba(255, 255, 255, 0.045)");
  halo.addColorStop(0.72, "rgba(66, 214, 255, 0.055)");
  halo.addColorStop(1, "rgba(66, 214, 255, 0)");

  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(centroX, centroY, radio * 1.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 52px Inter";
  ctx.fillText(String(totalPublicaciones), centroX, centroY + 12);

  ctx.fillStyle = "#91a9ca";
  ctx.font = "800 13px Inter";
  ctx.fillText("PUBLICACIONES", centroX, centroY + 42);

  ctx.restore();
}

/*
  Dibuja una tarjeta inferior centrada.
*/
function dibujarTarjetaResumen(ctx, x, y, ancho, alto, datos) {
  ctx.save();

  ctx.fillStyle = "rgba(5, 12, 24, 0.74)";
  dibujarRectanguloRedondeado(ctx, x, y, ancho, alto, 20);
  ctx.fill();

  ctx.strokeStyle = datos.borde;
  ctx.lineWidth = 1;
  dibujarRectanguloRedondeado(ctx, x, y, ancho, alto, 20);
  ctx.stroke();

  ctx.textAlign = "center";

  ctx.fillStyle = datos.colorTexto;
  ctx.font = "900 18px Inter";
  ctx.fillText(datos.titulo, x + ancho / 2, y + 28);

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 34px Inter";
  ctx.fillText(String(datos.valor), x + ancho / 2, y + 68);

  ctx.fillStyle = "#91a9ca";
  ctx.font = "700 13px Inter";
  ctx.fillText(`${datos.porcentaje}% del total`, x + ancho / 2, y + 94);

  const barraX = x + 28;
  const barraY = y + alto - 24;
  const barraAncho = ancho - 56;
  const barraAlto = 8;
  const progreso = Math.max(0, Math.min(1, datos.porcentaje / 100));

  ctx.fillStyle = "rgba(142, 166, 200, 0.18)";
  dibujarRectanguloRedondeado(ctx, barraX, barraY, barraAncho, barraAlto, 999);
  ctx.fill();

  const gradienteBarra = ctx.createLinearGradient(barraX, barraY, barraX + barraAncho, barraY);
  gradienteBarra.addColorStop(0, datos.color1);
  gradienteBarra.addColorStop(1, datos.color2);

  ctx.fillStyle = gradienteBarra;
  dibujarRectanguloRedondeado(ctx, barraX, barraY, barraAncho * progreso, barraAlto, 999);
  ctx.fill();

  ctx.restore();
}

/*
  Estado vacío centrado.
*/
function dibujarEstadoVacioGrafico(ctx, ancho, alto) {
  const centroX = ancho / 2;
  const centroY = alto / 2;
  const radio = Math.min(118, Math.max(86, Math.min(ancho, alto) * 0.22));

  ctx.beginPath();
  ctx.arc(centroX, centroY - 28, radio, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(142, 166, 200, 0.18)";
  ctx.lineWidth = 24;
  ctx.stroke();

  ctx.textAlign = "center";

  ctx.fillStyle = "#f4fbff";
  ctx.font = "900 21px Inter";
  ctx.fillText("Sin publicaciones registradas", centroX, centroY - 8);

  ctx.fillStyle = "#91a9ca";
  ctx.font = "600 14px Inter";
  ctx.fillText("Crea una oferta o una demanda para activar la comparativa.", centroX, centroY + 22);
}

/*
  Dibuja el gráfico Canvas con datos reales obtenidos desde el backend.
*/
async function pintarGraficoCanvas() {
  if (!canvasGrafico || !canvasGrafico.getContext) {
    return;
  }

  const publicaciones = filtrarPublicacionesPorRol(await cargarPublicacionesBackend());
  const totalOfertas = publicaciones.filter((publicacion) => publicacion.tipo === "oferta").length;
  const totalDemandas = publicaciones.filter((publicacion) => publicacion.tipo === "demanda").length;
  const totalPublicaciones = totalOfertas + totalDemandas;

  const porcentajeOfertas = calcularPorcentaje(totalOfertas, totalPublicaciones);
  const porcentajeDemandas = calcularPorcentaje(totalDemandas, totalPublicaciones);

  actualizarEstadoGrafico(totalOfertas, totalDemandas);

  const { ctx, ancho, alto } = prepararCanvasHD(canvasGrafico);

  ctx.clearRect(0, 0, ancho, alto);

  dibujarFondoPanel(ctx, ancho, alto);
  dibujarTituloPanel(ctx, ancho);

  if (totalPublicaciones === 0) {
    dibujarEstadoVacioGrafico(ctx, ancho, alto);
    return;
  }

  dibujarMedidorCentral(ctx, ancho, alto, totalOfertas, totalDemandas);

  const margenLateral = Math.max(32, ancho * 0.07);
  const separacion = 22;
  const tarjetaAlto = 132;
  const tarjetaY = alto - tarjetaAlto - 34;
  const tarjetaAncho = (ancho - (margenLateral * 2) - separacion) / 2;

  dibujarTarjetaResumen(ctx, margenLateral, tarjetaY, tarjetaAncho, tarjetaAlto, {
    titulo: "Ofertas",
    valor: totalOfertas,
    porcentaje: porcentajeOfertas,
    color1: "#72f0ff",
    color2: "#1799ff",
    colorTexto: "#c9f8ff",
    borde: "rgba(88, 231, 255, 0.25)"
  });

  dibujarTarjetaResumen(ctx, margenLateral + tarjetaAncho + separacion, tarjetaY, tarjetaAncho, tarjetaAlto, {
    titulo: "Demandas",
    valor: totalDemandas,
    porcentaje: porcentajeDemandas,
    color1: "#7dffd5",
    color2: "#23bd95",
    colorTexto: "#ccffed",
    borde: "rgba(79, 240, 190, 0.23)"
  });
}

/*
  DOMContentLoaded se dispara cuando el HTML ya está cargado.
*/
window.addEventListener("DOMContentLoaded", inicializarPaginaPublicaciones);