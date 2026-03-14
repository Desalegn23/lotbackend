import { Response } from 'express';
export declare const sendResponse: (res: Response, status: number, data: any, message?: string) => Response<any, Record<string, any>>;
export declare const sendError: (res: Response, status: number, message: string) => Response<any, Record<string, any>>;
//# sourceMappingURL=response.d.ts.map