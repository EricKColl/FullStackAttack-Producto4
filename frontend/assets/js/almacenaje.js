import { usuariosIniciales, publicacionesIniciales } from "./datos.js";

/*
  Claves usadas en localStorage.

  - usuarios: guarda el array de usuarios registrado en la aplicación.
  - usuarioActivo: guarda el email del usuario logueado actualmente.
  - publicacionesInicializadas: marca interna para no volver a sembrar
    las publicaciones iniciales una vez cargadas por primera vez.
*/
const CLAVES_STORAGE = {
  usuarios: "jobconnect_usuarios",
  usuarioActivo: "jobconnect_usuario_activo",
  publicacionesInicializadas: "jobconnect_publicaciones_inicializadas"
};

/*
  Configuración de IndexedDB.

  - DB_NAME: nombre de la base de datos local del navegador.
  - DB_VERSION: versión actual de la base de datos.
  - STORE_PUBLICACIONES: almacén donde guardamos ofertas y demandas.
  - STORE_SELECCIONADAS: almacén donde guardamos las publicaciones
    seleccionadas en el dashboard.
*/
const DB_NAME = "jobconnect_producto2_db";
const DB_VERSION = 1;
const STORE_PUBLICACIONES = "publicaciones";
const STORE_SELECCIONADAS = "seleccionadas";

/*
  Crea una copia profunda de un dato simple.
  Se usa para evitar modificar por referencia arrays u objetos
  que queremos devolver como copia independiente.
*/
function clonarDato(dato) {
  return JSON.parse(JSON.stringify(dato));
}

/*
  Lee un valor de localStorage y lo convierte desde JSON.

  Parámetros:
  - clave: nombre del valor guardado.
  - valorPorDefecto: valor que se devolverá si no existe nada
    o si el JSON da error al parsearse.
*/
function leerJSONStorage(clave, valorPorDefecto) {
  const texto = localStorage.getItem(clave);

  if (!texto) {
    return clonarDato(valorPorDefecto);
  }

  try {
    return JSON.parse(texto);
  } catch (error) {
    return clonarDato(valorPorDefecto);
  }
}

/*
  Guarda cualquier dato en localStorage en formato JSON.
*/
function guardarJSONStorage(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

/*
  Convierte cualquier valor en texto y elimina espacios
  al principio y al final.
*/
function normalizarTexto(texto) {
  return String(texto || "").trim();
}

/*
  Normaliza un email:
  - lo convierte a texto
  - elimina espacios sobrantes
  - lo pasa a minúsculas
*/
function normalizarEmail(email) {
  return normalizarTexto(email).toLowerCase();
}

/*
  Comprueba si un email tiene un formato razonable.

  No pretende ser una validación RFC perfecta,
  pero sí bastante mejor que simplemente comprobar si contiene "@".
*/
function esEmailValido(email) {
  const emailNormalizado = normalizarEmail(email);
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return patron.test(emailNormalizado);
}

/*
  Comprueba si una fecha tiene formato YYYY-MM-DD
  y si además representa una fecha válida.
*/
function esFechaValidaISO(fecha) {
  const fechaNormalizada = normalizarTexto(fecha);

  /*
    Primero validamos el formato exacto.
  */
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNormalizada)) {
    return false;
  }

  /*
    Después comprobamos que el navegador pueda interpretarla
    como una fecha real.
  */
  const tiempo = new Date(`${fechaNormalizada}T00:00:00`).getTime();
  return !Number.isNaN(tiempo);
}

