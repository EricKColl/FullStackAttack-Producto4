/**
 * @file src/models/publicacionModel.js
 * @description Capa de acceso a datos para la entidad Publicación (oferta/demanda).
 *
 * Porta al backend la lógica de `almacenaje.js` del Producto 2 relacionada
 * con publicaciones (listarPublicaciones, crearPublicacion, eliminarPublicacion).
 *
 * Estado actual (Fase 4):
 *   La entidad Publicacion ya persiste en MongoDB.
 *   La lógica de validación, normalización y serialización se mantiene,
 *   pero la capa de almacenamiento en memoria ha sido sustituida por
 *   operaciones reales sobre la colección `publicaciones`.
 *
 * Relación con otras entidades:
 *   - Una publicación puede estar seleccionada por el dashboard (ver seleccionadaModel).
 *   - Al eliminar una publicación, se debe limpiar también su selección
 *     (esa coordinación la hará el resolver, no el model).
 *
 * Diseño:
 *   - Las funciones reciben datos crudos, los normalizan y validan.
 *   - Si los datos no pasan validación, lanzan ValidationError.
 *   - Si el recurso no existe, lanzan NotFoundError.
 *   - Devuelven copias (no referencias) para evitar mutaciones accidentales
 *     desde capas superiores.
 *   - Mantienen el campo `id` numérico para no romper compatibilidad con
 *     la lógica heredada de Fase 3 y del Producto 2.
 */

import { getDb } from '../config/db.js';

import {
  normalizarTexto,
  normalizarEmail,
  validarCamposObligatorios,
  validarEmail,
  validarFechaISO,
  validarLongitudMinima,
  validarTipoPublicacion,
} from '../utils/validators.js';
import {
  ValidationError,
  NotFoundError,
} from '../utils/errors.js';

/**
 * Devuelve una copia defensiva de una publicación.
 * Aunque no tiene datos sensibles como una contraseña, seguimos el mismo patrón
 * que con Usuario para que las mutaciones externas nunca afecten al estado interno.
 *
 * @param {object} publicacion
 * @returns {object}
 */
function serializarPublicacion(publicacion) {
  return { ...publicacion };
}

/**
 * Devuelve todas las publicaciones persistidas en MongoDB,
 * ordenadas por fecha descendente.
 *
 * En caso de empate en fecha, ordena por id descendente
 * (más reciente primero).
 *
 * Flujo:
 *   1. Obtener la conexión activa a la base de datos.
 *   2. Leer todos los documentos de la colección `publicaciones`.
 *   3. Ordenarlos en memoria por fecha descendente y, en empate, por id.
 *   4. Serializar cada publicación para devolver copias defensivas.
 *
 * Nota:
 *   Se mantiene el ordenado en JavaScript para conservar exactamente
 *   el mismo comportamiento de la Fase 3.
 *
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicaciones() {
  const db = getDb();
  const coleccionPublicaciones = db.collection('publicaciones');

  const publicacionesDb = await coleccionPublicaciones.find({}).toArray();

  const ordenadas = [...publicacionesDb].sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime();
    const fechaB = new Date(b.fecha).getTime();

    if (fechaA !== fechaB) {
      return fechaB - fechaA;
    }

    return b.id - a.id;
  });

  return ordenadas.map(serializarPublicacion);
}

/**
 * Busca una publicación persistida en MongoDB por su id numérico.
 *
 * Flujo:
 *   1. Convertir el id recibido a número.
 *   2. Consultar la colección `publicaciones` por ese campo `id`.
 *   3. Si existe, devolverla serializada; si no, devolver null.
 *
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
export async function buscarPublicacionPorId(id) {
  const db = getDb();
  const coleccionPublicaciones = db.collection('publicaciones');

  const idNum = Number(id);
  const encontrada = await coleccionPublicaciones.findOne({ id: idNum });

  return encontrada ? serializarPublicacion(encontrada) : null;
}

/**
 * Filtra publicaciones persistidas en MongoDB por tipo
 * ("oferta" o "demanda").
 *
 * Flujo:
 *   1. Validar el tipo recibido.
 *   2. Normalizar el tipo.
 *   3. Consultar la colección `publicaciones` por ese campo.
 *   4. Ordenar los resultados con la misma lógica de la Fase 3.
 *   5. Devolver copias serializadas.
 *
 * @param {string} tipo
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicacionesPorTipo(tipo) {
  const db = getDb();
  const coleccionPublicaciones = db.collection('publicaciones');

  validarTipoPublicacion(tipo);
  const tipoNorm = normalizarTexto(tipo).toLowerCase();

  const publicacionesDb = await coleccionPublicaciones
    .find({ tipo: tipoNorm })
    .toArray();

  const ordenadas = [...publicacionesDb].sort((a, b) => {
    const fechaA = new Date(a.fecha).getTime();
    const fechaB = new Date(b.fecha).getTime();

    if (fechaA !== fechaB) {
      return fechaB - fechaA;
    }

    return b.id - a.id;
  });

  return ordenadas.map(serializarPublicacion);
}

/**
 * Crea una nueva publicación en MongoDB tras normalizar y validar los datos.
 *
 * Flujo:
 *   1. Validar campos obligatorios presentes.
 *   2. Normalizar textos y email.
 *   3. Validar tipo, formato email, longitud descripción y fecha ISO.
 *   4. Calcular nuevo id autoincremental manteniendo compatibilidad con Fase 3.
 *   5. Insertar en la colección `publicaciones`.
 *   6. Devolver la publicación creada.
 *
 * Importante:
 *   En esta fase seguimos usando `id` numérico como identificador funcional
 *   de la API, aunque MongoDB añada también su campo interno `_id`.
 *
 * @param {object} datos
 * @returns {Promise<object>} Publicación creada.
 * @throws {ValidationError}
 */
