/**
 * @file src/models/seleccionadaModel.js
 * @description Capa de acceso a datos para las publicaciones seleccionadas.
 *
 * Porta al backend la lógica del dashboard del Producto 2:
 *   - qué publicaciones están "marcadas" en el panel de selección.
 *   - cuáles están disponibles (aún no seleccionadas).
 *   - recuento total para las cajitas del resumen del dashboard.
 *
 * ⚠️ Estado actual:
 *   La estructura de seleccionadas sigue en memoria, pero este model ya se ha
 *   adaptado para trabajar correctamente con `publicacionModel` y `usuarioModel`,
 *   que en Fase 4 ya operan de forma asíncrona contra MongoDB.
 *
 * Dependencias:
 *   - Importa publicacionModel y usuarioModel para componer respuestas
 *     enriquecidas (ej: listarPublicacionesSeleccionadas devuelve las publicaciones
 *     completas, no solo ids).
 */

import { getDb } from '../config/db.js';
import * as publicacionModel from './publicacionModel.js';
import * as usuarioModel from './usuarioModel.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

/**
 * Devuelve los ids de las publicaciones actualmente seleccionadas,
 * en el orden en que fueron añadidas.
 *
 * @returns {Promise<Array<number>>}
 */
export async function listarIdsSeleccionados() {
  const db = getDb();
  const coleccionSeleccionadas = db.collection('seleccionadas');

  const seleccionadasDb = await coleccionSeleccionadas
    .find({})
    .sort({ fechaSeleccion: 1 })
    .toArray();

  return seleccionadasDb.map((s) => Number(s.publicacionId));
}

/**
 * Devuelve las publicaciones seleccionadas como objetos completos,
 * ordenadas por fecha de selección descendente (más recientes primero).
 *
 * @returns {Promise<Array<object>>}
 */
export async function listarPublicacionesSeleccionadas() {
  const db = getDb();
  const coleccionSeleccionadas = db.collection('seleccionadas');

  const seleccionadasDb = await coleccionSeleccionadas
    .find({})
    .sort({ fechaSeleccion: -1 })
    .toArray();

  const publicaciones = await publicacionModel.listarPublicaciones();
  const porId = new Map();

  for (const pub of publicaciones) {
    porId.set(Number(pub.id), pub);
  }

  return seleccionadasDb
    .map((s) => porId.get(Number(s.publicacionId)))
    .filter((pub) => pub !== undefined);
}

/**
 * Devuelve las publicaciones que todavía NO están seleccionadas,
 * en el mismo orden que listarPublicaciones() (por fecha desc).
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
 *   - El id debe ser un número válido.
 *   - La publicación debe existir en publicacionModel.
 *   - Si ya estaba seleccionada, la operación es idempotente.
 *
 * @param {number|string} idPublicacion
 * @returns {Promise<object>} La publicación seleccionada.
 * @throws {ValidationError}
 * @throws {NotFoundError}
 */
export async function anadirSeleccionada(idPublicacion) {
  const db = getDb();
  const coleccionSeleccionadas = db.collection('seleccionadas');

  const idNum = Number(idPublicacion);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  const publicacion = await publicacionModel.buscarPublicacionPorId(idNum);

  if (!publicacion) {
    throw new NotFoundError(`No existe la publicación con id ${idNum}.`);
  }

  const yaSeleccionada = await coleccionSeleccionadas.findOne({
    publicacionId: idNum,
  });

  if (!yaSeleccionada) {
    await coleccionSeleccionadas.insertOne({
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
 * @returns {Promise<object>} La publicación que se quitó.
 * @throws {ValidationError}
 * @throws {NotFoundError}
 */
export async function quitarSeleccionada(idPublicacion) {
  const db = getDb();
  const coleccionSeleccionadas = db.collection('seleccionadas');

  const idNum = Number(idPublicacion);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    throw new ValidationError('El identificador de la publicación no es válido.');
  }

  const seleccionada = await coleccionSeleccionadas.findOne({
    publicacionId: idNum,
  });

  if (!seleccionada) {
    throw new NotFoundError(`La publicación con id ${idNum} no estaba seleccionada.`);
  }

  await coleccionSeleccionadas.deleteOne({ publicacionId: idNum });

  const publicacion = await publicacionModel.buscarPublicacionPorId(idNum);

  return publicacion || { id: idNum };
}

/**
 * Limpia todas las seleccionadas que apuntan a publicaciones inexistentes.
 *
 * @returns {Promise<number>} Cantidad de selecciones huérfanas eliminadas.
 */
export async function limpiarSeleccionesHuerfanas() {
  const db = getDb();
  const coleccionSeleccionadas = db.collection('seleccionadas');

  const publicaciones = await publicacionModel.listarPublicaciones();
  const idsExistentes = new Set(publicaciones.map((p) => Number(p.id)));

  const seleccionadasDb = await coleccionSeleccionadas.find({}).toArray();

  const huerfanas = seleccionadasDb.filter(
    (s) => !idsExistentes.has(Number(s.publicacionId))
  );

  if (huerfanas.length > 0) {
    await coleccionSeleccionadas.deleteMany({
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
  const db = getDb();
  const coleccionSeleccionadas = db.collection('seleccionadas');

  const recuento = await publicacionModel.contarPublicaciones();
  const usuarios = await usuarioModel.listarUsuarios();
  const totalSeleccionadas = await coleccionSeleccionadas.countDocuments({});

  return {
    totalOfertas: recuento.ofertas,
    totalDemandas: recuento.demandas,
    totalUsuarios: usuarios.length,
    totalSeleccionadas,
  };
}