/**
 * Mock Request Factory
 * ====================
 *
 * Creates mock Request objects for API route tests.
 * Supports JSON body, form data, headers, and various HTTP methods.
 *
 * @example
 * ```typescript
 * // Simple POST with JSON body
 * const request = createMockRequest({ userId: '123', action: 'create' });
 *
 * // GET request
 * const getRequest = createMockRequest(undefined, 'GET');
 *
 * // POST with custom headers
 * const authRequest = createMockRequest(
 *   { data: 'test' },
 *   'POST',
 *   { 'Authorization': 'Bearer token123' }
 * );
 * ```
 */

import { vi } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Mock request body type - can be any JSON-serializable data
 */
export type MockRequestBody = Record<string, unknown> | unknown[] | unknown;

/**
 * Mock form data entries type
 */
export type MockFormDataEntries = Record<string, string | File>;

/**
 * HTTP method type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Mock request configuration options
 */
export interface MockRequestOptions {
	/** HTTP method (default: 'POST') */
	method?: HttpMethod;
	/** Request headers */
	headers?: Record<string, string>;
	/** Form data entries (alternative to JSON body) */
	formData?: MockFormDataEntries;
	/** URL for the request (default: 'http://localhost') */
	url?: string;
	/** URL search parameters */
	searchParams?: Record<string, string>;
}

// ============================================================================
// MOCK REQUEST FACTORY
// ============================================================================

/**
 * Creates a mock Request object for API route tests.
 *
 * @param data - JSON body data (will be returned by request.json())
 * @param method - HTTP method (default: 'POST')
 * @param headers - Optional headers to include
 *
 * @returns Mock Request object
 *
 * @example
 * ```typescript
 * // Test POST endpoint
 * const request = createMockRequest({ name: 'Test', value: 123 });
 * const response = await POST({ request, locals });
 *
 * // Test GET endpoint
 * const getRequest = createMockRequest(undefined, 'GET');
 *
 * // Test with authorization header
 * const authRequest = createMockRequest(
 *   { action: 'delete' },
 *   'DELETE',
 *   { 'Authorization': 'Bearer token' }
 * );
 * ```
 */
export function createMockRequest(
	data?: MockRequestBody,
	method: HttpMethod = 'POST',
	headers?: Record<string, string>
): Request {
	const requestHeaders = new Headers();

	// Set default content type for POST/PUT/PATCH
	if (['POST', 'PUT', 'PATCH'].includes(method) && data !== undefined) {
		requestHeaders.set('Content-Type', 'application/json');
	}

	// Merge custom headers
	if (headers) {
		Object.entries(headers).forEach(([key, value]) => {
			requestHeaders.set(key, value);
		});
	}

	return {
		method,
		json: vi.fn().mockResolvedValue(data ?? {}),
		formData: vi.fn().mockResolvedValue(new FormData()),
		text: vi.fn().mockResolvedValue(JSON.stringify(data ?? {})),
		headers: requestHeaders,
		url: 'http://localhost',
		clone: vi.fn().mockReturnThis(),
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		blob: vi.fn().mockResolvedValue(new Blob()),
		body: null,
		bodyUsed: false,
		cache: 'default' as RequestCache,
		credentials: 'same-origin' as RequestCredentials,
		destination: '' as RequestDestination,
		integrity: '',
		keepalive: false,
		mode: 'cors' as RequestMode,
		redirect: 'follow' as RequestRedirect,
		referrer: '',
		referrerPolicy: '' as ReferrerPolicy,
		signal: new AbortController().signal
	} as unknown as Request;
}

/**
 * Creates a mock Request with advanced configuration options.
 *
 * @param options - Configuration options for the mock request
 *
 * @returns Mock Request object
 *
 * @example
 * ```typescript
 * // Request with URL and search params
 * const request = createMockRequestAdvanced({
 *   method: 'GET',
 *   url: 'http://localhost/api/users',
 *   searchParams: { page: '1', limit: '10' }
 * });
 *
 * // Request with form data
 * const formRequest = createMockRequestAdvanced({
 *   method: 'POST',
 *   formData: {
 *     name: 'Test',
 *     file: new File(['content'], 'test.txt')
 *   }
 * });
 * ```
 */