/*
  Abre la base de datos IndexedDB.

  Devuelve una Promise porque abrir IndexedDB es un proceso asíncrono.
  Aquí también se crean los stores la primera vez o cuando haya
  cambio de versión.
*/
function abrirBaseDeDatos() {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(DB_NAME, DB_VERSION);

    /*
      onupgradeneeded se ejecuta cuando la BD no existe aún
      o cuando cambia la versión.
    */
    peticion.onupgradeneeded = (evento) => {
      const db = evento.target.result;

      /*
        Creamos el store de publicaciones si no existe.
        El campo "id" será la clave primaria y se autogenerará.
      */
      if (!db.objectStoreNames.contains(STORE_PUBLICACIONES)) {
        const storePublicaciones = db.createObjectStore(STORE_PUBLICACIONES, {
          keyPath: "id",
          autoIncrement: true
        });

        /*
          Índices auxiliares para organizar mejor los datos.
          No son obligatorios, pero son útiles para estructurar
          el almacenamiento.
        */
        storePublicaciones.createIndex("tipo", "tipo", { unique: false });
        storePublicaciones.createIndex("fecha", "fecha", { unique: false });
        storePublicaciones.createIndex("emailContacto", "emailContacto", {
          unique: false
        });
      }

      /*
        Creamos el store de seleccionadas si no existe.
        Aquí usamos como clave primaria el id de la publicación.
      */
      if (!db.objectStoreNames.contains(STORE_SELECCIONADAS)) {
        db.createObjectStore(STORE_SELECCIONADAS, {
          keyPath: "publicacionId"
        });
      }
    };

    /*
      Si la apertura va bien, resolvemos la promesa con la BD abierta.
    */
    peticion.onsuccess = () => {
      resolve(peticion.result);
    };

    /*
      Si falla la apertura, rechazamos la promesa con un error claro.
    */
    peticion.onerror = () => {
      reject(new Error("No se pudo abrir la base de datos del navegador."));
    };
  });
}

/*
  Devuelve todos los registros de un store concreto.
*/
function obtenerTodosDeStore(nombreStore) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await abrirBaseDeDatos();
      const transaccion = db.transaction(nombreStore, "readonly");
      const store = transaccion.objectStore(nombreStore);
      const peticion = store.getAll();

      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(new Error(`No se pudo leer ${nombreStore}.`));
    } catch (error) {
      reject(error);
    }
  });
}

/*
  Devuelve un único registro de un store usando su clave primaria.
*/
function obtenerUnoDeStore(nombreStore, clave) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await abrirBaseDeDatos();
      const transaccion = db.transaction(nombreStore, "readonly");
      const store = transaccion.objectStore(nombreStore);
      const peticion = store.get(clave);

      /*
        Si no existe ningún registro con esa clave, devolvemos null.
      */
      peticion.onsuccess = () => resolve(peticion.result || null);
      peticion.onerror = () => reject(new Error(`No se pudo leer el registro de ${nombreStore}.`));
    } catch (error) {
      reject(error);
    }
  });
}

/*
  Cuenta cuántos registros hay dentro de un store.
*/
function contarStore(nombreStore) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await abrirBaseDeDatos();
      const transaccion = db.transaction(nombreStore, "readonly");
      const store = transaccion.objectStore(nombreStore);
      const peticion = store.count();

      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(new Error(`No se pudo contar ${nombreStore}.`));
    } catch (error) {
      reject(error);
    }
  });
}

/*
  Añade un nuevo registro al store.

  Se usa add() porque queremos insertar uno nuevo.
  Si ya existiera esa clave, podría fallar.
*/
function agregarEnStore(nombreStore, dato) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await abrirBaseDeDatos();
      const transaccion = db.transaction(nombreStore, "readwrite");
      const store = transaccion.objectStore(nombreStore);
      const peticion = store.add(dato);

      /*
        En stores con clave autoincremental, peticion.result suele devolver
        el id generado automáticamente.
      */
      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(new Error(`No se pudo guardar en ${nombreStore}.`));
    } catch (error) {
      reject(error);
    }
  });
}

/*
  Inserta o actualiza un registro en el store.

  A diferencia de add(), put() permite:
  - crear si no existe
  - actualizar si ya existe
*/
function guardarEnStore(nombreStore, dato) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await abrirBaseDeDatos();
      const transaccion = db.transaction(nombreStore, "readwrite");
      const store = transaccion.objectStore(nombreStore);
      const peticion = store.put(dato);

      peticion.onsuccess = () => resolve(peticion.result);
      peticion.onerror = () => reject(new Error(`No se pudo actualizar ${nombreStore}.`));
    } catch (error) {
      reject(error);
    }
  });
}

