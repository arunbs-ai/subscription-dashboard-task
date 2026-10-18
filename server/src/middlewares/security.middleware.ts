import { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { config } from '../config/config.js';

const rateLimitHandler = (message: string) => (_req: Request, res: Response) => {
  res.status(429).json({ success: false, message });
};

export const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  limit: config.security.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests. Please try again later.'),
});

export const authLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  limit: config.security.authRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: rateLimitHandler('Too many authentication attempts. Please try again later.'),
});

export const applySecurity = (app: Express): void => {
  app.disable('x-powered-by');
  app.set('trust proxy', config.security.trustProxy);

  app.use(helmet());

  const allowedOrigins = config.clientUrl.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Origin not allowed by CORS policy.'));
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 600,
    })
  );

  app.use('/api', apiLimiter);
};

export const applyInputProtection = (app: Express, jsonParser: any, urlencodedParser: any): void => {
  app.use(jsonParser);
  app.use(urlencodedParser);
  app.use(mongoSanitize());
  app.use(hpp());
};

export const notFoundHandler = (_req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({ success: false, message: 'Route not found.' });
};