export function createMockRequestAdvanced(options: MockRequestOptions = {}): Request {
	const {
		method = 'POST',
		headers = {},
		formData,
		url = 'http://localhost',
		searchParams = {}
	} = options;

	// Build URL with search params
	const requestUrl = new URL(url);
	Object.entries(searchParams).forEach(([key, value]) => {
		requestUrl.searchParams.set(key, value);
	});

	// Build headers
	const requestHeaders = new Headers();
	Object.entries(headers).forEach(([key, value]) => {
		requestHeaders.set(key, value);
	});

	// Build form data if provided
	let mockFormData: FormData;
	if (formData) {
		mockFormData = new FormData();
		Object.entries(formData).forEach(([key, value]) => {
			mockFormData.append(key, value);
		});
	} else {
		mockFormData = new FormData();
	}

	return {
		method,
		json: vi.fn().mockResolvedValue({}),
		formData: vi.fn().mockResolvedValue(mockFormData),
		text: vi.fn().mockResolvedValue(''),
		headers: requestHeaders,
		url: requestUrl.toString(),
		clone: vi.fn().mockReturnThis(),
		arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		blob: vi.fn().mockResolvedValue(new Blob()),
		body: null,
		bodyUsed: false,
		cache: 'default' as RequestCache,
		credentials: 'same-origin' as RequestCredentials,
		destination: '' as RequestDestination,
		integrity: '',
		keepalive: false,
		mode: 'cors' as RequestMode,
		redirect: 'follow' as RequestRedirect,
		referrer: '',
		referrerPolicy: '' as ReferrerPolicy,
		signal: new AbortController().signal
	} as unknown as Request;
}

// ============================================================================
// MOCK URL FACTORY
// ============================================================================

/**
 * Creates a mock URL with search parameters.
 *
 * @param searchParams - Object of search parameter key-value pairs
 * @param baseUrl - Base URL (default: 'http://localhost')
 *
 * @returns URL object with search params set
 *
 * @example
 * ```typescript
 * const url = createMockURL({ page: '1', filter: 'active' });
 * // url.searchParams.get('page') === '1'
 * // url.searchParams.get('filter') === 'active'
 * ```
 */
export function createMockURL(
	searchParams: Record<string, string> = {},
	baseUrl: string = 'http://localhost'
): URL {
	const url = new URL(baseUrl);
	Object.entries(searchParams).forEach(([key, value]) => {
		url.searchParams.set(key, value);
	});
	return url;
}

// ============================================================================
// SPECIALIZED REQUEST FACTORIES
// ============================================================================

/**
 * Creates a mock GET request
 *
 * @param searchParams - Optional URL search parameters
 * @param headers - Optional headers
 */
export function createMockGetRequest(
	searchParams?: Record<string, string>,
	headers?: Record<string, string>
): Request {
	return createMockRequestAdvanced({
		method: 'GET',
		searchParams,
		headers
	});
}

/**
 * Creates a mock POST request with JSON body
 *
 * @param body - JSON body data
 * @param headers - Optional headers
 */
export function createMockPostRequest(
	body: MockRequestBody,
	headers?: Record<string, string>
): Request {
	return createMockRequest(body, 'POST', headers);
}

/**
 * Creates a mock PUT request with JSON body
 *
 * @param body - JSON body data
 * @param headers - Optional headers
 */
export function createMockPutRequest(
	body: MockRequestBody,
	headers?: Record<string, string>
): Request {
	return createMockRequest(body, 'PUT', headers);
}

/**
 * Creates a mock PATCH request with JSON body
 *
 * @param body - JSON body data
 * @param headers - Optional headers
 */
export function createMockPatchRequest(
	body: MockRequestBody,
	headers?: Record<string, string>
): Request {
	return createMockRequest(body, 'PATCH', headers);
}

/**
 * Creates a mock DELETE request
 *
 * @param body - Optional JSON body data
 * @param headers - Optional headers
 */
export function createMockDeleteRequest(
	body?: MockRequestBody,
	headers?: Record<string, string>
): Request {
	return createMockRequest(body, 'DELETE', headers);
}

/**
 * Creates a mock form data request (multipart/form-data)
 *
 * @param formEntries - Form field entries
 * @param method - HTTP method (default: 'POST')
 * @param headers - Optional additional headers
 */
export function createMockFormRequest(
	formEntries: MockFormDataEntries,
	method: HttpMethod = 'POST',
	headers?: Record<string, string>
): Request {
	return createMockRequestAdvanced({
		method,
		formData: formEntries,
		headers: {
			'Content-Type': 'multipart/form-data',
			...headers
		}
	});
}
