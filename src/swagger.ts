import swaggerJsdoc from 'swagger-jsdoc';
import { buildSwaggerDefinitions } from './shared/swagger/schemas';

const isProd = process.env.NODE_ENV === 'production';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      version: 'v1.0.0',
      title: 'Task Management API',
      description: 'API REST para crear, consultar, actualizar, completar y eliminar tareas, con control de estado.',
    },
    servers: [{ url: '/' }],
    components: {
      schemas: buildSwaggerDefinitions(),
    },
  },
  apis: [
    isProd
      ? './build/modules/**/infrastructure/http/*.routes.js'
      : './src/modules/**/infrastructure/http/*.routes.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
