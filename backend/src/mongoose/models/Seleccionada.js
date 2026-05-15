/**
 * @file src/mongoose/models/Seleccionada.js
 * @description Modelo Mongoose para la colección seleccionadas.
 *
 * Este modelo forma parte de la migración progresiva del Producto 4 hacia
 * Mongoose ODM.
 *
 * Objetivos:
 * - Mantener compatibilidad con la colección existente "seleccionadas".
 * - Respetar la lógica actual basada en publicacionId.
 * - Evitar duplicados de publicaciones seleccionadas.
 * - Añadir validaciones declarativas propias de Mongoose.
 * - Normalizar la fecha de selección.
 * - Aplicar índices útiles para consultas del dashboard.
 * - Aplicar el plugin cleanJsonPlugin para una salida JSON homogénea.
 *
 * Nota técnica:
 * Actualmente las seleccionadas se gestionan de forma global mediante
 * publicacionId. En una fase posterior, si se requiere selección por usuario,
 * se podrá incorporar usuarioId de forma obligatoria y cambiar el índice único
 * a { usuarioId, publicacionId }.
 */

import mongoose from 'mongoose';

import { cleanJsonPlugin } from '../plugins/index.js';

const { Schema } = mongoose;

/**
 * Schema principal de Seleccionada.
 *
 * Se usa collection: 'seleccionadas' para apuntar exactamente a la colección
 * que ya utiliza el backend.
 *
 * El campo publicacionId se mantiene como Number porque las publicaciones del
 * proyecto trabajan con un id numérico propio, no con el _id de MongoDB.
 */
const seleccionadaSchema = new Schema(
  {
    publicacionId: {
      type: Number,
      required: [true, 'El id de la publicación seleccionada es obligatorio.'],
      min: [1, 'El id de la publicación seleccionada debe ser mayor o igual que 1.'],
    },

    /**
     * Campo reservado para una evolución futura del Producto 4.
     *
     * Actualmente no se exige para no romper la lógica existente:
     * - anadirSeleccionada(idPublicacion)
     * - quitarSeleccionada(idPublicacion)
     *
     * Si más adelante se implementa selección individual por usuario,
     * este campo podrá pasar a ser obligatorio.
     */
    usuarioId: {
      type: Number,
      required: false,
      min: [1, 'El id del usuario debe ser mayor o igual que 1.'],
    },

    fechaSeleccion: {
      type: String,
      required: [true, 'La fecha de selección es obligatoria.'],
      trim: true,
      default: () => new Date().toISOString(),
      match: [
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        'La fecha de selección debe estar en formato ISO completo.',
      ],
    },
  },
  {
    collection: 'seleccionadas',
    timestamps: true,
    id: false,
  }
);

// =============================================================
// Índices
// =============================================================

/**
 * Mientras las seleccionadas sean globales, una publicación no debe poder
 * seleccionarse dos veces.
 */
seleccionadaSchema.index({ publicacionId: 1 }, { unique: true });

/**
 * Índices útiles para consultas de dashboard y ordenación.
 */
seleccionadaSchema.index({ fechaSeleccion: -1 });
seleccionadaSchema.index({ usuarioId: 1 }, { sparse: true });

// =============================================================
// Hooks
// =============================================================

/**
 * Normaliza la fecha de selección antes de validar.
 *
 * Permite recibir:
 * - una fecha Date;
 * - una cadena ISO válida;
 * - ausencia de fecha, en cuyo caso se genera automáticamente.
 */
seleccionadaSchema.pre('validate', function normalizarSeleccionada() {
  if (!this.fechaSeleccion) {
    this.fechaSeleccion = new Date().toISOString();
    return;
  }

  if (this.fechaSeleccion instanceof Date) {
    this.fechaSeleccion = this.fechaSeleccion.toISOString();
    return;
  }

  if (typeof this.fechaSeleccion === 'string') {
    this.fechaSeleccion = this.fechaSeleccion.trim();
  }
});

// =============================================================
// Métodos estáticos
// =============================================================

/**
 * Devuelve los ids numéricos de las publicaciones seleccionadas.
 *
 * Este método no sustituye todavía al model antiguo, pero deja preparada
 * una utilidad reutilizable para futuras migraciones de resolvers.
 *
 * @returns {Promise<number[]>} Lista de ids de publicaciones seleccionadas.
 */
seleccionadaSchema.statics.obtenerIdsPublicaciones = async function obtenerIdsPublicaciones() {
  const seleccionadas = await this.find({})
    .sort({ fechaSeleccion: 1 })
    .select('publicacionId')
    .lean();

  return seleccionadas.map((seleccionada) => Number(seleccionada.publicacionId));
};

// =============================================================
// Plugins
// =============================================================

seleccionadaSchema.plugin(cleanJsonPlugin);

// =============================================================
// Modelo
// =============================================================

export const SeleccionadaMongoose =
  mongoose.models.Seleccionada || mongoose.model('Seleccionada', seleccionadaSchema);