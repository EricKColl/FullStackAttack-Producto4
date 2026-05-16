import { borrarToken, borrarUsuarioAutenticado, obtenerUsuarioAutenticado } from "./api.js";

/*
  Tiempo por defecto que estará visible una alerta.
*/
const DURACION_ALERTA_POR_DEFECTO = 4000;

/*
  Roles funcionales de la aplicación.
*/
const ROL_ADMIN = "admin";
const ROL_EMPRESA = "empresa";
const ROL_CANDIDATO = "candidato";

/*
  Normaliza el rol para evitar errores por mayúsculas, espacios o valores nulos.
*/
function normalizarRol(rol) {
  return String(rol || "").trim().toLowerCase();
}

/*
  Devuelve el usuario activo guardado en localStorage o null si no existe.
*/
export function obtenerUsuarioActivo() {
  return obtenerUsuarioAutenticado();
}

/*
  Devuelve el rol del usuario activo.
*/
export function obtenerRolUsuarioActivo() {
  const usuarioActivo = obtenerUsuarioAutenticado();

  if (!usuarioActivo) {
    return null;
  }

  return normalizarRol(usuarioActivo.rol);
}

/*
  Comprueba si hay una sesión iniciada.
*/
export function haySesionActiva() {
  return Boolean(obtenerUsuarioAutenticado());
}

/*
  Comprueba si el usuario activo tiene un rol concreto.
*/
export function usuarioTieneRol(rolEsperado) {
  return obtenerRolUsuarioActivo() === normalizarRol(rolEsperado);
}

/*
  Helpers semánticos para adaptar pantallas según rol.
*/
export function usuarioEsAdmin() {
  return usuarioTieneRol(ROL_ADMIN);
}

export function usuarioEsEmpresa() {
  return usuarioTieneRol(ROL_EMPRESA);
}

export function usuarioEsCandidato() {
  return usuarioTieneRol(ROL_CANDIDATO);
}

/*
  Devuelve una etiqueta visual limpia para el rol.
*/
export function obtenerEtiquetaRol(rol) {
  const rolNormalizado = normalizarRol(rol);

  if (rolNormalizado === ROL_ADMIN) {
    return "Administrador";
  }

  if (rolNormalizado === ROL_EMPRESA) {
    return "Empresa";
  }

  if (rolNormalizado === ROL_CANDIDATO) {
    return "Candidato";
  }

  return "Usuario";
}

/*
  Devuelve un texto simple con el nombre del usuario activo.
  Si no hay usuario, devuelve cadena vacía para no mostrar "-no login-".
*/
export function obtenerTextoUsuarioActivo() {
  const usuarioActivo = obtenerUsuarioAutenticado();

  if (!usuarioActivo) {
    return "";
  }

  return `${usuarioActivo.nombre} ${usuarioActivo.apellidos}`;
}

/*
  Oculta un elemento de forma accesible.
*/
function ocultarElemento(elemento) {
  if (!elemento) {
    return;
  }

  elemento.classList.add("d-none");
  elemento.setAttribute("aria-hidden", "true");
  elemento.tabIndex = -1;
}

/*
  Muestra un elemento de forma accesible.
*/
function mostrarElemento(elemento) {
  if (!elemento) {
    return;
  }

  elemento.classList.remove("d-none");
  elemento.setAttribute("aria-hidden", "false");
  elemento.tabIndex = 0;
}

/*
  Oculta el botón de cerrar sesión sin eliminar el control del DOM.
*/
function ocultarBotonCerrarSesion(botonCerrarSesion) {
  if (!botonCerrarSesion) {
    return;
  }

  botonCerrarSesion.classList.remove("d-none");
  botonCerrarSesion.classList.add("session-button-hidden");
  botonCerrarSesion.setAttribute("aria-hidden", "true");
  botonCerrarSesion.tabIndex = -1;
}

