/**
 * @file src/graphql/resolvers/publicacionResolver.js
 * @description Resolvers GraphQL para la entidad Publicación.
 *
 * Producto 4:
 * - Las consultas de publicaciones se mantienen disponibles para alimentar el frontend.
 * - La creación de publicaciones se adapta al rol autenticado:
 *   admin puede crear ofertas y demandas.
 *   empresa solo puede crear ofertas.
 *   candidato solo puede crear demandas.
 * - La eliminación sigue reservada al administrador.
 */

import {
  requireAdmin,
  requirePermisoCrearPublicacion
} from '../../middleware/auth.js';
import * as publicacionModel from '../../models/publicacionModel.js';
import * as seleccionadaModel from '../../models/seleccionadaModel.js';
import {
  emitirDashboardActualizado,
  emitirPublicacionesActualizadas,
  emitirSeleccionadasActualizadas,
} from '../../socket.js';

/**
 * Normaliza texto defensivamente.
 *
 * @param {unknown} valor
 * @returns {string}
 */
function normalizarTexto(valor) {
  return String(valor || '').trim();
}

/**
 * Prepara los datos antes de enviarlos al model.
 *
 * Para usuarios no administradores se refuerza que el email de contacto
 * coincida con el usuario autenticado. Así evitamos que una empresa o
 * candidato cree publicaciones usando correos de terceros.
 *
 * @param {object} datosPublicacion
 * @param {object} usuarioAutenticado
 * @returns {object}
 */
function prepararDatosPublicacionPorRol(datosPublicacion, usuarioAutenticado) {
  const datos = {
    ...datosPublicacion,
    tipo: normalizarTexto(datosPublicacion.tipo).toLowerCase(),
  };

  if (usuarioAutenticado.rol !== 'admin') {
    datos.emailContacto = usuarioAutenticado.email;
  }

  return datos;
}

export const publicacionResolver = {
  Query: {
    /**
     * Lista todas las publicaciones.
     *
     * La adaptación final por rol se realizará en frontend para que:
     * - admin tenga visión global;
     * - empresa vea principalmente ofertas y demandas útiles para contratar;
     * - candidato vea principalmente ofertas disponibles.
     */
    listarPublicaciones: () => {
      return publicacionModel.listarPublicaciones();
    },

    /**
     * Lista publicaciones filtradas por tipo.
     *
     * @param {unknown} _parent
     * @param {{tipo: string}} args
     */
    listarPublicacionesPorTipo: (_parent, args) => {
      return publicacionModel.listarPublicacionesPorTipo(args.tipo);
    },

    /**
     * Busca una publicación por id.
     *
     * @param {unknown} _parent
     * @param {{id: string}} args
     */
    publicacionPorId: (_parent, args) => {
      return publicacionModel.buscarPublicacionPorId(args.id);
    },

    /**
     * Devuelve el recuento general de publicaciones.
     */
    recuentoPublicaciones: () => {
      return publicacionModel.contarPublicaciones();
    },
  },

  Mutation: {
    /**
     * Crea una publicación nueva.
     *
     * Reglas:
     * - admin puede crear ofertas y demandas.
     * - empresa solo puede crear ofertas.
     * - candidato solo puede crear demandas.
     *
     * @param {unknown} _parent
     * @param {{datos: object}} args
     * @param {{usuario: object|null}} context
     */
    crearPublicacion: async (_parent, args, context) => {
      const usuarioAutenticado = requirePermisoCrearPublicacion(
        context,
        args.datos.tipo
      );

      const datosPreparados = prepararDatosPublicacionPorRol(
        args.datos,
        usuarioAutenticado
      );

      const creada = await publicacionModel.crearPublicacion(datosPreparados);

      emitirDashboardActualizado();
      emitirPublicacionesActualizadas();

      return creada;
    },

    /**
     * Elimina una publicación por su id y mantiene coherencia limpiando
     * cualquier entrada huérfana en seleccionadas.
     *
     * Solo el administrador puede eliminar publicaciones porque afecta
     * a datos globales de la aplicación.
     *
     * @param {unknown} _parent
     * @param {{id: string}} args
     * @param {{usuario: object|null}} context
     */
    eliminarPublicacion: async (_parent, args, context) => {
      requireAdmin(context);

      const eliminada = await publicacionModel.eliminarPublicacionPorId(args.id);

      await seleccionadaModel.limpiarSeleccionesHuerfanas();

      emitirDashboardActualizado();
      emitirPublicacionesActualizadas();
      emitirSeleccionadasActualizadas();

      return eliminada;
    },
  },
};