import {
  graphqlRequest,
  obtenerTokenAdminObligatorio
} from "./api.js";
import { capitalizarTexto, configurarBotonCerrarSesion, mostrarAlerta, pintarUsuarioEnNavbar } from "./ui.js";

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
  Clave usada para recordar el filtro del dashboard.
*/
const CLAVE_FILTRO_DASHBOARD = "jobconnect_dashboard_filtro";

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
  const token = obtenerTokenAdminObligatorio();

  const data = await graphqlRequest(
    ANADIR_SELECCIONADA,
    { idPublicacion: String(idPublicacion) },
    token
  );

  return data.anadirSeleccionada;
}

async function quitarSeleccionadaBackend(idPublicacion) {
  const token = obtenerTokenAdminObligatorio();

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
  recuperarFiltroGuardado();
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
  Recupera el filtro guardado.
*/
function recuperarFiltroGuardado() {
  const filtroGuardado = localStorage.getItem(CLAVE_FILTRO_DASHBOARD);

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
  localStorage.setItem(CLAVE_FILTRO_DASHBOARD, filtroActual);
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
      filtroActual = boton.dataset.filtro;
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
    if (boton.dataset.filtro === filtroActual) {
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

  publicacionesDisponiblesCache = disponibles;
  publicacionesSeleccionadasCache = seleccionadas;

  pintarResumen(resumen);
  pintarTarjetas();
  actualizarEstadoDashboard("Datos sincronizados con el backend y actualizados en tiempo real.");
}

/*
  Pinta los KPIs superiores.
*/
function pintarResumen(resumen) {
  totalOfertasElemento.textContent = resumen.totalOfertas;
  totalDemandasElemento.textContent = resumen.totalDemandas;
  totalUsuariosElemento.textContent = resumen.totalUsuarios;
  totalSeleccionadasElemento.textContent = resumen.totalSeleccionadas;
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
    const textoFiltro = filtroActual === "todas"
      ? "disponibles"
      : `${filtroActual === "oferta" ? "ofertas" : "demandas"} visibles`;

    contadorDisponibles.textContent = `${disponiblesFiltradas.length} ${textoFiltro}`;
  }

  if (contadorSeleccionadas) {
    contadorSeleccionadas.textContent = `${seleccionadas.length} seleccionadas`;
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
    "Todavía no hay publicaciones seleccionadas. Arrastra aquí una tarjeta o usa doble clic sobre una publicación disponible.",
    "seleccionadas"
  );
}

/*
  Texto de estado vacío según el filtro activo.
*/
function obtenerTextoVacioDisponibles() {
  if (filtroActual === "oferta") {
    return "No hay ofertas disponibles con el filtro actual.";
  }

  if (filtroActual === "demanda") {
    return "No hay demandas disponibles con el filtro actual.";
  }

  return "No hay publicaciones disponibles en este momento.";
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