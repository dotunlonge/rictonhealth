"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registry = void 0;
exports.generateOpenApiSpec = generateOpenApiSpec;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
exports.registry = new zod_to_openapi_1.OpenAPIRegistry();
// Basic security scheme
exports.registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
});
function generateOpenApiSpec() {
    const generator = new zod_to_openapi_1.OpenApiGeneratorV3(exports.registry.definitions);
    return generator.generateDocument({
        openapi: '3.0.0',
        info: {
            title: 'Ricton API',
            version: '1.0.0',
            description: 'API documentation for the Ricton Backend',
        },
        servers: [{ url: 'http://localhost:8000', description: 'Local Gateway' }],
    });
}
//# sourceMappingURL=openapi.registry.js.map