/*
  Elimina un registro del store usando su clave primaria.
*/
function eliminarDeStore(nombreStore, clave) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await abrirBaseDeDatos();
      const transaccion = db.transaction(nombreStore, "readwrite");
      const store = transaccion.objectStore(nombreStore);
      const peticion = store.delete(clave);

      peticion.onsuccess = () => resolve(true);
      peticion.onerror = () => reject(new Error(`No se pudo eliminar en ${nombreStore}.`));
    } catch (error) {
      reject(error);
    }
  });
}

/*
  Inicializa el almacenamiento de la aplicación.

  Hace dos cosas:
  1. Asegura que existan usuarios iniciales en localStorage.
  2. Asegura la primera carga de publicaciones en IndexedDB.
*/
export async function inicializarAlmacenamiento() {
  inicializarUsuariosSiNoExisten();
  await inicializarPublicacionesSiNoExisten();
}

/*
  Si todavía no hay usuarios guardados, carga los usuarios iniciales.
*/
function inicializarUsuariosSiNoExisten() {
  if (!localStorage.getItem(CLAVES_STORAGE.usuarios)) {
    guardarJSONStorage(CLAVES_STORAGE.usuarios, usuariosIniciales);
  }
}

/*
  Inserta las publicaciones iniciales solo una vez.

  CORRECCIÓN IMPORTANTE:
  Antes, si el usuario borraba todas las publicaciones y recargaba,
  se volvían a insertar automáticamente porque el store estaba vacío.

  Ahora usamos una marca en localStorage para recordar si ya se hizo
  la siembra inicial. Así:
  - la primera vez sí se cargan
  - después ya no reaparecen aunque el usuario las borre todas
*/
async function inicializarPublicacionesSiNoExisten() {
  const yaInicializadas =
    localStorage.getItem(CLAVES_STORAGE.publicacionesInicializadas) === "true";

  /*
    Si ya se inicializaron una vez, no hacemos nada más.
  */
  if (yaInicializadas) {
    return;
  }

  const totalPublicaciones = await contarStore(STORE_PUBLICACIONES);

  /*
    Solo insertamos las publicaciones semilla si realmente no hay ninguna.
  */
  if (totalPublicaciones === 0) {
    for (const publicacion of publicacionesIniciales) {
      await agregarEnStore(STORE_PUBLICACIONES, publicacion);
    }
  }

  /*
    Marcamos la inicialización como hecha para no repetirla más adelante.
  */
  localStorage.setItem(CLAVES_STORAGE.publicacionesInicializadas, "true");
}

/*
  Devuelve la lista de usuarios ordenada alfabéticamente
  por nombre completo.
*/
export function listarUsuarios() {
  const usuarios = leerJSONStorage(CLAVES_STORAGE.usuarios, []);

  return usuarios.sort((a, b) => {
    const nombreA = `${a.nombre} ${a.apellidos}`.toLowerCase();
    const nombreB = `${b.nombre} ${b.apellidos}`.toLowerCase();
    return nombreA.localeCompare(nombreB);
  });
}

/*
  Devuelve el usuario actualmente logueado.

  Para ello:
  1. Lee el email guardado como usuario activo.
  2. Busca ese email dentro del listado de usuarios.
*/
export function obtenerUsuarioActivo() {
  const emailActivo = normalizarEmail(localStorage.getItem(CLAVES_STORAGE.usuarioActivo));

  if (!emailActivo) {
    return null;
  }

  const usuarios = listarUsuarios();
  return usuarios.find((usuario) => usuario.email === emailActivo) || null;
}

/*
  Guarda el email del usuario activo en localStorage.
*/
export function guardarUsuarioActivo(email) {
  localStorage.setItem(CLAVES_STORAGE.usuarioActivo, normalizarEmail(email));
}

/*
  Cierra la sesión borrando el usuario activo.
*/
export function cerrarSesion() {
  localStorage.removeItem(CLAVES_STORAGE.usuarioActivo);
}

