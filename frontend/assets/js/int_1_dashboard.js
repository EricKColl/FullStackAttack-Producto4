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
  Clave usada en localStorage para recordar el filtro visual activo.

  En Producto 4, localStorage no se utiliza como persistencia principal
  de publicaciones. Solo se conserva aquí una preferencia de interfaz.
*/
const CLAVE_FILTRO_DASHBOARD = "jobconnect_dashboard_filtro";

/*
  Referencias a elementos del HTML que muestran el resumen superior.
*/
const totalOfertasElemento = document.getElementById("total-ofertas");
const totalDemandasElemento = document.getElementById("total-demandas");
const totalUsuariosElemento = document.getElementById("total-usuarios");
const totalSeleccionadasElemento = document.getElementById("total-seleccionadas");

/*
  Contenedores internos donde se pintan las tarjetas del dashboard.
*/
const contenedorDisponibles = document.getElementById("contenedor-publicaciones");
const contenedorSeleccionadas = document.getElementById("contenedor-seleccionadas");

/*
  closest(".drop-zone") busca el ancestro más cercano con clase .drop-zone.
  Esto permite que el drag and drop funcione sobre toda la zona visual.
*/
const zonaDisponibles = contenedorDisponibles.closest(".drop-zone");
const zonaSeleccionadas = contenedorSeleccionadas.closest(".drop-zone");

/*
  Elemento donde mostraremos mensajes de éxito o error.
*/
const mensajeDashboard = document.getElementById("mensaje-dashboard");

/*
  Botones de filtrado visual.
*/
const botonesFiltro = document.querySelectorAll("[data-filtro]");

/*
  Estado visual del dashboard.
*/
let filtroActual = "todas";
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
  }
}

/*
  Recupera desde localStorage el último filtro usado por el usuario.
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
  Guarda en localStorage el filtro actual del dashboard.
*/
function guardarFiltroActual() {
  localStorage.setItem(CLAVE_FILTRO_DASHBOARD, filtroActual);
}

/*
  Programa un repintado del dashboard con una pequeña espera.

  Esto evita repintados duplicados cuando el backend emite varios eventos
  seguidos, por ejemplo al crear o eliminar una publicación.
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
  Configura Socket.io para actualizar el dashboard sin recargar la página.

  El dashboard escucha varios eventos porque sus datos pueden cambiar cuando:
  - se crea o elimina una publicación;
  - se añade o quita una publicación seleccionada;
  - se actualizan los contadores generales.
*/
function configurarSocketDashboard() {
  if (typeof window.io !== "function") {
    return;
  }

  if (socketDashboard) {
    return;
  }

  socketDashboard = window.io("http://localhost:4000");

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
        await pintarTarjetas();
      } catch (error) {
        mostrarAlerta(mensajeDashboard, error.message, "danger");
      }
    });
  });
}

/*
  Cambia el estilo de los botones según cuál está activo.
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
  Configura el comportamiento drag and drop de las dos zonas.
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

  Esta función se reutiliza en dos acciones:
  - doble clic sobre una tarjeta seleccionada;
  - botón de cierre dentro de la tarjeta seleccionada.
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
  await pintarResumen();
  await pintarTarjetas();
}

/*
  Pide al backend el resumen del dashboard y coloca cada dato
  en su elemento HTML correspondiente.
*/
async function pintarResumen() {
  const resumen = await cargarResumenDashboard();

  totalOfertasElemento.textContent = resumen.totalOfertas;
  totalDemandasElemento.textContent = resumen.totalDemandas;
  totalUsuariosElemento.textContent = resumen.totalUsuarios;
  totalSeleccionadasElemento.textContent = resumen.totalSeleccionadas;
}

/*
  Pinta las tarjetas de publicaciones disponibles y seleccionadas.
*/
async function pintarTarjetas() {
  const publicacionesDisponibles = await cargarPublicacionesDisponibles();
  const publicacionesSeleccionadas = await cargarPublicacionesSeleccionadas();

  const disponiblesFiltradas = publicacionesDisponibles.filter((publicacion) => {
    if (filtroActual === "todas") {
      return true;
    }

    return publicacion.tipo === filtroActual;
  });

  renderizarTarjetas(
    contenedorDisponibles,
    disponiblesFiltradas,
    "No hay publicaciones disponibles en este bloque.",
    "disponibles"
  );

  renderizarTarjetas(
    contenedorSeleccionadas,
    publicacionesSeleccionadas,
    "Arrastra aquí las publicaciones que quieras guardar.",
    "seleccionadas"
  );
}

/*
  Crea visualmente las tarjetas HTML dentro del contenedor indicado.
*/
function renderizarTarjetas(contenedor, publicaciones, textoVacio, origen) {
  if (publicaciones.length === 0) {
    contenedor.innerHTML = `
      <div class="col-12">
        <div class="alert alert-secondary mb-0">${textoVacio}</div>
      </div>
    `;
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
      <article class="card card-publicacion h-100 tarjeta-arrastrable" draggable="true" data-id="${publicacion.id}">
        <div class="card-body position-relative">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2 flex-wrap tarjeta-cabecera-publicacion">
            <div class="d-flex align-items-start gap-2 flex-wrap pe-4">
              <span class="badge ${badgeClase}">${capitalizarTexto(publicacion.tipo)}</span>
              <small class="text-muted">${publicacion.fecha}</small>
            </div>
            ${botonQuitarSeleccion}
          </div>
          <h3 class="h5">${publicacion.titulo}</h3>
          <p class="mb-2"><strong>Categoría:</strong> ${publicacion.categoria}</p>
          <p class="mb-2"><strong>Autor:</strong> ${publicacion.autor}</p>
          <p class="mb-2"><strong>Ubicación:</strong> ${publicacion.ubicacion}</p>
          <p class="mb-2"><strong>Contacto:</strong> ${publicacion.emailContacto}</p>
          <p class="mb-0 text-muted">${publicacion.descripcion}</p>
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
  Cuando el DOM ya está cargado, arrancamos toda la lógica del dashboard.
*/
window.addEventListener("DOMContentLoaded", inicializarDashboard);