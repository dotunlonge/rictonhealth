"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateRequest = void 0;
const zod_1 = require("zod");
const response_1 = require("../response");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.reduce((acc, curr) => {
                    const path = curr.path.join('.');
                    if (!acc[path]) {
                        acc[path] = [];
                    }
                    acc[path].push(curr.message);
                    return acc;
                }, {});
                return res.status(400).json((0, response_1.errorResponse)('Validation error', 'VALIDATION_ERROR', details));
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
const validateQuery = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.reduce((acc, curr) => {
                    const path = curr.path.join('.');
                    if (!acc[path]) {
                        acc[path] = [];
                    }
                    acc[path].push(curr.message);
                    return acc;
                }, {});
                return res.status(400).json((0, response_1.errorResponse)('Validation error', 'VALIDATION_ERROR', details));
            }
            next(error);
        }
    };
};
exports.validateQuery = validateQuery;
const validateParams = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.params);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.reduce((acc, curr) => {
                    const path = curr.path.join('.');
                    if (!acc[path]) {
                        acc[path] = [];
                    }
                    acc[path].push(curr.message);
                    return acc;
                }, {});
                return res.status(400).json((0, response_1.errorResponse)('Validation error', 'VALIDATION_ERROR', details));
            }
            next(error);
        }
    };
};
exports.validateParams = validateParams;
//# sourceMappingURL=validate.js.map