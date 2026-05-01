/**
 * @file src/middleware/errorHandler.js
 * @description Middlewares globales de Express para manejar errores y rutas no encontradas.
 *
 * Flujo en index.js:
 *   app.use('/graphql', ...)        ← rutas válidas
 *   app.get('/', ...)               ← rutas válidas
 *   app.use(notFoundHandler)        ← cualquier ruta que no haya matcheado llega aquí
 *   app.use(errorHandler)           ← cualquier error lanzado llega aquí (SIEMPRE el último)
 *
 * Importante: el errorHandler debe declararse con 4 parámetros (err, req, res, next)
 * aunque alguno no se use. Express detecta la aridad de la función para distinguir
 * un middleware normal de un middleware de errores. Esta es una peculiaridad de Express.
 */

import { env } from '../config/env.js';

/**
 * Middleware de 404: se ejecuta cuando ninguna ruta anterior ha respondido.
 *
 * Nota: las peticiones a /graphql ya las maneja Apollo Server, incluyendo
 * las queries/mutations inexistentes (responde con un error GraphQL estructurado).
 * Este handler cubre peticiones a rutas HTTP ajenas a GraphQL (ej. /foo).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
}

/**
 * Middleware centralizado de errores.
 *
 * Atrapa cualquier excepción lanzada por un handler o middleware anterior
 * y la convierte en una respuesta JSON consistente.
 *
 * En desarrollo incluye el stack trace para facilitar debugging.
 * En producción solo expone el mensaje del error (nunca el stack, por seguridad).
 *
 * Debe ser el ÚLTIMO middleware registrado en la app.
 * Debe declararse con 4 parámetros para que Express lo identifique como error handler.
 *
 * @param {Error}                       err
 * @param {import('express').Request}   req
 * @param {import('express').Response}  res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Si el error trae un statusCode explícito (lanzado por nosotros), lo respetamos.
  // Si no, asumimos 500 (error interno del servidor).
  const statusCode = err.statusCode || err.status || 500;

  console.error(`[errorHandler] ${req.method} ${req.originalUrl} → ${statusCode}`);
  console.error(err);

  const respuesta = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Se produjo un error interno en el servidor.',
    },
  };

  // Solo incluimos el stack en desarrollo, nunca en producción.
  if (env.isDevelopment && err.stack) {
    respuesta.error.stack = err.stack;
  }

  res.status(statusCode).json(respuesta);
}
