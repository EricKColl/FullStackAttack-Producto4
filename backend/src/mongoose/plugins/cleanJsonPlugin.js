/**
 * @file src/mongoose/plugins/cleanJsonPlugin.js
 * @description Plugin reutilizable de Mongoose para limpiar la salida JSON
 * de los documentos antes de enviarlos al frontend o a GraphQL.
 *
 * Objetivo:
 * - Mantener el campo id si el documento ya lo tiene.
 * - Convertir _id en id solo cuando no exista un id propio.
 * - Eliminar _id.
 * - Eliminar __v.
 * - Mantener virtuals si el schema los usa.
 *
 * Esto permite que los modelos Mongoose devuelvan objetos más limpios
 * y coherentes con el formato que ya utiliza GraphQL en el proyecto.
 */

/**
 * Plugin que normaliza la salida JSON y Object de un schema Mongoose.
 *
 * @param {import('mongoose').Schema} schema - Schema de Mongoose al que se aplica el plugin.
 * @returns {void}
 */
export function cleanJsonPlugin(schema) {
  function transformDocument(_doc, ret) {
    if (ret._id && ret.id === undefined) {
      ret.id = ret._id.toString();
    }

    delete ret._id;
    delete ret.__v;

    return ret;
  }

  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: transformDocument,
  });

  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
    transform: transformDocument,
  });
}