import { NextFunction, Request, Response } from 'express';

// Redact sensitive fields like password in logs
function redactBody(body: any) {
  if (!body || typeof body !== 'object') return body;
  const clone: any = { ...body };
  if (typeof clone.password !== 'undefined') clone.password = '***redacted***';
  if (typeof clone.confirmPassword !== 'undefined') clone.confirmPassword = '***redacted***';
  return clone;
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, originalUrl } = req;
  const body = redactBody(req.body);

  console.log(`[REQ] ${method} ${originalUrl} body=${JSON.stringify(body)} cookies=${Object.keys(req.cookies || {}).join(',')}`);

  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[RES] ${method} ${originalUrl} status=${res.statusCode} ${ms}ms`);
  });

  next();
}
