/**
 * @file src/models/seleccionadaModel.js
 * @description Capa de acceso a datos para las publicaciones seleccionadas usando Mongoose.
 *
 * Este model gestiona el panel de seleccionadas del dashboard:
 *   - ids seleccionados.
 *   - publicaciones seleccionadas completas.
 *   - publicaciones disponibles.
 *   - resumen numérico del dashboard.
 *
 * En la versión anterior se accedía a MongoDB con el driver nativo:
 *   getDb() -> db.collection('seleccionadas')
 *
 * En Producto 4 se migra a Mongoose:
 *   SeleccionadaMongoose.find()
 *   SeleccionadaMongoose.create()
 *   SeleccionadaMongoose.deleteOne()
 *
 * Se mantienen los mismos nombres de funciones y retornos para no modificar
 * los resolvers de GraphQL.
 */

import { SeleccionadaMongoose } from '../mongoose/models/Seleccionada.js';

import * as publicacionModel from './publicacionModel.js';
import * as usuarioModel from './usuarioModel.js';

import { ValidationError, NotFoundError } from '../utils/errors.js';

/**
 * Limpia una selección Mongoose eliminando campos internos de MongoDB.
 *
 * Aunque normalmente este model devuelve ids o publicaciones completas,
 * esta función queda como referencia de serialización si más adelante se
 * necesitara exponer una selección como objeto.
 *
 * @param {object} seleccionada
 * @returns {object}
 */
function serializarSeleccionada(seleccionada) {
  const obj = seleccionada.toObject ? seleccionada.toObject() : seleccionada;

  delete obj._id;
  delete obj.__v;

  return { ...obj };
}

/**
 * Devuelve los ids de las publicaciones actualmente seleccionadas,
 * en el orden en que fueron añadidas.
 *
 * @returns {Promise<Array<number>>}
 */
export async function listarIdsSeleccionados() {
  const seleccionadas = await SeleccionadaMongoose
    .find({})
    .sort({ fechaSeleccion: 1 });

  return seleccionadas.map((s) => Number(s.publicacionId));
}

/**
 * Devuelve las publicaciones seleccionadas como objetos completos,
 * ordenadas por fecha de selección descendente.
 *
 * Este model solo guarda los ids seleccionados.
 * Para devolver objetos completos, cruza esos ids con publicacionModel.
 *
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicacionesSeleccionadas() {
  const seleccionadas = await SeleccionadaMongoose
    .find({})
    .sort({ fechaSeleccion: -1 });

  const publicaciones = await publicacionModel.listarPublicaciones();
  const porId = new Map();

  for (const pub of publicaciones) {
    porId.set(Number(pub.id), pub);
  }

  return seleccionadas
    .map((s) => porId.get(Number(s.publicacionId)))
    .filter((pub) => pub !== undefined);
}

/**
 * Devuelve las publicaciones que todavía NO están seleccionadas,
 * en el mismo orden que listarPublicaciones().
 *
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicacionesDisponibles() {
  const idsSeleccionados = new Set(
    (await listarIdsSeleccionados()).map(Number)
  );

  const publicaciones = await publicacionModel.listarPublicaciones();

  return publicaciones.filter((pub) => !idsSeleccionados.has(Number(pub.id)));
}

/**
 * Añade una publicación al panel de seleccionadas.
 *
 * Validaciones:
 *   - El id debe ser un número entero positivo.
 *   - La publicación debe existir.
 *   - Si ya estaba seleccionada, no se duplica.
 *
 * Mongoose refuerza esto con unique en publicacionId.
 *
 * @param {number|string} idPublicacion
 * @returns {Promise<object>}
 * @throws {ValidationError}
 * @throws {NotFoundError}
 */
export async function anadirSeleccionada(idPublicacion) {
  const idNum = Number(idPublicacion);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  const publicacion = await publicacionModel.buscarPublicacionPorId(idNum);

  if (!publicacion) {
    throw new NotFoundError(`No existe la publicación con id ${idNum}.`);
  }

  const yaSeleccionada = await SeleccionadaMongoose.findOne({
    publicacionId: idNum,
  });

  if (!yaSeleccionada) {
    await SeleccionadaMongoose.create({
      publicacionId: idNum,
      fechaSeleccion: new Date().toISOString(),
    });
  }

  return publicacion;
}

/**
 * Quita una publicación del panel de seleccionadas.
 *
 * @param {number|string} idPublicacion
 * @returns {Promise<object>}
 * @throws {ValidationError}
 * @throws {NotFoundError}
 */
export async function quitarSeleccionada(idPublicacion) {
  const idNum = Number(idPublicacion);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  const eliminada = await SeleccionadaMongoose.findOneAndDelete({
    publicacionId: idNum,
  });

  if (!eliminada) {
    throw new NotFoundError(`La publicación con id ${idNum} no estaba seleccionada.`);
  }

  const publicacion = await publicacionModel.buscarPublicacionPorId(idNum);

  return publicacion || { id: idNum };
}

/**
 * Limpia todas las seleccionadas que apuntan a publicaciones inexistentes.
 *
 * @returns {Promise<number>}
 */
export async function limpiarSeleccionesHuerfanas() {
  const publicaciones = await publicacionModel.listarPublicaciones();
  const idsExistentes = new Set(publicaciones.map((p) => Number(p.id)));

  const seleccionadas = await SeleccionadaMongoose.find({});

  const huerfanas = seleccionadas
    .map(serializarSeleccionada)
    .filter((s) => !idsExistentes.has(Number(s.publicacionId)));

  if (huerfanas.length > 0) {
    await SeleccionadaMongoose.deleteMany({
      publicacionId: {
        $in: huerfanas.map((s) => Number(s.publicacionId)),
      },
    });
  }

  return huerfanas.length;
}

/**
 * Devuelve el resumen numérico para el dashboard del Producto 2.
 *
 * @returns {Promise<{totalOfertas: number, totalDemandas: number, totalUsuarios: number, totalSeleccionadas: number}>}
 */
export async function obtenerResumenDashboard() {
  const recuento = await publicacionModel.contarPublicaciones();
  const usuarios = await usuarioModel.listarUsuarios();

  const totalSeleccionadas = await SeleccionadaMongoose.countDocuments({});

  return {
    totalOfertas: recuento.ofertas,
    totalDemandas: recuento.demandas,
    totalUsuarios: usuarios.length,
    totalSeleccionadas,
  };
}