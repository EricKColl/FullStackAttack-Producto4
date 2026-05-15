/**
 * @file src/scripts/checkSeleccionadaMongoose.js
 * @description Script técnico de comprobación del modelo SeleccionadaMongoose.
 *
 * Este script forma parte del Producto 4 y sirve para verificar que:
 *
 * - La conexión Mongoose funciona correctamente.
 * - El modelo SeleccionadaMongoose puede consultar la colección seleccionadas.
 * - El método estático obtenerIdsPublicaciones() funciona correctamente.
 * - La migración de seleccionadas a Mongoose no rompe el dashboard.
 *
 * No forma parte del flujo principal de la aplicación.
 * Se ejecuta manualmente con:
 *
 *   npm run check:seleccionada-mongoose
 */

import { connectToMongo, closeMongo } from '../config/db.js';
import { SeleccionadaMongoose } from '../mongoose/models/index.js';

async function main() {
  try {
    await connectToMongo();

    const totalSeleccionadas = await SeleccionadaMongoose.countDocuments();

    const seleccionadas = await SeleccionadaMongoose.find({})
      .select('publicacionId usuarioId fechaSeleccion')
      .sort({ fechaSeleccion: 1 });

    const idsSeleccionados = await SeleccionadaMongoose.obtenerIdsPublicaciones();

    console.log('=============================================================');
    console.log('[check] Comprobación del modelo SeleccionadaMongoose');
    console.log('=============================================================');
    console.log(`[check] Total de seleccionadas encontradas: ${totalSeleccionadas}`);
    console.log(`[check] IDs seleccionados: ${idsSeleccionados.length > 0 ? idsSeleccionados.join(', ') : 'ninguno'}`);
    console.log('');

    if (seleccionadas.length === 0) {
      console.log('[check] No hay publicaciones seleccionadas en la colección seleccionadas.');
    } else {
      console.table(
        seleccionadas.map((seleccionada) => {
          const obj = seleccionada.toObject();

          return {
            publicacionId: obj.publicacionId,
            usuarioId: obj.usuarioId ?? '—',
            fechaSeleccion: obj.fechaSeleccion,
          };
        })
      );
    }

    console.log('');
    console.log('[check] Modelo SeleccionadaMongoose comprobado correctamente.');
  } catch (error) {
    console.error('[check] Error comprobando SeleccionadaMongoose:', error.message);
    process.exitCode = 1;
  } finally {
    await closeMongo();
  }
}

main();