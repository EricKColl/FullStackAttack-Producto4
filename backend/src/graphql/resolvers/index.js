/**
 * @file src/graphql/resolvers/index.js
 * @description Punto único de ensamblado de todos los resolvers del backend.
 *
 * Apollo Server espera un objeto plano con las claves Query y Mutation,
 * pero nosotros preferimos escribir un resolver por entidad y combinarlos aquí.
 * Esto mantiene cada fichero pequeño y responsable solo de su dominio.
 *
 * Patrón de combinación: fusionamos en profundidad los objetos Query y Mutation
 * de cada entidad, de modo que Apollo vea un único objeto consolidado.
 */

import { usuarioResolver } from './usuarioResolver.js';
import { publicacionResolver } from './publicacionResolver.js';
import { seleccionadaResolver } from './seleccionadaResolver.js';

/**
 * Resolvers "legacy" de healthcheck que dejó el PR #3 de Carles.
 * Se conservan como comprobación rápida de que el servidor responde,
 * y porque aparecen declarados en typeDefs.
 */
const healthcheckResolver = {
  Query: {
    saludo: () => 'Hola, GraphQL está funcionando',
    estado: () => 'Backend operativo',
  },
};

/**
 * Combina los resolvers Query y Mutation de varias entidades en uno solo.
 *
 * @param {Array<{Query?: object, Mutation?: object}>} lista
 * @returns {{Query: object, Mutation: object}}
 */
function combinarResolvers(lista) {
  return lista.reduce(
    (acc, resolver) => ({
      Query:    { ...acc.Query,    ...(resolver.Query    || {}) },
      Mutation: { ...acc.Mutation, ...(resolver.Mutation || {}) },
    }),
    { Query: {}, Mutation: {} }
  );
}

export const resolvers = combinarResolvers([
  healthcheckResolver,
  usuarioResolver,
  publicacionResolver,
  seleccionadaResolver,
]);