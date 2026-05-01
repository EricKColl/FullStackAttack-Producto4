# FullStackAttack · Producto 4

## Aplicación FullStack: combinando el FrontEnd y la API de Backend en una sola aplicación

**Asignatura:** FP.450 - (P) Desarrollo full stack de soluciones web JavaScript y servicios web  
**Institución:** Universitat Oberta de Catalunya (UOC)  
**Grupo:** FullStackAttack  
**Producto:** Producto 4  
**Proyecto:** JobConnect  

---

## Integrantes del equipo

- Erick Coll Rodríguez
- Carles Miguel Millán
- Jacobo Barrera Toba

---

## 1. Descripción general

Este repositorio contiene el desarrollo del **Producto 4** del proyecto **JobConnect**, realizado por el grupo **FullStackAttack**.

El objetivo principal de este producto es evolucionar el trabajo realizado en los productos anteriores hacia una aplicación **FullStack JavaScript completa**, integrando el frontend desarrollado en el **Producto 2** con el backend GraphQL desarrollado en el **Producto 3**.

En el **Producto 2**, la aplicación utilizaba mecanismos de persistencia en navegador, como **WebStorage** e **IndexedDB**. En este **Producto 4**, esa lógica se sustituirá por comunicaciones reales con un backend mediante **Fetch**, **GraphQL**, **MongoDB**, **Mongoose** y **Socket.io**.

---

## 2. Evolución respecto a productos anteriores

### Producto 2

En el Producto 2 se desarrolló la parte visible de la aplicación, incluyendo:

- Interfaz web con HTML, CSS, JavaScript y Bootstrap.
- Pantallas principales de JobConnect.
- Uso de APIs HTML5.
- Persistencia local mediante WebStorage e IndexedDB.
- Lógica de frontend organizada en archivos JavaScript.
- Dashboard e interacción con publicaciones, usuarios y datos simulados.

### Producto 3

En el Producto 3 se desarrolló el backend de la aplicación, incluyendo:

- Servidor Node.js con Express.
- API GraphQL.
- Conexión con MongoDB.
- Gestión de usuarios.
- Gestión de publicaciones.
- Gestión de elementos seleccionados.
- Resolvers y modelos separados.
- Validaciones y tratamiento de errores.
- Pruebas mediante Postman y Apollo Sandbox.

### Producto 4

En el Producto 4 se integran ambas partes para crear una solución FullStack completa.

La aplicación deberá:

- Sustituir la persistencia local del navegador por llamadas al backend.
- Utilizar Fetch para comunicarse con la API GraphQL.
- Migrar el acceso a MongoDB hacia Mongoose.
- Implementar autenticación y roles de usuario.
- Controlar permisos desde el servidor.
- Mantener el estado de sesión.
- Incorporar WebSockets mediante Socket.io.
- Actualizar el dashboard en tiempo real cuando se creen o seleccionen voluntariados/publicaciones.
- Preparar el proyecto para su entrega mediante GitHub, CodeSandbox o vídeo demostrativo.

---

## 3. Objetivos principales del Producto 4

Los objetivos principales de este producto son:

- Crear una aplicación FullStack JavaScript completa.
- Integrar frontend y backend en un único proyecto organizado.
- Migrar la capa de datos a Mongoose ODM.
- Definir esquemas estructurados para MongoDB.
- Incorporar validaciones automáticas en los modelos.
- Implementar autenticación con roles diferenciados.
- Diferenciar entre usuario administrador y usuario normal.
- Proteger las operaciones del backend según el rol del usuario.
- Sustituir WebStorage e IndexedDB por llamadas Fetch.
- Implementar comunicaciones asíncronas entre frontend y backend.
- Añadir WebSockets para actualizaciones en tiempo real.
- Preparar documentación técnica y evidencias de desarrollo.
- Mantener un flujo de trabajo colaborativo mediante Git y GitHub.

---

## 4. Tecnologías previstas

### Frontend

- HTML5
- CSS3
- JavaScript
- Bootstrap
- Fetch API
- Socket.io Client

### Backend

- Node.js
- Express.js
- GraphQL
- MongoDB
- Mongoose
- Socket.io
- JSON Web Token
- Bcrypt
- Dotenv
- CORS

### Herramientas de desarrollo

