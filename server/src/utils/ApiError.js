export class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request') {
    return new ApiError(message, 400);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(message, 401);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(message, 403);
  }

  static notFound(message = 'Not Found') {
    return new ApiError(message, 404);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(message, 409);
  }

  static unprocessableEntity(message = 'Unprocessable Entity') {
    return new ApiError(message, 422);
  }

  static tooManyRequests(message = 'Too Many Requests') {
    return new ApiError(message, 429);
  }

  static internal(message = 'Internal Server Error') {
    return new ApiError(message, 500);
  }

  static badGateway(message = 'Bad Gateway') {
    return new ApiError(message, 502);
  }

  static serviceUnavailable(message = 'Service Unavailable') {
    return new ApiError(message, 503);
  }

  static gatewayTimeout(message = 'Gateway Timeout') {
    return new ApiError(message, 504);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      stack: this.stack
    };
  }
}
