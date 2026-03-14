import { Response } from 'express';

export const sendResponse = (res: Response, status: number, data: any, message?: string) => {
  return res.status(status).json({
    success: status >= 200 && status < 300,
    data,
    message
  });
};

export const sendError = (res: Response, status: number, message: string) => {
  return res.status(status).json({
    success: false,
    message
  });
};