/*
  Muestra el botón de cerrar sesión.
*/
function mostrarBotonCerrarSesion(botonCerrarSesion) {
  if (!botonCerrarSesion) {
    return;
  }

  botonCerrarSesion.classList.remove("d-none");
  botonCerrarSesion.classList.remove("session-button-hidden");
  botonCerrarSesion.setAttribute("aria-hidden", "false");
  botonCerrarSesion.tabIndex = 0;
}

/*
  Localiza todos los enlaces de navbar que apuntan a una página concreta.
*/
function obtenerLinksNavbarPorHref(nombreArchivo) {
  return Array.from(document.querySelectorAll(".navbar a.nav-link"))
    .filter((link) => {
      const href = link.getAttribute("href") || "";
      return href.endsWith(nombreArchivo);
    });
}

/*
  Cambia el texto visible de un enlace de navbar sin tocar su href.
*/
function cambiarTextoLinksNavbar(nombreArchivo, texto) {
  obtenerLinksNavbarPorHref(nombreArchivo).forEach((link) => {
    link.textContent = texto;
  });
}

/*
  Muestra u oculta enlaces de navbar según convenga.
*/
function configurarVisibilidadLinksNavbar(nombreArchivo, visible) {
  obtenerLinksNavbarPorHref(nombreArchivo).forEach((link) => {
    const item = link.closest(".nav-item") || link;

    if (visible) {
      mostrarElemento(item);
      return;
    }

    ocultarElemento(item);
  });
}

/*
  Aplica clases al body para permitir estilos por rol.
*/
function aplicarClaseRolEnBody(usuarioActivo) {
  if (!document.body) {
    return;
  }

  document.body.classList.remove(
    "role-admin",
    "role-empresa",
    "role-candidato",
    "role-sin-sesion"
  );

  if (!usuarioActivo) {
    document.body.classList.add("role-sin-sesion");
    return;
  }

  const rol = normalizarRol(usuarioActivo.rol);

  if (rol === ROL_ADMIN) {
    document.body.classList.add("role-admin");
    return;
  }

  if (rol === ROL_EMPRESA) {
    document.body.classList.add("role-empresa");
    return;
  }

  if (rol === ROL_CANDIDATO) {
    document.body.classList.add("role-candidato");
    return;
  }

  document.body.classList.add("role-sin-sesion");
}

/*
  Adapta la navbar según el rol activo.
*/
export function adaptarNavbarPorRol() {
  const usuarioActivo = obtenerUsuarioAutenticado();
  const rol = normalizarRol(usuarioActivo?.rol);

  aplicarClaseRolEnBody(usuarioActivo);

  /*
    Login se mantiene disponible para poder iniciar sesión o cambiar usuario.
    En el siguiente paso lo moveremos visualmente a la derecha desde los HTML.
  */
  cambiarTextoLinksNavbar("login.html", usuarioActivo ? "Cambiar usuario" : "Login");

  /*
    Usuarios es una pantalla administrativa.
    Solo debe verla el administrador.
  */
  configurarVisibilidadLinksNavbar("usuarios.html", rol === ROL_ADMIN);

  /*
    Textos de navegación adaptados al contexto del usuario.
  */
  if (rol === ROL_ADMIN) {
    cambiarTextoLinksNavbar("dashboard.html", "Dashboard admin");
    cambiarTextoLinksNavbar("ofertas-demandas.html", "Ofertas/Demandas");
    return;
  }

  if (rol === ROL_EMPRESA) {
    cambiarTextoLinksNavbar("dashboard.html", "Panel empresa");
    cambiarTextoLinksNavbar("ofertas-demandas.html", "Ofertas y candidaturas");
    return;
  }

  if (rol === ROL_CANDIDATO) {
    cambiarTextoLinksNavbar("dashboard.html", "Panel candidato");
    cambiarTextoLinksNavbar("ofertas-demandas.html", "Ofertas disponibles");
    return;
  }

  cambiarTextoLinksNavbar("dashboard.html", "Dashboard");
  cambiarTextoLinksNavbar("ofertas-demandas.html", "Ofertas/Demandas");
}

