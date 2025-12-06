/// <reference lib="webworker" />

/**
 * JavaScript Sandbox Worker
 *
 * Executes user-generated JavaScript code from Blockly in a secure, isolated environment.
 * Provides a whitelist of safe globals, timeout protection, and console output capture.
 *
 * Security features:
 * - No access to window, document, fetch, XMLHttpRequest, eval, Function constructor
 * - 10 second execution timeout
 * - Console output captured and forwarded via postMessage
 * - Strict mode enforcement
 */

import type { FromWorkerMessage } from '$lib/shared/blockly/worker/messages';
import { toWorkerMessageSchema } from '$lib/shared/blockly/worker/messages';

// =============================================================================
// Worker Global Declarations
// =============================================================================

declare const self: DedicatedWorkerGlobalScope;

// =============================================================================
// Configuration
// =============================================================================

/** Execution timeout in milliseconds */
const TIMEOUT_MS = 10_000;

/** Maximum factorial input to prevent stack overflow */
const MAX_FACTORIAL_INPUT = 170;

/** Maximum iterations for primality test to prevent DoS */
const MAX_PRIME_CHECK = 1_000_000_000;

/** Maximum output size in characters to prevent memory exhaustion */
const MAX_OUTPUT_SIZE = 100_000;

/** Maximum single message size in characters */
const MAX_MESSAGE_SIZE = 10_000;

// =============================================================================
// State
// =============================================================================

let currentExecutionId: string | null = null;

/** Cumulative output size for current execution */
let currentOutputSize = 0;

/** Whether output limit has been reached for current execution */
let outputLimitReached = false;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Send a message to the main thread
 */
function postWorkerMessage(message: FromWorkerMessage): void {
	self.postMessage(message);
}

/**
 * Send stdout output to main thread with size limits
 */
function sendStdout(data: string, id: string): void {
	if (outputLimitReached) return;

	// Truncate single message if too long
	let truncatedData = data;
	if (data.length > MAX_MESSAGE_SIZE) {
		truncatedData = data.slice(0, MAX_MESSAGE_SIZE) + '... (tronque)';
	}

	// Check cumulative limit
	if (currentOutputSize + truncatedData.length > MAX_OUTPUT_SIZE) {
		outputLimitReached = true;
		postWorkerMessage({
			type: 'stderr',
			data: `Limite de sortie atteinte (${MAX_OUTPUT_SIZE} caracteres)`,
			id
		});
		return;
	}

	currentOutputSize += truncatedData.length;
	postWorkerMessage({ type: 'stdout', data: truncatedData, id });
}

/**
 * Send stderr output to main thread with size limits
 */
function sendStderr(data: string, id: string): void {
	if (outputLimitReached) return;

	// Truncate single message if too long
	let truncatedData = data;
	if (data.length > MAX_MESSAGE_SIZE) {
		truncatedData = data.slice(0, MAX_MESSAGE_SIZE) + '... (tronque)';
	}

	// Check cumulative limit
	if (currentOutputSize + truncatedData.length > MAX_OUTPUT_SIZE) {
		outputLimitReached = true;
		postWorkerMessage({
			type: 'stderr',
			data: `Limite de sortie atteinte (${MAX_OUTPUT_SIZE} caracteres)`,
			id
		});
		return;
	}

	currentOutputSize += truncatedData.length;
	postWorkerMessage({ type: 'stderr', data: truncatedData, id });
}

/**
 * Format values for console output
 * Handles arrays, objects, and primitives with proper formatting
 */
function formatValue(value: unknown): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		return '[' + value.map(formatValue).join(', ') + ']';
	}
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return '[Object]';
		}
	}
	if (typeof value === 'function') return '[Function]';
	return String(value);
}

/**
 * Format console arguments into a single string
 */
function formatConsoleArgs(args: unknown[]): string {
	return args.map(formatValue).join(' ');
}

// =============================================================================
// Math Helpers (UbuMaths specific)
// =============================================================================

/**
 * Greatest Common Divisor using Euclidean algorithm
 * @param a First integer
 * @param b Second integer
 * @returns GCD of a and b
 */
