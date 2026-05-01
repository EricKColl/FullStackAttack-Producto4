/**
 * @file src/middleware/auth.js
 * @description Funciones auxiliares para autenticar peticiones mediante JWT.
 *
 * En esta fase usamos JWT para que el administrador pueda hacer login
 * y después enviar un token en las operaciones protegidas.
 *
 * Flujo general:
 *   1. Postman envía un header Authorization: Bearer <token>.
 *   2. Este archivo extrae y verifica el token.
 *   3. Si el token es válido, devuelve los datos básicos del usuario.
 *   4. Los resolvers podrán comprobar si existe context.usuario.
 */

import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

/**
 * Extrae el token JWT del header Authorization.
 *
 * El formato esperado es:
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
 * - No lanza error aquí porque algunas queries seguirán siendo públicas.
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
      rol: payload.rol,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Obliga a que exista un usuario autenticado en el context.
 *
 * Esta función se usará dentro de resolvers protegidos.
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

  return context.usuario;
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