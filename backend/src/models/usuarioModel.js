/**
 * @file src/models/usuarioModel.js
 * @description Capa de acceso a datos para la entidad Usuario.
 *
 * Porta al backend la lógica de `almacenaje.js` del Producto 2 relacionada
 * con usuarios (listarUsuarios, crearUsuario, eliminarUsuario, loguearUsuario).
 *
 * Estado actual (Fase 4):
 *   La entidad Usuario ya persiste en MongoDB.
 *   La lógica de validación, normalización y serialización se mantiene,
 *   pero la capa de almacenamiento en memoria ha sido sustituida por
 *   operaciones reales sobre la colección `usuarios`.
 *
 * Diseño:
 *   - Las funciones reciben datos crudos, los normalizan y validan.
 *   - Si los datos no pasan validación, lanzan ValidationError.
 *   - Si el recurso no existe o ya existe, lanzan NotFoundError / ConflictError.
 *   - Devuelven copias (no referencias) para evitar mutaciones accidentales
 *     desde capas superiores.
 *   - Mantienen el campo `id` numérico para no romper compatibilidad con
 *     la lógica heredada de Fase 3 y del Producto 2.
 */

import { getDb } from '../config/db.js';
import bcrypt from 'bcryptjs';

import {
  normalizarTexto,
  normalizarEmail,
  validarCamposObligatorios,
  validarEmail,
  validarLongitudMinima,
  validarRol,
} from '../utils/validators.js';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
} from '../utils/errors.js';

/**
 * Devuelve una copia defensiva de un usuario, sin la contraseña.
 *
 * Jamás queremos exponer `password` en respuestas GraphQL aunque esté en la BBDD,
 * ni siquiera hasheada. Esta función centraliza esa garantía: cualquier cosa
 * que devuelva el model ya no contendrá password.
 *
 * @param {object} usuario
 * @returns {object} Copia del usuario sin la propiedad password.
 */
function serializarUsuario(usuario) {
  const { password, ...seguro } = usuario;
  return { ...seguro };
}

/**
 * Devuelve la lista de usuarios persistidos en MongoDB,
 * ordenada alfabéticamente por nombre completo.
 *
 * Flujo:
 *   1. Obtener la conexión activa a la base de datos.
 *   2. Leer todos los documentos de la colección `usuarios`.
 *   3. Ordenarlos en memoria por "nombre + apellidos".
 *   4. Serializar cada usuario para no exponer password.
 *
 * Nota:
 *   En esta primera migración mantenemos el ordenado en JavaScript
 *   porque depende del nombre completo concatenado. Más adelante podría
 *   optimizarse si hiciera falta.
 *
 * @returns {Promise<Array<object>>} Usuarios sin password.
 */
export async function listarUsuarios() {
  const db = getDb();
  const coleccionUsuarios = db.collection('usuarios');

  const usuariosDb = await coleccionUsuarios.find({}).toArray();

  const ordenados = [...usuariosDb].sort((a, b) => {
    const nombreA = `${a.nombre} ${a.apellidos}`.toLowerCase();
    const nombreB = `${b.nombre} ${b.apellidos}`.toLowerCase();
    return nombreA.localeCompare(nombreB);
  });

  return ordenados.map(serializarUsuario);
}

/**
 * Busca un usuario persistido en MongoDB por su id numérico.
 *
 * Flujo:
 *   1. Convertir el id recibido a número.
 *   2. Consultar la colección `usuarios` por ese campo `id`.
 *   3. Si existe, devolverlo serializado; si no, devolver null.
 *
 * Importante:
 *   Aunque MongoDB genera automáticamente un `_id`, en esta fase
 *   mantenemos el campo `id` numérico para no romper compatibilidad
 *   con la lógica heredada de Fase 3 y del Producto 2.
 *
 * @param {number|string} id
 * @returns {Promise<object|null>} Usuario sin password, o null si no existe.
 */
export async function buscarUsuarioPorId(id) {
  const db = getDb();
  const coleccionUsuarios = db.collection('usuarios');

  const idNum = Number(id);
  const encontrado = await coleccionUsuarios.findOne({ id: idNum });

  return encontrado ? serializarUsuario(encontrado) : null;
}