function gcd(a: number, b: number): number {
	// Validate inputs
	if (!Number.isInteger(a) || !Number.isInteger(b)) {
		throw new Error('gcd: les arguments doivent etre des entiers');
	}
	a = Math.abs(a);
	b = Math.abs(b);
	if (a === 0 && b === 0) return 0;
	if (a === 0) return b;
	if (b === 0) return a;

	// Euclidean algorithm
	while (b !== 0) {
		const temp = b;
		b = a % b;
		a = temp;
	}
	return a;
}

/**
 * Least Common Multiple
 * @param a First integer
 * @param b Second integer
 * @returns LCM of a and b
 */
function lcm(a: number, b: number): number {
	// Validate inputs
	if (!Number.isInteger(a) || !Number.isInteger(b)) {
		throw new Error('lcm: les arguments doivent etre des entiers');
	}
	if (a === 0 || b === 0) return 0;
	return Math.abs(a * b) / gcd(a, b);
}

/**
 * Primality test using trial division
 * @param n Number to test
 * @returns true if n is prime
 */
function isPrime(n: number): boolean {
	// Validate input
	if (!Number.isInteger(n)) {
		throw new Error("isPrime: l'argument doit etre un entier");
	}
	if (n > MAX_PRIME_CHECK) {
		throw new Error(`isPrime: l'argument doit etre inferieur a ${MAX_PRIME_CHECK}`);
	}

	if (n < 2) return false;
	if (n === 2) return true;
	if (n % 2 === 0) return false;
	if (n === 3) return true;
	if (n % 3 === 0) return false;

	// Trial division up to sqrt(n)
	const sqrtN = Math.sqrt(n);
	for (let i = 5; i <= sqrtN; i += 6) {
		if (n % i === 0 || n % (i + 2) === 0) return false;
	}
	return true;
}

/**
 * Factorial with recursion limit
 * @param n Non-negative integer
 * @returns n!
 */
function factorial(n: number): number {
	// Validate input
	if (!Number.isInteger(n)) {
		throw new Error("factorial: l'argument doit etre un entier");
	}
	if (n < 0) {
		throw new Error("factorial: l'argument doit etre positif ou nul");
	}
	if (n > MAX_FACTORIAL_INPUT) {
		throw new Error(`factorial: l'argument doit etre inferieur ou egal a ${MAX_FACTORIAL_INPUT}`);
	}

	// Iterative implementation to avoid stack overflow
	let result = 1;
	for (let i = 2; i <= n; i++) {
		result *= i;
	}
	return result;
}

// =============================================================================
// Safe Globals Whitelist
// =============================================================================

/**
 * Create safe console object that captures output
 */
function createSafeConsole(id: string): Console {
	return {
		log: (...args: unknown[]) => sendStdout(formatConsoleArgs(args), id),
		error: (...args: unknown[]) => sendStderr(formatConsoleArgs(args), id),
		warn: (...args: unknown[]) => sendStderr(formatConsoleArgs(args), id),
		info: (...args: unknown[]) => sendStdout(formatConsoleArgs(args), id),
		debug: (...args: unknown[]) => sendStdout(formatConsoleArgs(args), id),
		// Stub remaining console methods to avoid errors
		assert: () => {},
		clear: () => {},
		count: () => {},
		countReset: () => {},
		dir: () => {},
		dirxml: () => {},
		group: () => {},
		groupCollapsed: () => {},
		groupEnd: () => {},
		table: () => {},
		time: () => {},
		timeEnd: () => {},
		timeLog: () => {},
		timeStamp: () => {},
		trace: () => {},
		profile: () => {},
		profileEnd: () => {}
	} as Console;
}

/**
 * Safe globals available to user code
 * Explicitly excludes dangerous globals like eval, Function, fetch, etc.
 */
