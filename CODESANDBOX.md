# Ejecución en CodeSandbox

Este proyecto está preparado para poder ejecutarse desde la raíz del repositorio.

## Arranque principal

Desde la raíz:

```bash
npm start
```

Este comando instala las dependencias del backend y arranca el servidor Node/Express/Apollo.

## Frontend servido desde el backend

Para facilitar la ejecución en CodeSandbox, el backend también sirve el frontend estático.

URL principal:

```text
/
```

Endpoint GraphQL:

```text
/graphql
```

Endpoint técnico de estado:

```text
/api/status
```

## Variables de entorno necesarias

En CodeSandbox se deben configurar las variables equivalentes a:

```env
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb+srv://USUARIO:PASSWORD@CLUSTER.mongodb.net
MONGO_DB_NAME=jobconnect_producto4
JWT_SECRET=cambia-esta-cadena-por-algo-largo-y-aleatorio
JWT_EXPIRES_IN=12h
ADMIN_EMAIL=admin@jobconnect.com
ADMIN_PASSWORD=admin1234
```

Para CodeSandbox se recomienda utilizar MongoDB Atlas, ya que el entorno online no depende del Docker local de cada integrante.

## Arranque local habitual

El flujo local de desarrollo sigue funcionando igual:

Terminal 1:

```bash
cd backend
npm run dev
```

Terminal 2:

```bash
cd frontend
python -m http.server 5500
```

En local, el frontend seguirá conectando con:

```text
http://localhost:4000/graphql
```

## Comprobación rápida

Una vez arrancado el servidor, comprobar:

```text
http://localhost:4000
http://localhost:4000/graphql
http://localhost:4000/api/status
```