/**
 * Busca un usuario persistido en MongoDB por su email
 * (tras normalizarlo de forma case-insensitive).
 *
 * Flujo:
 *   1. Normalizar el email recibido.
 *   2. Buscar en la colección `usuarios` por ese email ya normalizado.
 *   3. Si existe, devolverlo serializado; si no, devolver null.
 *
 * @param {string} email
 * @returns {Promise<object|null>} Usuario sin password, o null si no existe.
 */
export async function buscarUsuarioPorEmail(email) {
  const db = getDb();
  const coleccionUsuarios = db.collection('usuarios');

  const emailNorm = normalizarEmail(email);
  const encontrado = await coleccionUsuarios.findOne({ email: emailNorm });

  return encontrado ? serializarUsuario(encontrado) : null;
}

/**
 * Crea un nuevo usuario en MongoDB tras normalizar y validar los datos de entrada.
 *
 * Flujo:
 *   1. Validar campos obligatorios presentes.
 *   2. Normalizar email (lowercase, trim) y resto de textos.
 *   3. Validar formato email, longitud password y rol permitido.
 *   4. Comprobar en MongoDB que el email no esté ya registrado.
 *   5. Calcular nuevo id autoincremental manteniendo compatibilidad con Fase 3.
 *   6. Insertar en la colección `usuarios`.
 *   7. Devolver el usuario creado sin password.
 *
 * Importante:
 *   En esta fase seguimos usando `id` numérico como identificador funcional
 *   de la API, aunque MongoDB añada también su campo interno `_id`.
 *
 * @param {object} datos
 * @param {string} datos.nombre
 * @param {string} datos.apellidos
 * @param {string} datos.email
 * @param {string} datos.password
 * @param {string} datos.rol
 * @returns {Promise<object>} Usuario creado (sin password).
 * @throws {ValidationError} Si los datos no son válidos.
 * @throws {ConflictError} Si el email ya está registrado.
 */
export async function crearUsuario(datos) {
  const db = getDb();
  const coleccionUsuarios = db.collection('usuarios');

  // 1. Campos obligatorios.
  validarCamposObligatorios(datos, [
    'nombre',
    'apellidos',
    'email',
    'password',
    'rol',
  ]);

  // 2. Normalización.
  const nombre = normalizarTexto(datos.nombre);
  const apellidos = normalizarTexto(datos.apellidos);
  const email = normalizarEmail(datos.email);
  const password = normalizarTexto(datos.password);
  const rol = normalizarTexto(datos.rol).toLowerCase();

  // 3. Validaciones específicas.
  validarEmail(email);
  validarLongitudMinima(password, 4, 'password');
  validarRol(rol);

  // 4. Email único en la colección.
  const existente = await coleccionUsuarios.findOne({ email });
  if (existente) {
    throw new ConflictError('Ya existe un usuario con ese correo electrónico.');
  }

  // 5. Nuevo id autoincremental.
  const ultimoUsuario = await coleccionUsuarios.findOne(
    {},
    { sort: { id: -1 } }
  );

  const siguienteId = ultimoUsuario ? ultimoUsuario.id + 1 : 1;

  // 6. Insertar y devolver.
  const nuevoUsuario = {
    id: siguienteId,
    nombre,
    apellidos,
    email,
    password,
    rol,
  };

  await coleccionUsuarios.insertOne(nuevoUsuario);

  return serializarUsuario(nuevoUsuario);
}

/**
 * Elimina un usuario persistido en MongoDB por su email.
 *
 * Flujo:
 *   1. Normalizar el email recibido.
 *   2. Validar que el email no esté vacío.
 *   3. Buscar el usuario en la colección `usuarios`.
 *   4. Si no existe, lanzar NotFoundError.
 *   5. Eliminar el usuario mediante deleteOne().
 *   6. Devolver el usuario eliminado (serializado).
 *
 * Importante:
 *   MongoDB no devuelve el documento eliminado automáticamente,
 *   por lo que es necesario buscarlo previamente antes de borrarlo.
 *
 * @param {string} email
 * @returns {Promise<object>} Usuario eliminado (sin password).
 * @throws {ValidationError} Si el email no es válido.
 * @throws {NotFoundError} Si no existe ningún usuario con ese email.
 */