/*
  Crea un nuevo usuario.

  Flujo:
  1. Normaliza los datos.
  2. Valida campos.
  3. Comprueba duplicados.
  4. Genera un id nuevo.
  5. Guarda el usuario en localStorage.
*/
export function crearUsuario(datosUsuario) {
  const usuarios = listarUsuarios();

  const nombre = normalizarTexto(datosUsuario.nombre);
  const apellidos = normalizarTexto(datosUsuario.apellidos);
  const email = normalizarEmail(datosUsuario.email);
  const password = normalizarTexto(datosUsuario.password);
  const rol = normalizarTexto(datosUsuario.rol).toLowerCase();

  if (!nombre || !apellidos || !email || !password || !rol) {
    throw new Error("Todos los campos del usuario son obligatorios.");
  }

  if (!esEmailValido(email)) {
    throw new Error("El correo electrónico no tiene un formato válido.");
  }

  if (password.length < 4) {
    throw new Error("La contraseña debe tener al menos 4 caracteres.");
  }

  if (rol !== "candidato" && rol !== "empresa") {
    throw new Error("El rol del usuario debe ser candidato o empresa.");
  }

  const usuarioDuplicado = usuarios.some((usuario) => usuario.email === email);

  if (usuarioDuplicado) {
    throw new Error("Ya existe un usuario con ese correo electrónico.");
  }

  const siguienteId = usuarios.length === 0
    ? 1
    : Math.max(...usuarios.map((usuario) => Number(usuario.id) || 0)) + 1;

  const nuevoUsuario = {
    id: siguienteId,
    nombre,
    apellidos,
    email,
    password,
    rol
  };

  usuarios.push(nuevoUsuario);
  guardarJSONStorage(CLAVES_STORAGE.usuarios, usuarios);

  return nuevoUsuario;
}

/*
  Elimina un usuario usando su email.

  Si el usuario eliminado era el que estaba logueado,
  también se cierra la sesión automáticamente.
*/
export function eliminarUsuario(email) {
  const emailNormalizado = normalizarEmail(email);
  const usuarios = listarUsuarios();

  const usuariosFiltrados = usuarios.filter((usuario) => usuario.email !== emailNormalizado);

  if (usuariosFiltrados.length === usuarios.length) {
    throw new Error("No se encontró el usuario a eliminar.");
  }

  guardarJSONStorage(CLAVES_STORAGE.usuarios, usuariosFiltrados);

  const usuarioActivo = obtenerUsuarioActivo();
  if (usuarioActivo && usuarioActivo.email === emailNormalizado) {
    cerrarSesion();
  }

  return true;
}

/*
  Intenta iniciar sesión con email y contraseña.

  Si encuentra coincidencia:
  - guarda el usuario activo
  - devuelve el usuario encontrado
*/
export function loguearUsuario(email, password) {
  const emailNormalizado = normalizarEmail(email);
  const passwordNormalizada = normalizarTexto(password);

  if (!emailNormalizado || !passwordNormalizada) {
    throw new Error("Debes introducir correo y contraseña.");
  }

  const usuarios = listarUsuarios();
  const usuario = usuarios.find(
    (item) => item.email === emailNormalizado && item.password === passwordNormalizada
  );

  if (!usuario) {
    throw new Error("Credenciales incorrectas. Revisa el correo y la contraseña.");
  }

  guardarUsuarioActivo(usuario.email);

  return usuario;
}

/*
  Devuelve todas las publicaciones ordenadas:
  1. por fecha más reciente
  2. en caso de empate, por id descendente
*/
export async function listarPublicaciones() {
  const publicaciones = await obtenerTodosDeStore(STORE_PUBLICACIONES);

  return publicaciones.sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime();
    const fechaB = new Date(b.fecha).getTime();

    if (fechaA !== fechaB) {
      return fechaB - fechaA;
    }

    return Number(b.id) - Number(a.id);
  });
}

