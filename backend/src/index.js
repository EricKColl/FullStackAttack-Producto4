/**
 * @file src/index.js
 * @description Punto de entrada del backend. Orquesta el arranque de Express,
 *              Apollo Server, MongoDB, seed inicial y cierre limpio.
 *
 * Orden de arranque:
 *   1. Conectar a MongoDB (si falla, el servidor no arranca).
 *   2. Ejecutar seed inicial e índices MongoDB.
 *   3. Iniciar Apollo Server.
 *   4. Registrar middlewares de Express (CORS, JSON, GraphQL, 404, errorHandler).
 *   5. Escuchar en el puerto configurado.
 *   6. Registrar handlers de cierre limpio para SIGINT/SIGTERM.
 */

import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';

import { env } from './config/env.js';
import { connectToMongo, closeMongo } from './config/db.js';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { obtenerUsuarioDesdeRequest } from './middleware/auth.js';
import { seedDatabase } from './seed/seed.js';

/**
 * Instancia del servidor Express.
 * Se configura dentro de startServer() tras conectar a Mongo y arrancar Apollo.
 */
const app = express();

/**
 * Instancia de Apollo Server con el schema y los resolvers del proyecto.
 */
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  // Introspection permite a Apollo Sandbox explorar el schema en modo desarrollo.
  introspection: env.isDevelopment,
});

/**
 * Arranca el backend completo: Mongo → seed → Apollo → Express → listen.
 *
 * En caso de error en cualquier paso, registra el fallo y termina el proceso
 * con código 1 para que Docker/CI puedan detectar que el servidor falló.
 *
 * @returns {Promise<void>}
 */
async function startServer() {
  try {
    // 1. Conectar a MongoDB antes que nada.
    //    Si Mongo no está arriba, fallamos rápido y no montamos el servidor web.
    await connectToMongo();

    // 2. Ejecutar seed inicial e índices tras conectar a MongoDB.
    //    El seed comprueba si ya existen datos para evitar duplicados.
    await seedDatabase();

    // 3. Arrancar Apollo Server.
    await apolloServer.start();

    // 4. Middlewares de Express.
    app.use(cors());
    app.use(express.json());

    // 5. Montar el endpoint de GraphQL.
    //    El context se enriquecerá en la Fase 5 con el usuario autenticado por JWT.
    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req }) => ({
          usuario: obtenerUsuarioDesdeRequest(req),
        }),
      })
    );

    // 6. Endpoint raíz: confirma que el servidor está vivo sin tocar GraphQL.
    app.get('/', (req, res) => {
      res.json({
        service: 'JobConnect Backend',
        status: 'ok',
        graphql: '/graphql',
        environment: env.nodeEnv,
      });
    });

    // 7. Middleware de 404 para rutas no definidas.
    //    Debe ir DESPUÉS de las rutas válidas.
    app.use(notFoundHandler);

    // 8. Middleware centralizado de errores.
    //    Debe ir el ÚLTIMO middleware.
    app.use(errorHandler);

    // 9. Poner el servidor a escuchar.
    app.listen(env.port, () => {
      console.log(`[server] Servidor escuchando en http://localhost:${env.port}`);
      console.log(`[server] GraphQL disponible en http://localhost:${env.port}/graphql`);
      console.log(`[server] Entorno: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error('[server] Error fatal al arrancar el servidor:', error.message);
    process.exit(1);
  }
}

/**
 * Registra un handler de cierre limpio para una señal del sistema operativo.
 *
 * Cuando llega la señal (por ejemplo Ctrl+C en local o SIGTERM en Docker),
 * cerramos ordenadamente Apollo y la conexión a MongoDB antes de terminar el proceso.
 *
 * @param {NodeJS.Signals} senyal - Nombre de la señal ('SIGINT', 'SIGTERM', ...).
 */
function registrarShutdown(senyal) {
  process.on(senyal, async () => {
    console.log(`\n[server] Señal ${senyal} recibida. Cerrando servidor...`);

    try {
      await apolloServer.stop();
      await closeMongo();
      console.log('[server] Servidor cerrado limpiamente. Hasta pronto.');
      process.exit(0);
    } catch (error) {
      console.error('[server] Error durante el cierre:', error.message);
      process.exit(1);
    }
  });
}

// Registramos el cierre limpio para las señales más comunes:
// - SIGINT: Ctrl+C en terminal.
// - SIGTERM: señal estándar enviada por Docker, systemd, PM2, etc.
registrarShutdown('SIGINT');
registrarShutdown('SIGTERM');

// Punto de arranque real.
startServer();