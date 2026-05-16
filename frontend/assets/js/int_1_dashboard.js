import {
  obtenerBackendBaseUrl,
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

const CLAVE_FILTRO_DASHBOARD_BASE = "jobconnect_dashboard_filtro";

/*
  KPIs
*/
const totalOfertasElemento = document.getElementById("total-ofertas");
const totalDemandasElemento = document.getElementById("total-demandas");
const totalUsuariosElemento = document.getElementById("total-usuarios");
const totalSeleccionadasElemento = document.getElementById("total-seleccionadas");

/*
  Contenedores principales
*/
const contenedorDisponibles = document.getElementById("contenedor-publicaciones");
const contenedorSeleccionadas = document.getElementById("contenedor-seleccionadas");

const zonaDisponibles = contenedorDisponibles.closest(".drop-zone");
const zonaSeleccionadas = contenedorSeleccionadas.closest(".drop-zone");

/*
  Elementos auxiliares
*/
const mensajeDashboard = document.getElementById("mensaje-dashboard");
const estadoDashboard = document.getElementById("estado-dashboard");
const contadorDisponibles = document.getElementById("contador-disponibles");
const contadorSeleccionadas = document.getElementById("contador-seleccionadas");
const botonesFiltro = document.querySelectorAll("[data-filtro]");

/*
  Estado local
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
    actualizarEstadoDashboard("No se pudo cargar la información del panel.");
  }
}

function obtenerClaveFiltroDashboard() {
  const rol = obtenerRolUsuarioActivo() || "sin-sesion";
  return `${CLAVE_FILTRO_DASHBOARD_BASE}_${rol}`;
}

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

function guardarFiltroActual() {
  localStorage.setItem(obtenerClaveFiltroDashboard(), filtroActual);
}

function obtenerFiltroPrincipalPorRol() {
  if (usuarioEsEmpresa()) {
    return "demanda";
  }

  if (usuarioEsCandidato()) {
    return "oferta";
  }

  return "todas";
}

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

function normalizarFiltroActualPorRol() {
  if (!filtroPermitidoParaRol(filtroActual)) {
    filtroActual = obtenerFiltroPrincipalPorRol();
    guardarFiltroActual();
  }
}

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

function filtrarPublicacionesPorRol(publicaciones) {
  return publicaciones.filter(publicacionVisibleParaRol);
}

function adaptarDashboardAlRol() {
  const usuario = obtenerUsuarioActivo();

  if (!usuario) {
    return;
  }

  prepararLayoutDashboardPorRol();
  actualizarTextosPrincipalesPorRol(usuario);
  actualizarTarjetasResumenPorRol();
  configurarPanelSuperiorPorRol(usuario);
}

/*
  Prepara la estructura visual del dashboard según el rol.

  - Admin mantiene el panel de control intermedio.
  - Empresa y candidato eliminan el panel intermedio porque solo tienen
    un tipo de publicación visible y no necesitan ese bloque extra.
  - Las tarjetas KPI se centran y se reparten mejor cuando solo quedan 3.
*/
function prepararLayoutDashboardPorRol() {
  const filaKpis = totalOfertasElemento?.closest("section.row");

  if (filaKpis) {
    filaKpis.classList.add("dashboard-kpi-row");
  }

  const tarjetasKpi = [
    totalOfertasElemento,
    totalDemandasElemento,
    totalUsuariosElemento,
    totalSeleccionadasElemento
  ];

  tarjetasKpi.forEach((elemento) => {
    const columna = elemento?.closest(".col-12");

    if (columna) {
      columna.classList.add("dashboard-kpi-col");
    }
  });

  const panelControl = document.querySelector("main > section.section-card");

  if (!panelControl) {
    return;
  }

  if (usuarioEsAdmin()) {
    panelControl.classList.remove("d-none");
    panelControl.setAttribute("aria-hidden", "false");
    return;
  }

  panelControl.classList.add("d-none");
  panelControl.setAttribute("aria-hidden", "true");
}

function actualizarTextosPrincipalesPorRol(usuario) {
  const tituloPagina = document.querySelector(".page-heading");
  const subtituloPagina = document.querySelector(".page-subtitle");
  const tituloControl = document.querySelector(".section-card .section-title");
  const subtituloControl = document.querySelector(".section-card .section-subtitle");

  if (usuarioEsAdmin()) {
    if (tituloPagina) {
      tituloPagina.textContent = "Centro de control de JobConnect";
    }

    if (subtituloPagina) {
      subtituloPagina.textContent =
        "Supervisa la actividad general de la plataforma, controla publicaciones, usuarios y selección activa en tiempo real.";
    }

    if (tituloControl) {
      tituloControl.textContent = "Publicaciones y selección activa";
    }

    if (subtituloControl) {
      subtituloControl.textContent =
        "Consulta ofertas y demandas, aplica filtros y organiza la selección global desde una vista completa de administración.";
    }

    actualizarTitulosColumnas(
      "Publicaciones disponibles",
      "Ofertas y demandas todavía disponibles en el sistema.",
      "Selección global",
      "Publicaciones marcadas para seguimiento, control o revisión."
    );

    return;
  }

  if (usuarioEsEmpresa()) {
    if (tituloPagina) {
      tituloPagina.textContent = `Bienvenido, ${usuario.nombre}`;
    }

    if (subtituloPagina) {
      subtituloPagina.textContent =
        "Consulta demandas de candidatos, identifica talento disponible y organiza tu selección profesional de forma ágil.";
    }

    if (tituloControl) {
      tituloControl.textContent = "";
    }

    if (subtituloControl) {
      subtituloControl.textContent = "";
    }

    actualizarTitulosColumnas(
      "Demandas disponibles",
      "Perfiles y demandas publicadas por candidatos que aún no has seleccionado.",
      "Demandas seleccionadas",
      "Demandas guardadas para seguimiento, comparación o contacto."
    );

    return;
  }

  if (usuarioEsCandidato()) {
    if (tituloPagina) {
      tituloPagina.textContent = "Oportunidades para tu perfil";
    }

    if (subtituloPagina) {
      subtituloPagina.textContent =
        "Consulta ofertas disponibles, guarda oportunidades relevantes y mantén tu selección profesional organizada.";
    }

    if (tituloControl) {
      tituloControl.textContent = "";
    }

    if (subtituloControl) {
      subtituloControl.textContent = "";
    }

    actualizarTitulosColumnas(
      "Ofertas disponibles",
      "Ofertas activas publicadas por empresas que todavía no forman parte de tu selección.",
      "Ofertas seleccionadas",
      "Oportunidades guardadas para seguimiento, revisión o comparación."
    );
  }
}

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

function configurarPanelSuperiorPorRol(usuario) {
  if (usuarioEsCandidato()) {
    insertarPanelBienvenidaCandidato(usuario);
    return;
  }

  eliminarPanelSuperiorDashboard();
}

function insertarPanelBienvenidaCandidato(usuario) {
  eliminarPanelSuperiorDashboard();

  const intro = document.querySelector(".page-intro");
  const tituloPagina = document.querySelector(".page-heading");

  if (!intro || !tituloPagina) {
    return;
  }

  let bienvenida = document.getElementById("bienvenida-candidato-dashboard");

  if (!bienvenida) {
    bienvenida = document.createElement("div");
    bienvenida.id = "bienvenida-candidato-dashboard";
    bienvenida.className = "dashboard-welcome-line";
    tituloPagina.insertAdjacentElement("beforebegin", bienvenida);
  }

  bienvenida.innerHTML = `
    <span class="dashboard-welcome-eyebrow">Área personal</span>
    <strong>Bienvenido, ${escaparHTML(usuario.nombre)}</strong>
  `;
}

function eliminarPanelSuperiorDashboard() {
  const panel = document.getElementById("panel-contexto-rol-dashboard");

  if (panel) {
    panel.remove();
  }

  const bienvenida = document.getElementById("bienvenida-candidato-dashboard");

  if (bienvenida) {
    bienvenida.remove();
  }
}

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
    actualizarTituloTarjeta(totalOfertasElemento, "Demandas disponibles");
    actualizarTituloTarjeta(totalDemandasElemento, "Candidatos activos");
    actualizarTituloTarjeta(totalSeleccionadasElemento, "Demandas seleccionadas");
    return;
  }

  if (usuarioEsCandidato()) {
    actualizarTituloTarjeta(totalOfertasElemento, "Ofertas de empresas");
    actualizarTituloTarjeta(totalDemandasElemento, "Empresas activas");
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

function actualizarEstadoDashboard(texto) {
  if (!estadoDashboard) {
    return;
  }

  estadoDashboard.textContent = texto;
}

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

function configurarSocketDashboard() {
  if (typeof window.io !== "function") {
    actualizarEstadoDashboard("Socket.io no está disponible. El panel funcionará con actualización manual.");
    return;
  }

  if (socketDashboard) {
    return;
  }

  socketDashboard = window.io(obtenerBackendBaseUrl());

  socketDashboard.on("connect", () => {
    actualizarEstadoDashboard("Panel conectado en tiempo real.");
  });

  socketDashboard.on("disconnect", () => {
    actualizarEstadoDashboard("Conexión en tiempo real interrumpida. Revisa el backend.");
  });

  socketDashboard.on("dashboard:actualizado", programarRepintadoDashboard);
  socketDashboard.on("publicaciones:actualizadas", programarRepintadoDashboard);
  socketDashboard.on("seleccionadas:actualizadas", programarRepintadoDashboard);
}

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
      mostrarAlerta(mensajeDashboard, "Publicación devuelta al listado principal.", "success");
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
      mostrarAlerta(mensajeDashboard, "Publicación añadida a la selección.", "success");
    } catch (error) {
      mostrarAlerta(mensajeDashboard, error.message, "danger");
    }
  });
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function moverASeleccionadas(idPublicacion) {
  return anadirSeleccionadaBackend(idPublicacion);
}