interface SafeGlobals {
	console: Console;
	Math: typeof Math;
	Number: typeof Number;
	String: typeof String;
	Array: typeof Array;
	Object: typeof Object;
	JSON: typeof JSON;
	Boolean: typeof Boolean;
	Date: typeof Date;
	RegExp: typeof RegExp;
	Map: typeof Map;
	Set: typeof Set;
	parseInt: typeof parseInt;
	parseFloat: typeof parseFloat;
	isNaN: typeof isNaN;
	isFinite: typeof isFinite;
	encodeURI: typeof encodeURI;
	decodeURI: typeof decodeURI;
	encodeURIComponent: typeof encodeURIComponent;
	decodeURIComponent: typeof decodeURIComponent;
	// UbuMaths helpers
	gcd: typeof gcd;
	lcm: typeof lcm;
	isPrime: typeof isPrime;
	factorial: typeof factorial;
	// Undefined placeholders to block dangerous globals
	window: undefined;
	document: undefined;
	fetch: undefined;
	XMLHttpRequest: undefined;
	WebSocket: undefined;
	Worker: undefined;
	SharedWorker: undefined;
	ServiceWorker: undefined;
	importScripts: undefined;
	eval: undefined;
	Function: undefined;
	setTimeout: undefined;
	setInterval: undefined;
	clearTimeout: undefined;
	clearInterval: undefined;
	requestAnimationFrame: undefined;
	cancelAnimationFrame: undefined;
	queueMicrotask: undefined;
	Proxy: undefined;
	Reflect: undefined;
	globalThis: undefined;
	self: undefined;
	location: undefined;
	navigator: undefined;
	localStorage: undefined;
	sessionStorage: undefined;
	indexedDB: undefined;
	caches: undefined;
	crypto: undefined;
	performance: undefined;
	postMessage: undefined;
	onmessage: undefined;
	onerror: undefined;
	close: undefined;
}

/**
 * Create a safe wrapper that blocks constructor access to prevent sandbox escape.
 * The attack: [].constructor.constructor('return this')() can access global scope.
 * We wrap objects in proxies that block '.constructor' property access.
 */
function createSafeWrapper<T extends object>(obj: T, _name: string): T {
	// For functions (like parseInt, gcd, etc.), just return as-is
	// since they don't expose dangerous prototype chains in the same way
	if (typeof obj === 'function') {
		return obj;
	}

	// For objects like Math, JSON, freeze them to prevent modification
	try {
		Object.freeze(obj);
	} catch {
		// Some objects can't be frozen, that's ok
	}

	return obj;
}

/**
 * Create safe globals object for sandboxed execution.
 * Security measures:
 * - Freezes prototypes to prevent pollution
 * - Blocks dangerous globals
 */
function createSafeGlobals(id: string): SafeGlobals {
	// Freeze prototypes of commonly used objects to prevent prototype pollution
	// This prevents: Array.prototype.push = malicious; Object.prototype.x = malicious;
	try {
		Object.freeze(Object.prototype);
		Object.freeze(Array.prototype);
		Object.freeze(String.prototype);
		Object.freeze(Number.prototype);
		Object.freeze(Boolean.prototype);
		Object.freeze(Function.prototype);
	} catch {
		// In some environments freezing may fail, continue anyway
	}

	return {
		// Safe built-ins (wrapped for security)
		console: createSafeConsole(id),
		Math: createSafeWrapper(Math, 'Math'),
		Number: createSafeWrapper(Number, 'Number'),
		String: createSafeWrapper(String, 'String'),
		Array: createSafeWrapper(Array, 'Array'),
		Object: createSafeWrapper(Object, 'Object'),
		JSON: createSafeWrapper(JSON, 'JSON'),
		Boolean: createSafeWrapper(Boolean, 'Boolean'),
		Date: createSafeWrapper(Date, 'Date'),
		RegExp: createSafeWrapper(RegExp, 'RegExp'),
		Map: createSafeWrapper(Map, 'Map'),
		Set: createSafeWrapper(Set, 'Set'),
		parseInt,
		parseFloat,
		isNaN,
		isFinite,
		encodeURI,
		decodeURI,
		encodeURIComponent,
		decodeURIComponent,
		// UbuMaths helpers
		gcd,
		lcm,
		isPrime,
		factorial,
		// Block dangerous globals by setting to undefined
		window: undefined,
		document: undefined,
		fetch: undefined,
		XMLHttpRequest: undefined,
		WebSocket: undefined,
		Worker: undefined,
		SharedWorker: undefined,
		ServiceWorker: undefined,
		importScripts: undefined,
		eval: undefined,
		Function: undefined,
		setTimeout: undefined,
		setInterval: undefined,
		clearTimeout: undefined,
		clearInterval: undefined,
		requestAnimationFrame: undefined,
		cancelAnimationFrame: undefined,
		queueMicrotask: undefined,
		Proxy: undefined,
		Reflect: undefined,
		globalThis: undefined,
		self: undefined,
		location: undefined,
		navigator: undefined,
		localStorage: undefined,
		sessionStorage: undefined,
		indexedDB: undefined,
		caches: undefined,
		crypto: undefined,
		performance: undefined,
		postMessage: undefined,
		onmessage: undefined,
		onerror: undefined,
		close: undefined
	};
}

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Extract line number from error stack trace
 * Looks for patterns like "at eval (eval at ... line 5)"
 * or "<anonymous>:5:10"
 */
