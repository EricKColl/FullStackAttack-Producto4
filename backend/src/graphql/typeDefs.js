/**
 * @file src/graphql/typeDefs.js
 * @description Schema GraphQL del backend.
 *
 * Convención:
 *   - Los tipos y los campos llevan triple comilla de documentación ("""..."""),
 *     que GraphQL mostrará en Apollo Sandbox y en cualquier cliente introspectable.
 *   - Las mutaciones que modifican datos agrupan sus parámetros en un "input type"
 *     para facilitar el envío desde Postman/Apollo Sandbox como variable JSON única.
 *
 * Estado actual: Usuario + Publicacion + Seleccionada (Fase 3 completa).
 */

export const typeDefs = `#graphql
  # =============================================================
  # TIPOS
  # =============================================================

  """
  Representa a un usuario registrado en la plataforma JobConnect.
  Importante: la contraseña nunca se expone en este tipo, solo se
  almacena internamente en el backend.
  """
  type Usuario {
    "Identificador único autoincremental."
    id: ID!

    "Nombre de pila del usuario."
    nombre: String!

    "Apellidos del usuario."
    apellidos: String!

    """
    Correo electrónico único en minúsculas. Usado como clave de login
    y como identificador humano del usuario.
    """
    email: String!

    """
    Rol del usuario dentro de la plataforma. Valores permitidos:
    - candidato: busca oportunidades laborales.
    - empresa: publica ofertas de empleo.
    - admin: administrador del backend (solo para gestión).
    """
    rol: String!
  }

  """
  Respuesta de autenticación para el login del administrador.
  Incluye el token JWT y los datos públicos del usuario autenticado.
  """
  type AuthPayload {
    "Token JWT que debe enviarse en el header Authorization como Bearer token."
    token: String!

    "Usuario administrador autenticado, sin exponer la contraseña."
    usuario: Usuario!
  }

  """
  Representa una publicación en JobConnect: puede ser una oferta de empleo
  publicada por una empresa, o una demanda publicada por un candidato.
  """
  type Publicacion {
    "Identificador único autoincremental."
    id: ID!

    """
    Tipo de publicación. Valores permitidos:
    - oferta: oportunidad laboral publicada por una empresa.
    - demanda: búsqueda activa publicada por un candidato.
    """
    tipo: String!

    "Título breve y descriptivo de la publicación."
    titulo: String!

    "Categoría o área profesional (Frontend, Sistemas, Full Stack, etc.)."
    categoria: String!

    "Nombre del autor: puede ser una empresa o un candidato."
    autor: String!

    "Ubicación geográfica o 'Remoto'."
    ubicacion: String!

    """
    Descripción extendida de la publicación. El backend exige un mínimo
    de 10 caracteres para evitar descripciones vacías o triviales.
    """
    descripcion: String!

    "Correo electrónico de contacto (normalizado a minúsculas)."
    emailContacto: String!

    """
    Fecha de la publicación en formato ISO YYYY-MM-DD.
    El backend valida que sea una fecha real (no acepta 30-feb, etc.).
    """
    fecha: String!
  }

  """
  Agrega estadísticas rápidas sobre las publicaciones.
  Usado por la futura query de resumen del dashboard.
  """
  type RecuentoPublicaciones {
    "Número de publicaciones de tipo 'oferta'."
    ofertas: Int!
    "Número de publicaciones de tipo 'demanda'."
    demandas: Int!
    "Total de publicaciones (ofertas + demandas)."
    total: Int!
  }

  """
  Resumen numérico del dashboard del Producto 2.
  Alimenta las cajitas de totales en la parte superior de la página.
  """
  type ResumenDashboard {
    totalOfertas: Int!
    totalDemandas: Int!
    totalUsuarios: Int!
    totalSeleccionadas: Int!
  }

  # =============================================================
  # INPUT TYPES (para mutaciones)
  # =============================================================

  """
  Payload para crear un nuevo usuario. Todos los campos son obligatorios.
  El backend normaliza el email a minúsculas y valida longitudes,
  formato de email y rol permitido antes de persistir.
  """
  input CrearUsuarioInput {
    nombre: String!
    apellidos: String!
    email: String!
    "Contraseña en texto plano. Debe tener al menos 4 caracteres."
    password: String!
    "Debe ser uno de: candidato, empresa, admin."
    rol: String!
  }

  """
  Payload para crear una nueva publicación. Todos los campos son obligatorios.
  El backend normaliza texto y email, valida tipo permitido, formato de email,
  fecha ISO válida (no acepta fechas inexistentes como 30-feb) y exige descripción
  de al menos 10 caracteres.
  """
  input CrearPublicacionInput {
    "Debe ser 'oferta' o 'demanda'."
    tipo: String!
    titulo: String!
    categoria: String!
    autor: String!
    ubicacion: String!
    "Mínimo 10 caracteres."
    descripcion: String!
    emailContacto: String!
    "Formato YYYY-MM-DD."
    fecha: String!
  }

  # =============================================================
  # QUERIES
  # =============================================================

  type Query {
    """
    [LEGACY / HEALTHCHECK]
    Devuelve un mensaje fijo para comprobar rápidamente que GraphQL vive.
    Creado en la Fase 2 por el compañero Carles.
    """
    saludo: String

    """
    [LEGACY / HEALTHCHECK]
    Devuelve un mensaje de estado fijo del backend.
    Creado en la Fase 2 por el compañero Carles.
    """
    estado: String

    # --- Usuario ---

    """
    Devuelve la lista completa de usuarios registrados,
    ordenada alfabéticamente por nombre completo.
    """
    listarUsuarios: [Usuario!]!

    """
    Busca un usuario por su email (case-insensitive).
    Devuelve null si no existe.
    """
    usuarioPorEmail(email: String!): Usuario

    # --- Publicacion ---

    """
    Devuelve todas las publicaciones ordenadas por fecha descendente.
    En empate de fecha, ordena por id descendente.
    """
    listarPublicaciones: [Publicacion!]!

    """
    Devuelve las publicaciones de un tipo concreto.
    Errores posibles:
    - VALIDATION_ERROR: tipo distinto de 'oferta' o 'demanda'.
    """
    listarPublicacionesPorTipo(tipo: String!): [Publicacion!]!

    """
    Busca una publicación por su id. Devuelve null si no existe.
    """
    publicacionPorId(id: ID!): Publicacion

    """
    Devuelve el recuento de publicaciones agrupado por tipo.
    """
    recuentoPublicaciones: RecuentoPublicaciones!

    # --- Seleccionadas y Dashboard ---

    """
    Devuelve solo los ids de las publicaciones seleccionadas actualmente
    en el panel del dashboard.
    """
    idsSeleccionados: [ID!]!

    """
    Devuelve las publicaciones seleccionadas como objetos completos,
    en orden de selección descendente (la última seleccionada primero).
    """
    listarPublicacionesSeleccionadas: [Publicacion!]!

    """
    Devuelve las publicaciones que todavía NO están seleccionadas,
    listas para ser arrastradas al panel del dashboard.
    """
    listarPublicacionesDisponibles: [Publicacion!]!

    """
    Devuelve el resumen numérico completo del dashboard del Producto 2:
    totales de ofertas, demandas, usuarios y seleccionadas.
    """
    resumenDashboard: ResumenDashboard!
  }

  # =============================================================
  # MUTATIONS
  # =============================================================

    type Mutation {
    # --- Usuario ---

    """
    Crea un nuevo usuario con los datos proporcionados.
    Errores posibles:
    - VALIDATION_ERROR: algún campo inválido (email mal formado, password corto, rol no permitido).
    - CONFLICT: el email ya está registrado.
    """
    crearUsuario(datos: CrearUsuarioInput!): Usuario!

    """
    Elimina un usuario por su email.
    Errores posibles:
    - VALIDATION_ERROR: el email está vacío.
    - NOT_FOUND: no existe usuario con ese email.
    """
    eliminarUsuario(email: String!): Usuario!

    """
    Autentica a un usuario con email y password.
    Devuelve el usuario sin password si las credenciales son válidas.

    Esta mutation se mantiene por compatibilidad con el trabajo previo.
    Para la autenticación segura de administrador se usa loginAdmin.
    
    Errores posibles:
    - VALIDATION_ERROR: faltan credenciales.
    - NOT_FOUND: email o password incorrectos.
    """
    loguearUsuario(email: String!, password: String!): Usuario!

    """
    Autentica al administrador de la aplicación.
    Si las credenciales son correctas y el usuario tiene rol admin,
    devuelve un token JWT y los datos públicos del usuario autenticado.

    Errores posibles:
    - VALIDATION_ERROR: faltan credenciales o el email no es válido.
    - UNAUTHORIZED: credenciales incorrectas o usuario sin permisos de administrador.
    """
    loginAdmin(email: String!, password: String!): AuthPayload!

    # --- Publicacion ---

    """
    Crea una nueva publicación con los datos proporcionados.
    Errores posibles:
    - VALIDATION_ERROR: tipo inválido, fecha incorrecta, email mal formado, descripción corta, etc.
    """
    crearPublicacion(datos: CrearPublicacionInput!): Publicacion!

    """
    Elimina una publicación por su id. Devuelve la publicación eliminada.
    Si la publicación estaba seleccionada en el dashboard, también se retira
    del panel de seleccionadas para mantener coherencia.
    Errores posibles:
    - VALIDATION_ERROR: id inválido.
    - NOT_FOUND: no existe publicación con ese id.
    """
    eliminarPublicacion(id: ID!): Publicacion!

    # --- Seleccionadas ---

    """
    Añade una publicación al panel de seleccionadas del dashboard.
    Operación idempotente: si la publicación ya estaba seleccionada,
    no crea duplicado ni lanza error.
    Errores posibles:
    - VALIDATION_ERROR: id inválido.
    - NOT_FOUND: no existe publicación con ese id.
    """
    anadirSeleccionada(idPublicacion: ID!): Publicacion!

    """
    Quita una publicación del panel de seleccionadas.
    Errores posibles:
    - VALIDATION_ERROR: id inválido.
    - NOT_FOUND: la publicación no estaba seleccionada.
    """
    quitarSeleccionada(idPublicacion: ID!): Publicacion!
  }
`;