const GRAPHQL_URL = "http://localhost:4000/graphql";
const TOKEN_STORAGE_KEY = "jobconnect_token";
const USUARIO_STORAGE_KEY = "jobconnect_usuario";

/*
  Lee el token JWT guardado en localStorage.
  Si aún no existe, devuelve null.
*/
export function obtenerTokenGuardado() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/*
  Guarda el token JWT para reutilizarlo en mutaciones protegidas.
*/
export function guardarToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, String(token || ""));
}

/*
  Elimina el token JWT guardado.
*/
export function borrarToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/*
  Guarda en localStorage los datos públicos del usuario autenticado.
  Esto nos servirá más adelante para pintar la navbar y adaptar vistas.
*/
export function guardarUsuarioAutenticado(usuario) {
  localStorage.setItem(USUARIO_STORAGE_KEY, JSON.stringify(usuario || null));
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
  Función base para enviar queries y mutations GraphQL al backend.

  - query: texto GraphQL
  - variables: objeto con variables opcionales
  - token: JWT opcional para operaciones protegidas
*/
export async function graphqlRequest(query, variables = {}, token = null) {
  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ query, variables })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error("No se pudo conectar correctamente con el backend.");
  }

  if (result.errors && result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}