export async function eliminarUsuarioPorEmail(email) {
  const db = getDb();
  const coleccionUsuarios = db.collection('usuarios');

  const emailNorm = normalizarEmail(email);

  // 1. Validación básica.
  if (emailNorm === '') {
    throw new ValidationError('Debes indicar el email del usuario a eliminar.');
  }

  // 2. Buscar usuario antes de eliminar.
  const existente = await coleccionUsuarios.findOne({ email: emailNorm });

  if (!existente) {
    throw new NotFoundError(
      `No se encontró ningún usuario con email "${emailNorm}".`
    );
  }

  // 3. Eliminar usuario en MongoDB.
  await coleccionUsuarios.deleteOne({ email: emailNorm });

  // 4. Devolver usuario eliminado sin password.
  return serializarUsuario(existente);
}

/**
 * Autentica a un usuario comprobando email + password en MongoDB.
 *
 * Flujo:
 *   1. Normalizar email y password recibidos.
 *   2. Validar que ambos campos estén informados.
 *   3. Buscar en la colección `usuarios` un documento que coincida
 *      con el email y la contraseña.
 *   4. Si no existe coincidencia, lanzar NotFoundError.
 *   5. Devolver el usuario autenticado sin password.
 *
 * Nota:
 *   En esta fase se mantiene la comparación en texto plano para conservar
 *   compatibilidad con la lógica heredada del Producto 2 y de la Fase 3.
 *   En la Fase 5 se migrará esta autenticación a bcrypt + JWT.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} Usuario autenticado (sin password).
 * @throws {ValidationError} Si faltan credenciales.
 * @throws {NotFoundError} Si las credenciales no coinciden.
 */
export async function loguearUsuario(email, password) {
  const db = getDb();
  const coleccionUsuarios = db.collection('usuarios');

  const emailNorm = normalizarEmail(email);
  const passwordNorm = normalizarTexto(password);

  // 1. Validación básica.
  if (emailNorm === '' || passwordNorm === '') {
    throw new ValidationError('Debes introducir correo y contraseña.');
  }

  // 2. Buscar usuario en MongoDB por email + password.
  const encontrado = await coleccionUsuarios.findOne({
    email: emailNorm,
    password: passwordNorm,
  });

  if (!encontrado) {
    throw new NotFoundError(
      'Credenciales incorrectas. Revisa el correo y la contraseña.'
    );
  }

  // 3. Devolver usuario autenticado sin password.
  return serializarUsuario(encontrado);
}
/**
 * Realiza el login del administrador.
 *
 * A diferencia de loguearUsuario(), esta función está pensada para la Fase 5:
 * - busca el usuario por email,
 * - comprueba que tenga rol "admin",
 * - compara la contraseña escrita con el hash guardado en MongoDB usando bcrypt,
 * - devuelve el usuario si todo es correcto.
 *
 * @param {string} email - Email introducido por el administrador.
 * @param {string} password - Contraseña introducida por el administrador.
 * @returns {Promise<object>} Usuario administrador autenticado.
 * @throws {UnauthorizedError} Si las credenciales son incorrectas o no es admin.
 */
export async function loginAdmin(email, password) {
  const db = getDb();
  const coleccionUsuarios = db.collection('usuarios');

  const emailNorm = normalizarEmail(email);
  const passwordNorm = normalizarTexto(password);

  validarCamposObligatorios(
    { email: emailNorm, password: passwordNorm },
    ['email', 'password']
  );
  validarEmail(emailNorm);

  const usuario = await coleccionUsuarios.findOne({
    email: emailNorm,
  });

  if (!usuario) {
    throw new UnauthorizedError('Credenciales de administrador incorrectas.');
  }

  if (usuario.rol !== 'admin') {
    throw new UnauthorizedError('El usuario no tiene permisos de administrador.');
  }

  const passwordCorrecta = await bcrypt.compare(passwordNorm, usuario.password);

  if (!passwordCorrecta) {
    throw new UnauthorizedError('Credenciales de administrador incorrectas.');
  }

  return serializarUsuario(usuario);
}