import {
  crearUsuario,
  eliminarUsuario,
  inicializarAlmacenamiento,
  listarUsuarios,
  obtenerUsuarioActivo
} from "./almacenaje.js";
import {
  capitalizarTexto,
  configurarBotonCerrarSesion,
  mostrarAlerta,
  obtenerClaseBadgeRol,
  pintarUsuarioEnNavbar
} from "./ui.js";

/*
  Aquí buscamos y guardamos referencias a elementos del HTML.

  Los vamos a necesitar para:
  - leer los datos del formulario de alta de usuario
  - pintar la tabla de usuarios
  - mostrar mensajes de éxito o error
*/
const formUsuario = document.getElementById("form-usuario");
const nombreUsuario = document.getElementById("nombre-usuario");
const apellidosUsuario = document.getElementById("apellidos-usuario");
const emailUsuario = document.getElementById("email-usuario");
const passwordUsuario = document.getElementById("password-usuario");
const rolUsuario = document.getElementById("rol-usuario");
const tablaUsuariosBody = document.getElementById("tabla-usuarios-body");
const mensajeUsuario = document.getElementById("mensaje-usuario");

/*
  Esta es la función principal de arranque de la página de usuarios.

  Hace estas tareas:
  1. inicializa el almacenamiento por si aún no existen datos iniciales
  2. pinta el usuario activo en la navbar
  3. configura el botón de cerrar sesión
  4. pinta la tabla de usuarios
  5. conecta el formulario con la función que crea usuarios
*/
async function inicializarPaginaUsuarios() {
  await inicializarAlmacenamiento();
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();
  pintarTablaUsuarios();

  /*
    Cuando se envíe el formulario,
    se ejecutará gestionarAltaUsuario.
  */
  formUsuario.addEventListener("submit", gestionarAltaUsuario);
}

/*
  Devuelve una versión oculta de la contraseña para mostrarla en la tabla.

  No cambia la contraseña real almacenada.
  Solo evita que se vea en texto plano en pantalla.

  Ejemplo:
  "1234" -> "••••"
*/
function ocultarPassword(password) {
  const longitud = String(password || "").length;

  if (longitud === 0) {
    return "";
  }

  return "•".repeat(longitud);
}

/*
  Esta función pinta en la tabla todos los usuarios guardados.

  Hace esto:
  1. pide la lista de usuarios a almacenaje.js
  2. si no hay usuarios, muestra una fila informativa
  3. si sí hay, crea una fila por cada usuario
*/
function pintarTablaUsuarios() {
  const usuarios = listarUsuarios();

  /*
    Si no hay usuarios, metemos una única fila
    indicando que la tabla está vacía.
  */
  if (usuarios.length === 0) {
    tablaUsuariosBody.innerHTML = `
      <tr class="fila-vacia">
        <td colspan="6" class="text-center text-muted">No hay usuarios registrados.</td>
      </tr>
    `;
    return;
  }

  /*
    Si sí hay usuarios, vaciamos la tabla antes de repintarla
    para evitar duplicados.
  */
  tablaUsuariosBody.innerHTML = "";

  /*
    Recorremos el array de usuarios
    y creamos una fila por cada uno.
  */
  usuarios.forEach((usuario) => {
    const fila = document.createElement("tr");

    /*
      Según el rol del usuario,
      obtenemos una clase CSS para el badge.
    */
    const claseRol = obtenerClaseBadgeRol(usuario.rol);

    /*
      Construimos el HTML de la fila.

      Mejora aplicada:
      en la columna de acción usamos una X compacta en rojo,
      así evitamos que el botón se corte y el diseño queda más limpio.
    */
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

    /*
      Buscamos el botón eliminar que acabamos de crear dentro de la fila.
    */
    const botonEliminar = fila.querySelector("button");

    /*
      Cuando el usuario pulse ese botón,
      se ejecutará la función que borra ese usuario por su email.

      También pasamos el nombre completo para que el mensaje
      de confirmación sea más claro.
    */
    botonEliminar.addEventListener("click", () =>
      gestionarBorradoUsuario(usuario.email, `${usuario.nombre} ${usuario.apellidos}`)
    );

    /*
      Finalmente añadimos la fila al cuerpo de la tabla.
    */
    tablaUsuariosBody.appendChild(fila);
  });
}

