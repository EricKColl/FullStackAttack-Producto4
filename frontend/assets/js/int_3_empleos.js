import {
  crearPublicacion,
  eliminarPublicacion,
  inicializarAlmacenamiento,
  listarPublicaciones,
  obtenerUsuarioActivo
} from "./almacenaje.js";
import { capitalizarTexto, configurarBotonCerrarSesion, mostrarAlerta, pintarUsuarioEnNavbar } from "./ui.js";

/*
  Aquí guardamos referencias a elementos del HTML.
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

/*
  Temporizador para evitar redibujar demasiadas veces seguidas el gráfico
  cuando cambia el tamaño de la ventana.
*/
let resizeTimeoutId = null;

/*
  Esta función se ejecuta al cargar la página.
*/
async function inicializarPaginaPublicaciones() {
  await inicializarAlmacenamiento();
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();
  completarDatosSugeridos();
  await pintarTablaPublicaciones();
  await pintarGraficoCanvas();

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
  Esta función rellena automáticamente algunos campos del formulario.
*/
function completarDatosSugeridos() {
  fechaPublicacion.value = new Date().toISOString().split("T")[0];
  const usuarioActivo = obtenerUsuarioActivo();

  if (usuarioActivo) {
    autorPublicacion.value = `${usuarioActivo.nombre} ${usuarioActivo.apellidos}`;
    emailPublicacion.value = usuarioActivo.email;
  }
}

/*
  Esta función recoge todos los datos escritos en el formulario.
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
  Esta función pinta la tabla HTML con todas las publicaciones.
*/
async function pintarTablaPublicaciones() {
  const publicaciones = await listarPublicaciones();

  if (publicaciones.length === 0) {
    tablaPublicacionesBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="8" class="text-center text-muted">No hay ofertas o demandas registradas.</td>
      </tr>
    `;
    return;
  }

  tablaPublicacionesBody.innerHTML = "";

  publicaciones.forEach((publicacion) => {
    const fila = document.createElement("tr");
    const badgeClase = publicacion.tipo === "oferta" ? "badge-oferta" : "badge-demanda";

    fila.innerHTML = `
      <td>${publicacion.id}</td>
      <td><span class="badge ${badgeClase}">${capitalizarTexto(publicacion.tipo)}</span></td>
      <td>${publicacion.titulo}</td>
      <td>${publicacion.fecha}</td>
      <td class="columna-email">${publicacion.emailContacto}</td>
      <td class="columna-descripcion">${publicacion.descripcion}</td>
      <td>${publicacion.ubicacion}</td>
      <td class="columna-accion">
        <button class="btn btn-sm btn-action-delete" data-id="${publicacion.id}">Eliminar</button>
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
  Esta función se ejecuta cuando se envía el formulario.
*/
async function gestionarAltaPublicacion(evento) {
  evento.preventDefault();

  try {
    await crearPublicacion(obtenerDatosFormulario());
    await pintarTablaPublicaciones();
    await pintarGraficoCanvas();
    formPublicacion.reset();
    completarDatosSugeridos();

    mostrarAlerta(
      mensajePublicacion,
      "Publicación guardada correctamente en IndexedDB.",
      "success"
    );
  } catch (error) {
    mostrarAlerta(mensajePublicacion, error.message, "danger");
  }
}

/*
  Esta función elimina una publicación por su id.
*/
async function gestionarBorradoPublicacion(idPublicacion, tituloPublicacion) {
  const confirmarBorrado = window.confirm(
    `¿Seguro que quieres eliminar la publicación "${tituloPublicacion}"?`
  );

  if (!confirmarBorrado) {
    mostrarAlerta(mensajePublicacion, "Eliminación cancelada por el usuario.", "secondary");
    return;
  }

  try {
    await eliminarPublicacion(idPublicacion);
    await pintarTablaPublicaciones();
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
  Ajusta el tamaño interno del canvas para que se vea nítido
  en cualquier resolución o densidad de píxeles.
*/
function prepararCanvasHD(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const anchoVisual = canvas.clientWidth || canvas.width || 760;
  const altoVisual = canvas.clientHeight || canvas.height || 420;

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

/*
  Actualiza el chip superior del gráfico con un resumen rápido.
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
  Esta función dibuja un gráfico más completo, mejor distribuido
  y visualmente más equilibrado.
*/
async function pintarGraficoCanvas() {
  if (!canvasGrafico || !canvasGrafico.getContext) {
    return;
  }

  const publicaciones = await listarPublicaciones();
  const totalOfertas = publicaciones.filter((publicacion) => publicacion.tipo === "oferta").length;
  const totalDemandas = publicaciones.filter((publicacion) => publicacion.tipo === "demanda").length;
  const totalPublicaciones = totalOfertas + totalDemandas;

  actualizarEstadoGrafico(totalOfertas, totalDemandas);

  const { ctx, ancho, alto } = prepararCanvasHD(canvasGrafico);
  const maximo = Math.max(totalOfertas, totalDemandas, 1);

  ctx.clearRect(0, 0, ancho, alto);

  const fondo = ctx.createLinearGradient(0, 0, 0, alto);
  fondo.addColorStop(0, "#0d1931");
  fondo.addColorStop(1, "#07111f");
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, ancho, alto);

  ctx.strokeStyle = "rgba(108, 209, 255, 0.18)";
  ctx.lineWidth = 1;
  dibujarRectanguloRedondeado(ctx, 16, 16, ancho - 32, alto - 32, 18);
  ctx.stroke();

  const areaGrafico = {
    izquierda: 76,
    derecha: ancho - 56,
    arriba: 50,
    abajo: alto - 82
  };

  const anchoArea = areaGrafico.derecha - areaGrafico.izquierda;
  const altoArea = areaGrafico.abajo - areaGrafico.arriba;
  const anchoBarra = Math.min(160, Math.max(110, Math.floor(anchoArea * 0.22)));
  const separacionBarras = Math.max(48, Math.floor(anchoArea * 0.12));
  const anchoConjunto = (anchoBarra * 2) + separacionBarras;
  const inicioConjunto = areaGrafico.izquierda + ((anchoArea - anchoConjunto) / 2);

  const datos = [
    {
      etiqueta: "Ofertas",
      valor: totalOfertas,
      colorSuperior: "#58e7ff",
      colorInferior: "#2498ff",
      brillo: "rgba(88, 231, 255, 0.34)",
      x: inicioConjunto
    },
    {
      etiqueta: "Demandas",
      valor: totalDemandas,
      colorSuperior: "#63ffc6",
      colorInferior: "#26c79e",
      brillo: "rgba(99, 255, 198, 0.30)",
      x: inicioConjunto + anchoBarra + separacionBarras
    }
  ];

  const pasos = 4;

  for (let i = 0; i <= pasos; i += 1) {
    const valor = Math.round((maximo / pasos) * i);
    const y = areaGrafico.abajo - ((altoArea / pasos) * i);

    ctx.strokeStyle = i === 0 ? "rgba(108, 209, 255, 0.28)" : "rgba(108, 209, 255, 0.12)";
    ctx.lineWidth = i === 0 ? 1.6 : 1;
    ctx.beginPath();
    ctx.moveTo(areaGrafico.izquierda, y);
    ctx.lineTo(areaGrafico.derecha, y);
    ctx.stroke();

    ctx.fillStyle = "#87a4ca";
    ctx.font = "500 12px Inter";
    ctx.textAlign = "right";
    ctx.fillText(String(valor), areaGrafico.izquierda - 12, y + 4);
  }

  datos.forEach((dato) => {
    const alturaBarra = (dato.valor / maximo) * (altoArea - 18);
    const yBarra = areaGrafico.abajo - alturaBarra;

    const gradienteBarra = ctx.createLinearGradient(dato.x, yBarra, dato.x, areaGrafico.abajo);
    gradienteBarra.addColorStop(0, dato.colorSuperior);
    gradienteBarra.addColorStop(1, dato.colorInferior);

    ctx.save();
    ctx.shadowColor = dato.brillo;
    ctx.shadowBlur = 24;
    ctx.fillStyle = gradienteBarra;
    dibujarRectanguloRedondeado(ctx, dato.x, yBarra, anchoBarra, alturaBarra, 18);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(255, 255, 255, 0.11)";
    dibujarRectanguloRedondeado(
      ctx,
      dato.x + 8,
      yBarra + 8,
      anchoBarra - 16,
      Math.max(14, alturaBarra * 0.16),
      14
    );
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#f7fbff";
    ctx.font = "700 18px Inter";
    ctx.fillText(String(dato.valor), dato.x + (anchoBarra / 2), yBarra - 12);

    ctx.fillStyle = "#d8ebff";
    ctx.font = "600 14px Inter";
    ctx.fillText(dato.etiqueta, dato.x + (anchoBarra / 2), areaGrafico.abajo + 30);

    const porcentaje = totalPublicaciones === 0 ? 0 : Math.round((dato.valor / totalPublicaciones) * 100);
    ctx.fillStyle = "#8ea6c8";
    ctx.font = "500 12px Inter";
    ctx.fillText(`${porcentaje}% del total`, dato.x + (anchoBarra / 2), areaGrafico.abajo + 50);
  });

  if (totalPublicaciones === 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(232, 243, 255, 0.82)";
    ctx.font = "600 16px Inter";
    ctx.fillText("Añade publicaciones para generar la comparativa visual.", ancho / 2, alto / 2 + 10);
  }
}

/*
  DOMContentLoaded se dispara cuando el HTML ya está cargado.
*/
window.addEventListener("DOMContentLoaded", inicializarPaginaPublicaciones);