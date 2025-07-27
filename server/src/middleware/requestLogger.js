import { logger } from '../utils/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request details
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined
  });

  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(body) {
    const duration = Date.now() - start;
    
    logger.info(`Response ${res.statusCode} for ${req.method} ${req.url}`, {
      duration: `${duration}ms`,
      statusCode: res.statusCode
    });
    
    return originalJson.call(this, body);
  };

  next();
};