/*
  Pinta en la navbar el usuario activo.
*/
export function pintarUsuarioEnNavbar() {
  const elementoUsuario = document.getElementById("usuarioActivo")
    || document.getElementById("usuario-logueado-nav");

  const botonCerrarSesion = document.getElementById("btn-cerrar-sesion");
  const usuarioActivo = obtenerUsuarioAutenticado();

  adaptarNavbarPorRol();

  if (!elementoUsuario) {
    return;
  }

  if (!usuarioActivo) {
    elementoUsuario.textContent = "";
    elementoUsuario.title = "";
    elementoUsuario.classList.add("d-none");
    elementoUsuario.setAttribute("aria-hidden", "true");

    ocultarBotonCerrarSesion(botonCerrarSesion);
    return;
  }

  const nombreCompleto = `${usuarioActivo.nombre} ${usuarioActivo.apellidos}`;
  const etiquetaRol = obtenerEtiquetaRol(usuarioActivo.rol);
  const textoUsuario = `${nombreCompleto} · ${etiquetaRol}`;

  elementoUsuario.textContent = textoUsuario;
  elementoUsuario.title = textoUsuario;
  elementoUsuario.classList.remove("d-none");
  elementoUsuario.setAttribute("aria-hidden", "false");

  mostrarBotonCerrarSesion(botonCerrarSesion);
}

/*
  Configura el botón de cerrar sesión usando el modal visual propio.
*/
export function configurarBotonCerrarSesion() {
  const botonCerrarSesion = document.getElementById("btn-cerrar-sesion");

  if (!botonCerrarSesion) {
    return;
  }

  if (botonCerrarSesion.dataset.configurado === "true") {
    return;
  }

  botonCerrarSesion.dataset.configurado = "true";

  botonCerrarSesion.addEventListener("click", async () => {
    const confirmarCierre = await confirmarAccion({
      titulo: "Cerrar sesión",
      mensaje: "¿Seguro que quieres cerrar la sesión actual?",
      textoConfirmar: "Cerrar sesión",
      textoCancelar: "Cancelar",
      variante: "primary"
    });

    if (!confirmarCierre) {
      return;
    }

    borrarToken();
    borrarUsuarioAutenticado();
    window.location.href = "login.html";
  });
}

/*
  Comprueba si la pantalla requiere sesión.
*/
export function protegerPantallaConSesion() {
  if (haySesionActiva()) {
    return true;
  }

  window.location.href = "login.html";
  return false;
}

/*
  Comprueba si la pantalla requiere rol administrador.
*/
export function protegerPantallaAdmin() {
  if (usuarioEsAdmin()) {
    return true;
  }

  window.location.href = "dashboard.html";
  return false;
}

/*
  Crea un modal Bootstrap dinámico para confirmar acciones importantes.
*/
function crearModalConfirmacion() {
  const modal = document.createElement("div");

  modal.className = "modal fade";
  modal.tabIndex = -1;
  modal.setAttribute("aria-hidden", "true");

  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content seccion-listado border-0">
        <div class="modal-header border-0 pb-0">
          <h2 class="modal-title h4" data-confirm-title>Confirmar acción</h2>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>

        <div class="modal-body pt-3">
          <p class="text-muted mb-0" data-confirm-message>
            ¿Seguro que quieres continuar?
          </p>
        </div>

        <div class="modal-footer border-0 pt-0 d-flex justify-content-center gap-2">
          <button type="button" class="btn btn-outline-primary" data-confirm-cancel>
            Cancelar
          </button>
          <button type="button" class="btn btn-action-delete" data-confirm-accept>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  return modal;
}

