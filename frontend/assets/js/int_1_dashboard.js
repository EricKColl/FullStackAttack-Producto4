import {
  graphqlRequest,
  obtenerTokenSesionObligatorio
} from "./api.js";
import {
  capitalizarTexto,
  configurarBotonCerrarSesion,
  mostrarAlerta,
  obtenerEtiquetaRol,
  obtenerRolUsuarioActivo,
  obtenerUsuarioActivo,
  pintarUsuarioEnNavbar,
  protegerPantallaConSesion,
  usuarioEsAdmin,
  usuarioEsCandidato,
  usuarioEsEmpresa
} from "./ui.js";

const RESUMEN_DASHBOARD = `
  query ResumenDashboard {
    resumenDashboard {
      totalOfertas
      totalDemandas
      totalUsuarios
      totalSeleccionadas
    }
  }
`;

const LISTAR_PUBLICACIONES_DISPONIBLES = `
  query ListarPublicacionesDisponibles {
    listarPublicacionesDisponibles {
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

const LISTAR_PUBLICACIONES_SELECCIONADAS = `
  query ListarPublicacionesSeleccionadas {
    listarPublicacionesSeleccionadas {
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

const ANADIR_SELECCIONADA = `
  mutation AnadirSeleccionada($idPublicacion: ID!) {
    anadirSeleccionada(idPublicacion: $idPublicacion) {
      id
      titulo
    }
  }
`;

const QUITAR_SELECCIONADA = `
  mutation QuitarSeleccionada($idPublicacion: ID!) {
    quitarSeleccionada(idPublicacion: $idPublicacion) {
      id
      titulo
    }
  }
`;

/*
  Clave base usada para recordar el filtro del dashboard.
  Se completa con el rol para evitar que un filtro de admin afecte
  después a empresa o candidato.
*/
const CLAVE_FILTRO_DASHBOARD_BASE = "jobconnect_dashboard_filtro";

/*
  Elementos de resumen.
*/
const totalOfertasElemento = document.getElementById("total-ofertas");
const totalDemandasElemento = document.getElementById("total-demandas");
const totalUsuariosElemento = document.getElementById("total-usuarios");
const totalSeleccionadasElemento = document.getElementById("total-seleccionadas");

/*
  Contenedores principales.
*/
const contenedorDisponibles = document.getElementById("contenedor-publicaciones");
const contenedorSeleccionadas = document.getElementById("contenedor-seleccionadas");

const zonaDisponibles = contenedorDisponibles.closest(".drop-zone");
const zonaSeleccionadas = contenedorSeleccionadas.closest(".drop-zone");

/*
  Elementos auxiliares.
*/
const mensajeDashboard = document.getElementById("mensaje-dashboard");
const estadoDashboard = document.getElementById("estado-dashboard");
const contadorDisponibles = document.getElementById("contador-disponibles");
const contadorSeleccionadas = document.getElementById("contador-seleccionadas");
const botonesFiltro = document.querySelectorAll("[data-filtro]");

/*
  Estado local.
*/
let filtroActual = "todas";
let publicacionesDisponiblesCache = [];
let publicacionesSeleccionadasCache = [];
let socketDashboard = null;
let refrescoDashboardTimeoutId = null;

async function cargarResumenDashboard() {
  const data = await graphqlRequest(RESUMEN_DASHBOARD);
  return data.resumenDashboard;
}

async function cargarPublicacionesDisponibles() {
  const data = await graphqlRequest(LISTAR_PUBLICACIONES_DISPONIBLES);
  return data.listarPublicacionesDisponibles;
}

async function cargarPublicacionesSeleccionadas() {
  const data = await graphqlRequest(LISTAR_PUBLICACIONES_SELECCIONADAS);
  return data.listarPublicacionesSeleccionadas;
}

async function anadirSeleccionadaBackend(idPublicacion) {
  const token = obtenerTokenSesionObligatorio();

  const data = await graphqlRequest(
    ANADIR_SELECCIONADA,
    { idPublicacion: String(idPublicacion) },
    token
  );

  return data.anadirSeleccionada;
}

async function quitarSeleccionadaBackend(idPublicacion) {
  const token = obtenerTokenSesionObligatorio();

  const data = await graphqlRequest(
    QUITAR_SELECCIONADA,
    { idPublicacion: String(idPublicacion) },
    token
  );

  return data.quitarSeleccionada;
}

/*
  Función principal de arranque del dashboard.
*/
async function inicializarDashboard() {
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();

  if (!protegerPantallaConSesion()) {
    return;
  }

  adaptarDashboardAlRol();
  recuperarFiltroGuardado();
  normalizarFiltroActualPorRol();
  actualizarEstadoVisualFiltros();
  configurarFiltros();
  configurarZonasDrop();
  configurarSocketDashboard();

  try {
    await repintarDashboard();
  } catch (error) {
    mostrarAlerta(mensajeDashboard, error.message, "danger", 0);
    actualizarEstadoDashboard("No se pudo cargar la información del dashboard.");
  }
}

/*
  Devuelve la clave de filtro separada por rol.
*/
function obtenerClaveFiltroDashboard() {
  const rol = obtenerRolUsuarioActivo() || "sin-sesion";
  return `${CLAVE_FILTRO_DASHBOARD_BASE}_${rol}`;
}

/*
  Recupera el filtro guardado.
*/
function recuperarFiltroGuardado() {
  const filtroGuardado = localStorage.getItem(obtenerClaveFiltroDashboard());

  if (
    filtroGuardado === "todas"
    || filtroGuardado === "oferta"
    || filtroGuardado === "demanda"
  ) {
    filtroActual = filtroGuardado;
  }
}

/*
  Guarda el filtro actual.
*/
function guardarFiltroActual() {
  localStorage.setItem(obtenerClaveFiltroDashboard(), filtroActual);
}

/*
  Devuelve el filtro principal según el rol.
*/
function obtenerFiltroPrincipalPorRol() {
  if (usuarioEsEmpresa()) {
    return "demanda";
  }

  if (usuarioEsCandidato()) {
    return "oferta";
  }

  return "todas";
}

/*
  Comprueba si un filtro es válido para el rol actual.
*/
function filtroPermitidoParaRol(filtro) {
  if (usuarioEsAdmin()) {
    return filtro === "todas" || filtro === "oferta" || filtro === "demanda";
  }

  if (usuarioEsEmpresa()) {
    return filtro === "demanda";
  }

  if (usuarioEsCandidato()) {
    return filtro === "oferta";
  }

  return false;
}

/*
  Corrige el filtro si no corresponde al rol activo.
*/
function normalizarFiltroActualPorRol() {
  if (!filtroPermitidoParaRol(filtroActual)) {
    filtroActual = obtenerFiltroPrincipalPorRol();
    guardarFiltroActual();
  }
}

/*
  Devuelve si una publicación debe ser visible para el rol activo.
*/
function publicacionVisibleParaRol(publicacion) {
  if (usuarioEsAdmin()) {
    return true;
  }

  if (usuarioEsEmpresa()) {
    return publicacion.tipo === "demanda";
  }

  if (usuarioEsCandidato()) {
    return publicacion.tipo === "oferta";
  }

  return false;
}

/*
  Filtra publicaciones según el rol activo.
*/
function filtrarPublicacionesPorRol(publicaciones) {
  return publicaciones.filter(publicacionVisibleParaRol);
}

/*
  Crea o actualiza un panel superior explicando el contexto del rol.
*/
function adaptarDashboardAlRol() {
  const usuario = obtenerUsuarioActivo();

  if (!usuario) {
    return;
  }

  actualizarTextosPrincipalesPorRol(usuario);
  actualizarTarjetasResumenPorRol();
  insertarPanelContextoRol(usuario);
}

/*
  Cambia los textos principales del dashboard.
*/
function actualizarTextosPrincipalesPorRol(usuario) {
  const tituloPagina = document.querySelector(".page-heading");
  const subtituloPagina = document.querySelector(".page-subtitle");
  const tituloControl = document.querySelector(".section-card .section-title");
  const subtituloControl = document.querySelector(".section-card .section-subtitle");

  if (usuarioEsAdmin()) {
    if (tituloPagina) {
      tituloPagina.textContent = "Dashboard administrativo";
    }

    if (subtituloPagina) {
      subtituloPagina.textContent =
        "Supervisa el estado global de JobConnect, revisa usuarios, publicaciones, selección activa y sincronización en tiempo real.";
    }

    if (tituloControl) {
      tituloControl.textContent = "Control global de publicaciones";
    }

    if (subtituloControl) {
      subtituloControl.textContent =
        "Filtra ofertas y demandas, revisa la actividad general y organiza publicaciones seleccionadas desde una visión completa de administrador.";
    }

    actualizarTitulosColumnas(
      "Publicaciones disponibles",
      "Ofertas y demandas todavía disponibles en el sistema.",
      "Selección global",
      "Publicaciones marcadas para seguimiento o revisión operativa."
    );

    return;
  }

  if (usuarioEsEmpresa()) {
    if (tituloPagina) {
      tituloPagina.textContent = "Panel de empresa";
    }

    if (subtituloPagina) {
      subtituloPagina.textContent =
        "Consulta demandas de candidatos, detecta perfiles disponibles y organiza las oportunidades que pueden interesar a tu empresa.";
    }

    if (tituloControl) {
      tituloControl.textContent = "Demandas de candidatos";
    }

    if (subtituloControl) {
      subtituloControl.textContent =
        "Como empresa, el dashboard se centra en demandas publicadas por candidatos para facilitar procesos de búsqueda y contacto.";
    }

    actualizarTitulosColumnas(
      "Demandas disponibles",
      "Candidatos y perfiles disponibles que todavía no forman parte de tu selección.",
      "Demandas seleccionadas",
      "Demandas guardadas para seguimiento, contacto o comparación."
    );

    return;
  }

  if (usuarioEsCandidato()) {
    if (tituloPagina) {
      tituloPagina.textContent = "Panel de candidato";
    }

    if (subtituloPagina) {
      subtituloPagina.textContent =
        "Consulta ofertas disponibles, guarda oportunidades relevantes y mantén tu selección profesional organizada.";
    }

    if (tituloControl) {
      tituloControl.textContent = "Ofertas disponibles";
    }

    if (subtituloControl) {
      subtituloControl.textContent =
        "Como candidato, el dashboard se centra en ofertas publicadas por empresas para que puedas revisar y seleccionar oportunidades.";
    }

    actualizarTitulosColumnas(
      "Ofertas disponibles",
      "Ofertas activas que todavía no forman parte de tu selección.",
      "Ofertas seleccionadas",
      "Ofertas guardadas para seguimiento, revisión o comparación."
    );
  }
}

/*
  Actualiza los textos de las dos columnas del dashboard.
*/
function actualizarTitulosColumnas(
  tituloDisponibles,
  subtituloDisponibles,
  tituloSeleccionadas,
  subtituloSeleccionadas
) {
  const bloques = document.querySelectorAll(".drop-zone .section-heading-block");

  const bloqueDisponibles = bloques[0];
  const bloqueSeleccionadas = bloques[1];

  if (bloqueDisponibles) {
    const titulo = bloqueDisponibles.querySelector(".section-title");
    const subtitulo = bloqueDisponibles.querySelector(".section-subtitle");

    if (titulo) {
      titulo.textContent = tituloDisponibles;
    }

    if (subtitulo) {
      subtitulo.textContent = subtituloDisponibles;
    }
  }

  if (bloqueSeleccionadas) {
    const titulo = bloqueSeleccionadas.querySelector(".section-title");
    const subtitulo = bloqueSeleccionadas.querySelector(".section-subtitle");

    if (titulo) {
      titulo.textContent = tituloSeleccionadas;
    }

    if (subtitulo) {
      subtitulo.textContent = subtituloSeleccionadas;
    }
  }
}

/*
  Ajusta las tarjetas KPI según el rol.
*/
function actualizarTarjetasResumenPorRol() {
  const tarjetaUsuarios = totalUsuariosElemento?.closest(".col-12");

  if (usuarioEsAdmin()) {
    mostrarTarjeta(tarjetaUsuarios);
    actualizarTituloTarjeta(totalOfertasElemento, "Ofertas registradas");
    actualizarTituloTarjeta(totalDemandasElemento, "Demandas registradas");
    actualizarTituloTarjeta(totalUsuariosElemento, "Usuarios registrados");
    actualizarTituloTarjeta(totalSeleccionadasElemento, "Selección activa");
    return;
  }

  ocultarTarjeta(tarjetaUsuarios);

  if (usuarioEsEmpresa()) {
    actualizarTituloTarjeta(totalOfertasElemento, "Ofertas del sistema");
    actualizarTituloTarjeta(totalDemandasElemento, "Demandas de candidatos");
    actualizarTituloTarjeta(totalSeleccionadasElemento, "Demandas seleccionadas");
    return;
  }

  if (usuarioEsCandidato()) {
    actualizarTituloTarjeta(totalOfertasElemento, "Ofertas de empresas");
    actualizarTituloTarjeta(totalDemandasElemento, "Demandas del sistema");
    actualizarTituloTarjeta(totalSeleccionadasElemento, "Ofertas seleccionadas");
  }
}

function actualizarTituloTarjeta(elementoNumero, texto) {
  const tarjeta = elementoNumero?.closest(".card-body");
  const titulo = tarjeta?.querySelector("h2");

  if (titulo) {
    titulo.textContent = texto;
  }
}

function ocultarTarjeta(tarjeta) {
  if (!tarjeta) {
    return;
  }

  tarjeta.classList.add("d-none");
  tarjeta.setAttribute("aria-hidden", "true");
}

function mostrarTarjeta(tarjeta) {
  if (!tarjeta) {
    return;
  }

  tarjeta.classList.remove("d-none");
  tarjeta.setAttribute("aria-hidden", "false");
}

/*
  Inserta un panel contextual para que la pantalla tenga sentido según el usuario.
*/
function insertarPanelContextoRol(usuario) {
  const intro = document.querySelector(".page-intro");

  if (!intro) {
    return;
  }

  let panel = document.getElementById("panel-contexto-rol-dashboard");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "panel-contexto-rol-dashboard";
    panel.className = "role-context-panel";
    intro.insertAdjacentElement("afterend", panel);
  }

  const etiquetaRol = obtenerEtiquetaRol(usuario.rol);
  const nombre = `${usuario.nombre} ${usuario.apellidos}`;

  let titulo = "Vista personalizada";
  let descripcion = "La información se adapta al rol activo de la sesión.";

  if (usuarioEsAdmin()) {
    titulo = "Vista de administración global";
    descripcion =
      "Tienes acceso completo a la actividad general de JobConnect: usuarios, ofertas, demandas, selección activa y datos sincronizados en tiempo real.";
  } else if (usuarioEsEmpresa()) {
    titulo = "Vista operativa para empresa";
    descripcion =
      "El panel prioriza demandas de candidatos y perfiles disponibles. La gestión de usuarios queda reservada al administrador.";
  } else if (usuarioEsCandidato()) {
    titulo = "Vista profesional para candidato";
    descripcion =
      "El panel prioriza ofertas disponibles publicadas por empresas. La gestión global queda oculta para mantener una experiencia adecuada a tu rol.";
  }

  panel.innerHTML = `
    <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
      <div>
        <span class="role-chip mb-3">${escaparHTML(etiquetaRol)}</span>
        <h2 class="h4">${escaparHTML(titulo)}</h2>
        <p>${escaparHTML(descripcion)}</p>
      </div>
      <div class="text-end">
        <p class="mb-1 text-muted">Sesión activa</p>
        <strong>${escaparHTML(nombre)}</strong>
      </div>
    </div>
  `;
}

/*
  Actualiza el texto de estado general.
*/
function actualizarEstadoDashboard(texto) {
  if (!estadoDashboard) {
    return;
  }

  estadoDashboard.textContent = texto;
}

/*
  Programa un repintado evitando llamadas duplicadas por eventos Socket.io seguidos.
*/
function programarRepintadoDashboard() {
  if (refrescoDashboardTimeoutId) {
    window.clearTimeout(refrescoDashboardTimeoutId);
  }

  refrescoDashboardTimeoutId = window.setTimeout(async () => {
    try {
      await repintarDashboard();
    } catch (error) {
      mostrarAlerta(mensajeDashboard, error.message, "danger");
    }
  }, 120);
}

/*
  Configura Socket.io para actualizar el dashboard en tiempo real.
*/
function configurarSocketDashboard() {
  if (typeof window.io !== "function") {
    actualizarEstadoDashboard("Socket.io no está disponible. El dashboard funcionará con actualización manual.");
    return;
  }

  if (socketDashboard) {
    return;
  }

  socketDashboard = window.io("http://localhost:4000");

  socketDashboard.on("connect", () => {
    actualizarEstadoDashboard("Dashboard conectado en tiempo real.");
  });

  socketDashboard.on("disconnect", () => {
    actualizarEstadoDashboard("Conexión en tiempo real interrumpida. Revisa el backend.");
  });

  socketDashboard.on("dashboard:actualizado", programarRepintadoDashboard);
  socketDashboard.on("publicaciones:actualizadas", programarRepintadoDashboard);
  socketDashboard.on("seleccionadas:actualizadas", programarRepintadoDashboard);
}

/*
  Configura los botones de filtro.
*/
function configurarFiltros() {
  botonesFiltro.forEach((boton) => {
    boton.addEventListener("click", async () => {
      const filtroSolicitado = boton.dataset.filtro;

      if (!filtroPermitidoParaRol(filtroSolicitado)) {
        return;
      }

      filtroActual = filtroSolicitado;
      guardarFiltroActual();
      actualizarEstadoVisualFiltros();

      try {
        pintarTarjetas();
      } catch (error) {
        mostrarAlerta(mensajeDashboard, error.message, "danger");
      }
    });
  });
}

/*
  Cambia el estilo de los botones según el filtro activo.
*/
function actualizarEstadoVisualFiltros() {
  botonesFiltro.forEach((boton) => {
    const filtroBoton = boton.dataset.filtro;

    if (!filtroPermitidoParaRol(filtroBoton)) {
      boton.classList.add("d-none");
      boton.setAttribute("aria-hidden", "true");
      boton.tabIndex = -1;
      return;
    }

    boton.classList.remove("d-none");
    boton.setAttribute("aria-hidden", "false");
    boton.tabIndex = 0;

    if (filtroBoton === filtroActual) {
      boton.classList.remove("btn-outline-primary");
      boton.classList.add("btn-primary");
    } else {
      boton.classList.remove("btn-primary");
      boton.classList.add("btn-outline-primary");
    }
  });
}

/*
  Configura drag and drop en ambas columnas.
*/
function configurarZonasDrop() {
  [zonaDisponibles, zonaSeleccionadas].forEach((zona) => {
    zona.addEventListener("dragover", (evento) => {
      evento.preventDefault();
      zona.classList.add("drop-zone-activa");
    });

    zona.addEventListener("dragleave", (evento) => {
      if (!zona.contains(evento.relatedTarget)) {
        zona.classList.remove("drop-zone-activa");
      }
    });
  });

  zonaDisponibles.addEventListener("drop", async (evento) => {
    evento.preventDefault();
    zonaDisponibles.classList.remove("drop-zone-activa");

    const id = evento.dataTransfer.getData("text/plain");

    if (!id) {
      return;
    }

    try {
      await quitarSeleccionadaBackend(id);
      await repintarDashboard();
      mostrarAlerta(mensajeDashboard, "Publicación devuelta al listado general.", "success");
    } catch (error) {
      mostrarAlerta(mensajeDashboard, error.message, "danger");
    }
  });

  zonaSeleccionadas.addEventListener("drop", async (evento) => {
    evento.preventDefault();
    zonaSeleccionadas.classList.remove("drop-zone-activa");

    const id = evento.dataTransfer.getData("text/plain");

    if (!id) {
      return;
    }

    try {
      await anadirSeleccionadaBackend(id);
      await repintarDashboard();
      mostrarAlerta(mensajeDashboard, "Publicación añadida a la selección del usuario.", "success");
    } catch (error) {
      mostrarAlerta(mensajeDashboard, error.message, "danger");
    }
  });
}

/*
  Normaliza valores para mostrarlos de forma segura.
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
  Mueve una publicación al bloque de seleccionadas usando doble clic.
*/
async function moverASeleccionadas(idPublicacion) {
  try {
    await anadirSeleccionadaBackend(idPublicacion);
    await repintarDashboard();
    mostrarAlerta(mensajeDashboard, "Publicación añadida a la selección del usuario.", "success");
  } catch (error) {
    mostrarAlerta(mensajeDashboard, error.message, "danger");
  }
}

/*
  Devuelve una publicación al bloque de disponibles.
*/
async function moverADisponibles(idPublicacion) {
  try {
    await quitarSeleccionadaBackend(idPublicacion);
    await repintarDashboard();
    mostrarAlerta(mensajeDashboard, "Publicación devuelta al listado general.", "success");
  } catch (error) {
    mostrarAlerta(mensajeDashboard, error.message, "danger");
  }
}

/*
  Repinta todo el dashboard.
*/
async function repintarDashboard() {
  const [resumen, disponibles, seleccionadas] = await Promise.all([
    cargarResumenDashboard(),
    cargarPublicacionesDisponibles(),
    cargarPublicacionesSeleccionadas()
  ]);

  publicacionesDisponiblesCache = filtrarPublicacionesPorRol(disponibles);
  publicacionesSeleccionadasCache = filtrarPublicacionesPorRol(seleccionadas);

  pintarResumen(resumen);
  pintarTarjetas();

  if (usuarioEsAdmin()) {
    actualizarEstadoDashboard("Datos globales sincronizados con el backend y actualizados en tiempo real.");
  } else if (usuarioEsEmpresa()) {
    actualizarEstadoDashboard("Demandas de candidatos sincronizadas con el backend en tiempo real.");
  } else if (usuarioEsCandidato()) {
    actualizarEstadoDashboard("Ofertas disponibles sincronizadas con el backend en tiempo real.");
  }
}

/*
  Pinta los KPIs superiores.
*/
function pintarResumen(resumen) {
  totalOfertasElemento.textContent = resumen.totalOfertas;
  totalDemandasElemento.textContent = resumen.totalDemandas;

  if (usuarioEsAdmin()) {
    totalUsuariosElemento.textContent = resumen.totalUsuarios;
    totalSeleccionadasElemento.textContent = resumen.totalSeleccionadas;
    return;
  }

  totalSeleccionadasElemento.textContent = publicacionesSeleccionadasCache.length;
}

/*
  Devuelve las publicaciones disponibles según el filtro activo.
*/
function obtenerDisponiblesFiltradas() {
  return publicacionesDisponiblesCache.filter((publicacion) => {
    if (filtroActual === "todas") {
      return true;
    }

    return publicacion.tipo === filtroActual;
  });
}

/*
  Actualiza los contadores internos de cada columna.
*/
function actualizarContadoresColumnas(disponiblesFiltradas, seleccionadas) {
  if (contadorDisponibles) {
    let textoFiltro = "disponibles";

    if (usuarioEsEmpresa()) {
      textoFiltro = "demandas visibles";
    } else if (usuarioEsCandidato()) {
      textoFiltro = "ofertas visibles";
    } else if (filtroActual !== "todas") {
      textoFiltro = `${filtroActual === "oferta" ? "ofertas" : "demandas"} visibles`;
    }

    contadorDisponibles.textContent = `${disponiblesFiltradas.length} ${textoFiltro}`;
  }

  if (contadorSeleccionadas) {
    let texto = "seleccionadas";

    if (usuarioEsEmpresa()) {
      texto = "demandas seleccionadas";
    } else if (usuarioEsCandidato()) {
      texto = "ofertas seleccionadas";
    }

    contadorSeleccionadas.textContent = `${seleccionadas.length} ${texto}`;
  }
}

/*
  Pinta las tarjetas de ambas zonas.
*/
function pintarTarjetas() {
  const disponiblesFiltradas = obtenerDisponiblesFiltradas();

  actualizarContadoresColumnas(disponiblesFiltradas, publicacionesSeleccionadasCache);

  renderizarTarjetas(
    contenedorDisponibles,
    disponiblesFiltradas,
    obtenerTextoVacioDisponibles(),
    "disponibles"
  );

  renderizarTarjetas(
    contenedorSeleccionadas,
    publicacionesSeleccionadasCache,
    obtenerTextoVacioSeleccionadas(),
    "seleccionadas"
  );
}

/*
  Texto de estado vacío según el filtro activo.
*/
function obtenerTextoVacioDisponibles() {
  if (usuarioEsEmpresa()) {
    return "No hay demandas de candidatos disponibles en este momento.";
  }

  if (usuarioEsCandidato()) {
    return "No hay ofertas disponibles en este momento.";
  }

  if (filtroActual === "oferta") {
    return "No hay ofertas disponibles con el filtro actual.";
  }

  if (filtroActual === "demanda") {
    return "No hay demandas disponibles con el filtro actual.";
  }

  return "No hay publicaciones disponibles en este momento.";
}

/*
  Texto vacío de la zona de seleccionadas.
*/
function obtenerTextoVacioSeleccionadas() {
  if (usuarioEsEmpresa()) {
    return "Todavía no hay demandas seleccionadas. Arrastra aquí una demanda o usa doble clic sobre una tarjeta disponible.";
  }

  if (usuarioEsCandidato()) {
    return "Todavía no hay ofertas seleccionadas. Arrastra aquí una oferta o usa doble clic sobre una tarjeta disponible.";
  }

  return "Todavía no hay publicaciones seleccionadas. Arrastra aquí una tarjeta o usa doble clic sobre una publicación disponible.";
}

/*
  Renderiza un estado vacío más integrado que una alerta simple.
*/
function renderizarEstadoVacio(contenedor, texto) {
  contenedor.innerHTML = `
    <div class="col-12">
      <div class="section-glass p-4 text-center">
        <h3 class="h5 mb-2">Sin resultados</h3>
        <p class="text-muted mb-0">${escaparHTML(texto)}</p>
      </div>
    </div>
  `;
}

/*
  Crea visualmente las tarjetas HTML dentro del contenedor indicado.
*/
function renderizarTarjetas(contenedor, publicaciones, textoVacio, origen) {
  if (publicaciones.length === 0) {
    renderizarEstadoVacio(contenedor, textoVacio);
    return;
  }

  contenedor.innerHTML = "";

  publicaciones.forEach((publicacion) => {
    const columna = document.createElement("div");
    columna.className = "col-12";

    const badgeClase = publicacion.tipo === "oferta" ? "badge-oferta" : "badge-demanda";

    const botonQuitarSeleccion = origen === "seleccionadas"
      ? `
        <button
          type="button"
          class="btn-close btn-quitar-seleccion"
          aria-label="Devolver publicación al listado general"
          title="Devolver al listado general"
        ></button>
      `
      : "";

    columna.innerHTML = `
      <article class="card card-publicacion h-100 tarjeta-arrastrable" draggable="true" data-id="${escaparHTML(publicacion.id)}">
        <div class="card-body position-relative">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2 flex-wrap tarjeta-cabecera-publicacion">
            <div class="d-flex align-items-center gap-2 flex-wrap pe-4">
              <span class="badge ${badgeClase}">${escaparHTML(capitalizarTexto(publicacion.tipo))}</span>
              <small class="text-muted">${escaparHTML(publicacion.fecha)}</small>
            </div>
            ${botonQuitarSeleccion}
          </div>

          <h3 class="h5">${escaparHTML(publicacion.titulo)}</h3>

          <div class="row g-2 mb-2">
            <div class="col-12 col-md-6">
              <p class="mb-1"><strong>Categoría:</strong> ${escaparHTML(publicacion.categoria)}</p>
            </div>
            <div class="col-12 col-md-6">
              <p class="mb-1"><strong>Ubicación:</strong> ${escaparHTML(publicacion.ubicacion)}</p>
            </div>
            <div class="col-12">
              <p class="mb-1"><strong>Autor:</strong> ${escaparHTML(publicacion.autor)}</p>
            </div>
            <div class="col-12">
              <p class="mb-1"><strong>Contacto:</strong> ${escaparHTML(publicacion.emailContacto)}</p>
            </div>
          </div>

          <p class="mb-0 text-muted">${escaparHTML(publicacion.descripcion)}</p>
        </div>
      </article>
    `;

    const tarjeta = columna.querySelector(".tarjeta-arrastrable");
    const botonCerrar = columna.querySelector(".btn-quitar-seleccion");

    tarjeta.addEventListener("dragstart", (evento) => {
      evento.dataTransfer.setData("text/plain", String(publicacion.id));
      tarjeta.classList.add("tarjeta-dragging");
    });

    tarjeta.addEventListener("dragend", () => {
      tarjeta.classList.remove("tarjeta-dragging");
    });

    tarjeta.addEventListener("dblclick", async () => {
      if (origen === "disponibles") {
        await moverASeleccionadas(publicacion.id);
      } else {
        await moverADisponibles(publicacion.id);
      }
    });

    if (botonCerrar) {
      botonCerrar.addEventListener("dblclick", (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
      });

      botonCerrar.addEventListener("click", async (evento) => {
        evento.preventDefault();
        evento.stopPropagation();
        await moverADisponibles(publicacion.id);
      });
    }

    contenedor.appendChild(columna);
  });
}

/*
  Cuando el DOM ya está cargado,
  arrancamos toda la lógica del dashboard.
*/
window.addEventListener("DOMContentLoaded", inicializarDashboard);