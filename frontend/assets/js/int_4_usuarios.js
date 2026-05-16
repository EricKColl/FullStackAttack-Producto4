import {
  borrarToken,
  borrarUsuarioAutenticado,
  graphqlRequest,
  obtenerTokenAdminObligatorio,
  obtenerUsuarioAutenticado
} from "./api.js";
import {
  capitalizarTexto,
  configurarBotonCerrarSesion,
  confirmarAccion,
  mostrarAlerta,
  obtenerClaseBadgeRol,
  obtenerEtiquetaRol,
  pintarUsuarioEnNavbar,
  protegerPantallaAdmin,
  protegerPantallaConSesion
} from "./ui.js";

const LISTAR_USUARIOS = `
  query ListarUsuarios {
    listarUsuarios {
      id
      nombre
      apellidos
      email
      rol
    }
  }
`;

const CREAR_USUARIO = `
  mutation CrearUsuario($datos: CrearUsuarioInput!) {
    crearUsuario(datos: $datos) {
      id
      nombre
      apellidos
      email
      rol
    }
  }
`;

const ELIMINAR_USUARIO = `
  mutation EliminarUsuario($email: String!) {
    eliminarUsuario(email: $email) {
      id
      nombre
      apellidos
      email
      rol
    }
  }
`;

/*
  Referencias a elementos principales de la pantalla.
*/
const formUsuario = document.getElementById("form-usuario");
const nombreUsuario = document.getElementById("nombre-usuario");
const apellidosUsuario = document.getElementById("apellidos-usuario");
const emailUsuario = document.getElementById("email-usuario");
const passwordUsuario = document.getElementById("password-usuario");
const rolUsuario = document.getElementById("rol-usuario");
const tablaUsuariosBody = document.getElementById("tabla-usuarios-body");
const mensajeUsuario = document.getElementById("mensaje-usuario");

const buscadorUsuarios = document.getElementById("buscador-usuarios");
const filtroRolUsuarios = document.getElementById("filtro-rol-usuarios");
const botonLimpiarFiltrosUsuarios = document.getElementById("btn-limpiar-filtros-usuarios");
const contadorUsuarios = document.getElementById("contador-usuarios");

/*
  Caché local de usuarios descargados desde GraphQL.
*/
let usuariosCache = [];

/*
  Carga usuarios desde backend.
  Ahora requiere token admin porque listarUsuarios está protegido en servidor.
*/
async function cargarUsuariosBackend() {
  const token = obtenerTokenAdminObligatorio();
  const data = await graphqlRequest(LISTAR_USUARIOS, {}, token);

  return data.listarUsuarios;
}

/*
  Crea usuarios.
  Acción exclusiva de administrador.
*/
async function crearUsuarioBackend(datosUsuario) {
  const token = obtenerTokenAdminObligatorio();

  const data = await graphqlRequest(
    CREAR_USUARIO,
    { datos: datosUsuario },
    token
  );

  return data.crearUsuario;
}

/*
  Elimina usuarios.
  Acción exclusiva de administrador.
*/
async function eliminarUsuarioBackend(email) {
  const token = obtenerTokenAdminObligatorio();

  const data = await graphqlRequest(
    ELIMINAR_USUARIO,
    { email },
    token
  );

  return data.eliminarUsuario;
}

/*
  Función principal de arranque de la página de usuarios.
*/
async function inicializarPaginaUsuarios() {
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();

  if (!protegerPantallaConSesion()) {
    return;
  }

  if (!protegerPantallaAdmin()) {
    return;
  }

  adaptarPaginaUsuariosAdmin();
  configurarFiltrosUsuarios();

  try {
    await refrescarUsuariosDesdeBackend();
  } catch (error) {
    mostrarAlerta(mensajeUsuario, error.message, "danger", 0);
  }

  formUsuario.addEventListener("submit", gestionarAltaUsuario);
}

/*
  Inserta un panel contextual para dejar claro que esta pantalla es administrativa.
*/
function adaptarPaginaUsuariosAdmin() {
  const usuarioActivo = obtenerUsuarioAutenticado();

  if (!usuarioActivo) {
    return;
  }

  insertarPanelContextoAdmin(usuarioActivo);
  reforzarFormularioAdmin();
}

