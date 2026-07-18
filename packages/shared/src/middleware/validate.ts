import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { errorResponse } from '../response';

export const validateRequest = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, curr) => {
            const path = curr.path.join('.');
            if (!acc[path]) {
              acc[path] = [];
            }
            acc[path].push(curr.message);
            return acc;
          },
          {} as Record<string, string[]>
        );

        return res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', details));
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, curr) => {
            const path = curr.path.join('.');
            if (!acc[path]) {
              acc[path] = [];
            }
            acc[path].push(curr.message);
            return acc;
          },
          {} as Record<string, string[]>
        );

        return res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', details));
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, curr) => {
            const path = curr.path.join('.');
            if (!acc[path]) {
              acc[path] = [];
            }
            acc[path].push(curr.message);
            return acc;
          },
          {} as Record<string, string[]>
        );

        return res.status(400).json(errorResponse('Validation error', 'VALIDATION_ERROR', details));
      }
      next(error);
    }
  };
};
