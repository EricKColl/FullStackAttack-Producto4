/**
 * @file src/config/db.js
 * @description Gestiona la conexión al servidor de MongoDB usando el driver nativo oficial.
 *
 * Este módulo implementa un patrón singleton: la conexión se establece una sola vez
 * al arrancar el servidor y se reutiliza durante toda la vida del proceso.
 *
 * Funciones exportadas:
 *   - connectToMongo() → abre la conexión (llamar una sola vez al arrancar).
 *   - getDb()          → devuelve la referencia a la BBDD (usada por resolvers y models).
 *   - closeMongo()     → cierra la conexión limpiamente (usada en graceful shutdown).
 *
 * Importante: este módulo NUNCA lee process.env directamente.
 * Toda la configuración proviene de src/config/env.js.
 */

import { MongoClient } from 'mongodb';
import { env } from './env.js';

/**
 * Cliente de MongoDB. Se inicializa en connectToMongo() y se mantiene vivo
 * durante toda la ejecución del proceso.
 * @type {MongoClient|null}
 */
let client = null;

/**
 * Referencia a la base de datos activa. Se obtiene a partir del cliente tras conectar.
 * @type {import('mongodb').Db|null}
 */
let db = null;

/**
 * Abre la conexión al servidor MongoDB y selecciona la base de datos indicada
 * en la variable de entorno MONGO_DB_NAME.
 *
 * Opciones del cliente:
 *   - serverSelectionTimeoutMS: 5000
 *     Si Mongo no responde en 5 segundos, falla inmediatamente en lugar de
 *     esperar indefinidamente. Esto es crítico en entornos sin Mongo arriba.
 *   - connectTimeoutMS: 5000
 *     Timeout para establecer la conexión TCP inicial.
 *
 * @returns {Promise<import('mongodb').Db>} La referencia a la BBDD ya conectada.
 * @throws {Error} Si la conexión falla (servidor caído, credenciales inválidas, etc.).
 */
export async function connectToMongo() {
  try {
    client = new MongoClient(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(env.mongoDbName);

    console.log(`[db] Conectado a MongoDB: ${env.mongoDbName}`);
    return db;
  } catch (error) {
    console.error('[db] Error al conectar con MongoDB:', error.message);
    throw error;
  }
}

/**
 * Devuelve la referencia a la base de datos activa.
 *
 * Esta función es el punto de acceso a la BBDD para todo el resto del código
 * (resolvers, models, seed, etc.). Evita tener que pasar la conexión
 * por parámetros a través de toda la aplicación.
 *
 * @returns {import('mongodb').Db} La base de datos conectada.
 * @throws {Error} Si se llama antes de connectToMongo() (protección contra uso prematuro).
 */
export function getDb() {
  if (!db) {
    throw new Error(
      '[db] La base de datos no está conectada. ' +
      'Asegúrate de llamar a connectToMongo() antes de usar getDb().'
    );
  }
  return db;
}

/**
 * Cierra la conexión al servidor MongoDB de forma limpia.
 *
 * Se invoca típicamente desde el graceful shutdown del servidor (SIGINT/SIGTERM)
 * para liberar recursos antes de que el proceso termine.
 *
 * Si la conexión ya estaba cerrada o nunca se abrió, la función no hace nada.
 *
 * @returns {Promise<void>}
 */
export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[db] Conexión a MongoDB cerrada correctamente.');
  }
}