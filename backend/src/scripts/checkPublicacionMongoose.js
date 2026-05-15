/**
 * @file src/scripts/checkPublicacionMongoose.js
 * @description Script técnico de comprobación del modelo PublicacionMongoose.
 *
 * Este script forma parte del Producto 4 y sirve para verificar que:
 *
 * - La conexión Mongoose funciona correctamente.
 * - El modelo PublicacionMongoose puede consultar la colección publicaciones.
 * - Los documentos se transforman correctamente con cleanJsonPlugin.
 * - La migración de publicaciones a Mongoose funciona sin romper GraphQL.
 *
 * No forma parte del flujo principal de la aplicación.
 * Se ejecuta manualmente con:
 *
 *   npm run check:publicacion-mongoose
 */

import { connectToMongo, closeMongo } from '../config/db.js';
import { PublicacionMongoose } from '../mongoose/models/index.js';

async function main() {
  try {
    await connectToMongo();

    const totalPublicaciones = await PublicacionMongoose.countDocuments();

    const publicaciones = await PublicacionMongoose.find({})
      .select('id tipo titulo categoria autor ubicacion emailContacto fecha')
      .sort({ id: 1 });

    console.log('=============================================================');
    console.log('[check] Comprobación del modelo PublicacionMongoose');
    console.log('=============================================================');
    console.log(`[check] Total de publicaciones encontradas: ${totalPublicaciones}`);
    console.log('');

    if (publicaciones.length === 0) {
      console.log('[check] No hay publicaciones en la colección publicaciones.');
    } else {
      console.table(
        publicaciones.map((publicacion) => {
          const obj = publicacion.toObject();

          return {
            id: obj.id,
            tipo: obj.tipo,
            titulo: obj.titulo,
            categoria: obj.categoria,
            autor: obj.autor,
            ubicacion: obj.ubicacion,
            emailContacto: obj.emailContacto,
            fecha: obj.fecha,
          };
        })
      );
    }

    console.log('');
    console.log('[check] Modelo PublicacionMongoose comprobado correctamente.');
  } catch (error) {
    console.error('[check] Error comprobando PublicacionMongoose:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongo();
  }
}

main();