function moverADisponibles(idPublicacion) {
  return quitarSeleccionadaBackend(idPublicacion);
}

function contarEntidadesUnicas(publicaciones) {
  const valores = publicaciones.map((publicacion) => {
    return String(publicacion.emailContacto || publicacion.autor || "").trim().toLowerCase();
  }).filter(Boolean);

  return new Set(valores).size;
}

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

function pintarResumen(resumen) {
  if (usuarioEsAdmin()) {
    totalOfertasElemento.textContent = resumen.totalOfertas;
    totalDemandasElemento.textContent = resumen.totalDemandas;
    totalUsuariosElemento.textContent = resumen.totalUsuarios;
    totalSeleccionadasElemento.textContent = resumen.totalSeleccionadas;
    return;
  }

  const totalVisibles = publicacionesDisponiblesCache.length;
  const totalUnicos = contarEntidadesUnicas(publicacionesDisponiblesCache);
  const totalSeleccionadas = publicacionesSeleccionadasCache.length;

  totalOfertasElemento.textContent = totalVisibles;
  totalDemandasElemento.textContent = totalUnicos;
  totalSeleccionadasElemento.textContent = totalSeleccionadas;
}

function obtenerDisponiblesFiltradas() {
  return publicacionesDisponiblesCache.filter((publicacion) => {
    if (filtroActual === "todas") {
      return true;
    }

    return publicacion.tipo === filtroActual;
  });
}

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

