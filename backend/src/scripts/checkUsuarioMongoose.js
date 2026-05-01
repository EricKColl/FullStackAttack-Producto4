/**
 * @file src/scripts/checkUsuarioMongoose.js
 * @description Script técnico de comprobación del modelo UsuarioMongoose.
 *
 * Este script forma parte del Producto 4 y sirve para verificar que:
 *
 * - La conexión Mongoose funciona correctamente.
 * - El modelo UsuarioMongoose puede consultar la colección usuarios.
 * - Los documentos se transforman correctamente con cleanJsonPlugin.
 * - La migración hacia Mongoose puede continuar sin romper el backend actual.
 *
 * No forma parte del flujo principal de la aplicación.
 * Se ejecuta manualmente con:
 *
 *   npm run check:usuario-mongoose
 */

import { connectToMongo, closeMongo } from '../config/db.js';
import { UsuarioMongoose } from '../mongoose/models/index.js';

async function main() {
  try {
    await connectToMongo();

    const totalUsuarios = await UsuarioMongoose.countDocuments();

    const usuarios = await UsuarioMongoose.find({})
      .select('id nombre apellidos email rol')
      .sort({ id: 1 })
      .lean();

    console.log('=============================================================');
    console.log('[check] Comprobación del modelo UsuarioMongoose');
    console.log('=============================================================');
    console.log(`[check] Total de usuarios encontrados: ${totalUsuarios}`);
    console.log('');

    if (usuarios.length === 0) {
      console.log('[check] No hay usuarios en la colección usuarios.');
    } else {
      console.table(
        usuarios.map((usuario) => ({
          id: usuario.id,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos,
          email: usuario.email,
          rol: usuario.rol,
        }))
      );
    }

    console.log('');
    console.log('[check] Modelo UsuarioMongoose comprobado correctamente.');
  } catch (error) {
    console.error('[check] Error comprobando UsuarioMongoose:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongo();
  }
}

main();