/*
  Panel superior de contexto administrativo.
*/
function insertarPanelContextoAdmin(usuarioActivo) {
  const intro = document.querySelector(".page-intro");

  if (!intro) {
    return;
  }

  let panel = document.getElementById("panel-contexto-admin-usuarios");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "panel-contexto-admin-usuarios";
    panel.className = "role-context-panel";
    intro.insertAdjacentElement("afterend", panel);
  }

  const nombre = `${usuarioActivo.nombre} ${usuarioActivo.apellidos}`;
  const etiquetaRol = obtenerEtiquetaRol(usuarioActivo.rol);

  panel.innerHTML = `
    <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
      <div>
        <span class="role-chip mb-3">${escaparHTML(etiquetaRol)}</span>
        <h2 class="h4">Panel exclusivo de administración</h2>
        <p>
          Esta pantalla permite consultar, filtrar, crear y eliminar usuarios registrados.
          Por seguridad, solo está disponible para sesiones con rol administrador.
        </p>
      </div>
      <div class="text-end">
        <p class="mb-1 text-muted">Sesión activa</p>
        <strong>${escaparHTML(nombre)}</strong>
      </div>
    </div>
  `;
}

/*
  Refuerza el formulario para que el admin cree usuarios normales.
*/
function reforzarFormularioAdmin() {
  if (!rolUsuario) {
    return;
  }

  /*
    En esta entrega mantenemos el alta desde interfaz para usuarios funcionales:
    candidato y empresa. El admin ya existe como cuenta de gestión.
  */
  Array.from(rolUsuario.options).forEach((opcion) => {
    if (opcion.value === "admin") {
      opcion.remove();
    }
  });
}

/*
  Descarga usuarios del backend, actualiza la caché y repinta la tabla.
*/
async function refrescarUsuariosDesdeBackend() {
  usuariosCache = await cargarUsuariosBackend();
  pintarTablaUsuarios();
}

