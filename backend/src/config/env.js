/**
 * @file src/config/env.js
 * @description Carga, valida y expone las variables de entorno del proyecto.
 *
 * Este módulo es el ÚNICO punto del código que lee directamente `process.env`.
 * Cualquier otra parte del backend debe importar el objeto `env` de aquí.
 *
 * Filosofía:
 *   - Si falta una variable obligatoria, la aplicación NO arranca.
 *   - El error sale inmediatamente con un mensaje claro indicando qué variable falta.
 *   - Esto es mejor que fallar a mitad de una petición con un error críptico.
 *
 * Referencia: https://12factor.net/es/config
 */

import dotenv from 'dotenv';

// Cargamos el .env desde la raíz del proyecto UNA sola vez.
// Si el archivo no existe, dotenv simplemente no inyecta nada (no lanza error).
dotenv.config();

/**
 * Lee una variable de entorno obligatoria.
 *
 * @param {string} nombre - Nombre de la variable (p. ej. "MONGO_URI").
 * @returns {string} Valor de la variable, sin espacios al inicio/fin.
 * @throws {Error} Si la variable no existe o está vacía.
 */
function leerObligatoria(nombre) {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === '') {
    throw new Error(
      `[config/env] Falta la variable de entorno obligatoria "${nombre}". ` +
      `Revisa tu fichero .env (puedes usar .env.example como referencia).`
    );
  }
  return valor.trim();
}

/**
 * Lee una variable de entorno opcional, con valor por defecto.
 *
 * @param {string} nombre - Nombre de la variable.
 * @param {string} porDefecto - Valor que se usa si la variable no está definida.
 * @returns {string} Valor de la variable o el valor por defecto.
 */
function leerOpcional(nombre, porDefecto) {
  const valor = process.env[nombre];
  return valor && valor.trim() !== '' ? valor.trim() : porDefecto;
}

/**
 * Objeto inmutable con toda la configuración del proyecto.
 * Se congela con Object.freeze() para evitar mutaciones accidentales en runtime.
 *
 * @typedef  {Object} Env
 * @property {number}  port           - Puerto HTTP del servidor Express.
 * @property {string}  nodeEnv        - Entorno de ejecución (development/production).
 * @property {boolean} isDevelopment  - Flag booleano para desarrollo.
 * @property {string}  mongoUri       - URI de conexión a MongoDB.
 * @property {string}  mongoDbName    - Nombre de la base de datos.
 * @property {string}  jwtSecret      - Secreto para firmar los JWT.
 * @property {string}  jwtExpiresIn   - Tiempo de expiración de los tokens (p. ej. "12h").
 * @property {string}  adminEmail     - Email del administrador por defecto (usado por seed).
 * @property {string}  adminPassword  - Contraseña del administrador por defecto (usado por seed).
 */

/** @type {Env} */
export const env = Object.freeze({
  // --- Servidor ---
  port: Number(leerOpcional('PORT', '4000')),
  nodeEnv: leerOpcional('NODE_ENV', 'development'),
  isDevelopment: leerOpcional('NODE_ENV', 'development') === 'development',

  // --- MongoDB ---
  mongoUri: leerObligatoria('MONGO_URI'),
  mongoDbName: leerObligatoria('MONGO_DB_NAME'),

  // --- Autenticación JWT ---
  jwtSecret: leerObligatoria('JWT_SECRET'),
  jwtExpiresIn: leerOpcional('JWT_EXPIRES_IN', '12h'),

  // --- Admin por defecto (usado por el seed) ---
  adminEmail: leerObligatoria('ADMIN_EMAIL'),
  adminPassword: leerObligatoria('ADMIN_PASSWORD'),
});