/*
  Esta función recoge los valores escritos en el formulario
  y los devuelve en un objeto.

  Eso luego se pasa a crearUsuario(...).
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
  Esta función se ejecuta cuando se envía el formulario
  para crear un nuevo usuario.
*/
function gestionarAltaUsuario(evento) {
  /*
    Evitamos el comportamiento por defecto del formulario,
    que sería recargar la página.
  */
  evento.preventDefault();

  try {
    /*
      Leemos todos los datos del formulario.
    */
    const datosUsuario = obtenerDatosFormulario();

    /*
      Creamos el usuario usando la función del módulo almacenaje.js.
      Esa función también valida los datos y guarda en localStorage.
    */
    const usuario = crearUsuario(datosUsuario);

    /*
      Después de crear el usuario:
      - repintamos la tabla
      - repintamos la navbar
      - vaciamos el formulario
    */
    pintarTablaUsuarios();
    pintarUsuarioEnNavbar();
    formUsuario.reset();

    /*
      Mostramos mensaje de éxito.
    */
    mostrarAlerta(
      mensajeUsuario,
      `Usuario ${usuario.nombre} ${usuario.apellidos} creado correctamente en WebStorage.`,
      "success"
    );
  } catch (error) {
    /*
      Si algo falla (campos vacíos, email duplicado, etc.),
      mostramos el mensaje de error.
    */
    mostrarAlerta(mensajeUsuario, error.message, "danger");
  }
}

/*
  Esta función elimina un usuario usando su email.

  Mejoras funcionales aplicadas:
  - antes de borrar, se pide confirmación
  - si el usuario a eliminar es el que tiene la sesión activa,
    se avisa de que la sesión se cerrará automáticamente
*/
function gestionarBorradoUsuario(email, nombreCompleto) {
  const usuarioActivo = obtenerUsuarioActivo();
  const esUsuarioActivo = usuarioActivo && usuarioActivo.email === email;

  /*
    Construimos un mensaje distinto según el caso:
    - borrado normal
    - borrado del usuario que tiene la sesión activa
  */
  const mensajeConfirmacion = esUsuarioActivo
    ? `¿Seguro que quieres eliminar al usuario "${nombreCompleto}"?\n\nEste es el usuario que tiene la sesión activa ahora mismo, así que al borrarlo también se cerrará la sesión.`
    : `¿Seguro que quieres eliminar al usuario "${nombreCompleto}"?`;

  const confirmarBorrado = window.confirm(mensajeConfirmacion);

  if (!confirmarBorrado) {
    mostrarAlerta(mensajeUsuario, "Eliminación cancelada por el usuario.", "secondary");
    return;
  }

  try {
    eliminarUsuario(email);
    pintarTablaUsuarios();
    pintarUsuarioEnNavbar();

    /*
      También diferenciamos el mensaje final según si el usuario borrado
      era el que estaba logueado.
    */
    const mensajeExito = esUsuarioActivo
      ? `Usuario "${nombreCompleto}" eliminado correctamente. La sesión activa se ha cerrado.`
      : `Usuario "${nombreCompleto}" eliminado correctamente.`;

    mostrarAlerta(mensajeUsuario, mensajeExito, "success");
  } catch (error) {
    mostrarAlerta(mensajeUsuario, error.message, "danger");
  }
}

/*
  Cuando el DOM ya está cargado,
  arrancamos toda la lógica de la página de usuarios.
*/
window.addEventListener("DOMContentLoaded", inicializarPaginaUsuarios);