/**
 * @file src/graphql/resolvers/seleccionadaResolver.js
 * @description Resolvers GraphQL para publicaciones seleccionadas y dashboard.
 *
 * Producto 4:
 * - Las consultas del dashboard siguen disponibles para pintar datos reales.
 * - Las acciones de selección ya no son exclusivas del administrador.
 * - Cualquier usuario autenticado con JWT puede añadir o quitar seleccionadas.
 * - Socket.io sigue notificando los cambios en tiempo real.
 */

import { requireAuth } from '../../middleware/auth.js';
import * as seleccionadaModel from '../../models/seleccionadaModel.js';
import {
  emitirDashboardActualizado,
  emitirSeleccionadasActualizadas,
} from '../../socket.js';

export const seleccionadaResolver = {
  Query: {
    /**
     * Devuelve los ids de las publicaciones seleccionadas.
     */
    idsSeleccionados: () => {
      return seleccionadaModel.listarIdsSeleccionados();
    },

    /**
     * Devuelve las publicaciones seleccionadas como objetos completos.
     */
    listarPublicacionesSeleccionadas: () => {
      return seleccionadaModel.listarPublicacionesSeleccionadas();
    },

    /**
     * Devuelve las publicaciones que todavía no están seleccionadas.
     */
    listarPublicacionesDisponibles: () => {
      return seleccionadaModel.listarPublicacionesDisponibles();
    },

    /**
     * Devuelve el resumen numérico general del dashboard.
     */
    resumenDashboard: () => {
      return seleccionadaModel.obtenerResumenDashboard();
    },
  },

  Mutation: {
    /**
     * Añade una publicación al panel de seleccionadas.
     *
     * Requiere sesión iniciada:
     * - admin puede usarlo desde visión global.
     * - empresa puede usarlo desde su panel de empresa.
     * - candidato puede usarlo desde su panel de candidato.
     *
     * @param {unknown} _parent
     * @param {{idPublicacion: string}} args
     * @param {{usuario: object|null}} context
     */
    anadirSeleccionada: async (_parent, args, context) => {
      requireAuth(context);

      const seleccionada = await seleccionadaModel.anadirSeleccionada(
        args.idPublicacion
      );

      emitirDashboardActualizado();
      emitirSeleccionadasActualizadas();

      return seleccionada;
    },

    /**
     * Quita una publicación del panel de seleccionadas.
     *
     * Requiere sesión iniciada.
     *
     * @param {unknown} _parent
     * @param {{idPublicacion: string}} args
     * @param {{usuario: object|null}} context
     */
    quitarSeleccionada: async (_parent, args, context) => {
      requireAuth(context);

      const seleccionada = await seleccionadaModel.quitarSeleccionada(
        args.idPublicacion
      );

      emitirDashboardActualizado();
      emitirSeleccionadasActualizadas();

      return seleccionada;
    },
  },
};