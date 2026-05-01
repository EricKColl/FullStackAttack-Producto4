# Colección Postman — JobConnect Producto 3

## Backend GraphQL · FullStackAttack

Esta carpeta contiene la colección Postman oficial del backend GraphQL del **Producto 3 — JobConnect**, desarrollado por el equipo **FullStackAttack**, junto con su environment local de desarrollo.

La colección permite probar el funcionamiento principal del backend, validar la autenticación mediante JWT, comprobar los CRUD principales del proyecto y ejecutar tests automáticos sobre las operaciones más importantes.

---

## 1. Ficheros incluidos

| Fichero | Descripción |
|---|---|
| `JobConnect-Producto3.postman_collection.json` | Colección con 22 requests organizadas en 6 carpetas y más de 60 tests automáticos. |
| `JobConnect-Local.postman_environment.json` | Environment local con las variables necesarias para ejecutar la colección: `baseUrl`, `adminEmail`, `adminPassword` y `token`. |

---

## 2. Importar la colección en Postman

Para utilizar correctamente la colección, primero se deben importar los dos ficheros `.json` incluidos en esta carpeta.

### Pasos

1. Abrir Postman.
2. Seleccionar **File → Import**.
3. También se puede pulsar el botón **Import** situado en la barra superior.
4. Seleccionar los dos ficheros `.json` de esta carpeta:
   - `JobConnect-Producto3.postman_collection.json`
   - `JobConnect-Local.postman_environment.json`
5. Confirmar la importación.
6. La colección aparecerá en el apartado **Collections**.
7. El environment aparecerá en el apartado **Environments**.

---

## 3. Activar el environment local

Postman no activa automáticamente el environment al importarlo. Por este motivo, es necesario seleccionarlo manualmente antes de ejecutar cualquier request.

### Pasos

1. Ir a la esquina superior derecha de Postman.
2. Abrir el selector de environment.
3. Cambiar la opción **No environment** por **JobConnect — Local**.

> ⚠️ Si no se activa el environment, las variables `{{baseUrl}}`, `{{token}}`, `{{adminEmail}}` y `{{adminPassword}}` no se resolverán correctamente.  
> Como consecuencia, las requests fallarán aunque el backend esté funcionando correctamente.

---

## 4. Estructura de la colección

La colección está organizada de forma progresiva para facilitar las pruebas del backend GraphQL.

    JobConnect Producto 3 — Backend GraphQL  (22 requests)
    ├── 0. Healthcheck (2)
    │   └── Queries básicas de prueba para comprobar que el backend responde correctamente.
    │
    ├── 1. Auth (1)
    │   └── Login del administrador. Guarda el token JWT automáticamente en el environment.
    │
    ├── 2. Usuario (5)
    │   └── Requests relacionadas con el CRUD de usuarios.
    │
    ├── 3. Publicación (6)
    │   └── Requests relacionadas con el CRUD de publicaciones.
    │
    ├── 4. Dashboard / Seleccionadas (6)
    │   └── Requests relacionadas con el panel del dashboard y las publicaciones seleccionadas.
    │
    └── 5. Tests de seguridad (2)
        └── Pruebas negativas que verifican que la protección JWT funciona correctamente.

---

## 5. Flujo de uso recomendado

Para ejecutar correctamente la colección, se recomienda seguir siempre este orden.

### Paso 1 — Arrancar el backend en local

Antes de usar Postman, el backend debe estar ejecutándose en local.

    npm run dev

Por defecto, el endpoint GraphQL estará disponible en:

    http://localhost:4000/graphql

---

### Paso 2 — Ejecutar el login del administrador

Una vez arrancado el backend, se debe ejecutar la siguiente request:

    1. Auth → Login Admin

Esta request realiza el login con el usuario administrador definido en el seed del proyecto.

Si el login es correcto, el script post-response de Postman extrae automáticamente el token JWT recibido en la respuesta y lo guarda en la variable de entorno:

    {{token}}

---

### Paso 3 — Ejecutar el resto de requests

Después de obtener el token, ya se puede ejecutar cualquier otra request de la colección.

Las requests protegidas utilizan automáticamente la cabecera de autorización:

    Authorization: Bearer {{token}}

De esta forma, no es necesario copiar manualmente el token en cada request.

---

## 6. Ejecutar todos los tests con Collection Runner

Postman permite ejecutar toda la colección de golpe mediante el **Collection Runner**.

### Pasos

1. Clic derecho sobre la colección **JobConnect Producto 3 — Backend GraphQL**.
2. Seleccionar la opción **Run collection**.
3. Marcar todas las carpetas y requests.
4. Pulsar **Run JobConnect Producto 3...**.
5. Esperar a que finalice la ejecución completa.

