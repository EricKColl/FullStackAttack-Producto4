/**
 * @file src/graphql/resolvers/usuarioResolver.js
 * @description Resolvers GraphQL para usuarios y autenticación.
 *
 * Producto 4:
 * - Todos los usuarios autenticados reciben JWT.
 * - El administrador mantiene acceso completo.
 * - Empresa y candidato reciben token para que el backend pueda aplicar permisos por rol.
 */

import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { requireAdmin } from '../../middleware/auth.js';
import * as usuarioModel from '../../models/usuarioModel.js';

/**
 * Genera un token JWT para cualquier usuario autenticado.
 *
 * El token incluye:
 * - sub: id del usuario.
 * - email: correo.
 * - rol: admin, empresa o candidato.
 *
 * No guarda contraseña ni datos sensibles.
 *
 * @param {object} usuario
 * @returns {string}
 */
function generarTokenUsuario(usuario) {
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

/**
 * Construye la respuesta estándar de autenticación.
 *
 * @param {object} usuario
 * @returns {{token: string, usuario: object}}
 */
function crearAuthPayload(usuario) {
  return {
    token: generarTokenUsuario(usuario),
    usuario,
  };
}

export const usuarioResolver = {
  Query: {
    /**
     * Lista todos los usuarios.
     *
     * Ahora queda protegido a nivel servidor:
     * solo el administrador puede ver el listado completo.
     *
     * @param {unknown} _parent
     * @param {unknown} _args
     * @param {{usuario: object|null}} context
     */
    listarUsuarios: (_parent, _args, context) => {
      requireAdmin(context);

      return usuarioModel.listarUsuarios();
    },

    /**
     * Busca un usuario por email.
     *
     * Se mantiene disponible por compatibilidad con el proyecto,
     * aunque la pantalla de gestión completa queda reservada al admin.
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
     * Solo el administrador puede hacerlo.
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
     * Elimina un usuario por email.
     * Solo el administrador puede hacerlo.
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
     * Login general de la aplicación.
     *
     * Sirve para:
     * - admin
     * - empresa
     * - candidato
     *
     * Devuelve siempre:
     * - token JWT
     * - usuario autenticado
     *
     * @param {unknown} _parent
     * @param {{email: string, password: string}} args
     */
    loguearUsuario: async (_parent, args) => {
      const usuario = await usuarioModel.loguearUsuario(args.email, args.password);

      return crearAuthPayload(usuario);
    },

    /**
     * Login específico de administrador.
     *
     * Se conserva para compatibilidad con las pruebas anteriores.
     * Si el usuario no es admin, el model lanza UnauthorizedError.
     *
     * @param {unknown} _parent
     * @param {{email: string, password: string}} args
     */
    loginAdmin: async (_parent, args) => {
      const usuario = await usuarioModel.loginAdmin(args.email, args.password);

      return crearAuthPayload(usuario);
    },
  },
};