/**
 * @file src/utils/errors.js
 * @description Clases de error personalizadas con semántica HTTP y GraphQL.
 *
 * Todas las clases extienden de GraphQLError (no de Error plano) para que
 * Apollo Server respete el código del error en lugar de enmascararlo
 * automáticamente como INTERNAL_SERVER_ERROR.
 *
 * Beneficios de extender de GraphQLError:
 *   1. Apollo lee el `code` del campo `extensions` y lo expone al cliente
 *      tal cual, sin enmascararlo.
 *   2. Apollo deja de filtrar el `stacktrace` en la respuesta porque
 *      reconoce el error como esperado (no como crash imprevisto).
 *   3. El cliente recibe un código semántico (UNAUTHORIZED, VALIDATION_ERROR,
 *      NOT_FOUND, etc.) que puede usar para decidir cómo reaccionar.
 *
 * Cada subclase mantiene además su `statusCode` HTTP por compatibilidad
 * con el middleware errorHandler de Express, que sigue funcionando igual
 * para cualquier ruta REST que se añada en el futuro.
 *
 * @example
 * import { ValidationError } from '../utils/errors.js';
 * throw new ValidationError('El email no tiene un formato válido.');
 * // → cliente recibe: { errors: [{ message: '...', extensions: { code: 'VALIDATION_ERROR' } }] }
 */

import { GraphQLError } from 'graphql';

/**
 * Clase base de todos los errores del dominio.
 *
 * Todas las subclases pasan por aquí, garantizando que cada error tenga:
 *   - un mensaje legible
 *   - un statusCode HTTP semántico (para Express)
 *   - un code textual (para GraphQL extensions)
 *
 * @abstract
 */
export class AppError extends GraphQLError {
  /**
   * @param {string} message  - Mensaje legible para el cliente.
   * @param {number} statusCode - Código HTTP equivalente (400, 401, 403, 404, 409, 500).
   * @param {string} code     - Código textual (VALIDATION_ERROR, UNAUTHORIZED, etc.).
   */
  constructor(message, statusCode, code) {
    super(message, {
      extensions: { code },
    });

    // Apollo usa `extensions.code`, pero mantenemos también las propiedades
    // sueltas `statusCode` y `code` por compatibilidad con el errorHandler
    // de Express (middleware/errorHandler.js).
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Error 400 — datos de entrada inválidos.
 * Se lanza cuando una validación falla (formato de email, longitud, fecha imposible, etc.).
 */
export class ValidationError extends AppError {
  constructor(message = 'Los datos enviados no son válidos.') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Error 401 — el cliente no está autenticado.
 * Se lanza cuando falta el token JWT, está caducado o es inválido.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Necesitas autenticarte para realizar esta operación.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error 403 — el cliente está autenticado pero no tiene permisos.
 * Se lanza cuando un usuario sin rol admin intenta acceder a una operación restringida.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permisos suficientes para esta operación.') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Error 404 — el recurso solicitado no existe.
 * Se lanza al buscar por id o email un usuario o publicación inexistente.
 */
export class NotFoundError extends AppError {
  constructor(message = 'El recurso solicitado no existe.') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Error 409 — conflicto con el estado actual del recurso.
 * Se lanza típicamente al intentar registrar un email duplicado.
 */
export class ConflictError extends AppError {
  constructor(message = 'El recurso entra en conflicto con el estado actual.') {
    super(message, 409, 'CONFLICT');
  }
}