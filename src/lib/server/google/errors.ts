/**
 * Custom error classes for Google API interactions
 */

/**
 * Base error class for Google API errors
 */
export class GoogleAPIError extends Error {
	public statusCode: number;
	public errorCode?: string;

	constructor(message: string, statusCode: number, errorCode?: string) {
		super(message);
		this.name = 'GoogleAPIError';
		this.statusCode = statusCode;
		this.errorCode = errorCode;
	}
}

/**
 * Error thrown when access token has expired
 */
export class GoogleTokenExpiredError extends GoogleAPIError {
	constructor() {
		super('Access token expired', 401, 'TOKEN_EXPIRED');
		this.name = 'GoogleTokenExpiredError';
	}
}

/**
 * Error thrown when rate limit is exceeded
 */
export class GoogleRateLimitError extends GoogleAPIError {
	public retryAfter?: number;

	constructor(retryAfter?: number) {
		super('Rate limit exceeded', 429, 'RATE_LIMIT');
		this.name = 'GoogleRateLimitError';
		this.retryAfter = retryAfter;
	}
}

/**
 * Error thrown when insufficient permissions
 */
export class GoogleInsufficientPermissionsError extends GoogleAPIError {
	constructor(message = 'Insufficient permissions') {
		super(message, 403, 'INSUFFICIENT_PERMISSIONS');
		this.name = 'GoogleInsufficientPermissionsError';
	}
}

/**
 * Error thrown when resource not found
 */
export class GoogleNotFoundError extends GoogleAPIError {
	constructor(message = 'Resource not found') {
		super(message, 404, 'NOT_FOUND');
		this.name = 'GoogleNotFoundError';
	}
}
