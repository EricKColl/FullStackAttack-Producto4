import { borrarToken, borrarUsuarioAutenticado, obtenerUsuarioAutenticado } from "./api.js";

/*
  Tiempo por defecto que estará visible una alerta.
*/
const DURACION_ALERTA_POR_DEFECTO = 4000;

/*
  Devuelve un texto simple con el nombre del usuario activo.
*/
export function obtenerTextoUsuarioActivo() {
  const usuarioActivo = obtenerUsuarioAutenticado();

  if (!usuarioActivo) {
    return "-no login-";
  }

  return `${usuarioActivo.nombre} ${usuarioActivo.apellidos}`;
}

/*
  Oculta el botón de cerrar sesión sin eliminarlo del flujo visual.
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
  Muestra el botón de cerrar sesión manteniendo el espacio reservado.
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
  Pinta en la navbar el usuario activo.
*/
export function pintarUsuarioEnNavbar() {
  const elementoUsuario = document.getElementById("usuarioActivo")
    || document.getElementById("usuario-logueado-nav");

  const botonCerrarSesion = document.getElementById("btn-cerrar-sesion");

  if (!elementoUsuario) {
    return;
  }

  const usuarioActivo = obtenerUsuarioAutenticado();

  if (!usuarioActivo) {
    elementoUsuario.textContent = "Usuario activo: -no login-";
    elementoUsuario.title = "Usuario activo: -no login-";
    ocultarBotonCerrarSesion(botonCerrarSesion);
    return;
  }

  const textoUsuario = `Usuario activo: ${usuarioActivo.nombre} ${usuarioActivo.apellidos}`;

  elementoUsuario.textContent = textoUsuario;
  elementoUsuario.title = textoUsuario;

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
  if (rol === "admin") {
    return "badge-rol-admin";
  }

  if (rol === "empresa") {
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