function obtenerTextoVacioSeleccionadas() {
  if (usuarioEsEmpresa()) {
    return "Todavía no hay demandas seleccionadas. Arrastra aquí una demanda o usa doble clic sobre una tarjeta disponible.";
  }

  if (usuarioEsCandidato()) {
    return "Todavía no hay ofertas seleccionadas. Arrastra aquí una oferta o usa doble clic sobre una tarjeta disponible.";
  }

  return "Todavía no hay publicaciones seleccionadas. Arrastra aquí una tarjeta o usa doble clic sobre una publicación disponible.";
}

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
      try {
        if (origen === "disponibles") {
          await moverASeleccionadas(publicacion.id);
          mostrarAlerta(mensajeDashboard, "Publicación añadida a la selección.", "success");
        } else {
          await moverADisponibles(publicacion.id);
          mostrarAlerta(mensajeDashboard, "Publicación devuelta al listado principal.", "success");
        }

        await repintarDashboard();
      } catch (error) {
        mostrarAlerta(mensajeDashboard, error.message, "danger");
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

        try {
          await moverADisponibles(publicacion.id);
          await repintarDashboard();
          mostrarAlerta(mensajeDashboard, "Publicación devuelta al listado principal.", "success");
        } catch (error) {
          mostrarAlerta(mensajeDashboard, error.message, "danger");
        }
      });
    }

    contenedor.appendChild(columna);
  });
}

window.addEventListener("DOMContentLoaded", inicializarDashboard);