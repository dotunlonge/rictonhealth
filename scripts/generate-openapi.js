const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Ricton Healthcare Platform API',
      version: '1.0.0',
      description: 'API Documentation for the Ricton Healthcare Platform.',
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Local Gateway (Kong)',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Paths to files containing OpenAPI definitions
  apis: [
    path.join(__dirname, '../services/*/src/routes/*.ts'),
    path.join(__dirname, '../services/*/src/controllers/*.ts'),
  ],
};

const openapiSpecification = swaggerJsdoc(options);

// Convert JSON to YAML and write to openapi.yaml
const yamlStr = yaml.dump(openapiSpecification);
fs.writeFileSync(path.join(__dirname, '../openapi.yaml'), yamlStr, 'utf8');

console.log('Successfully generated openapi.yaml');
