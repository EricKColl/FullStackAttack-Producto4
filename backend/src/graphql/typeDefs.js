/**
 * @file src/graphql/typeDefs.js
 * @description Schema GraphQL del backend.
 *
 * Producto 4:
 * - Frontend conectado mediante Fetch.
 * - Backend GraphQL con MongoDB/Mongoose.
 * - Sesión mediante JWT.
 * - Control de roles: admin, empresa y candidato.
 */

export const typeDefs = `#graphql
  # =============================================================
  # TIPOS
  # =============================================================

  """
  Representa a un usuario registrado en JobConnect.
  La contraseña nunca se expone en la API.
  """
  type Usuario {
    id: ID!
    nombre: String!
    apellidos: String!
    email: String!
    rol: String!
  }

  """
  Respuesta de autenticación.
  Incluye el token JWT y los datos públicos del usuario.
  """
  type AuthPayload {
    token: String!
    usuario: Usuario!
  }

  """
  Representa una publicación en JobConnect.
  Puede ser una oferta publicada por una empresa o una demanda publicada por un candidato.
  """
  type Publicacion {
    id: ID!
    tipo: String!
    titulo: String!
    categoria: String!
    autor: String!
    ubicacion: String!
    descripcion: String!
    emailContacto: String!
    fecha: String!
  }

  """
  Recuento agrupado de publicaciones.
  """
  type RecuentoPublicaciones {
    ofertas: Int!
    demandas: Int!
    total: Int!
  }

  """
  Resumen numérico del dashboard.
  """
  type ResumenDashboard {
    totalOfertas: Int!
    totalDemandas: Int!
    totalUsuarios: Int!
    totalSeleccionadas: Int!
  }

  # =============================================================
  # INPUT TYPES
  # =============================================================

  input CrearUsuarioInput {
    nombre: String!
    apellidos: String!
    email: String!
    password: String!
    rol: String!
  }

  input CrearPublicacionInput {
    tipo: String!
    titulo: String!
    categoria: String!
    autor: String!
    ubicacion: String!
    descripcion: String!
    emailContacto: String!
    fecha: String!
  }

  # =============================================================
  # QUERIES
  # =============================================================

  type Query {
    """
    Healthcheck básico.
    """
    saludo: String

    """
    Estado básico del backend.
    """
    estado: String

    # --- Usuario ---

    """
    Devuelve la lista completa de usuarios.
    Requiere rol administrador.
    """
    listarUsuarios: [Usuario!]!

    """
    Busca un usuario por email.
    """
    usuarioPorEmail(email: String!): Usuario

    # --- Publicacion ---

    """
    Devuelve todas las publicaciones ordenadas por fecha descendente.
    """
    listarPublicaciones: [Publicacion!]!

    """
    Devuelve publicaciones filtradas por tipo: oferta o demanda.
    """
    listarPublicacionesPorTipo(tipo: String!): [Publicacion!]!

    """
    Busca una publicación por id.
    """
    publicacionPorId(id: ID!): Publicacion

    """
    Devuelve el recuento de publicaciones agrupado por tipo.
    """
    recuentoPublicaciones: RecuentoPublicaciones!

    # --- Seleccionadas y Dashboard ---

    """
    Devuelve los ids de las publicaciones seleccionadas.
    """
    idsSeleccionados: [ID!]!

    """
    Devuelve las publicaciones seleccionadas como objetos completos.
    """
    listarPublicacionesSeleccionadas: [Publicacion!]!

    """
    Devuelve las publicaciones todavía disponibles.
    """
    listarPublicacionesDisponibles: [Publicacion!]!

    """
    Devuelve el resumen numérico del dashboard.
    """
    resumenDashboard: ResumenDashboard!
  }

  # =============================================================
  # MUTATIONS
  # =============================================================

  type Mutation {
    # --- Usuario ---

    """
    Crea un nuevo usuario.
    Requiere rol administrador.
    """
    crearUsuario(datos: CrearUsuarioInput!): Usuario!

    """
    Elimina un usuario por email.
    Requiere rol administrador.
    """
    eliminarUsuario(email: String!): Usuario!

    """
    Autentica cualquier usuario válido: admin, empresa o candidato.
    Devuelve token JWT y datos públicos del usuario.
    """
    loguearUsuario(email: String!, password: String!): AuthPayload!

    """
    Autentica específicamente al administrador.
    Se mantiene para compatibilidad con las pruebas anteriores.
    """
    loginAdmin(email: String!, password: String!): AuthPayload!

    # --- Publicacion ---

    """
    Crea una nueva publicación.
    El backend validará el rol:
    - admin puede crear ofertas y demandas.
    - empresa solo puede crear ofertas.
    - candidato solo puede crear demandas.
    """
    crearPublicacion(datos: CrearPublicacionInput!): Publicacion!

    """
    Elimina una publicación por id.
    Requiere rol administrador.
    """
    eliminarPublicacion(id: ID!): Publicacion!

    # --- Seleccionadas ---

    """
    Añade una publicación al panel de seleccionadas.
    Requiere sesión iniciada.
    """
    anadirSeleccionada(idPublicacion: ID!): Publicacion!

    """
    Quita una publicación del panel de seleccionadas.
    Requiere sesión iniciada.
    """
    quitarSeleccionada(idPublicacion: ID!): Publicacion!
  }
`;