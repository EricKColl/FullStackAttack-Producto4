/**
 * @file src/middleware/auth.js
 * @description Funciones auxiliares para autenticar peticiones mediante JWT
 *              y aplicar permisos por rol en los resolvers GraphQL.
 *
 * En el Producto 4 la sesión no solo distingue si hay login, sino también
 * qué puede hacer cada tipo de usuario:
 *
 * - admin: puede gestionar usuarios, publicaciones y visión global.
 * - empresa: puede trabajar con ofertas y panel de empresa.
 * - candidato: puede trabajar con demandas, selección y panel de candidato.
 *
 * Flujo general:
 *   1. El frontend envía Authorization: Bearer <token>.
 *   2. Apollo/Express construye context.usuario a partir del token.
 *   3. Los resolvers aplican requireAuth, requireAdmin o requireRole.
 */

import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

/**
 * Normaliza un rol para evitar errores por mayúsculas, espacios o valores nulos.
 *
 * @param {unknown} rol
 * @returns {string}
 */
function normalizarRol(rol) {
  return String(rol || '').trim().toLowerCase();
}

/**
 * Extrae el token JWT del header Authorization.
 *
 * Formato esperado:
 * Authorization: Bearer eyJhbGciOiJIUzI1...
 *
 * @param {object} req - Request de Express.
 * @returns {string|null} Token JWT o null si no viene correctamente.
 */
function extraerTokenDesdeRequest(req) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [tipo, token] = authorization.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

/**
 * Intenta obtener el usuario autenticado a partir del token enviado.
 *
 * Importante:
 * - Si no hay token, devuelve null.
 * - Si el token no es válido, devuelve null.
 * - No lanza error aquí porque algunas queries siguen siendo públicas.
 *
 * @param {object} req - Request de Express.
 * @returns {object|null} Datos básicos del usuario autenticado.
 */
export function obtenerUsuarioDesdeRequest(req) {
  const token = extraerTokenDesdeRequest(req);

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    return {
      id: Number(payload.sub),
      email: payload.email,
      rol: normalizarRol(payload.rol),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Obliga a que exista un usuario autenticado en el context.
 *
 * @param {object} context - Contexto de Apollo GraphQL.
 * @returns {object} Usuario autenticado.
 * @throws {UnauthorizedError} Si no hay usuario autenticado.
 */
export function requireAuth(context) {
  if (!context?.usuario) {
    throw new UnauthorizedError(
      'Debes enviar un token JWT válido para realizar esta operación.'
    );
  }

  return {
    ...context.usuario,
    rol: normalizarRol(context.usuario.rol),
  };
}

/**
 * Obliga a que el usuario autenticado tenga rol admin.
 *
 * @param {object} context - Contexto de Apollo GraphQL.
 * @returns {object} Usuario admin autenticado.
 * @throws {UnauthorizedError} Si no hay token válido.
 * @throws {ForbiddenError} Si el usuario no es admin.
 */
export function requireAdmin(context) {
  const usuario = requireAuth(context);

  if (usuario.rol !== 'admin') {
    throw new ForbiddenError(
      'Necesitas permisos de administrador para realizar esta operación.'
    );
  }

  return usuario;
}

/**
 * Obliga a que el usuario autenticado tenga uno de los roles permitidos.
 *
 * @param {object} context - Contexto de Apollo GraphQL.
 * @param {string[]} rolesPermitidos - Lista de roles aceptados.
 * @returns {object} Usuario autenticado.
 * @throws {UnauthorizedError} Si no hay token válido.
 * @throws {ForbiddenError} Si el rol no está permitido.
 */
export function requireRole(context, rolesPermitidos = []) {
  const usuario = requireAuth(context);
  const rolesNormalizados = rolesPermitidos.map(normalizarRol);

  if (!rolesNormalizados.includes(usuario.rol)) {
    throw new ForbiddenError(
      `Tu rol actual (${usuario.rol}) no tiene permisos para realizar esta operación.`
    );
  }

  return usuario;
}

/**
 * Valida si un usuario puede crear una publicación de un tipo concreto.
 *
 * Reglas funcionales:
 * - admin puede crear ofertas y demandas.
 * - empresa solo puede crear ofertas.
 * - candidato solo puede crear demandas.
 *
 * @param {object} context - Contexto de Apollo GraphQL.
 * @param {string} tipoPublicacion - "oferta" o "demanda".
 * @returns {object} Usuario autenticado.
 * @throws {ForbiddenError} Si el rol intenta crear un tipo no permitido.
 */
export function requirePermisoCrearPublicacion(context, tipoPublicacion) {
  const usuario = requireRole(context, ['admin', 'empresa', 'candidato']);
  const tipo = String(tipoPublicacion || '').trim().toLowerCase();

  if (usuario.rol === 'admin') {
    return usuario;
  }

  if (usuario.rol === 'empresa' && tipo === 'oferta') {
    return usuario;
  }

  if (usuario.rol === 'candidato' && tipo === 'demanda') {
    return usuario;
  }

  throw new ForbiddenError(
    'No puedes crear este tipo de publicación con tu rol actual.'
  );
}

/**
 * Indica si un rol corresponde a administrador.
 *
 * @param {unknown} rol
 * @returns {boolean}
 */
export function esRolAdmin(rol) {
  return normalizarRol(rol) === 'admin';
}

/**
 * Indica si un rol corresponde a empresa.
 *
 * @param {unknown} rol
 * @returns {boolean}
 */
export function esRolEmpresa(rol) {
  return normalizarRol(rol) === 'empresa';
}

/**
 * Indica si un rol corresponde a candidato.
 *
 * @param {unknown} rol
 * @returns {boolean}
 */
export function esRolCandidato(rol) {
  return normalizarRol(rol) === 'candidato';
}