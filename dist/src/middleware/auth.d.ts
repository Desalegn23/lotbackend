import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
export interface AuthUser {
    id: string;
    role: Role;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
/**
 * Verify JWT from Authorization header and attach req.user
 */
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const authorize: (roles: Role[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const adminOnly: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const agentOnly: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const userOnly: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.d.ts.map