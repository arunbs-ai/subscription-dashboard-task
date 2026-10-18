import { Request, Response, NextFunction } from 'express';
import { config } from '../config/config.js';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Unhandled Error]:', err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(409).json({
      success: false,
      message: `An account with this ${field} already exists.`,
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: `Invalid identifier format for ${err.path}.`,
    });
    return;
  }

  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Malformed JSON in request body.' });
    return;
  }
  if (err.type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'Request body is too large.' });
    return;
  }

  if (err.message === 'Origin not allowed by CORS policy.') {
    res.status(403).json({ success: false, message: err.message });
    return;
  }

  const status = err.status && err.status < 500 ? err.status : 500;
  res.status(status).json({
    success: false,
    message:
      status === 500 && config.nodeEnv === 'production'
        ? 'Internal server error occurred.'
        : err.message || 'Internal server error occurred.',
  });
};
