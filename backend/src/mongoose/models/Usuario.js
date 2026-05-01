/**
 * @file src/mongoose/models/Usuario.js
 * @description Modelo Mongoose para la colección usuarios.
 *
 * Este modelo forma parte de la migración progresiva del Producto 4 hacia
 * Mongoose ODM.
 *
 * Importante:
 * - No sustituye todavía al modelo antiguo src/models/usuarioModel.js.
 * - Mantiene compatibilidad con la colección existente "usuarios".
 * - Respeta el campo id numérico usado por GraphQL y por el frontend.
 * - Añade validaciones, índices, normalización y hook de seguridad.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { cleanJsonPlugin } from '../plugins/index.js';

const { Schema } = mongoose;

const ROLES_USUARIO = ['candidato', 'empresa', 'admin'];
const SALT_ROUNDS = 10;

/**
 * Schema principal de Usuario.
 *
 * Se usa collection: 'usuarios' para apuntar exactamente a la misma colección
 * que ya utiliza el backend heredado del Producto 3.
 *
 * Se usa id: false para desactivar el virtual id automático de Mongoose,
 * porque este proyecto ya tiene su propio campo id numérico.
 */
const usuarioSchema = new Schema(
  {
    id: {
      type: Number,
      required: [true, 'El id del usuario es obligatorio.'],
      min: [1, 'El id del usuario debe ser mayor o igual que 1.'],
    },

    nombre: {
      type: String,
      required: [true, 'El nombre del usuario es obligatorio.'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres.'],
      maxlength: [60, 'El nombre no puede superar los 60 caracteres.'],
    },

    apellidos: {
      type: String,
      required: [true, 'Los apellidos del usuario son obligatorios.'],
      trim: true,
      minlength: [2, 'Los apellidos deben tener al menos 2 caracteres.'],
      maxlength: [100, 'Los apellidos no pueden superar los 100 caracteres.'],
    },

    email: {
      type: String,
      required: [true, 'El email del usuario es obligatorio.'],
      trim: true,
      lowercase: true,
      maxlength: [120, 'El email no puede superar los 120 caracteres.'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'El correo electrónico no tiene un formato válido.',
      ],
    },

    password: {
      type: String,
      required: [true, 'La contraseña del usuario es obligatoria.'],
      minlength: [4, 'La contraseña debe tener al menos 4 caracteres.'],
      select: false,
    },

    rol: {
      type: String,
      required: [true, 'El rol del usuario es obligatorio.'],
      trim: true,
      lowercase: true,
      enum: {
        values: ROLES_USUARIO,
        message: `El rol debe ser uno de: ${ROLES_USUARIO.join(', ')}.`,
      },
    },
  },
  {
    collection: 'usuarios',
    timestamps: true,
    id: false,
  }
);

// =============================================================
// Índices
// =============================================================

usuarioSchema.index({ id: 1 }, { unique: true });
usuarioSchema.index({ email: 1 }, { unique: true });
usuarioSchema.index({ rol: 1 });

// =============================================================
// Hooks
// =============================================================

/**
 * Normaliza campos de texto antes de validar.
 */
usuarioSchema.pre('validate', function normalizarUsuario(next) {
  if (this.nombre) {
    this.nombre = this.nombre.trim();
  }

  if (this.apellidos) {
    this.apellidos = this.apellidos.trim();
  }

  if (this.email) {
    this.email = this.email.trim().toLowerCase();
  }

  if (this.rol) {
    this.rol = this.rol.trim().toLowerCase();
  }

  next();
});

/**
 * Hashea la contraseña antes de guardar si todavía no está hasheada.
 *
 * Esto permite:
 * - Crear usuarios nuevos con contraseña segura.
 * - Evitar volver a hashear contraseñas que ya estén en formato bcrypt.
 */
usuarioSchema.pre('save', async function hashearPassword(next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    const yaEsHashBcrypt = /^\$2[aby]\$/.test(this.password);

    if (!yaEsHashBcrypt) {
      this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

// =============================================================
// Métodos de instancia
// =============================================================

/**
 * Compara una contraseña en texto plano con el hash almacenado.
 *
 * Para usar este método, el documento debe haberse consultado con:
 * .select('+password')
 *
 * @param {string} passwordPlano - Contraseña introducida por el usuario.
 * @returns {Promise<boolean>} true si coincide, false si no coincide.
 */
usuarioSchema.methods.compararPassword = function compararPassword(passwordPlano) {
  return bcrypt.compare(String(passwordPlano ?? ''), this.password);
};

// =============================================================
// Métodos estáticos
// =============================================================

/**
 * Calcula el siguiente id numérico disponible.
 *
 * Se mantiene este id numérico por compatibilidad con GraphQL, frontend y
 * datos heredados de productos anteriores.
 *
 * @returns {Promise<number>} Siguiente id disponible.
 */
usuarioSchema.statics.obtenerSiguienteId = async function obtenerSiguienteId() {
  const ultimoUsuario = await this.findOne({})
    .sort({ id: -1 })
    .select('id')
    .lean();

  return ultimoUsuario ? ultimoUsuario.id + 1 : 1;
};

// =============================================================
// Plugins
// =============================================================

usuarioSchema.plugin(cleanJsonPlugin);

// =============================================================
// Modelo
// =============================================================

export const UsuarioMongoose =
  mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);