export async function crearPublicacion(datos) {
  const db = getDb();
  const coleccionPublicaciones = db.collection('publicaciones');

  // 1. Campos obligatorios.
  validarCamposObligatorios(datos, [
    'tipo',
    'titulo',
    'categoria',
    'autor',
    'ubicacion',
    'descripcion',
    'emailContacto',
    'fecha',
  ]);

  // 2. Normalización.
  const tipo = normalizarTexto(datos.tipo).toLowerCase();
  const titulo = normalizarTexto(datos.titulo);
  const categoria = normalizarTexto(datos.categoria);
  const autor = normalizarTexto(datos.autor);
  const ubicacion = normalizarTexto(datos.ubicacion);
  const descripcion = normalizarTexto(datos.descripcion);
  const emailContacto = normalizarEmail(datos.emailContacto);
  const fecha = normalizarTexto(datos.fecha);

  // 3. Validaciones específicas.
  validarTipoPublicacion(tipo);
  validarEmail(emailContacto);
  validarFechaISO(fecha);
  validarLongitudMinima(descripcion, 10, 'descripcion');

  // 4. Nuevo id autoincremental.
  const ultimaPublicacion = await coleccionPublicaciones.findOne(
    {},
    { sort: { id: -1 } }
  );

  const siguienteId = ultimaPublicacion ? ultimaPublicacion.id + 1 : 1;

  // 5. Insertar y devolver.
  const nueva = {
    id: siguienteId,
    tipo,
    titulo,
    categoria,
    autor,
    ubicacion,
    descripcion,
    emailContacto,
    fecha,
  };

  await coleccionPublicaciones.insertOne(nueva);

  return serializarPublicacion(nueva);
}

/**
 * Elimina una publicación persistida en MongoDB por su id.
 *
 * Flujo:
 *   1. Convertir el id recibido a número.
 *   2. Validar que el id sea un entero positivo.
 *   3. Buscar la publicación en la colección `publicaciones`.
 *   4. Si no existe, lanzar NotFoundError.
 *   5. Eliminarla mediante deleteOne().
 *   6. Devolver la publicación eliminada.
 *
 * Importante:
 *   MongoDB no devuelve automáticamente el documento borrado,
 *   por lo que primero debemos localizarlo y después eliminarlo.
 *
 * @param {number|string} id
 * @returns {Promise<object>} Publicación eliminada.
 * @throws {ValidationError} Si el id no es un número válido.
 * @throws {NotFoundError} Si no existe publicación con ese id.
 */
export async function eliminarPublicacionPorId(id) {
  const db = getDb();
  const coleccionPublicaciones = db.collection('publicaciones');

  const idNum = Number(id);

  // 1. Validar identificador.
  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  // 2. Buscar antes de eliminar.
  const existente = await coleccionPublicaciones.findOne({ id: idNum });

  if (!existente) {
    throw new NotFoundError(`No se encontró ninguna publicación con id ${idNum}.`);
  }

  // 3. Eliminar en MongoDB.
  await coleccionPublicaciones.deleteOne({ id: idNum });

  // 4. Devolver copia defensiva.
  return serializarPublicacion(existente);
}

/**
 * Devuelve el número de publicaciones por tipo
 * usando la colección `publicaciones` de MongoDB.
 *
 * Se utiliza en el resumen del dashboard
 * (consumido por la entidad Seleccionada).
 *
 * @returns {Promise<{ofertas: number, demandas: number, total: number}>}
 */
export async function contarPublicaciones() {
  const db = getDb();
  const coleccionPublicaciones = db.collection('publicaciones');

  const ofertas = await coleccionPublicaciones.countDocuments({ tipo: 'oferta' });
  const demandas = await coleccionPublicaciones.countDocuments({ tipo: 'demanda' });
  const total = await coleccionPublicaciones.countDocuments({});

  return {
    ofertas,
    demandas,
    total,
  };
}