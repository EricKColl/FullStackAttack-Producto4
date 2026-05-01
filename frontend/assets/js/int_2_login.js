import { inicializarAlmacenamiento, loguearUsuario, obtenerUsuarioActivo } from "./almacenaje.js";
import { configurarBotonCerrarSesion, mostrarAlerta, pintarUsuarioEnNavbar } from "./ui.js";

/*
  Referencias a los elementos HTML de la página de login.

  Estos elementos se usan para:
  - leer el email y la contraseña escritos por el usuario
  - detectar el envío del formulario
  - mostrar mensajes de éxito o error
  - enseñar en la propia página qué usuario está activo
*/
const formLogin = document.getElementById("form-login");
const inputEmail = document.getElementById("email-login");
const inputPassword = document.getElementById("password-login");
const mensajeLogin = document.getElementById("mensaje-login");
const usuarioActivoPagina = document.getElementById("usuario-activo-pagina");

/*
  Tiempo de espera antes de redirigir al dashboard
  cuando el login ha sido correcto.
*/
const TIEMPO_REDIRECCION_LOGIN = 1200;

/*
  Función principal de arranque de la página login.

  Mejora aplicada:
  si ya existe una sesión iniciada, la página se puede seguir visitando
  sin redirigir automáticamente al dashboard.
*/
async function inicializarPaginaLogin() {
  await inicializarAlmacenamiento();
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();
  mostrarUsuarioActivoEnPagina();
  mostrarAvisoSesionActivaSiCorresponde();

  formLogin.addEventListener("submit", gestionarLogin);
}

/*
  Si ya había una sesión activa al entrar en esta pantalla,
  mostramos solo un aviso informativo y dejamos que el usuario
  decida qué hacer.
*/
function mostrarAvisoSesionActivaSiCorresponde() {
  const usuarioActivo = obtenerUsuarioActivo();

  if (!usuarioActivo) {
    return;
  }

  mostrarAlerta(
    mensajeLogin,
    `Ya hay una sesión activa con ${usuarioActivo.nombre} ${usuarioActivo.apellidos}. Puedes mantenerla abierta, cerrarla desde la parte superior o iniciar otra sesión si lo necesitas.`,
    "info",
    0
  );
}

/*
  Muestra dentro de la página si hay un usuario activo o no.
*/
function mostrarUsuarioActivoEnPagina() {
  const usuarioActivo = obtenerUsuarioActivo();

  if (!usuarioActivo) {
    usuarioActivoPagina.textContent = "Ahora mismo no hay ningún usuario logueado.";
    return;
  }

  usuarioActivoPagina.textContent = `Ahora mismo está logueado ${usuarioActivo.nombre} ${usuarioActivo.apellidos} (${usuarioActivo.email}).`;
}

/*
  Valida y normaliza los datos introducidos en el formulario.
*/
function validarFormulario() {
  const email = inputEmail.value.trim().toLowerCase();
  const password = inputPassword.value.trim();

  if (!email || !password) {
    throw new Error("Debes completar el correo y la contraseña.");
  }

  return { email, password };
}

/*
  Redirige al usuario al dashboard principal.
*/
function redirigirAlDashboard() {
  window.location.href = "dashboard.html";
}

/*
  Gestiona el envío del formulario de login.
*/
async function gestionarLogin(evento) {
  evento.preventDefault();

  try {
    const { email, password } = validarFormulario();
    const usuario = loguearUsuario(email, password);

    pintarUsuarioEnNavbar();
    mostrarUsuarioActivoEnPagina();
    mostrarAlerta(
      mensajeLogin,
      `Inicio de sesión correcto. Bienvenido/a, ${usuario.nombre}. Redirigiendo al dashboard...`,
      "success",
      TIEMPO_REDIRECCION_LOGIN
    );

    formLogin.reset();
    window.setTimeout(redirigirAlDashboard, TIEMPO_REDIRECCION_LOGIN);
  } catch (error) {
    mostrarAlerta(mensajeLogin, error.message, "danger");
  }
}

/*
  Cuando el DOM está completamente cargado,
  arrancamos toda la lógica de la página de login.
*/
window.addEventListener("DOMContentLoaded", inicializarPaginaLogin);