/*
  Configura buscador, filtro por rol y botón de limpiar filtros.
*/
function configurarFiltrosUsuarios() {
  if (buscadorUsuarios) {
    buscadorUsuarios.addEventListener("input", pintarTablaUsuarios);
  }

  if (filtroRolUsuarios) {
    filtroRolUsuarios.addEventListener("change", pintarTablaUsuarios);
  }

  if (botonLimpiarFiltrosUsuarios) {
    botonLimpiarFiltrosUsuarios.addEventListener("click", () => {
      if (buscadorUsuarios) {
        buscadorUsuarios.value = "";
      }

      if (filtroRolUsuarios) {
        filtroRolUsuarios.value = "todos";
      }

      pintarTablaUsuarios();
    });
  }
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
  Evita inyectar HTML directamente desde datos del backend.
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
  Devuelve una versión oculta de la contraseña.

  En el Producto 4 el backend no expone la contraseña en listarUsuarios,
  por eso se muestra como "No visible".
*/
function ocultarPassword(password) {
  const longitud = String(password || "").length;

  if (longitud === 0) {
    return "No visible";
  }

  return "•".repeat(longitud);
}

/*
  Devuelve los usuarios que cumplen los filtros actuales.
*/
function obtenerUsuariosFiltrados() {
  const textoBusqueda = normalizarTexto(buscadorUsuarios?.value || "");
  const filtroRol = filtroRolUsuarios?.value || "todos";

  return usuariosCache.filter((usuario) => {
    const coincideRol = filtroRol === "todos" || usuario.rol === filtroRol;

    const textoUsuario = normalizarTexto([
      usuario.id,
      usuario.nombre,
      usuario.apellidos,
      usuario.email,
      usuario.rol
    ].join(" "));

    const coincideTexto = !textoBusqueda || textoUsuario.includes(textoBusqueda);

    return coincideRol && coincideTexto;
  });
}

/*
  Actualiza el contador de usuarios visibles.
*/
function actualizarContadorUsuarios(totalVisibles, totalUsuarios) {
  if (!contadorUsuarios) {
    return;
  }

  if (totalUsuarios === 0) {
    contadorUsuarios.textContent = "No hay usuarios registrados.";
    return;
  }

  if (totalVisibles === totalUsuarios) {
    contadorUsuarios.textContent = `Mostrando ${totalUsuarios} usuarios registrados.`;
    return;
  }

  contadorUsuarios.textContent = `Mostrando ${totalVisibles} de ${totalUsuarios} usuarios registrados.`;
}

/*
  Pinta la tabla con los usuarios filtrados.
*/
function pintarTablaUsuarios() {
  const usuariosFiltrados = obtenerUsuariosFiltrados();

  actualizarContadorUsuarios(usuariosFiltrados.length, usuariosCache.length);

  if (usuariosCache.length === 0) {
    tablaUsuariosBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="6" class="text-center text-muted">No hay usuarios registrados.</td>
      </tr>
    `;
    return;
  }

  if (usuariosFiltrados.length === 0) {
    tablaUsuariosBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="6" class="text-center text-muted">
          No hay usuarios que coincidan con la búsqueda o el filtro seleccionado.
        </td>
      </tr>
    `;
    return;
  }

  tablaUsuariosBody.innerHTML = "";

  usuariosFiltrados.forEach((usuario) => {
    const fila = document.createElement("tr");
    const claseRol = obtenerClaseBadgeRol(usuario.rol);
    const nombreCompleto = `${usuario.nombre} ${usuario.apellidos}`;

    fila.innerHTML = `
      <td>${escaparHTML(usuario.id)}</td>
      <td>${escaparHTML(nombreCompleto)}</td>
      <td>${escaparHTML(usuario.email)}</td>
      <td>${escaparHTML(ocultarPassword(usuario.password))}</td>
      <td class="columna-rol">
        <span class="badge ${escaparHTML(claseRol)}">${escaparHTML(capitalizarTexto(usuario.rol))}</span>
      </td>
      <td class="columna-accion">
        <button
          class="btn btn-sm btn-action-delete-icon"
          data-email="${escaparHTML(usuario.email)}"
          type="button"
          aria-label="Eliminar usuario"
          title="Eliminar usuario"
        >✕</button>
      </td>
    `;

    const botonEliminar = fila.querySelector("button");

    botonEliminar.addEventListener("click", () =>
      gestionarBorradoUsuario(usuario.email, nombreCompleto)
    );

    tablaUsuariosBody.appendChild(fila);
  });
}

/*
  Recoge los valores escritos en el formulario.
*/
function obtenerDatosFormulario() {
  return {
    nombre: nombreUsuario.value,
    apellidos: apellidosUsuario.value,
    email: emailUsuario.value,
    password: passwordUsuario.value,
    rol: rolUsuario.value
  };
}

/*
  Gestiona el alta de un nuevo usuario.
*/
async function gestionarAltaUsuario(evento) {
  evento.preventDefault();

  try {
    const datosUsuario = obtenerDatosFormulario();
    const usuario = await crearUsuarioBackend(datosUsuario);

    await refrescarUsuariosDesdeBackend();
    pintarUsuarioEnNavbar();
    formUsuario.reset();

    mostrarAlerta(
      mensajeUsuario,
      `Usuario ${usuario.nombre} ${usuario.apellidos} creado correctamente en el backend.`,
      "success"
    );
  } catch (error) {
    mostrarAlerta(mensajeUsuario, error.message, "danger");
  }
}

/*
  Elimina un usuario usando su email.

  Si el usuario eliminado es el mismo que tiene la sesión activa,
  se borra también el token JWT y la sesión local.
*/
async function gestionarBorradoUsuario(email, nombreCompleto) {
  const usuarioActivo = obtenerUsuarioAutenticado();
  const esUsuarioActivo = usuarioActivo && usuarioActivo.email === email;

  const mensajeConfirmacion = esUsuarioActivo
    ? `Vas a eliminar el usuario "${nombreCompleto}". Este usuario tiene la sesión activa, así que también se cerrará la sesión.`
    : `¿Seguro que quieres eliminar el usuario "${nombreCompleto}"?`;

  const confirmarBorrado = await confirmarAccion({
    titulo: "Eliminar usuario",
    mensaje: mensajeConfirmacion,
    textoConfirmar: "Eliminar",
    textoCancelar: "Cancelar",
    variante: "danger"
  });

  if (!confirmarBorrado) {
    mostrarAlerta(mensajeUsuario, "Eliminación cancelada por el usuario.", "secondary");
    return;
  }

  try {
    await eliminarUsuarioBackend(email);
    await refrescarUsuariosDesdeBackend();

    if (esUsuarioActivo) {
      borrarToken();
      borrarUsuarioAutenticado();
      pintarUsuarioEnNavbar();

      mostrarAlerta(
        mensajeUsuario,
        `Usuario "${nombreCompleto}" eliminado correctamente. La sesión activa se ha cerrado.`,
        "success"
      );

      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 1400);

      return;
    }

    pintarUsuarioEnNavbar();

    mostrarAlerta(
      mensajeUsuario,
      `Usuario "${nombreCompleto}" eliminado correctamente.`,
      "success"
    );
  } catch (error) {
    mostrarAlerta(mensajeUsuario, error.message, "danger");
  }
}

/*
  Cuando el DOM ya está cargado,
  arrancamos toda la lógica de la página de usuarios.
*/
window.addEventListener("DOMContentLoaded", inicializarPaginaUsuarios);