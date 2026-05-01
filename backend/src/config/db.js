/**
 * @file src/config/db.js
 * @description Gestiona la conexión a MongoDB usando dos mecanismos durante la migración del Producto 4:
 *
 *   1. Driver nativo oficial de MongoDB:
 *      - Se mantiene para no romper el backend heredado del Producto 3.
 *      - Los modelos actuales siguen usando getDb() y db.collection(...).
 *
 *   2. Mongoose ODM:
 *      - Se añade para cumplir los requisitos del Producto 4.
 *      - Permitirá crear esquemas, modelos, validaciones, índices, hooks y agregaciones.
 *
 * Esta estrategia permite una migración progresiva y segura:
 *
 *   Producto 3:
 *     MongoClient + db.collection(...)
 *
 *   Producto 4:
 *     MongoClient temporal + Mongoose progresivo
 *
 * Cuando toda la capa de modelos haya sido migrada a Mongoose, el driver nativo podrá eliminarse.
 */

import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Cliente nativo de MongoDB.
 * Se mantiene para compatibilidad con los models/resolvers actuales.
 *
 * @type {MongoClient|null}
 */
let client = null;

/**
 * Referencia nativa a la base de datos activa.
 *
 * @type {import('mongodb').Db|null}
 */
let db = null;

/**
 * Abre la conexión a MongoDB mediante el driver nativo y mediante Mongoose.
 *
 * De momento se conectan ambos sistemas:
 *
 * - MongoClient: necesario para que siga funcionando el código heredado del Producto 3.
 * - Mongoose: necesario para iniciar la migración progresiva del Producto 4.
 *
 * @returns {Promise<import('mongodb').Db>} Referencia nativa a la base de datos.
 * @throws {Error} Si alguna de las conexiones falla.
 */
export async function connectToMongo() {
  try {
    // ---------------------------------------------------------
    // 1. Conexión con el driver nativo de MongoDB
    // ---------------------------------------------------------
    client = new MongoClient(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(env.mongoDbName);

    console.log(`[db] Conectado a MongoDB con driver nativo: ${env.mongoDbName}`);

    // ---------------------------------------------------------
    // 2. Conexión con Mongoose ODM
    // ---------------------------------------------------------
    await mongoose.connect(env.mongoUri, {
      dbName: env.mongoDbName,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    console.log(`[db] Conectado a MongoDB con Mongoose: ${mongoose.connection.name}`);

    return db;
  } catch (error) {
    console.error('[db] Error al conectar con MongoDB:', error.message);

    if (client) {
      await client.close().catch(() => {});
      client = null;
      db = null;
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }

    throw error;
  }
}

/**
 * Devuelve la referencia nativa a la base de datos.
 *
 * Esta función se mantiene para que sigan funcionando los modelos actuales
 * que todavía usan db.collection(...).
 *
 * @returns {import('mongodb').Db} Base de datos conectada mediante driver nativo.
 * @throws {Error} Si se llama antes de connectToMongo().
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
 * Devuelve la conexión activa de Mongoose.
 *
 * Esta función se usará durante el Producto 4 para comprobar el estado
 * de Mongoose y para futuras necesidades de diagnóstico.
 *
 * @returns {typeof mongoose.connection} Conexión activa de Mongoose.
 */
export function getMongooseConnection() {
  return mongoose.connection;
}

/**
 * Cierra las conexiones a MongoDB de forma limpia.
 *
 * Cierra:
 *
 * - La conexión nativa de MongoClient.
 * - La conexión de Mongoose.
 *
 * Se invoca normalmente desde el graceful shutdown del servidor.
 *
 * @returns {Promise<void>}
 */
export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[db] Conexión nativa a MongoDB cerrada correctamente.');
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[db] Conexión Mongoose cerrada correctamente.');
  }
}