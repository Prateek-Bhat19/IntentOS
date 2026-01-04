export class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super(message, 404);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = " Action not allowed") {
        super(message, 403);
    }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input") {
    super(message, 422);
  }
}