- Visual Studio Code
- Git
- GitHub
- Postman
- Apollo Sandbox
- MongoDB Atlas o MongoDB local
- CodeSandbox o entorno equivalente

---

## 5. Estructura inicial del proyecto

```txt
FullStackAttack-Producto4/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── graphql/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── seed/
│   │   └── utils/
│   │
│   ├── postman/
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── package-lock.json
│   └── package.json
│
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   ├── img/
│   │   └── js/
│   │
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   ├── ofertas-demandas.html
│   └── usuarios.html
│
├── docs/
│   ├── evidencias/
│   ├── mapa-conceptual/
│   └── prompts-ia/
│
├── .gitignore
└── README.md
```

---

## 6. Organización del equipo

El trabajo se organizará en tres partes principales, con el objetivo de dividir correctamente las responsabilidades y facilitar el desarrollo colaborativo del Producto 4.

### Parte 1 — Infraestructura e integración inicial

**Responsable inicial:** Erick Coll Rodríguez

Tareas principales:

- Crear el repositorio nuevo del Producto 4.
- Preparar la estructura inicial del proyecto.
- Integrar el frontend del Producto 2.
- Integrar el backend del Producto 3.
- Preparar el archivo `.gitignore`.
- Documentar la base inicial del repositorio.
- Crear las ramas de trabajo.
- Dejar el proyecto preparado para que los compañeros puedan continuar.

### Parte 2 — Backend, Mongoose, GraphQL y roles

Tareas principales:

- Migrar el acceso a MongoDB desde el driver nativo hacia Mongoose.
- Crear esquemas Mongoose para usuarios, publicaciones y seleccionadas.
- Añadir validaciones, índices, hooks y middleware.
- Implementar control de roles.
- Proteger resolvers según permisos.
- Mejorar la autenticación.
- Preparar operaciones de administrador y usuario normal.

### Parte 3 — Frontend, Fetch, WebSockets y entrega

Tareas principales:

- Sustituir la lógica de persistencia local por llamadas Fetch.
- Conectar el frontend con GraphQL.
- Gestionar token o sesión desde el cliente.
- Actualizar vistas según el rol del usuario.
- Integrar Socket.io en el frontend.
- Actualizar el dashboard en tiempo real.
- Preparar la demostración final, vídeo o CodeSandbox.

---

## 7. Ramas de trabajo previstas

La organización inicial de ramas será:

- `main`
- `develop`
- `feature/infraestructura-erick`
- `feature/backend-mongoose-roles`
- `feature/frontend-fetch-websocket`

### Flujo de trabajo previsto

- `main`: rama estable final.
- `develop`: rama de integración del equipo.
- `feature/infraestructura-erick`: rama inicial de infraestructura.
- `feature/backend-mongoose-roles`: rama para backend, Mongoose y roles.
- `feature/frontend-fetch-websocket`: rama para frontend, Fetch y WebSockets.

---

## 8. Estado actual del proyecto

Estado inicial del Producto 4:

- Estructura principal creada.
- Frontend del Producto 2 incorporado.
- Backend del Producto 3 incorporado.
- `.gitignore` general preparado.
- README inicial creado.
- Pendiente de inicializar repositorio Git.
- Pendiente de crear repositorio remoto en GitHub.
- Pendiente de instalar dependencias.
- Pendiente de migración a Mongoose.
- Pendiente de integración mediante Fetch.
- Pendiente de implementación de roles.
- Pendiente de integración de WebSockets.

---

## 9. Notas importantes de seguridad

No se deben subir al repositorio archivos privados como:

- `.env`
- `.env.local-backup`
- `node_modules`
- Tokens reales.
- Contraseñas.
- Claves privadas.
- URIs reales de MongoDB Atlas.

Solo debe subirse el archivo:

- `.env.example`

Este archivo debe contener únicamente variables de ejemplo, sin datos privados reales.

---

## 10. Entrega prevista

Para la entrega final se deberá incluir:

- Enlace al repositorio GitHub.
- Enlace a CodeSandbox o alternativa funcional.
- Vídeo explicativo si es necesario.
- Documentación técnica.
- Evidencias del uso de Git.
- Evidencias del uso de IA generativa.
- Mapa conceptual.
- Explicación de las mejoras respecto a productos anteriores.

---