El runner ejecutará las 22 requests en orden y mostrará un informe final con los más de 60 tests automáticos incluidos en la colección.

Si el backend está funcionando correctamente, el resultado esperado es que todos los tests aparezcan en verde.

---

## 7. Variables del environment

El environment `JobConnect — Local` contiene las variables necesarias para ejecutar correctamente la colección en entorno local.

| Variable | Descripción |
|---|---|
| `baseUrl` | URL del endpoint GraphQL. Por defecto: `http://localhost:4000/graphql`. Debe cambiarse si se usa un despliegue externo como Atlas, CodeSandbox u otro entorno remoto. |
| `adminEmail` | Email del administrador definido en el seed del proyecto. Por defecto: `admin@jobconnect.com`. |
| `adminPassword` | Contraseña del administrador definida en el fichero `.env`. Por defecto: `admin1234`. |
| `token` | Token JWT del administrador. Se rellena automáticamente después de ejecutar correctamente la request `Login Admin`. |

## Environments alternativos

Esta carpeta incluye un environment listo para desarrollo local
(`JobConnect-Local.postman_environment.json`). Para Fase 6 trabajamos contra
**MongoDB Atlas** y, durante la grabación del vídeo y la entrega, contra
**CodeSandbox**.

### Local + Atlas (mismo environment)

Mientras el backend se ejecuta en tu PC con `npm run dev`, da igual si la
base de datos es Docker local o Atlas: el endpoint GraphQL sigue siendo
`http://localhost:4000/graphql`. Por tanto, el environment
`JobConnect-Local` sirve igual en ambos casos.

Lo único que cambia entre los dos modos es la variable `MONGO_URI` del
fichero `.env` del backend. La colección Postman no necesita modificación.

### CodeSandbox (environment paralelo)

Cuando despleguemos el backend en CodeSandbox, la URL del endpoint cambia
a algo como `https://<id-sandbox>.csb.app/graphql`. Para no tener que
editar la variable `baseUrl` cada vez, recomendamos crear un segundo
environment en Postman:

1. Duplicar el environment `JobConnect — Local` (clic derecho → Duplicate).
2. Renombrar el duplicado a `JobConnect — Atlas` o `JobConnect — Sandbox`.
3. Editar la variable `baseUrl` para apuntar a la URL pública de CodeSandbox.
4. Mantener `adminEmail`, `adminPassword` y `token` con los mismos valores.

A partir de ese momento, alternar entre los entornos requiere solo cambiar
el selector de la esquina superior derecha de Postman.

## Configurar la conexión a Atlas en el backend

Para que el backend se conecte a MongoDB Atlas en lugar de a Docker local:

1. En el panel de Atlas, ir a `Database → Clusters → Connect → Drivers` y
   copiar la URI con formato `mongodb+srv://...`.
2. Sustituir `<db_password>` por la contraseña real del Database User.
3. **Importante**: si la contraseña contiene caracteres especiales como `!`,
   `@`, `:`, `/`, `?` o `#`, hay que URL-encodearlos antes de pegarlos en
   la URI. Por ejemplo: `!` → `%21`, `@` → `%40`.
4. Pegar la URI resultante en `.env` como `MONGO_URI=...` (todo en una sola
   línea, sin comillas).
5. Reiniciar el servidor con `npm run dev`. La primera vez, el seed
   poblará la base de datos cloud con los 3 usuarios y 4 publicaciones
   iniciales más el administrador con contraseña hasheada.

La URI completa **no se commitea al repositorio** porque incluye la
contraseña del Database User. Está en el `.env` local de cada miembro del
equipo y, en el futuro, en las variables de entorno secretas de CodeSandbox.

## Despliegue público en CodeSandbox

El backend del Producto 3 está desplegado en CodeSandbox como entrega final
de la Fase 6. CodeSandbox provee una URL pública persistente que cualquier
revisor puede usar sin necesidad de clonar el repositorio ni instalar nada
en local.

**URL pública del backend:**
https://2cw562-4000.csb.app

**Endpoint GraphQL:**
https://2cw562-4000.csb.app/graphql

Abrir esa URL en un navegador carga **Apollo Sandbox** (la UI gráfica oficial
de Apollo Server) con el schema introspectado en vivo. Cualquiera puede
ejecutar queries y mutations contra el backend desplegado, incluido el flujo
completo de autenticación de administrador con JWT.

### Conexión Postman → CodeSandbox

Para apuntar Postman al backend desplegado en lugar del backend local:

1. Duplicar el environment `JobConnect — Local` (clic derecho → Duplicate).
2. Renombrar el duplicado a `JobConnect — CodeSandbox`.
3. Editar la variable `baseUrl` y cambiar su valor a:
   `https://2cw562-4000.csb.app/graphql`
