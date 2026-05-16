const GRAPHQL_URL = "http://localhost:4000/graphql";
const TOKEN_STORAGE_KEY = "jobconnect_token";
const USUARIO_STORAGE_KEY = "jobconnect_usuario";

/*
  Lee el token JWT guardado en localStorage.

  En el Producto 4, localStorage no se usa como persistencia principal
  de datos de negocio. Solo mantiene información de sesión del frontend:
  token JWT y usuario autenticado.
*/
export function obtenerTokenGuardado() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!token) {
    return null;
  }

  return token;
}

/*
  Devuelve el token JWT actual cuando una operación requiere sesión.

  Sirve para cualquier usuario autenticado:
  - admin
  - empresa
  - candidato

  Si no hay token, se lanza un error claro antes de llamar al backend.
*/
export function obtenerTokenSesionObligatorio() {
  const token = obtenerTokenGuardado();

  if (!token) {
    throw new Error("Debes iniciar sesión para realizar esta operación.");
  }

  return token;
}

/*
  Devuelve el token JWT actual cuando una operación requiere administrador.

  Se mantiene separado del token general porque hay operaciones que deben seguir
  siendo exclusivas del rol admin, como crear usuarios, eliminar usuarios o
  eliminar publicaciones globales.
*/
export function obtenerTokenAdminObligatorio() {
  const token = obtenerTokenGuardado();

  if (!token) {
    throw new Error("Debes iniciar sesión como administrador para realizar esta operación.");
  }

  return token;
}

/*
  Guarda el token JWT para reutilizarlo en operaciones protegidas.

  Si no llega un token válido, se elimina cualquier token anterior para evitar
  sesiones inconsistentes.
*/
export function guardarToken(token) {
  if (!token) {
    borrarToken();
    return;
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, String(token));
}

/*
  Elimina el token JWT guardado.
*/
export function borrarToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/*
  Guarda en localStorage los datos públicos del usuario autenticado.

  Solo se almacenan datos no sensibles que permiten pintar la navbar,
  identificar la sesión activa y adaptar la interfaz.
*/
export function guardarUsuarioAutenticado(usuario) {
  if (!usuario) {
    borrarUsuarioAutenticado();
    return;
  }

  localStorage.setItem(USUARIO_STORAGE_KEY, JSON.stringify(usuario));
}

/*
  Recupera los datos del usuario autenticado guardados en localStorage.
*/
export function obtenerUsuarioAutenticado() {
  const texto = localStorage.getItem(USUARIO_STORAGE_KEY);

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch (error) {
    borrarUsuarioAutenticado();
    return null;
  }
}

/*
  Borra el usuario autenticado guardado localmente.
*/
export function borrarUsuarioAutenticado() {
  localStorage.removeItem(USUARIO_STORAGE_KEY);
}

/*
  Construye las cabeceras HTTP necesarias para enviar una operación GraphQL.

  Si se recibe un token JWT, se añade Authorization con el formato:
  Bearer TOKEN
*/
function construirHeaders(token = null) {
  const headers = {
    "Content-Type": "application/json"
  };

  const tokenSeguro = token ? String(token).trim() : "";

  if (tokenSeguro) {
    headers.Authorization = `Bearer ${tokenSeguro}`;
  }

  return headers;
}

/*
  Extrae el mensaje principal de error devuelto por GraphQL.

  Apollo devuelve los errores en result.errors. Normalmente el primer error
  contiene el mensaje más útil para mostrar al usuario.
*/
function obtenerMensajeGraphQLError(result) {
  if (!result || !Array.isArray(result.errors) || result.errors.length === 0) {
    return null;
  }

  return result.errors[0]?.message || "El backend devolvió un error GraphQL.";
}

/*
  Convierte la respuesta HTTP del backend en JSON de forma segura.

  Se usa response.text() + JSON.parse() para poder detectar respuestas vacías
  o respuestas no JSON, evitando errores poco claros en consola.
*/
async function leerRespuestaJson(response) {
  const textoRespuesta = await response.text();

  if (!textoRespuesta) {
    return {};
  }

  try {
    return JSON.parse(textoRespuesta);
  } catch (error) {
    throw new Error(
      "El backend respondió, pero la respuesta no tiene un formato JSON válido."
    );
  }
}

/*
  Función base para enviar queries y mutations GraphQL al backend.

  Parámetros:
  - query: operación GraphQL en texto.
  - variables: objeto opcional con variables.
  - token: JWT opcional para operaciones protegidas.

  Esta función centraliza:
  - conexión con Apollo GraphQL;
  - envío del token JWT;
  - lectura segura de la respuesta;
  - mensajes claros si el backend está apagado;
  - mensajes claros si GraphQL devuelve errores.
*/
export async function graphqlRequest(query, variables = {}, token = null) {
  if (!query || typeof query !== "string") {
    throw new Error("La operación GraphQL no es válida.");
  }

  let response;

  try {
    response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: construirHeaders(token),
      body: JSON.stringify({ query, variables })
    });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con el backend. Comprueba que el servidor esté arrancado en http://localhost:4000."
    );
  }

  const result = await leerRespuestaJson(response);
  const mensajeGraphQL = obtenerMensajeGraphQLError(result);

  if (!response.ok) {
    throw new Error(
      mensajeGraphQL || `El backend respondió con un error HTTP ${response.status}.`
    );
  }

  if (mensajeGraphQL) {
    throw new Error(mensajeGraphQL);
  }

  if (!Object.prototype.hasOwnProperty.call(result, "data")) {
    throw new Error("La respuesta del backend no contiene datos GraphQL válidos.");
  }

  return result.data;
}