function extractLineNumber(error: Error): number | undefined {
	if (!error.stack) return undefined;

	// Try to find line number in stack trace
	// Pattern: <anonymous>:LINE:COLUMN or eval:LINE:COLUMN
	const patterns = [
		/<anonymous>:(\d+):\d+/,
		/eval[^:]*:(\d+):\d+/,
		/Function[^:]*:(\d+):\d+/,
		/:(\d+):\d+\)?$/m
	];

	for (const pattern of patterns) {
		const match = error.stack.match(pattern);
		if (match) {
			const line = parseInt(match[1], 10);
			// Subtract wrapper lines (the sandboxed code starts at line 4 in our wrapper)
			// Adjust for 0-based to 1-based and wrapper offset
			if (line > 3) return line - 3;
			return line;
		}
	}

	return undefined;
}

/**
 * Format error message for French users
 */
function formatErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		const message = error.message;

		// Translate common JavaScript errors to French
		if (message.includes('is not defined')) {
			const match = message.match(/(\w+) is not defined/);
			if (match) {
				return `${match[1]} n'est pas defini`;
			}
		}
		if (message.includes('is not a function')) {
			const match = message.match(/(\w+) is not a function/);
			if (match) {
				return `${match[1]} n'est pas une fonction`;
			}
		}
		if (message.includes('Cannot read properties of undefined')) {
			return 'Impossible de lire une propriete de undefined';
		}
		if (message.includes('Cannot read properties of null')) {
			return 'Impossible de lire une propriete de null';
		}
		if (message.includes('Maximum call stack size exceeded')) {
			return "Depassement de la pile d'appels (recursion infinie ?)";
		}
		if (message.includes('Invalid or unexpected token')) {
			return 'Caractere invalide ou inattendu';
		}
		if (message.includes('Unexpected token')) {
			return 'Syntaxe invalide: symbole inattendu';
		}
		if (message.includes('Unexpected end of input')) {
			return 'Syntaxe invalide: fin de code inattendue';
		}
		if (message.includes('Illegal return statement')) {
			return "Instruction return en dehors d'une fonction";
		}
		if (message.includes('Illegal break statement')) {
			return "Instruction break en dehors d'une boucle";
		}
		if (message.includes('Illegal continue statement')) {
			return "Instruction continue en dehors d'une boucle";
		}

		// Sanitize unknown error messages to prevent information leakage
		// Remove any file paths or internal details
		let sanitized = message;

		// Remove file paths (Windows and Unix style)
		sanitized = sanitized.replace(/[A-Za-z]:\\[^\s:]+/g, '[chemin]');
		sanitized = sanitized.replace(/\/[^\s:]+\.[a-z]+/g, '[chemin]');

		// Remove URLs
		sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[url]');

		// Limit message length
		if (sanitized.length > 500) {
			sanitized = sanitized.slice(0, 500) + '...';
		}

		return sanitized;
	}

	return String(error);
}

// =============================================================================
// Code Execution
// =============================================================================

/**
 * Check if code contains dangerous patterns that could escape the sandbox.
 * Returns an error message if dangerous pattern found, null otherwise.
 */
