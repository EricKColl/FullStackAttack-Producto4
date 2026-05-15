/**
 * @file src/models/publicacionModel.js
 * @description Capa de acceso a datos para la entidad Publicación usando Mongoose.
 *
 * Este archivo actúa como puente entre los resolvers de GraphQL y la base de datos.
 *
 * En fases anteriores, este model trabajaba directamente con el driver nativo de MongoDB
 * mediante getDb() y db.collection('publicaciones').
 *
 * En el Producto 4, esta capa se migra a Mongoose para cumplir el requisito de usar
 * un ODM (Object Document Mapper). Gracias a Mongoose podemos trabajar con modelos,
 * schemas, validaciones, índices y métodos más estructurados.
 *
 * IMPORTANTE:
 *   - Se mantienen los mismos nombres de funciones públicas.
 *   - Se mantienen los mismos parámetros.
 *   - Se mantienen los mismos datos de retorno.
 *
 * De esta forma, los resolvers de GraphQL no necesitan cambiar.
 * Solo cambiamos la implementación interna del model.
 *
 * Entidad relacionada:
 *   - PublicacionMongoose representa la colección `publicaciones`.
 *   - seleccionadaModel puede utilizar publicaciones para mostrar el dashboard.
 *
 * Compatibilidad:
 *   - Se conserva el campo `id` numérico para no romper el frontend ni GraphQL.
 *   - MongoDB también genera `_id`, pero no se expone hacia capas superiores.
 */

import { PublicacionMongoose } from '../mongoose/models/Publicacion.js';

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
 * Devuelve una copia limpia de una publicación.
 *
 * Mongoose devuelve documentos con información interna como `_id` y `__v`.
 * Como GraphQL y el frontend trabajan con el campo `id` numérico, eliminamos
 * esos campos internos antes de devolver la publicación.
 *
 * También se mantiene una copia defensiva para evitar mutaciones accidentales
 * desde resolvers u otras capas.
 *
 * @param {object} publicacion Documento Mongoose o objeto plano.
 * @returns {object} Publicación serializada.
 */
function serializarPublicacion(publicacion) {
  const obj = publicacion.toObject ? publicacion.toObject() : publicacion;

  delete obj._id;
  delete obj.__v;

  return { ...obj };
}

/**
 * Devuelve todas las publicaciones almacenadas en MongoDB mediante Mongoose.
 *
 * Orden:
 *   1. Fecha descendente.
 *   2. Id descendente en caso de empate.
 *
 * Antes se hacía con:
 *   db.collection('publicaciones').find({}).toArray()
 *
 * Ahora se hace con:
 *   PublicacionMongoose.find({})
 *
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicaciones() {
  const publicaciones = await PublicacionMongoose
    .find({})
    .sort({ fecha: -1, id: -1 });

  return publicaciones.map(serializarPublicacion);
}

/**
 * Busca una publicación por su id numérico.
 *
 * Se convierte el id recibido a Number porque GraphQL puede recibirlo como string
 * al venir definido como ID.
 *
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
export async function buscarPublicacionPorId(id) {
  const idNum = Number(id);

  const encontrada = await PublicacionMongoose.findOne({ id: idNum });

  return encontrada ? serializarPublicacion(encontrada) : null;
}

/**
 * Lista publicaciones filtradas por tipo.
 *
 * Tipos permitidos:
 *   - oferta
 *   - demanda
 *
 * Se valida antes de consultar para evitar búsquedas incorrectas.
 *
 * @param {string} tipo
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicacionesPorTipo(tipo) {
  validarTipoPublicacion(tipo);

  const tipoNorm = normalizarTexto(tipo).toLowerCase();

  const publicaciones = await PublicacionMongoose
    .find({ tipo: tipoNorm })
    .sort({ fecha: -1, id: -1 });

  return publicaciones.map(serializarPublicacion);
}

/**
 * Crea una nueva publicación usando Mongoose.
 *
 * Flujo:
 *   1. Validar campos obligatorios.
 *   2. Normalizar textos y email.
 *   3. Aplicar validaciones específicas.
 *   4. Calcular el siguiente id numérico.
 *   5. Crear el documento con PublicacionMongoose.create().
 *   6. Devolver la publicación serializada.
 *
 * Se mantiene el id autoincremental manual porque el frontend y GraphQL heredados
 * trabajan con `id`, no con `_id`.
 *
 * @param {object} datos
 * @returns {Promise<object>}
 * @throws {ValidationError}
 */
export async function crearPublicacion(datos) {
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

  const tipo = normalizarTexto(datos.tipo).toLowerCase();
  const titulo = normalizarTexto(datos.titulo);
  const categoria = normalizarTexto(datos.categoria);
  const autor = normalizarTexto(datos.autor);
  const ubicacion = normalizarTexto(datos.ubicacion);
  const descripcion = normalizarTexto(datos.descripcion);
  const emailContacto = normalizarEmail(datos.emailContacto);
  const fecha = normalizarTexto(datos.fecha);

  validarTipoPublicacion(tipo);
  validarEmail(emailContacto);
  validarFechaISO(fecha);
  validarLongitudMinima(descripcion, 10, 'descripcion');

  const ultimaPublicacion = await PublicacionMongoose
    .findOne({})
    .sort({ id: -1 });

  const siguienteId = ultimaPublicacion ? ultimaPublicacion.id + 1 : 1;

  const nueva = await PublicacionMongoose.create({
    id: siguienteId,
    tipo,
    titulo,
    categoria,
    autor,
    ubicacion,
    descripcion,
    emailContacto,
    fecha,
  });

  return serializarPublicacion(nueva);
}

/**
 * Elimina una publicación por su id.
 *
 * Flujo:
 *   1. Convertir el id a número.
 *   2. Validar que sea entero positivo.
 *   3. Buscar y eliminar con findOneAndDelete().
 *   4. Si no existe, lanzar NotFoundError.
 *   5. Devolver la publicación eliminada.
 *
 * findOneAndDelete() permite recuperar el documento eliminado en una sola operación.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {ValidationError}
 * @throws {NotFoundError}
 */
export async function eliminarPublicacionPorId(id) {
  const idNum = Number(id);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  const eliminada = await PublicacionMongoose.findOneAndDelete({ id: idNum });

  if (!eliminada) {
    throw new NotFoundError(`No se encontró ninguna publicación con id ${idNum}.`);
  }

  return serializarPublicacion(eliminada);
}

/**
 * Cuenta publicaciones por tipo.
 *
 * Se usa en el resumen del dashboard para mostrar:
 *   - total de ofertas
 *   - total de demandas
 *   - total general
 *
 * @returns {Promise<{ofertas: number, demandas: number, total: number}>}
 */
export async function contarPublicaciones() {
  const ofertas = await PublicacionMongoose.countDocuments({ tipo: 'oferta' });
  const demandas = await PublicacionMongoose.countDocuments({ tipo: 'demanda' });
  const total = await PublicacionMongoose.countDocuments({});

  return {
    ofertas,
    demandas,
    total,
  };
}