/**
 * @file src/mongoose/index.js
 * @description Punto central de exportación de la capa Mongoose del Producto 4.
 *
 * Esta carpeta agrupará progresivamente:
 *
 * - Modelos Mongoose.
 * - Plugins reutilizables.
 * - Configuraciones específicas del ODM.
 *
 * La migración se realiza de forma progresiva para no romper el backend heredado
 * del Producto 3, que todavía utiliza el driver nativo de MongoDB.
 */

export * from './plugins/index.js';
export * from './models/index.js';