/*
  Muestra un modal de confirmación profesional y devuelve true/false.
*/
export function confirmarAccion({
  titulo = "Confirmar acción",
  mensaje = "¿Seguro que quieres continuar?",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  variante = "danger"
} = {}) {
  return new Promise((resolve) => {
    const modalElemento = crearModalConfirmacion();

    const tituloElemento = modalElemento.querySelector("[data-confirm-title]");
    const mensajeElemento = modalElemento.querySelector("[data-confirm-message]");
    const botonCancelar = modalElemento.querySelector("[data-confirm-cancel]");
    const botonAceptar = modalElemento.querySelector("[data-confirm-accept]");

    tituloElemento.textContent = titulo;
    mensajeElemento.textContent = mensaje;
    botonCancelar.textContent = textoCancelar;
    botonAceptar.textContent = textoConfirmar;

    if (variante === "primary") {
      botonAceptar.className = "btn btn-primary";
    } else {
      botonAceptar.className = "btn btn-action-delete";
    }

    let resultadoConfirmacion = false;
    let resuelto = false;

    const resolverUnaVez = (resultado) => {
      if (resuelto) {
        return;
      }

      resuelto = true;
      resultadoConfirmacion = resultado;
    };

    botonCancelar.addEventListener("click", () => {
      resolverUnaVez(false);

      if (window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getInstance(modalElemento)?.hide();
      } else {
        modalElemento.remove();
        resolve(false);
      }
    });

    botonAceptar.addEventListener("click", () => {
      resolverUnaVez(true);

      if (window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getInstance(modalElemento)?.hide();
      } else {
        modalElemento.remove();
        resolve(true);
      }
    });

    modalElemento.addEventListener("hidden.bs.modal", () => {
      modalElemento.remove();
      resolve(resultadoConfirmacion);
    });

    if (window.bootstrap && window.bootstrap.Modal) {
      const modalBootstrap = new window.bootstrap.Modal(modalElemento, {
        backdrop: "static",
        keyboard: true
      });

      modalBootstrap.show();
      return;
    }

    const respuestaFallback = window.confirm(mensaje);
    modalElemento.remove();
    resolve(respuestaFallback);
  });
}

/*
  Muestra una alerta Bootstrap dentro de un elemento HTML.
*/
export function mostrarAlerta(
  elemento,
  texto,
  tipo = "secondary",
  duracion = DURACION_ALERTA_POR_DEFECTO
) {
  if (!elemento) {
    return;
  }

  if (elemento.__alertTimeoutId) {
    window.clearTimeout(elemento.__alertTimeoutId);
    elemento.__alertTimeoutId = null;
  }

  elemento.innerHTML = "";

  const alerta = document.createElement("div");
  alerta.className = `alert alert-${tipo}`;
  alerta.setAttribute("role", "alert");
  alerta.textContent = texto;

  elemento.appendChild(alerta);

  if (duracion > 0) {
    elemento.__alertTimeoutId = window.setTimeout(() => {
      limpiarAlerta(elemento);
    }, duracion);
  }
}

/*
  Limpia la alerta de un elemento.
*/
export function limpiarAlerta(elemento) {
  if (!elemento) {
    return;
  }

  if (elemento.__alertTimeoutId) {
    window.clearTimeout(elemento.__alertTimeoutId);
    elemento.__alertTimeoutId = null;
  }

  elemento.innerHTML = "";
}

/*
  Devuelve una clase CSS para el badge del rol.
*/
export function obtenerClaseBadgeRol(rol) {
  const rolNormalizado = normalizarRol(rol);

  if (rolNormalizado === ROL_ADMIN) {
    return "badge-rol-admin";
  }

  if (rolNormalizado === ROL_EMPRESA) {
    return "badge-rol-empresa";
  }

  return "badge-rol-candidato";
}

/*
  Pone en mayúscula la primera letra de un texto.
*/
export function capitalizarTexto(texto) {
  const textoNormal = String(texto || "");

  if (!textoNormal) {
    return "";
  }

  return textoNormal.charAt(0).toUpperCase() + textoNormal.slice(1);
}