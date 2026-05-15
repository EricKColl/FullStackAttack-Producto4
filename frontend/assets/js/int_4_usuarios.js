import {
  inicializarAlmacenamiento
} from "./almacenaje.js";
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
  mostrarAlerta,
  obtenerClaseBadgeRol,
  pintarUsuarioEnNavbar
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
  Referencias principales a elementos del HTML.

  Estos elementos permiten:
  - leer los datos del formulario de alta de usuario;
  - pintar la tabla de usuarios recibidos desde GraphQL;
  - mostrar mensajes de éxito o error;
  - ejecutar acciones protegidas usando el token JWT de administrador.
*/
const formUsuario = document.getElementById("form-usuario");
const nombreUsuario = document.getElementById("nombre-usuario");
const apellidosUsuario = document.getElementById("apellidos-usuario");
const emailUsuario = document.getElementById("email-usuario");
const passwordUsuario = document.getElementById("password-usuario");
const rolUsuario = document.getElementById("rol-usuario");
const tablaUsuariosBody = document.getElementById("tabla-usuarios-body");
const mensajeUsuario = document.getElementById("mensaje-usuario");

async function cargarUsuariosBackend() {
  const data = await graphqlRequest(LISTAR_USUARIOS);
  return data.listarUsuarios;
}

async function crearUsuarioBackend(datosUsuario) {
  const token = obtenerTokenAdminObligatorio();

  const data = await graphqlRequest(
    CREAR_USUARIO,
    { datos: datosUsuario },
    token
  );

  return data.crearUsuario;
}

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

  Flujo:
  1. Mantiene la inicialización heredada del frontend para no romper compatibilidad.
  2. Pinta el usuario autenticado en la navbar usando la sesión centralizada de api.js.
  3. Configura el botón de cerrar sesión.
  4. Consulta los usuarios reales desde el backend mediante GraphQL.
  5. Conecta el formulario con la mutation crearUsuario.
*/
async function inicializarPaginaUsuarios() {
  await inicializarAlmacenamiento();
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();

  try {
    await pintarTablaUsuarios();
  } catch (error) {
    mostrarAlerta(mensajeUsuario, error.message, "danger", 0);
  }

  formUsuario.addEventListener("submit", gestionarAltaUsuario);
}

/*
  Devuelve una versión oculta de la contraseña para mostrarla en la tabla.

  La API GraphQL no devuelve contraseñas reales por seguridad.
  Por tanto, en la práctica se mostrará "No visible" cuando el campo no exista.
*/
function ocultarPassword(password) {
  const longitud = String(password || "").length;

  if (longitud === 0) {
    return "No visible";
  }

  return "•".repeat(longitud);
}

/*
  Pinta en la tabla los usuarios recibidos desde el backend.

  La información se obtiene mediante la query listarUsuarios.
  No se usa persistencia local para obtener los datos principales de esta pantalla.
*/
async function pintarTablaUsuarios() {
  const usuarios = await cargarUsuariosBackend();

  if (usuarios.length === 0) {
    tablaUsuariosBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="6" class="text-center text-muted">No hay usuarios registrados.</td>
      </tr>
    `;
    return;
  }

  tablaUsuariosBody.innerHTML = "";

  usuarios.forEach((usuario) => {
    const fila = document.createElement("tr");
    const claseRol = obtenerClaseBadgeRol(usuario.rol);

    fila.innerHTML = `
      <td>${usuario.id}</td>
      <td>${usuario.nombre} ${usuario.apellidos}</td>
      <td>${usuario.email}</td>
      <td>${ocultarPassword(usuario.password)}</td>
      <td class="columna-rol"><span class="badge ${claseRol}">${capitalizarTexto(usuario.rol)}</span></td>
      <td class="columna-accion">
        <button
          class="btn btn-sm btn-action-delete-icon"
          data-email="${usuario.email}"
          type="button"
          aria-label="Eliminar usuario"
          title="Eliminar usuario"
        >✕</button>
      </td>
    `;

    const botonEliminar = fila.querySelector("button");

    botonEliminar.addEventListener("click", () =>
      gestionarBorradoUsuario(usuario.email, `${usuario.nombre} ${usuario.apellidos}`)
    );

    tablaUsuariosBody.appendChild(fila);
  });
}

/*
  Recoge los valores escritos en el formulario y los prepara
  para enviarlos a la mutation crearUsuario.
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
  Gestiona el alta de un usuario nuevo.

  La operación se envía al backend mediante GraphQL.
  Como crearUsuario está protegida en el backend, se exige un token JWT
  de administrador antes de enviar la mutation.
*/
async function gestionarAltaUsuario(evento) {
  evento.preventDefault();

  try {
    const datosUsuario = obtenerDatosFormulario();
    const usuario = await crearUsuarioBackend(datosUsuario);

    await pintarTablaUsuarios();
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

  La operación se ejecuta mediante GraphQL y requiere token JWT de administrador.
  Si el usuario eliminado es el que tiene la sesión activa, se borra también
  la sesión local y se redirige al login para evitar una sesión inconsistente.
*/
async function gestionarBorradoUsuario(email, nombreCompleto) {
  const usuarioActivo = obtenerUsuarioAutenticado();
  const esUsuarioActivo = usuarioActivo && usuarioActivo.email === email;

  const mensajeConfirmacion = esUsuarioActivo
    ? `¿Seguro que quieres eliminar al usuario "${nombreCompleto}"?\n\nEste es el usuario que tiene la sesión activa ahora mismo, así que al borrarlo también se cerrará la sesión.`
    : `¿Seguro que quieres eliminar al usuario "${nombreCompleto}"?`;

  const confirmarBorrado = window.confirm(mensajeConfirmacion);

  if (!confirmarBorrado) {
    mostrarAlerta(mensajeUsuario, "Eliminación cancelada por el usuario.", "secondary");
    return;
  }

  try {
    await eliminarUsuarioBackend(email);

    if (esUsuarioActivo) {
      borrarToken();
      borrarUsuarioAutenticado();
      pintarUsuarioEnNavbar();

      mostrarAlerta(
        mensajeUsuario,
        `Usuario "${nombreCompleto}" eliminado correctamente. La sesión activa se ha cerrado y serás redirigido/a al login.`,
        "success",
        2000
      );

      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);

      return;
    }

    await pintarTablaUsuarios();
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
  Cuando el DOM ya está cargado, arrancamos la lógica de la página.
*/
window.addEventListener("DOMContentLoaded", inicializarPaginaUsuarios);