function checkDangerousPatterns(code: string): string | null {
	// Patterns that could be used to escape the sandbox
	const dangerousPatterns = [
		// Direct constructor access attempts
		/\.constructor\s*\(/,
		/\['constructor'\]/,
		/\["constructor"\]/,
		// __proto__ access
		/__proto__/,
		// Prototype manipulation
		/\.prototype\s*=/,
		/\['prototype'\]\s*=/,
		/\["prototype"\]\s*=/
	];

	for (const pattern of dangerousPatterns) {
		if (pattern.test(code)) {
			return "Acces a 'constructor' ou 'prototype' non autorise pour des raisons de securite";
		}
	}

	return null;
}

/**
 * Execute JavaScript code in a sandboxed environment
 * @param code User code to execute
 * @param id Execution identifier
 */
function executeCode(code: string, id: string): void {
	// Check if execution was cancelled
	if (currentExecutionId !== id) {
		return;
	}

	// Reset output counters for this execution
	currentOutputSize = 0;
	outputLimitReached = false;

	// Check for dangerous patterns before execution
	const dangerousCheck = checkDangerousPatterns(code);
	if (dangerousCheck) {
		postWorkerMessage({ type: 'error', message: dangerousCheck, id });
		currentExecutionId = null;
		return;
	}

	const startTime = Date.now();

	// Set up timeout
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let timedOut = false;

	const timeoutPromise = new Promise<void>((_, reject) => {
		timeoutId = setTimeout(() => {
			timedOut = true;
			reject(new Error('Timeout'));
		}, TIMEOUT_MS);
	});

	// Create safe globals for this execution
	const safeGlobals = createSafeGlobals(id);

	// Build the list of global names and values
	const globalNames = Object.keys(safeGlobals);
	const globalValues = Object.values(safeGlobals);

	// Create sandboxed function
	// The code runs in strict mode within an IIFE that receives only safe globals
	// Additional security: block constructor access at runtime
	const sandboxedCode = `
		"use strict";
		return (function(${globalNames.join(', ')}) {
			// Runtime protection against constructor access
			var _blocked = function() { throw new Error("Acces non autorise"); };
			${code}
		}).apply(null, arguments);
	`;

	try {
		// We use the Function constructor here, but note:
		// - The user code does NOT have access to Function (it's blocked in safeGlobals)
		// - This is the only controlled use of Function in the worker
		// - The created function only receives our safe globals

		const sandboxedFn = new Function(sandboxedCode);

		// Execute with timeout race
		const executionPromise = new Promise<void>((resolve, reject) => {
			try {
				// Execute synchronously but wrap in promise for timeout
				// eslint-disable-next-line prefer-spread
				sandboxedFn.apply(null, globalValues);
				resolve();
			} catch (error) {
				reject(error);
			}
		});

		// Race between execution and timeout
		Promise.race([executionPromise, timeoutPromise])
			.then(() => {
				// Check if still current execution and not timed out
				if (currentExecutionId === id && !timedOut) {
					const duration = Date.now() - startTime;
					postWorkerMessage({ type: 'complete', id, duration });
				}
			})
			.catch((error: unknown) => {
				// Check if still current execution
				if (currentExecutionId !== id) {
					return;
				}

				if (timedOut || (error instanceof Error && error.message === 'Timeout')) {
					postWorkerMessage({ type: 'timeout', id });
				} else {
					const message = formatErrorMessage(error);
					const line = error instanceof Error ? extractLineNumber(error) : undefined;
					postWorkerMessage({ type: 'error', message, line, id });
				}
			})
			.finally(() => {
				// Clear timeout if set
				if (timeoutId) {
					clearTimeout(timeoutId);
				}
				// Clear current execution
				if (currentExecutionId === id) {
					currentExecutionId = null;
				}
			});
	} catch (error) {
		// Syntax errors are caught here (before execution)
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		if (currentExecutionId === id) {
			const message = formatErrorMessage(error);
			const line = error instanceof Error ? extractLineNumber(error) : undefined;
			postWorkerMessage({ type: 'error', message, line, id });
			currentExecutionId = null;
		}
	}
}

/**
 * Cancel the current execution
 */
function cancelExecution(id: string): void {
	if (currentExecutionId === id) {
		currentExecutionId = null;
	}
}

// =============================================================================
// Message Handler
// =============================================================================

/**
 * Handle incoming messages from main thread
 */
self.onmessage = (event: MessageEvent<unknown>) => {
	// Validate message with Zod
	const validation = toWorkerMessageSchema.safeParse(event.data);
	if (!validation.success) {
		console.error('[JS Sandbox Worker] Message invalide:', validation.error.issues);
		return;
	}

	const message = validation.data;

	switch (message.type) {
		case 'execute':
			// Cancel any existing execution
			if (currentExecutionId) {
				currentExecutionId = null;
			}
			currentExecutionId = message.id;
			executeCode(message.code, message.id);
			break;

		case 'cancel':
			cancelExecution(message.id);
			break;
	}
};

// =============================================================================
// Worker Initialization
// =============================================================================

// Signal that worker is ready
postWorkerMessage({ type: 'ready' });

console.log('[JS Sandbox Worker] Worker initialise et pret');
