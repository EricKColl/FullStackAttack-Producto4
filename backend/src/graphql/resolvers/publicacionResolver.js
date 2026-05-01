/**
 * @file src/graphql/resolvers/publicacionResolver.js
 * @description Resolvers GraphQL para la entidad Publicación.
 *
 * Siguen el mismo patrón que usuarioResolver: resolvers finos que delegan
 * toda la lógica de normalización, validación y persistencia al model.
 *
 * Excepción importante: eliminarPublicacion coordina DOS models (publicacion
 * + seleccionada) para mantener la coherencia del dashboard tras un borrado.
 * Esta coordinación inter-entidades es responsabilidad del resolver, no
 * del model, porque afecta a dos agregados distintos.
 *
 * En la Fase 5 protegemos las mutations sensibles con JWT:
 * - crearPublicacion requiere administrador autenticado.
 * - eliminarPublicacion requiere administrador autenticado.
 */

import { requireAdmin } from '../../middleware/auth.js';
import * as publicacionModel from '../../models/publicacionModel.js';
import * as seleccionadaModel from '../../models/seleccionadaModel.js';

export const publicacionResolver = {
  Query: {
    /**
     * Lista todas las publicaciones.
     * Esta query se mantiene pública porque solo lee datos.
     */
    listarPublicaciones: () => {
      return publicacionModel.listarPublicaciones();
    },

    /**
     * Lista publicaciones filtradas por tipo.
     * Esta query se mantiene pública porque solo lee datos.
     *
     * @param {unknown} _parent
     * @param {{tipo: string}} args
     */
    listarPublicacionesPorTipo: (_parent, args) => {
      return publicacionModel.listarPublicacionesPorTipo(args.tipo);
    },

    /**
     * Busca una publicación por id.
     * Esta query se mantiene pública porque solo lee datos.
     *
     * @param {unknown} _parent
     * @param {{id: string}} args
     */
    publicacionPorId: (_parent, args) => {
      return publicacionModel.buscarPublicacionPorId(args.id);
    },

    /**
     * Devuelve el recuento de publicaciones.
     * Esta query se mantiene pública porque solo lee datos.
     */
    recuentoPublicaciones: () => {
      return publicacionModel.contarPublicaciones();
    },
  },

  Mutation: {
    /**
     * Crea una publicación nueva tras validar todos sus campos.
     *
     * Fase 5:
     * Esta mutation queda protegida. Solo un administrador autenticado
     * mediante JWT puede crear publicaciones.
     *
     * @param {unknown} _parent
     * @param {{datos: object}} args
     * @param {{usuario: object|null}} context
     */
    crearPublicacion: (_parent, args, context) => {
      requireAdmin(context);

      return publicacionModel.crearPublicacion(args.datos);
    },

    /**
     * Elimina una publicación por su id y mantiene coherencia limpiando
     * cualquier entrada huérfana en el panel de seleccionadas.
     *
     * Orden de operaciones:
     *   1. Comprobar que el usuario autenticado es administrador.
     *   2. Eliminar la publicación.
     *   3. Limpiar posibles huérfanas en seleccionadas.
     *   4. Devolver la publicación eliminada al cliente.
     *
     * @param {unknown} _parent
     * @param {{id: string}} args
     * @param {{usuario: object|null}} context
     */
    eliminarPublicacion: async (_parent, args, context) => {
      requireAdmin(context);

      const eliminada = await publicacionModel.eliminarPublicacionPorId(args.id);
      await seleccionadaModel.limpiarSeleccionesHuerfanas();

      return eliminada;
    },
  },
};