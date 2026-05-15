import {
  borrarToken,
  graphqlRequest,
  guardarToken,
  guardarUsuarioAutenticado,
  obtenerUsuarioAutenticado
} from "./api.js";
import { configurarBotonCerrarSesion, mostrarAlerta, pintarUsuarioEnNavbar } from "./ui.js";

const LOGIN_ADMIN = `
  mutation LoginAdmin($email: String!, $password: String!) {
    loginAdmin(email: $email, password: $password) {
      token
      usuario {
        id
        nombre
        apellidos
        email
        rol
      }
    }
  }
`;

const LOGIN_USUARIO = `
  mutation LoguearUsuario($email: String!, $password: String!) {
    loguearUsuario(email: $email, password: $password) {
      id
      nombre
      apellidos
      email
      rol
    }
  }
`;

/*
  Referencias principales del formulario de login.
*/
const formLogin = document.getElementById("form-login");
const inputEmail = document.getElementById("email-login");
const inputPassword = document.getElementById("password-login");
const mensajeLogin = document.getElementById("mensaje-login");

/*
  Tiempo de espera antes de redirigir al dashboard.
*/
const TIEMPO_REDIRECCION_LOGIN = 900;

/*
  Función principal de arranque.
*/
function inicializarPaginaLogin() {
  pintarUsuarioEnNavbar();
  configurarBotonCerrarSesion();

  const usuarioActivo = obtenerUsuarioAutenticado();

  if (usuarioActivo) {
    mostrarAlerta(
      mensajeLogin,
      `Sesión activa: ${usuarioActivo.nombre} ${usuarioActivo.apellidos}.`,
      "info",
      0
    );
  }

  formLogin.addEventListener("submit", gestionarLogin);
}

/*
  Valida y normaliza los datos introducidos.
*/
function validarFormulario() {
  const email = inputEmail.value.trim().toLowerCase();
  const password = inputPassword.value.trim();

  if (!email || !password) {
    throw new Error("Debes completar el correo electrónico y la contraseña.");
  }

  return { email, password };
}

/*
  Redirige al dashboard.
*/
function redirigirAlDashboard() {
  window.location.href = "dashboard.html";
}

/*
  Login de administrador con JWT.
*/
async function loginAdmin(email, password) {
  const data = await graphqlRequest(LOGIN_ADMIN, { email, password });

  guardarToken(data.loginAdmin.token);
  guardarUsuarioAutenticado(data.loginAdmin.usuario);

  return data.loginAdmin.usuario;
}

/*
  Login de usuario normal.
  Se elimina cualquier token previo para evitar permisos antiguos.
*/
async function loginUsuarioNormal(email, password) {
  borrarToken();

  const data = await graphqlRequest(LOGIN_USUARIO, { email, password });

  guardarUsuarioAutenticado(data.loguearUsuario);

  return data.loguearUsuario;
}

/*
  Gestiona el envío del formulario.
*/
async function gestionarLogin(evento) {
  evento.preventDefault();

  try {
    const { email, password } = validarFormulario();
    let usuario = null;

    try {
      usuario = await loginAdmin(email, password);
    } catch (errorAdmin) {
      usuario = await loginUsuarioNormal(email, password);
    }

    pintarUsuarioEnNavbar();

    mostrarAlerta(
      mensajeLogin,
      `Bienvenido/a, ${usuario.nombre}. Redirigiendo...`,
      "success",
      TIEMPO_REDIRECCION_LOGIN
    );

    formLogin.reset();
    window.setTimeout(redirigirAlDashboard, TIEMPO_REDIRECCION_LOGIN);
  } catch (error) {
    mostrarAlerta(mensajeLogin, error.message, "danger");
  }
}

window.addEventListener("DOMContentLoaded", inicializarPaginaLogin);