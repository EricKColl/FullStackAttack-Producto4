import {
  anadirPublicacionSeleccionada,
  inicializarAlmacenamiento,
  listarPublicacionesDisponibles,
  listarPublicacionesSeleccionadas,
  obtenerResumenDashboard,
  quitarPublicacionSeleccionada
} from "./almacenaje.js";
import { capitalizarTexto, configurarBotonCerrarSesion, mostrarAlerta, pintarUsuarioEnNavbar } from "./ui.js";

/*
  Clave usada en localStorage para recordar qué filtro del dashboard
  estaba activo la última vez.
*/
const CLAVE_FILTRO_DASHBOARD = "jobconnect_dashboard_filtro";

/*
  Referencias a elementos del HTML que vamos a usar en el dashboard.

  Estos cuatro muestran los números del resumen superior:
  - total de ofertas
  - total de demandas
  - total de usuarios
  - total de seleccionadas
*/
const totalOfertasElemento = document.getElementById("total-ofertas");
const totalDemandasElemento = document.getElementById("total-demandas");
const totalUsuariosElemento = document.getElementById("total-usuarios");
const totalSeleccionadasElemento = document.getElementById("total-seleccionadas");

/*
  Estos son los contenedores internos donde pintamos las tarjetas:
  - publicaciones disponibles
  - publicaciones seleccionadas
*/
const contenedorDisponibles = document.getElementById("contenedor-publicaciones");
const contenedorSeleccionadas = document.getElementById("contenedor-seleccionadas");

/*
  closest(".drop-zone") busca el ancestro más cercano que tenga la clase .drop-zone.

  Esto es importante porque el drag and drop se apoya en la zona visual completa,
  no solo en el contenedor interno de tarjetas.
*/
const zonaDisponibles = contenedorDisponibles.closest(".drop-zone");
const zonaSeleccionadas = contenedorSeleccionadas.closest(".drop-zone");

/*
  Elemento donde mostraremos mensajes de éxito o error.
*/
const mensajeDashboard = document.getElementById("mensaje-dashboard");

/*
  Lista de botones de filtro.
*/
const botonesFiltro = document.querySelectorAll("[data-filtro]");

/*
  Guarda qué filtro está activo en este momento.
*/
let filtroActual = "todas";

/*
  Función principal de arranque del dashboard.
*/
async function inicializarDashboard() {
  await inicializarAlmacenamiento();
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();
  recuperarFiltroGuardado();
  actualizarEstadoVisualFiltros();
  configurarFiltros();
  configurarZonasDrop();
  await repintarDashboard();
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
  Configura los botones de filtro.
*/
function configurarFiltros() {
  botonesFiltro.forEach((boton) => {
    boton.addEventListener("click", async () => {
      filtroActual = boton.dataset.filtro;
      guardarFiltroActual();
      actualizarEstadoVisualFiltros();
      await pintarTarjetas();
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
      await quitarPublicacionSeleccionada(id);
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
      await anadirPublicacionSeleccionada(id);
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
    await anadirPublicacionSeleccionada(idPublicacion);
    await repintarDashboard();
    mostrarAlerta(mensajeDashboard, "Publicación añadida a la selección del usuario.", "success");
  } catch (error) {
    mostrarAlerta(mensajeDashboard, error.message, "danger");
  }
}

/*
  Devuelve una publicación al bloque de disponibles.

  Esta función se reutiliza en dos acciones distintas:
  - doble clic sobre una tarjeta seleccionada
  - botón con X dentro de la propia tarjeta seleccionada
*/
async function moverADisponibles(idPublicacion) {
  try {
    await quitarPublicacionSeleccionada(idPublicacion);
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
  Pide el resumen al módulo de almacenamiento
  y coloca cada dato en su elemento HTML correspondiente.
*/
async function pintarResumen() {
  const resumen = await obtenerResumenDashboard();

  totalOfertasElemento.textContent = resumen.totalOfertas;
  totalDemandasElemento.textContent = resumen.totalDemandas;
  totalUsuariosElemento.textContent = resumen.totalUsuarios;
  totalSeleccionadasElemento.textContent = resumen.totalSeleccionadas;
}

/*
  Pinta las tarjetas de ambas zonas.
*/
async function pintarTarjetas() {
  const publicacionesDisponibles = await listarPublicacionesDisponibles();
  const publicacionesSeleccionadas = await listarPublicacionesSeleccionadas();

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
  Cuando el DOM ya está cargado,
  arrancamos toda la lógica del dashboard.
*/
window.addEventListener("DOMContentLoaded", inicializarDashboard);