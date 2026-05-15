import {
  graphqlRequest,
  obtenerTokenAdminObligatorio,
  obtenerUsuarioAutenticado
} from "./api.js";
import {
  capitalizarTexto,
  configurarBotonCerrarSesion,
  confirmarAccion,
  mostrarAlerta,
  pintarUsuarioEnNavbar
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

async function cargarPublicacionesBackend() {
  const data = await graphqlRequest(LISTAR_PUBLICACIONES);
  return data.listarPublicaciones;
}

async function crearPublicacionBackend(datosPublicacion) {
  const token = obtenerTokenAdminObligatorio();

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
  completarDatosSugeridos();
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
  const usuarioActivo = obtenerUsuarioAutenticado();

  if (usuarioActivo) {
    autorPublicacion.value = `${usuarioActivo.nombre} ${usuarioActivo.apellidos}`;
    emailPublicacion.value = usuarioActivo.email;
  }
}

/*
  Recoge los datos del formulario para enviarlos al backend.
*/
function obtenerDatosFormulario() {
  return {
    tipo: tipoPublicacion.value,
    titulo: tituloPublicacion.value,
    categoria: categoriaPublicacion.value,
    autor: autorPublicacion.value,
    ubicacion: ubicacionPublicacion.value,
    fecha: fechaPublicacion.value,
    descripcion: descripcionPublicacion.value,
    emailContacto: emailPublicacion.value
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

  return publicacionesCache.filter((publicacion) => {
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
function actualizarContadorPublicaciones(totalVisibles, totalPublicaciones) {
  if (!contadorPublicaciones) {
    return;
  }

  if (totalPublicaciones === 0) {
    contadorPublicaciones.textContent = "No hay publicaciones registradas.";
    return;
  }

  if (totalVisibles === totalPublicaciones) {
    contadorPublicaciones.textContent = `Mostrando ${totalPublicaciones} publicaciones registradas.`;
    return;
  }

  contadorPublicaciones.textContent = `Mostrando ${totalVisibles} de ${totalPublicaciones} publicaciones registradas.`;
}

/*
  Pinta la tabla HTML usando la caché local y los filtros activos.
*/
function pintarTablaPublicaciones() {
  const publicacionesFiltradas = obtenerPublicacionesFiltradas();

  actualizarContadorPublicaciones(publicacionesFiltradas.length, publicacionesCache.length);

  if (publicacionesCache.length === 0) {
    tablaPublicacionesBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="8" class="text-center text-muted">No hay ofertas o demandas registradas.</td>
      </tr>
    `;
    return;
  }

  if (publicacionesFiltradas.length === 0) {
    tablaPublicacionesBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="8" class="text-center text-muted">
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

    fila.innerHTML = `
      <td>${escaparHTML(publicacion.id)}</td>
      <td><span class="badge ${badgeClase}">${escaparHTML(capitalizarTexto(publicacion.tipo))}</span></td>
      <td>${escaparHTML(publicacion.titulo)}</td>
      <td>${escaparHTML(publicacion.fecha)}</td>
      <td class="columna-email">${escaparHTML(publicacion.emailContacto)}</td>
      <td class="columna-descripcion">${escaparHTML(publicacion.descripcion)}</td>
      <td>${escaparHTML(publicacion.ubicacion)}</td>
      <td class="columna-accion">
        <button class="btn btn-sm btn-action-delete" data-id="${escaparHTML(publicacion.id)}">Eliminar</button>
      </td>
    `;

    const botonEliminar = fila.querySelector("button");

    botonEliminar.addEventListener("click", async () => {
      await gestionarBorradoPublicacion(publicacion.id, publicacion.titulo);
    });

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

    mostrarAlerta(
      mensajePublicacion,
      "Publicación guardada correctamente en el backend.",
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

  const publicaciones = await cargarPublicacionesBackend();
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