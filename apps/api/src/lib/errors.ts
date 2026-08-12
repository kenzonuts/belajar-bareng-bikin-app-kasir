export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function badRequest(message: string, code = 'VALIDATION_ERROR') {
  return new AppError(message, 400, code);
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError(message, 401, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden') {
  return new AppError(message, 403, 'FORBIDDEN');
}

export function notFound(message = 'Not found') {
  return new AppError(message, 404, 'NOT_FOUND');
}

export function conflict(message: string, code = 'CONFLICT') {
  return new AppError(message, 409, code);
}
