/**
 * @file src/graphql/resolvers/usuarioResolver.js
 * @description Resolvers GraphQL para la entidad Usuario.
 *
 * Cada función aquí se corresponde con una Query o Mutation declarada
 * en src/graphql/typeDefs.js. Los resolvers son delgados a propósito:
 * delegan toda la lógica de normalización, validación y persistencia
 * al model (src/models/usuarioModel.js).
 *
 * En la Fase 5 añadimos la autenticación de administrador con JWT:
 * - loginAdmin valida credenciales mediante el model.
 * - Si el usuario es admin, se genera un token JWT.
 * - El cliente podrá usar ese token en el header Authorization.
 * - Las mutations sensibles quedan protegidas con requireAdmin(context).
 *
 * Si un model lanza un AppError (ValidationError, NotFoundError, etc.),
 * Apollo Server lo atrapa y lo transforma automáticamente en una respuesta
 * GraphQL con el campo `errors` poblado, incluyendo code y message.
 */

import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { requireAdmin } from '../../middleware/auth.js';
import * as usuarioModel from '../../models/usuarioModel.js';

/**
 * Genera un token JWT para el usuario administrador autenticado.
 *
 * El token incluye información mínima:
 * - sub: id del usuario, definido en la opción subject.
 * - email: correo del usuario.
 * - rol: rol del usuario.
 *
 * Importante:
 * El token no guarda la contraseña ni información sensible.
 *
 * @param {object} usuario - Usuario administrador autenticado.
 * @returns {string} Token JWT firmado.
 */
function generarTokenAdmin(usuario) {
  return jwt.sign(
    {
      email: usuario.email,
      rol: usuario.rol,
    },
    env.jwtSecret,
    {
      subject: String(usuario.id),
      expiresIn: env.jwtExpiresIn,
    }
  );
}

export const usuarioResolver = {
  Query: {
    /**
     * Lista todos los usuarios ordenados alfabéticamente.
     * No requiere argumentos.
     *
     * Esta query se mantiene pública porque solo devuelve datos básicos
     * y nunca expone contraseñas.
     */
    listarUsuarios: () => {
      return usuarioModel.listarUsuarios();
    },

    /**
     * Busca un usuario por email. Devuelve null si no existe
     * (GraphQL permite null porque el campo `usuarioPorEmail: Usuario`
     *  no lleva el signo de exclamación).
     *
     * Esta query se mantiene pública por compatibilidad con el proyecto actual.
     *
     * @param {unknown} _parent
     * @param {{email: string}} args
     */
    usuarioPorEmail: (_parent, args) => {
      return usuarioModel.buscarUsuarioPorEmail(args.email);
    },
  },

  Mutation: {
    /**
     * Crea un usuario nuevo.
     *
     * Fase 5:
     * Esta mutation queda protegida. Solo un administrador autenticado
     * mediante JWT puede crear usuarios.
     *
     * @param {unknown} _parent
     * @param {{datos: object}} args
     * @param {{usuario: object|null}} context
     */
    crearUsuario: (_parent, args, context) => {
      requireAdmin(context);

      return usuarioModel.crearUsuario(args.datos);
    },

    /**
     * Elimina un usuario por email. Devuelve el usuario eliminado.
     *
     * Fase 5:
     * Esta mutation queda protegida. Solo un administrador autenticado
     * mediante JWT puede eliminar usuarios.
     *
     * @param {unknown} _parent
     * @param {{email: string}} args
     * @param {{usuario: object|null}} context
     */
    eliminarUsuario: (_parent, args, context) => {
      requireAdmin(context);

      return usuarioModel.eliminarUsuarioPorEmail(args.email);
    },

    /**
     * Autentica a un usuario por email + password.
     * Devuelve el usuario sin password si las credenciales coinciden.
     *
     * Se mantiene por compatibilidad con el trabajo previo.
     * Para la autenticación segura de administrador se usa loginAdmin.
     *
     * @param {unknown} _parent
     * @param {{email: string, password: string}} args
     */
    loguearUsuario: (_parent, args) => {
      return usuarioModel.loguearUsuario(args.email, args.password);
    },

    /**
     * Autentica al administrador y devuelve un token JWT.
     *
     * Flujo:
     * 1. El model comprueba email, password y rol admin.
     * 2. Si todo es correcto, el resolver genera un token JWT.
     * 3. Devuelve el token y los datos públicos del usuario.
     *
     * Esta mutation NO se protege con requireAdmin porque precisamente
     * sirve para conseguir el token inicial.
     *
     * @param {unknown} _parent
     * @param {{email: string, password: string}} args
     * @returns {Promise<{token: string, usuario: object}>}
     */
    loginAdmin: async (_parent, args) => {
      const usuario = await usuarioModel.loginAdmin(args.email, args.password);
      const token = generarTokenAdmin(usuario);

      return {
        token,
        usuario,
      };
    },
  },
};