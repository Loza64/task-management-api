# Task Management API

API REST para gestionar tareas: crear, consultar, actualizar, completar y eliminar, manteniendo el estado de cada una. Construida con Node.js, Express 5, TypeScript y MongoDB (Mongoose), siguiendo una arquitectura hexagonal.

## Tabla de contenido

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Scripts](#scripts)
- [Modelo de datos](#modelo-de-datos)
- [Gestión de estados](#gestión-de-estados)
- [Endpoints](#endpoints)
- [Validaciones](#validaciones)
- [Formato de respuestas y errores](#formato-de-respuestas-y-errores)
- [Arquitectura](#arquitectura)
- [Decisiones de diseño](#decisiones-de-diseño)
- [Pruebas](#pruebas)
- [Base de datos con Docker](#base-de-datos-con-docker)
- [Docker](#docker)

## Stack

| Área | Tecnología |
|---|---|
| Runtime / lenguaje | Node.js 22, TypeScript 5 |
| HTTP | Express 5, Helmet, CORS, Morgan |
| Base de datos | MongoDB con Mongoose 9 |
| Paginación | mongoose-paginate-v2 |
| Validación | class-validator, class-transformer |
| Documentación | swagger-jsdoc, swagger-ui-express |
| Pruebas | Jest, ts-jest, Supertest |
| Gestor de paquetes | pnpm |

## Requisitos

- Node.js 20.19 o superior (la imagen Docker usa Node 22)
- pnpm
- MongoDB accesible (local, remoto o el contenedor descrito en [Base de datos con Docker](#base-de-datos-con-docker))

## Puesta en marcha

```bash
pnpm install
cp .env.example .env
pnpm dev
```

- API: `http://localhost:4100/api/tasks`
- Documentación Swagger: `http://localhost:4100/api-docs`
- Especificación OpenAPI en JSON: `http://localhost:4100/api-docs.json`

Para producción:

```bash
pnpm build
pnpm start
```

## Variables de entorno

Se leen desde `.env` (ver `.env.example`).

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `4100` | Puerto HTTP |
| `NODE_ENV` | `development` | En `development` los errores 500 incluyen el mensaje real; en otros valores devuelven un mensaje genérico |
| `ORIGIN` | vacío | Orígenes permitidos por CORS, separados por coma. Vacío permite cualquier origen (`*`) y desactiva `credentials` |
| `MONGO_URI` | `mongodb://localhost:27017/tasks_db` | Cadena de conexión a MongoDB. Con el contenedor de este proyecto lleva usuario, contraseña y `authSource=admin` (ver [Base de datos con Docker](#base-de-datos-con-docker)) |

## Scripts

| Script | Descripción |
|---|---|
| `pnpm dev` | Servidor en modo desarrollo con recarga (`ts-node-dev`) y logs `DEBUG=nodets:*` |
| `pnpm build` | Compila con `tsc` y resuelve los alias con `tsc-alias` |
| `pnpm start` | Ejecuta `build/index.js` |
| `pnpm test` | Ejecuta las pruebas |
| `pnpm test:watch` | Pruebas en modo observación |
| `pnpm lint` | ESLint sobre `src/**/*.ts` |

## Modelo de datos

Colección `tasks` (modelo `Task`).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | string (ObjectId) | Generado por MongoDB, expuesto como `id` |
| `title` | string | Obligatorio, sin espacios sobrantes, 3 a 120 caracteres |
| `description` | string \| null | Opcional, hasta 1000 caracteres, `null` si no hay |
| `status` | enum | `pending` (por defecto), `in_progress`, `completed` |
| `completedAt` | date \| null | Se asigna al completar y se limpia al cambiar a otro estado |
| `createdAt` | date | Automático (`timestamps`) |
| `updatedAt` | date | Automático (`timestamps`) |

Índice: `{ status: 1, createdAt: -1 }`, que sirve al filtro por estado con orden por más reciente.

## Gestión de estados

```
pending ⇄ in_progress ⇄ completed
   └────────────────────────▲
```

- Toda tarea nace en `pending`.
- Se puede pasar de cualquier estado a cualquier otro distinto.
- Pedir el estado que la tarea ya tiene responde `409`.
- Al pasar a `completed` se guarda `completedAt`. Al salir de `completed` (reabrir) vuelve a `null`.
- El estado solo cambia por `PATCH /api/tasks/:id/status` o `PATCH /api/tasks/:id/complete`. Crear o editar con un campo `status` se rechaza con `400`.

## Endpoints

Base: `/api/tasks`

| Método | Ruta | Descripción | Éxito | Errores |
|---|---|---|---|---|
| POST | `/` | Crea una tarea en `pending` | 201 | 400 |
| GET | `/` | Lista paginada con filtros | 200 | 400 |
| GET | `/:id` | Obtiene una tarea | 200 | 400, 404 |
| PATCH | `/:id` | Edita `title` y/o `description` | 200 | 400, 404 |
| PATCH | `/:id/status` | Cambia el estado | 200 | 400, 404, 409 |
| PATCH | `/:id/complete` | Marca como completada | 200 | 400, 404, 409 |
| DELETE | `/:id` | Elimina la tarea | 204 | 400, 404 |

### Crear

```bash
curl -X POST http://localhost:4100/api/tasks \
  -H "Content-Type: application/json" \
  -d '{ "title": "Escribir informe", "description": "Resumen del trimestre" }'
```

```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Escribir informe",
    "description": "Resumen del trimestre",
    "status": "pending",
    "completedAt": null,
    "createdAt": "2026-10-25T22:00:00.000Z",
    "updatedAt": "2026-10-25T22:00:00.000Z"
  }
}
```

### Listar

```bash
curl "http://localhost:4100/api/tasks?status=pending&search=informe&page=1&pageSize=10"
```

| Parámetro | Por defecto | Reglas |
|---|---|---|
| `page` | `1` | Entero ≥ 1 |
| `pageSize` | `10` | Entero entre 1 y 100 |
| `search` | | Hasta 100 caracteres; busca sin distinguir mayúsculas en `title` y `description`. Los caracteres especiales se escapan |
| `status` | | `pending`, `in_progress` o `completed` |

Parámetros desconocidos se rechazan con `400`. Orden fijo: más recientes primero.

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "pageCount": 1,
    "total": 0
  }
}
```

`pageCount` viene de `totalPages` de `mongoose-paginate-v2`, que devuelve `1` cuando no hay resultados.

### Actualizar

```bash
curl -X PATCH http://localhost:4100/api/tasks/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{ "title": "Informe trimestral", "description": null }'
```

Debe incluir al menos `title` o `description`. Enviar `description` como `null` o cadena vacía la limpia.

### Cambiar estado y completar

```bash
curl -X PATCH http://localhost:4100/api/tasks/507f1f77bcf86cd799439011/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "in_progress" }'

curl -X PATCH http://localhost:4100/api/tasks/507f1f77bcf86cd799439011/complete
```

### Eliminar

```bash
curl -X DELETE http://localhost:4100/api/tasks/507f1f77bcf86cd799439011
```

Respuesta `204` sin cuerpo. La eliminación es permanente.

## Validaciones

Aplicadas antes de llegar a los casos de uso:

- **Cuerpo (DTOs):** se usa `whitelist` y `forbidNonWhitelisted`, así que cualquier propiedad no declarada devuelve `400`. Los textos se recortan (`trim`) antes de validar, por lo que un título de solo espacios es inválido.
- **Query string:** misma regla, con conversión de tipos para `page` y `pageSize`.
- **Parámetro `:id`:** debe ser un ObjectId de 24 caracteres hexadecimales; si no, `400` sin consultar la base.
- **Reglas de negocio:** tarea inexistente (`404`), cambio al mismo estado (`409`), actualización vacía (`400`).
- **Esquema Mongoose:** repite las restricciones de longitud y el enum de estado como segunda barrera (`runValidators` activo en las actualizaciones).

## Formato de respuestas y errores

- Un recurso: `{ "data": { ... } }`
- Lista: `{ "data": [ ... ], "pagination": { ... } }`
- Errores: `{ "status": <código>, "message": "<detalle>" }`. En errores de validación, `message` concatena todos los problemas separados por coma.

| Código | Cuándo |
|---|---|
| 400 | Cuerpo, query o id inválidos; actualización sin campos |
| 404 | La tarea no existe |
| 409 | La tarea ya está en el estado solicitado |
| 500 | Error inesperado |

## Arquitectura

Arquitectura hexagonal: el dominio y los casos de uso no dependen de Express ni de Mongoose.

```
src/
├── index.ts                    Arranque: conecta a Mongo y levanta Express
├── app.ts                      Configuración de Express, rutas y Swagger
├── composition-root.ts         Inyección de dependencias manual
├── swagger.ts                  Definición OpenAPI
├── interfaces/http/routes.ts   Router raíz (/api)
├── modules/task/
│   ├── domain/                 Entidad Task, enum TaskStatus, puerto TaskRepository
│   ├── application/            Casos de uso y DTOs de entrada
│   └── infrastructure/
│       ├── http/               Controller y rutas (con anotaciones Swagger)
│       └── persistence/        Esquema Mongoose y MongooseTaskRepository
└── shared/
    ├── config/                 Variables de entorno y configuración de Express
    ├── database/mongo.ts       Conexión y desconexión de MongoDB
    ├── errors/AppError.ts      Error operacional con código HTTP
    ├── middlewares/            Validación de DTO, query e id; manejador de errores
    ├── pagination/             DTOs de paginación, tipos y respuesta paginada
    └── logger/                 Loggers con `debug`
```

Flujo de una petición: ruta → middleware de validación → controller → caso de uso → `TaskRepository` (puerto) → `MongooseTaskRepository` → MongoDB. Cualquier error pasa por `errorHandler`.

## Decisiones de diseño

- **Dominio sin Mongoose.** `Task` es una clase plana con la regla de transición de estado. El repositorio convierte los documentos a entidades de dominio.
- **Estado controlado.** Cambiar el estado tiene endpoints propios para que `PATCH /:id` no lo altere por accidente y `completedAt` siempre sea consistente.
- **Eliminación física.** `DELETE` borra el documento. Si se necesita recuperación, habría que agregar un campo `deletedAt` y filtrar en el repositorio.
- **Búsqueda con regex.** `search` usa expresión regular escapada, suficiente para volúmenes moderados. Con muchos datos conviene un índice de texto.
- **Actualizaciones sin control de versión.** Una edición lee la tarea y luego la guarda; si dos peticiones editan la misma tarea a la vez, gana la última.
- **Índices automáticos.** Mongoose crea el índice al iniciar (`autoIndex` por defecto).

## Pruebas

```bash
pnpm test
```

No requieren base de datos:

- Entidad: transiciones de estado y `completedAt`.
- Casos de uso: reglas de negocio con repositorio simulado.
- DTOs: casos válidos e inválidos.
- Rutas HTTP: validación de cuerpo, query e id con Supertest, y la ruta `/api-docs.json`.
- Repositorio: filtros y mapeo de paginación con `paginate` simulado.

Las consultas reales a MongoDB no se cubren con pruebas automáticas; se verifican manualmente (por ejemplo, desde `/api-docs`).

## Base de datos con Docker

MongoDB se levanta con el compose del repositorio [Loza64/docker-containers](https://github.com/Loza64/docker-containers/blob/main/database/mongo/docker-compose.yaml) (carpeta `database/mongo`). Esta API no incluye su propio servicio de Mongo: se conecta a ese contenedor.

Lo que define ese compose:

| Elemento | Valor |
|---|---|
| Imagen | `mongo:latest` |
| Contenedor | `some-mongo` |
| Puerto | `27017` publicado en el host |
| Usuario root | `MONGO_INITDB_ROOT_USERNAME` (por defecto `mongo`) |
| Contraseña root | `MONGO_INITDB_ROOT_PASSWORD` (por defecto `change_me`) |
| Volúmenes | `db` (`/data/db`) y `config` (`/data/configdb`) |
| Red | `network` (bridge) |
| Healthcheck | `mongosh` con `ping` cada 10 s |

Levantarlo, definiendo una contraseña propia en lugar de la de ejemplo:

```bash
cd database/mongo
MONGO_INITDB_ROOT_PASSWORD=<tu_password> docker compose up -d
```

(También puedes poner las variables en un `.env` dentro de esa carpeta.) Las credenciales solo se aplican la primera vez, cuando se crea el volumen `db`.

**Nombre de la red.** Compose antepone el nombre del proyecto, que por defecto es el de la carpeta. Al ejecutarlo desde `database/mongo`, la red `network` se crea como `mongo_network`, que es la que usa el `docker-compose.yaml` de esta API. Si lo levantas desde otra carpeta, el nombre cambia; confírmalo con `docker network ls`.

**Cadena de conexión.** El usuario root se crea en la base `admin`, por eso la URI lleva `authSource=admin`:

| Dónde corre la API | `MONGO_URI` |
|---|---|
| En tu máquina (`pnpm dev`) | `mongodb://mongo:<tu_password>@localhost:27017/tasks_db?authSource=admin` |
| En Docker (misma red) | `mongodb://mongo:<tu_password>@some-mongo:27017/tasks_db?authSource=admin` |

Dentro de un contenedor `localhost` apunta al propio contenedor, por eso en Docker se usa el nombre `some-mongo`. Si la contraseña tiene `@`, `:`, `/`, `?` o `#`, debe codificarse en formato URL.

El compose de Mongo publica `27017` en todas las interfaces. Si no necesitas acceso desde fuera de tu máquina, ese archivo trae comentada la alternativa `127.0.0.1:27017:27017` para limitarlo a localhost.

## Docker

Con MongoDB ya levantado (sección anterior):

```bash
cp .env.example .env
docker compose up --build
```

- `docker-compose.yaml` define solo el servicio `api` y lo une a la red externa `mongo_network`. Esa red debe existir antes, es decir, el contenedor de Mongo debe haberse levantado primero.
- La conexión sale del `.env` (`MONGO_URI`), que dentro de Docker debe usar el host `some-mongo`.
- El `Dockerfile` es multi-etapa: instala con `--frozen-lockfile`, ejecuta `pnpm test` y `pnpm build`, y la imagen final corre como usuario sin privilegios.
- El puerto publicado es el definido en `PORT` (4100 si no se define).
- Si Mongo no está disponible al arrancar, la API termina con error y `restart: unless-stopped` la reinicia hasta que pueda conectarse.