4. Mantener `adminEmail`, `adminPassword` y `token` con los mismos valores.
5. Activar el environment `JobConnect — CodeSandbox` desde la esquina
   superior derecha de Postman.

Tras este cambio, las 22 requests de la colección funcionan idénticas pero
contra el backend en cloud. La latencia es algo mayor (1-3 segundos por
request en lugar de los 30-50 ms del backend local), pero todos los tests
del Collection Runner siguen pasando.

### Configuración interna de CodeSandbox

Las variables de entorno necesarias para que el backend arranque
(`MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, etc.) están
configuradas como **secretos cifrados** en el panel del repositorio de
CodeSandbox (`Editor → Repository → Env Variables`). No se commitean al
repositorio público y solo el dueño del workspace tiene acceso a sus
valores reales.

La base de datos a la que apunta el backend desplegado es **el mismo
cluster de MongoDB Atlas** descrito en la sección anterior. Esto garantiza
que los datos sean consistentes entre el backend local (cuando un miembro
del equipo lo arranca con `npm run dev`) y el backend desplegado.

---

## 8. Tests automáticos incluidos

La colección incluye más de 60 tests automáticos distribuidos entre las distintas requests.

Estos tests permiten comprobar aspectos importantes del backend, como:

- Que el servidor GraphQL responde correctamente.
- Que el login del administrador funciona.
- Que el token JWT se genera correctamente.
- Que las operaciones protegidas requieren autenticación.
- Que los CRUD principales responden según lo esperado.
- Que las respuestas contienen los datos necesarios.
- Que los errores controlados devuelven códigos adecuados.
- Que las operaciones negativas fallan de forma esperada.

---

## 9. Tests negativos de seguridad

La carpeta **5. Tests de seguridad** contiene tests intencionalmente negativos.

Esto significa que algunas operaciones están diseñadas para fallar de forma controlada. En estos casos, el objetivo no es obtener una respuesta correcta, sino comprobar que el backend bloquea adecuadamente una acción no permitida.

Por ejemplo, estos tests verifican que una operación protegida sin token JWT no pueda ejecutarse correctamente.

En estos casos, la operación HTTP debe responder con un error y los assertions de Postman comprueban que el código del error sea el esperado.

---

## 10. Importancia de los tests negativos

Los tests negativos fueron especialmente importantes durante el desarrollo del Producto 3, ya que permitieron detectar un problema en el backend relacionado con la gestión de errores.

Concretamente, se detectó un bug en el que Apollo estaba enmascarando todos los errores tipados como:

    INTERNAL_SERVER_ERROR

Este comportamiento dificultaba distinguir entre errores internos reales y errores controlados de autenticación, autorización o validación.

El problema fue corregido en el PR correspondiente al fichero:

    src/utils/errors.js

Gracias a esta corrección, el backend pasó a devolver códigos de error más precisos y coherentes, facilitando tanto la depuración como la validación mediante Postman.

---

## 11. Orden recomendado de ejecución manual

Aunque la colección puede ejecutarse completa con el Collection Runner, también puede probarse manualmente siguiendo este orden:

    1. 0. Healthcheck
    2. 1. Auth → Login Admin
    3. 2. Usuario
    4. 3. Publicación
    5. 4. Dashboard / Seleccionadas
    6. 5. Tests de seguridad

Este orden permite comprobar primero que el servidor está activo, después obtener el token de autenticación y finalmente ejecutar las operaciones protegidas.

---

## 12. Recomendaciones de uso

Antes de ejecutar la colección, se recomienda comprobar lo siguiente:

- El backend está arrancado con `npm run dev`.
- El endpoint GraphQL está disponible en `http://localhost:4000/graphql`.
- El environment **JobConnect — Local** está activado en Postman.
- Las variables `adminEmail` y `adminPassword` coinciden con los datos definidos en el proyecto.
- La request `Login Admin` se ha ejecutado correctamente antes de lanzar requests protegidas.
- La variable `{{token}}` contiene un JWT válido.
- El Collection Runner se ejecuta respetando el orden de las requests.

---

## 13. Resumen técnico

La colección Postman del Producto 3 permite validar de forma ordenada y automatizada el backend GraphQL de JobConnect.

Incluye pruebas sobre autenticación, usuarios, publicaciones, dashboard, publicaciones seleccionadas y seguridad mediante JWT.

Además, el uso de environments permite separar la configuración del entorno local respecto al contenido de las requests, facilitando la reutilización de la colección en otros entornos de despliegue.

Esta colección sirve como herramienta de verificación técnica, documentación práctica del backend y apoyo para demostrar el correcto funcionamiento del Producto 3.