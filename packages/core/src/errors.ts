export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'One or more fields are invalid.', details?: unknown) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}
export class UnauthenticatedError extends AppError {
  constructor(message = 'Please sign in.') {
    super('UNAUTHENTICATED', 401, message);
  }
}
export class InvalidCredentialsError extends AppError {
  constructor(message = 'Email or password is incorrect.') {
    super('INVALID_CREDENTIALS', 401, message);
  }
}
export class BadOriginError extends AppError {
  constructor(message = 'Request origin is not allowed.') {
    super('BAD_ORIGIN', 403, message);
  }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super('NOT_FOUND', 404, message);
  }
}
export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, 409, message, details);
  }
}
export class InvalidStateError extends AppError {
  constructor(message: string, details?: unknown) {
    super('INVALID_STATE', 409, message, details);
  }
}
export class PayloadTooLargeError extends AppError {
  constructor(message = 'File is too large (10 MB maximum).') {
    super('FILE_TOO_LARGE', 413, message);
  }
}
export class UnprocessableError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, 422, message, details);
  }
}
export class RateLimitedError extends AppError {
  constructor(message = 'Too many attempts. Try again in a few minutes.') {
    super('RATE_LIMITED', 429, message);
  }
}