/*
  Crea una nueva publicación en IndexedDB.
*/
export async function crearPublicacion(datosPublicacion) {
  const tipo = normalizarTexto(datosPublicacion.tipo).toLowerCase();
  const titulo = normalizarTexto(datosPublicacion.titulo);
  const categoria = normalizarTexto(datosPublicacion.categoria);
  const autor = normalizarTexto(datosPublicacion.autor);
  const ubicacion = normalizarTexto(datosPublicacion.ubicacion);
  const descripcion = normalizarTexto(datosPublicacion.descripcion);
  const emailContacto = normalizarEmail(datosPublicacion.emailContacto);
  const fecha = normalizarTexto(datosPublicacion.fecha);

  if (!tipo || !titulo || !categoria || !autor || !ubicacion || !descripcion || !emailContacto || !fecha) {
    throw new Error("Todos los campos de la publicación son obligatorios.");
  }

  if (tipo !== "oferta" && tipo !== "demanda") {
    throw new Error("El tipo de publicación debe ser oferta o demanda.");
  }

  if (!esEmailValido(emailContacto)) {
    throw new Error("El email de contacto no es válido.");
  }

  if (!esFechaValidaISO(fecha)) {
    throw new Error("La fecha de la publicación no es válida.");
  }

  if (descripcion.length < 10) {
    throw new Error("La descripción debe tener al menos 10 caracteres.");
  }

  const nuevaPublicacion = {
    tipo,
    titulo,
    categoria,
    autor,
    ubicacion,
    descripcion,
    emailContacto,
    fecha
  };

  const nuevoId = await agregarEnStore(STORE_PUBLICACIONES, nuevaPublicacion);
  return { ...nuevaPublicacion, id: nuevoId };
}

/*
  Elimina una publicación por su id.

  Además, si esa publicación estaba seleccionada en el dashboard,
  también se elimina del store de seleccionadas.
*/
export async function eliminarPublicacion(idPublicacion) {
  const id = Number(idPublicacion);

  if (!Number.isInteger(id)) {
    throw new Error("El identificador de la publicación no es válido.");
  }

  const publicacion = await obtenerUnoDeStore(STORE_PUBLICACIONES, id);

  if (!publicacion) {
    throw new Error("No se encontró la publicación a eliminar.");
  }

  await eliminarDeStore(STORE_PUBLICACIONES, id);
  await eliminarDeStore(STORE_SELECCIONADAS, id);
  return true;
}

/*
  Devuelve solo los ids de las publicaciones seleccionadas.
*/
export async function listarIdsSeleccionados() {
  const registros = await obtenerTodosDeStore(STORE_SELECCIONADAS);
  return registros.map((registro) => Number(registro.publicacionId));
}

/*
  Añade una publicación a la selección del dashboard.

  Guardamos:
  - el id de la publicación
  - la fecha de selección
*/
export async function anadirPublicacionSeleccionada(idPublicacion) {
  const id = Number(idPublicacion);
  const publicacion = await obtenerUnoDeStore(STORE_PUBLICACIONES, id);

  if (!publicacion) {
    throw new Error("No existe la publicación que intentas seleccionar.");
  }

  await guardarEnStore(STORE_SELECCIONADAS, {
    publicacionId: id,
    fechaSeleccion: new Date().toISOString()
  });

  return true;
}

/*
  Quita una publicación de la selección del dashboard.
*/
export async function quitarPublicacionSeleccionada(idPublicacion) {
  const id = Number(idPublicacion);
  await eliminarDeStore(STORE_SELECCIONADAS, id);
  return true;
}

/*
  Devuelve las publicaciones que están seleccionadas.
*/
export async function listarPublicacionesSeleccionadas() {
  const [publicaciones, idsSeleccionados] = await Promise.all([
    listarPublicaciones(),
    listarIdsSeleccionados()
  ]);

  return publicaciones.filter((publicacion) => idsSeleccionados.includes(Number(publicacion.id)));
}

/*
  Devuelve las publicaciones que todavía NO están seleccionadas.
*/
export async function listarPublicacionesDisponibles() {
  const [publicaciones, idsSeleccionados] = await Promise.all([
    listarPublicaciones(),
    listarIdsSeleccionados()
  ]);

  return publicaciones.filter((publicacion) => !idsSeleccionados.includes(Number(publicacion.id)));
}

/*
  Devuelve un resumen numérico para el dashboard.
*/
export async function obtenerResumenDashboard() {
  const [publicaciones, idsSeleccionados] = await Promise.all([
    listarPublicaciones(),
    listarIdsSeleccionados()
  ]);

  return {
    totalOfertas: publicaciones.filter((publicacion) => publicacion.tipo === "oferta").length,
    totalDemandas: publicaciones.filter((publicacion) => publicacion.tipo === "demanda").length,
    totalUsuarios: listarUsuarios().length,
    totalSeleccionadas: idsSeleccionados.length
  };
}