/**
 * @file src/graphql/resolvers/seleccionadaResolver.js
 * @description Resolvers GraphQL para las publicaciones seleccionadas
 *              y el resumen del dashboard.
 *
 * Cubre toda la lógica del panel de drag & drop del Producto 2:
 *   - qué hay seleccionado ahora mismo
 *   - qué queda disponible para arrastrar
 *   - añadir o quitar publicaciones del panel
 *   - obtener los totales que pintan las cajitas del dashboard
 *
 * Siguiendo el patrón "thin resolver / fat model", aquí solo adaptamos
 * argumentos y delegamos en seleccionadaModel.
 *
 * En la Fase 5 protegemos las mutations sensibles con JWT:
 * - anadirSeleccionada requiere administrador autenticado.
 * - quitarSeleccionada requiere administrador autenticado.
 */

import { requireAdmin } from '../../middleware/auth.js';
import * as seleccionadaModel from '../../models/seleccionadaModel.js';

export const seleccionadaResolver = {
  Query: {
    /**
     * Devuelve solo los ids de las publicaciones seleccionadas.
     * Esta query se mantiene pública porque solo lee datos.
     */
    idsSeleccionados: () => {
      return seleccionadaModel.listarIdsSeleccionados();
    },

    /**
     * Devuelve las publicaciones seleccionadas como objetos completos.
     * Esta query se mantiene pública porque solo lee datos.
     */
    listarPublicacionesSeleccionadas: () => {
      return seleccionadaModel.listarPublicacionesSeleccionadas();
    },

    /**
     * Devuelve las publicaciones que aún no están seleccionadas.
     * Esta query se mantiene pública porque solo lee datos.
     */
    listarPublicacionesDisponibles: () => {
      return seleccionadaModel.listarPublicacionesDisponibles();
    },

    /**
     * Devuelve el resumen numérico del dashboard (4 totales).
     * Esta query se mantiene pública porque solo lee datos.
     */
    resumenDashboard: () => {
      return seleccionadaModel.obtenerResumenDashboard();
    },
  },

  Mutation: {
    /**
     * Añade una publicación al panel de seleccionadas.
     *
     * Fase 5:
     * Esta mutation queda protegida. Solo un administrador autenticado
     * mediante JWT puede modificar las publicaciones seleccionadas.
     *
     * @param {unknown} _parent
     * @param {{idPublicacion: string}} args
     * @param {{usuario: object|null}} context
     */
    anadirSeleccionada: (_parent, args, context) => {
      requireAdmin(context);

      return seleccionadaModel.anadirSeleccionada(args.idPublicacion);
    },

    /**
     * Quita una publicación del panel de seleccionadas.
     *
     * Fase 5:
     * Esta mutation queda protegida. Solo un administrador autenticado
     * mediante JWT puede modificar las publicaciones seleccionadas.
     *
     * @param {unknown} _parent
     * @param {{idPublicacion: string}} args
     * @param {{usuario: object|null}} context
     */
    quitarSeleccionada: (_parent, args, context) => {
      requireAdmin(context);

      return seleccionadaModel.quitarSeleccionada(args.idPublicacion);
    },
  },
};