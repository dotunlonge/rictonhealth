import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';
export declare const validateRequest: (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const validateQuery: (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateParams: (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
