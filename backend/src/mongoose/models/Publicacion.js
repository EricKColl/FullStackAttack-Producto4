/**
 * @file src/mongoose/models/Publicacion.js
 * @description Modelo Mongoose para la colección publicaciones.
 *
 * Este modelo forma parte de la migración progresiva del Producto 4 hacia
 * Mongoose ODM.
 *
 * Objetivos:
 * - Mantener compatibilidad con la colección existente "publicaciones".
 * - Respetar el campo id numérico utilizado por GraphQL y por el frontend.
 * - Añadir validaciones declarativas propias de Mongoose.
 * - Normalizar campos antes de validar.
 * - Aplicar índices útiles para búsquedas y dashboard.
 * - Aplicar el plugin cleanJsonPlugin para una salida JSON homogénea.
 */

import mongoose from 'mongoose';

import { cleanJsonPlugin } from '../plugins/index.js';

const { Schema } = mongoose;

const TIPOS_PUBLICACION = ['oferta', 'demanda'];

/**
 * Schema principal de Publicación.
 *
 * Se usa collection: 'publicaciones' para apuntar exactamente a la misma
 * colección que ya utiliza el backend.
 *
 * Se usa id: false para desactivar el virtual id automático de Mongoose,
 * porque este proyecto ya trabaja con su propio campo id numérico.
 */
const publicacionSchema = new Schema(
  {
    id: {
      type: Number,
      required: [true, 'El id de la publicación es obligatorio.'],
      min: [1, 'El id de la publicación debe ser mayor o igual que 1.'],
    },

    tipo: {
      type: String,
      required: [true, 'El tipo de publicación es obligatorio.'],
      trim: true,
      lowercase: true,
      enum: {
        values: TIPOS_PUBLICACION,
        message: `El tipo debe ser uno de: ${TIPOS_PUBLICACION.join(', ')}.`,
      },
    },

    titulo: {
      type: String,
      required: [true, 'El título de la publicación es obligatorio.'],
      trim: true,
      minlength: [4, 'El título debe tener al menos 4 caracteres.'],
      maxlength: [120, 'El título no puede superar los 120 caracteres.'],
    },

    categoria: {
      type: String,
      required: [true, 'La categoría de la publicación es obligatoria.'],
      trim: true,
      minlength: [2, 'La categoría debe tener al menos 2 caracteres.'],
      maxlength: [80, 'La categoría no puede superar los 80 caracteres.'],
    },

    autor: {
      type: String,
      required: [true, 'El autor de la publicación es obligatorio.'],
      trim: true,
      minlength: [2, 'El autor debe tener al menos 2 caracteres.'],
      maxlength: [100, 'El autor no puede superar los 100 caracteres.'],
    },

    ubicacion: {
      type: String,
      required: [true, 'La ubicación de la publicación es obligatoria.'],
      trim: true,
      minlength: [2, 'La ubicación debe tener al menos 2 caracteres.'],
      maxlength: [100, 'La ubicación no puede superar los 100 caracteres.'],
    },

    descripcion: {
      type: String,
      required: [true, 'La descripción de la publicación es obligatoria.'],
      trim: true,
      minlength: [10, 'La descripción debe tener al menos 10 caracteres.'],
      maxlength: [1000, 'La descripción no puede superar los 1000 caracteres.'],
    },

    emailContacto: {
      type: String,
      required: [true, 'El email de contacto es obligatorio.'],
      trim: true,
      lowercase: true,
      maxlength: [120, 'El email de contacto no puede superar los 120 caracteres.'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'El email de contacto no tiene un formato válido.',
      ],
    },

    fecha: {
      type: String,
      required: [true, 'La fecha de la publicación es obligatoria.'],
      trim: true,
      match: [
        /^\d{4}-\d{2}-\d{2}$/,
        'La fecha debe tener formato ISO corto YYYY-MM-DD.',
      ],
    },
  },
  {
    collection: 'publicaciones',
    timestamps: true,
    id: false,
  }
);

// =============================================================
// Índices
// =============================================================

publicacionSchema.index({ id: 1 }, { unique: true });
publicacionSchema.index({ tipo: 1 });
publicacionSchema.index({ categoria: 1 });
publicacionSchema.index({ fecha: -1 });
publicacionSchema.index({ tipo: 1, fecha: -1 });

// =============================================================
// Hooks
// =============================================================

/**
 * Normaliza campos de texto antes de validar.
 *
 * Esta normalización complementa las validaciones ya existentes en
 * src/utils/validators.js y evita que se guarden espacios innecesarios
 * o emails con mayúsculas.
 */
publicacionSchema.pre('validate', function normalizarPublicacion(next) {
  if (this.tipo) {
    this.tipo = this.tipo.trim().toLowerCase();
  }

  if (this.titulo) {
    this.titulo = this.titulo.trim();
  }

  if (this.categoria) {
    this.categoria = this.categoria.trim();
  }

  if (this.autor) {
    this.autor = this.autor.trim();
  }

  if (this.ubicacion) {
    this.ubicacion = this.ubicacion.trim();
  }

  if (this.descripcion) {
    this.descripcion = this.descripcion.trim();
  }

  if (this.emailContacto) {
    this.emailContacto = this.emailContacto.trim().toLowerCase();
  }

  if (this.fecha) {
    this.fecha = this.fecha.trim();
  }

  next();
});

// =============================================================
// Métodos estáticos
// =============================================================

/**
 * Calcula el siguiente id numérico disponible.
 *
 * Se mantiene este id numérico por compatibilidad con GraphQL, frontend
 * y datos heredados de productos anteriores.
 *
 * @returns {Promise<number>} Siguiente id disponible.
 */
publicacionSchema.statics.obtenerSiguienteId = async function obtenerSiguienteId() {
  const ultimaPublicacion = await this.findOne({})
    .sort({ id: -1 })
    .select('id')
    .lean();

  return ultimaPublicacion ? ultimaPublicacion.id + 1 : 1;
};

// =============================================================
// Plugins
// =============================================================

publicacionSchema.plugin(cleanJsonPlugin);

// =============================================================
// Modelo
// =============================================================

export const PublicacionMongoose =
  mongoose.models.Publicacion || mongoose.model('Publicacion', publicacionSchema);