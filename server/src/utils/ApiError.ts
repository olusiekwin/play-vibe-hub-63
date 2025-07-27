export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = 'Bad Request') {
    return new ApiError(message, 400);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(message, 401);
  }

  static forbidden(message: string = 'Forbidden') {
    return new ApiError(message, 403);
  }

  static notFound(message: string = 'Not Found') {
    return new ApiError(message, 404);
  }

  static conflict(message: string = 'Conflict') {
    return new ApiError(message, 409);
  }

  static unprocessableEntity(message: string = 'Unprocessable Entity') {
    return new ApiError(message, 422);
  }

  static tooManyRequests(message: string = 'Too Many Requests') {
    return new ApiError(message, 429);
  }

  static internal(message: string = 'Internal Server Error') {
    return new ApiError(message, 500);
  }

  static badGateway(message: string = 'Bad Gateway') {
    return new ApiError(message, 502);
  }

  static serviceUnavailable(message: string = 'Service Unavailable') {
    return new ApiError(message, 503);
  }
}
