/**
 * @file src/utils/validators.js
 * @description Validadores y normalizadores reutilizables en todo el backend.
 *
 * Esta es una adaptación al backend de las funciones de validación que en el
 * Producto 2 vivían dentro de `almacenaje.js`. Aquí se extraen a su propio
 * módulo para que puedan usarse desde cualquier model o resolver sin acoplarse
 * a la capa de persistencia.
 *
 * Todas las funciones son PURAS: no tocan BBDD, no tienen efectos secundarios,
 * simplemente reciben un valor y devuelven otro (o lanzan ValidationError).
 */

import { ValidationError } from './errors.js';

// =============================================================
// Normalizadores
// =============================================================

/**
 * Convierte cualquier valor a string y elimina espacios al principio y final.
 * Devuelve cadena vacía si el valor es null/undefined.
 *
 * @param {unknown} texto
 * @returns {string}
 */
export function normalizarTexto(texto) {
  return String(texto ?? '').trim();
}

/**
 * Normaliza un email: texto + trim + lowercase.
 * Mantener los emails en minúsculas evita duplicados accidentales
 * del tipo "Laura@mail.com" vs "laura@mail.com".
 *
 * @param {unknown} email
 * @returns {string}
 */
export function normalizarEmail(email) {
  return normalizarTexto(email).toLowerCase();
}

// =============================================================
// Comprobadores (devuelven boolean, no lanzan)
// =============================================================

/**
 * Comprueba si un email tiene un formato razonable.
 *
 * No pretende ser una validación RFC 5322 perfecta (que es imposible de
 * cubrir con una regex sencilla), pero cubre los casos realistas: presencia
 * de arroba, dominio con punto, sin espacios.
 *
 * @param {string} email
 * @returns {boolean}
 */
export function esEmailValido(email) {
  const normalizado = normalizarEmail(email);
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return patron.test(normalizado);
}

/**
 * Comprueba si una fecha tiene formato YYYY-MM-DD y representa una fecha real.
 *
 * No basta con validar el formato con regex, porque "2026-02-30" tiene formato
 * correcto pero no existe. Por eso después parseamos la fecha y comprobamos
 * que el navegador/runtime la interpreta como un tiempo válido.
 *
 * @param {string} fecha
 * @returns {boolean}
 */
export function esFechaValidaISO(fecha) {
  const normalizada = normalizarTexto(fecha);

  // 1. Verificar formato exacto YYYY-MM-DD con regex.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizada)) {
    return false;
  }

  // 2. Parsear a Date y comprobar que NO es Invalid Date.
  const fechaParseada = new Date(`${normalizada}T00:00:00`);
  if (Number.isNaN(fechaParseada.getTime())) {
    return false;
  }

  // 3. Comprobación anti-overflow: JavaScript acepta "2026-02-30" y lo
  //    convierte silenciosamente a "2026-03-02". Para detectarlo,
  //    reconstruimos la fecha ISO a partir del Date parseado y
  //    comprobamos que coincide exactamente con la entrada.
  const [anyo, mes, dia] = normalizada.split('-').map(Number);
  return (
    fechaParseada.getFullYear() === anyo &&
    fechaParseada.getMonth() + 1 === mes &&
    fechaParseada.getDate() === dia
  );
}

// =============================================================
// Validadores que LANZAN ValidationError si no se cumplen
// =============================================================

/**
 * Asegura que todos los campos listados existen en el objeto y no son cadena vacía.
 * Útil al principio de una mutation para validar payloads de entrada.
 *
 * @param {Record<string, unknown>} objeto - Objeto a validar (payload del resolver).
 * @param {string[]} camposRequeridos - Lista de claves obligatorias.
 * @throws {ValidationError} Si falta algún campo o está vacío.
 */
export function validarCamposObligatorios(objeto, camposRequeridos) {
  for (const campo of camposRequeridos) {
    const valor = normalizarTexto(objeto?.[campo]);
    if (valor === '') {
      throw new ValidationError(`El campo "${campo}" es obligatorio.`);
    }
  }
}

/**
 * Valida que el email tiene formato correcto.
 *
 * @param {string} email
 * @throws {ValidationError}
 */
export function validarEmail(email) {
  if (!esEmailValido(email)) {
    throw new ValidationError('El correo electrónico no tiene un formato válido.');
  }
}

/**
 * Valida que la fecha está en formato ISO YYYY-MM-DD y es real.
 *
 * @param {string} fecha
 * @throws {ValidationError}
 */
export function validarFechaISO(fecha) {
  if (!esFechaValidaISO(fecha)) {
    throw new ValidationError('La fecha debe tener el formato YYYY-MM-DD y ser válida.');
  }
}

/**
 * Valida que un texto tiene al menos una longitud mínima.
 * Usado para descripciones, contraseñas, etc.
 *
 * @param {string} texto
 * @param {number} minimo - Longitud mínima (inclusive).
 * @param {string} nombreCampo - Nombre del campo para el mensaje de error.
 * @throws {ValidationError}
 */
export function validarLongitudMinima(texto, minimo, nombreCampo) {
  if (normalizarTexto(texto).length < minimo) {
    throw new ValidationError(
      `El campo "${nombreCampo}" debe tener al menos ${minimo} caracteres.`
    );
  }
}

/**
 * Valida que el rol de usuario es uno de los permitidos.
 *
 * En el Producto 2 eran solo "candidato" y "empresa". Añadimos "admin"
 * para el usuario administrador del backend (Fase 5).
 *
 * @param {string} rol
 * @throws {ValidationError}
 */
export function validarRol(rol) {
  const rolesValidos = ['candidato', 'empresa', 'admin'];
  const normalizado = normalizarTexto(rol).toLowerCase();
  if (!rolesValidos.includes(normalizado)) {
    throw new ValidationError(
      `El rol debe ser uno de: ${rolesValidos.join(', ')}.`
    );
  }
}

/**
 * Valida que el tipo de publicación es uno de los permitidos.
 *
 * @param {string} tipo
 * @throws {ValidationError}
 */
export function validarTipoPublicacion(tipo) {
  const tiposValidos = ['oferta', 'demanda'];
  const normalizado = normalizarTexto(tipo).toLowerCase();
  if (!tiposValidos.includes(normalizado)) {
    throw new ValidationError(
      `El tipo de publicación debe ser uno de: ${tiposValidos.join(', ')}.`
    );
  }
}