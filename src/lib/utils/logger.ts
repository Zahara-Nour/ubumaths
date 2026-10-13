// Handle both SvelteKit and standalone Node.js environments
let dev = true;
try {
	// Dynamic import to avoid build errors in standalone scripts
	const env = await import('$app/environment');
	dev = env.dev;
} catch {
	// Fallback for standalone Node.js scripts (tsx, vitest, etc.)
	dev = process.env.NODE_ENV !== 'production';
}

/**
 * Log severity levels
 */
export type LogLevel = 'trace' | 'info' | 'warn' | 'error';

// =====================================================
// PII REDACTION
// =====================================================

/**
 * Patterns for detecting and redacting PII (Personally Identifiable Information)
 * Note: Patterns are kept simple to avoid ReDoS vulnerabilities
 */
const PII_PATTERNS = {
	// Codes de connexion passés dans une URL (callback OAuth, lien de confirmation)
	urlSecret: /([?&#](?:code|token_hash|token|access_token|refresh_token|otp)=)[^&#\s"']+/gi,
	// Code à usage unique (6 chiffres) annoncé par « otp » ou « code », jusqu'à 4 signes
	// entre les deux (`"code": "482913"`) ; un code d'erreur Postgres (5 caractères,
	// `23505`) n'est pas visé
	otp: /(otp|code)\b(\W{0,4})\d{6}\b/gi,
	// IP addresses - IPv4
	ipv4: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
	// IP addresses - IPv6 (common forms)
	ipv6: /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g,
	// UUIDs (partial redaction - show first 8 chars)
	uuid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
	// JWT tokens (starts with eyJ)
	jwt: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
	// Bearer tokens in headers
	bearer: /Bearer\s+[A-Za-z0-9_-]+/gi,
	// API keys (common patterns)
	apiKey: /\b(sk_|pk_|api[_-]?key[=:]\s*)[A-Za-z0-9_-]{20,}\b/gi,
	// Phone numbers (French format)
	phone: /\b0[1-9](?:[\s.-]?\d{2}){4}\b/g
} as const;

/**
 * Sensitive field names to redact in objects
 */
const SENSITIVE_FIELDS = [
	/password/i,
	/token/i,
	/secret/i,
	/api[_-]?key/i,
	/auth/i,
	/credential/i,
	/session/i,
	/cookie/i,
	/bearer/i,
	/authorization/i,
	/mdp/i,
	/pwd/i,
	// `otp` en tête ou après `_`, `Otp` en camelCase : `footprint` n'est pas visé
	/(?:^|_)otp|Otp|OTP/,
	// Noms des personnes : colonnes de `profiles` et métadonnées d'un compte Supabase
	// (`user_metadata.full_name`, `name`, `pseudo`…). Le `name` seul reste lisible ailleurs
	// (catégorie, fichier) : il n'est masqué qu'à l'intérieur des métadonnées.
	/^(full_?name|first_?name|last_?name|given_?name|family_?name|display_?name|user_?name|pseudo|prenom|nom)$/i,
	// Métadonnées d'un compte, et `identities[].identity_data` d'un compte Google
	/^(raw_)?(user|app)_?meta_?data$/i,
	/^identity_?data$/i
] as const;

/**
 * Valeurs de la clé `code` qui restent lisibles : des codes d'erreur, utiles au tri.
 * SQLSTATE Postgres (`23505`), PostgREST (`PGRST116`), Supabase Auth (`otp_expired`),
 * Node (`ECONNRESET`). Tout le reste (code OAuth, code à usage unique) est masqué.
 * Un code de classe (8 caractères hexadécimaux) n'a aucune de ces formes.
 */
const ERROR_CODE_PATTERNS = [
	/^[0-9A-Z]{5}$/,
	/^PGRST\d+$/,
	/^[a-z]+(?:_[a-z]+)+$/,
	// Node (`ECONNRESET`, `EAI_AGAIN`) : au moins une lettre de G à Z, ce qui écarte
	// un code de classe fait de 8 caractères hexadécimaux
	/^(?=.*[G-Z])E[A-Z_]+$/,
	/^ERR_[A-Z0-9_]+$/,
	// undici, le fetch de supabase-js (`UND_ERR_CONNECT_TIMEOUT`)
	/^UND_ERR_[A-Z_]+$/
] as const;

/**
 * Domaine fait de chiffres et de points : une version de paquet (`postgrest-js@1.21.4`
 * d'un chemin de pile), pas une adresse. `163.com` ou `12.34.fr` n'en sont pas.
 */
const PACKAGE_VERSION = /^[\d.]+$/;

/**
 * Chemin pnpm avec pairs, `kit@2.8.0_@sveltejs+vite-plugin-svelte@4.0.0-next.6_svelte@5.1.0`.
 * Domaine qui suit une version : `2.8.0_…`, `4.0.0-next.6_svelte` (un `_` n'existe dans
 * aucun nom de domaine). Pair à portée : partie locale réduite à une version suivie de
 * `_`, domaine en `scope+nom`.
 */
const PNPM_PEER_DOMAIN = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?_/;
const PNPM_PEER_LOCAL = /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.]+)?_$/;

/** Ce qui borne une adresse e-mail : un espace, un autre `@`, un `/` (chemin de pile). */
function isEmailBoundary(char: string): boolean {
	return char === '@' || char === '/' || /\s/.test(char);
}

/**
 * Masque les e-mails sous toutes leurs formes : domaine sans point (`eleve@college`),
 * numérique (`163.com`), accentué. Balayage linéaire à partir de chaque `@` : un motif
 * `[^\s@/]+@` reparcourait la chaîne depuis chaque position (5 à 10 s pour 100 Ko).
 */
function redactEmails(value: string): string {
	let result = '';
	let copied = 0;
	for (let at = value.indexOf('@'); at !== -1; at = value.indexOf('@', at + 1)) {
		let start = at;
		while (start > copied && !isEmailBoundary(value[start - 1])) start--;
		let end = at + 1;
		while (end < value.length && !isEmailBoundary(value[end])) end++;
		const local = value.slice(start, at);
		const domain = value.slice(at + 1, end);
		const isPackagePath =
			PACKAGE_VERSION.test(domain) ||
			PNPM_PEER_DOMAIN.test(domain) ||
			(PNPM_PEER_LOCAL.test(local) && domain.includes('+'));
		if (local === '' || domain === '' || isPackagePath) continue;
		result += value.slice(copied, start) + '[email@redacted]';
		copied = end;
	}
	return result + value.slice(copied);
}

/**
 * Redact PII from a string value
 */
function redactString(value: string): string {
	let result = value;

	// Redact emails
	result = redactEmails(result);

	// Redact IPv4 (show first octet only)
	result = result.replace(PII_PATTERNS.ipv4, (ip) => {
		const firstOctet = ip.split('.')[0];
		return `${firstOctet}.xxx.xxx.xxx`;
	});

	// Redact IPv6
	result = result.replace(PII_PATTERNS.ipv6, '[IPv6_REDACTED]');

	// Redact UUIDs (show first 8 chars)
	result = result.replace(PII_PATTERNS.uuid, (uuid) => `${uuid.slice(0, 8)}...`);

	// Redact JWT tokens
	result = result.replace(PII_PATTERNS.jwt, '[JWT_REDACTED]');

	// Redact Bearer tokens
	result = result.replace(PII_PATTERNS.bearer, 'Bearer [REDACTED]');

	// Redact API keys
	result = result.replace(PII_PATTERNS.apiKey, '$1[REDACTED]');

	// Redact phone numbers
	result = result.replace(PII_PATTERNS.phone, '[PHONE_REDACTED]');

	// Codes de connexion : paramètres d'URL, code à usage unique
	result = result.replace(PII_PATTERNS.urlSecret, '$1[REDACTED]');
	result = result.replace(PII_PATTERNS.otp, '$1$2[REDACTED]');

	return result;
}

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(key: string): boolean {
	return SENSITIVE_FIELDS.some((pattern) => pattern.test(key));
}

/**
 * Masque la valeur d'un champ d'après son nom. Un booléen reste lisible sous un nom
 * sensible (`hasOtpHash: true` ne dit rien du secret) ; la clé `code` ne garde que
 * les codes d'erreur.
 */
function redactField(key: string, value: unknown, depth: number, seen: WeakSet<object>): unknown {
	if (key === 'code') {
		if (typeof value === 'number') return value < 1000 ? value : '[REDACTED]';
		if (typeof value === 'string') {
			return ERROR_CODE_PATTERNS.some((pattern) => pattern.test(value)) ? value : '[REDACTED]';
		}
	}
	if (isSensitiveField(key) && typeof value !== 'boolean') return '[REDACTED]';
	return redactObject(value, depth + 1, seen);
}

/**
 * Recursively redact PII from an object
 * Uses WeakSet to detect circular references
 */
function redactObject(obj: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): unknown {
	// Prevent infinite recursion
	if (depth > 10) return '[MAX_DEPTH]';

	if (obj === null || obj === undefined) {
		return obj;
	}

	if (typeof obj === 'string') {
		return redactString(obj);
	}

	if (typeof obj === 'number' || typeof obj === 'boolean') {
		return obj;
	}

	// Detect circular references for objects
	if (typeof obj === 'object') {
		if (seen.has(obj)) {
			return '[CIRCULAR]';
		}
		seen.add(obj);
	}

	// Special handling for Error objects (non-enumerable properties)
	if (obj instanceof Error) {
		const errorObj: Record<string, unknown> = {
			name: obj.name,
			message: redactString(obj.message),
			stack: obj.stack ? redactString(obj.stack) : undefined
		};
		// error.cause is ES2022+, check if it exists
		if ('cause' in obj && obj.cause !== undefined) {
			errorObj.cause = redactObject(obj.cause, depth + 1, seen);
		}
		// Champs propres (code, details, hint d'une PostgrestError…) : sans eux, un 23505
		// ou un 42501 disparaît des journaux. Masqués comme ceux d'un objet ordinaire.
		for (const [key, value] of Object.entries(obj)) {
			if (key in errorObj) continue;
			errorObj[key] = redactField(key, value, depth, seen);
		}
		return errorObj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => redactObject(item, depth + 1, seen));
	}

	if (typeof obj === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = redactField(key, value, depth, seen);
		}
		return result;
	}

	return obj;
}

/**
 * Redact PII from log arguments
 * @param args - Arguments to redact
 * @returns Redacted arguments safe for logging
 */
export function redactPII(...args: unknown[]): unknown[] {
	return args.map((arg) => redactObject(arg));
}

/**
 * Numerical levels for each log level (for threshold comparison)
 * trace < info < warn < error
 */
const LOG_LEVELS: Record<LogLevel, number> = {
	trace: 0,
	info: 1,
	warn: 2,
	error: 3
} as const;

/**
 * Color codes for different log levels
 * Uses ANSI codes for terminal and CSS for browser console
 */
const COLORS = {
	trace: {
		ansi: '\x1b[0m', // Normal/reset
		css: 'color: inherit'
	},
	info: {
		ansi: '\x1b[34m', // Blue
		css: 'color: #3b82f6; font-weight: bold'
	},
	warn: {
		ansi: '\x1b[33m', // Orange/Yellow
		css: 'color: #f97316; font-weight: bold'
	},
	error: {
		ansi: '\x1b[31m', // Red
		css: 'color: #ef4444; font-weight: bold'
	}
} as const;

const RESET = '\x1b[0m';
const GRAY = '\x1b[90m'; // Gray color for timestamp

/**
 * Detects if running in browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Formats a timestamp in "h:mm:ss AM/PM" format
 */
function formatTimestamp(): string {
	const now = new Date();
	let hours = now.getHours();
	const minutes = now.getMinutes();
	const seconds = now.getSeconds();
	const ampm = hours >= 12 ? 'PM' : 'AM';

	hours = hours % 12;
	hours = hours ? hours : 12; // 0 should be 12

	const mm = minutes.toString().padStart(2, '0');
	const ss = seconds.toString().padStart(2, '0');

	return `${hours}:${mm}:${ss} ${ampm}`;
}

/**
 * Formats a log message with colored prefix
 */
function formatMessage(
	level: LogLevel,
	file: string,
	threshold: LogLevel,
	message: unknown,
	...args: unknown[]
) {
	// Check if the message level meets the threshold
	if (LOG_LEVELS[level] < LOG_LEVELS[threshold]) {
		return; // Don't log if below threshold
	}

	const prefix = `[${file}]`;

	if (isBrowser) {
		// Browser console with CSS styling (no timestamp in browser)
		console[level === 'trace' ? 'log' : level](`%c${prefix}`, COLORS[level].css, message, ...args);
	} else {
		// Terminal with ANSI codes (with timestamp on server)
		const timestamp = formatTimestamp();
		const colorCode = COLORS[level].ansi;
		console[level === 'trace' ? 'log' : level](
			`${GRAY}${timestamp}${RESET} ${colorCode}${prefix}${RESET}`,
			message,
			...args
		);
	}
}

/**
 * Creates a logger instance for a specific file
 *
 * @param filename - The name of the file using the logger (e.g., 'MyComponent.svelte')
 * @param threshold - Minimum log level to display (default: 'info'). Messages below this level are suppressed.
 * @returns Logger instance with trace, info, warn, and error methods
 *
 * @example
 * ```ts
 * // Default threshold (info) - trace messages won't be displayed
 * const logger = createLogger('MyComponent.svelte');
 * logger.trace('This will not be displayed'); // Suppressed
 * logger.info('Component mounted'); // Displayed
 * logger.error('Failed to load data', error); // Displayed
 *
 * // Custom threshold (trace) - all messages will be displayed
 * const debugLogger = createLogger('DebugComponent.svelte', 'trace');
 * debugLogger.trace('This will be displayed'); // Displayed
 *
 * // Custom threshold (error) - only errors will be displayed
 * const errorLogger = createLogger('ProductionComponent.svelte', 'error');
 * errorLogger.info('This will not be displayed'); // Suppressed
 * errorLogger.error('Critical error'); // Displayed
 * ```
 */
export function createLogger(filename: string, threshold: LogLevel = 'info') {
	// In production, return no-op functions
	if (!dev) {
		return {
			trace: () => {},
			info: () => {},
			warn: () => {},
			error: () => {}
		};
	}

	return {
		/**
		 * Trace level - for detailed debugging information
		 */
		trace: (message: unknown, ...args: unknown[]) => {
			formatMessage('trace', filename, threshold, message, ...args);
		},

		/**
		 * Info level - for general informational messages
		 */
		info: (message: unknown, ...args: unknown[]) => {
			formatMessage('info', filename, threshold, message, ...args);
		},

		/**
		 * Warning level - for potentially problematic situations
		 */
		warn: (message: unknown, ...args: unknown[]) => {
			formatMessage('warn', filename, threshold, message, ...args);
		},

		/**
		 * Error level - for error events
		 */
		error: (message: unknown, ...args: unknown[]) => {
			formatMessage('error', filename, threshold, message, ...args);
		}
	};
}

/**
 * Type for a logger instance
 */
export type Logger = ReturnType<typeof createLogger>;

// =====================================================
// SERVER LOGGER WITH PII REDACTION
// =====================================================

/**
 * Format message for server logging with PII redaction
 */
function formatServerMessage(
	level: LogLevel,
	file: string,
	message: unknown,
	...args: unknown[]
): void {
	const timestamp = formatTimestamp();
	const colorCode = COLORS[level].ansi;
	const prefix = `[${file}]`;

	// Redact PII from all arguments
	const redactedMessage = redactObject(message);
	const redactedArgs = args.map((arg) => redactObject(arg));

	// Hors dev, texte nu : les journaux Vercel affichent les codes ANSI en clair
	// (écart L8, lot 0). En dev, le terminal les interprète : couleurs gardées.
	const header = dev
		? `${GRAY}${timestamp}${RESET} ${colorCode}${prefix}${RESET}`
		: `${timestamp} ${prefix}`;

	console[level === 'trace' ? 'log' : level](header, redactedMessage, ...redactedArgs);
}

/**
 * Creates a server logger instance with automatic PII redaction.
 *
 * Unlike `createLogger`, this logger:
 * - Works in BOTH development and production
 * - Automatically redacts sensitive data (emails, IPs, tokens, passwords, etc.)
 * - Is intended for server-side code only
 *
 * @param filename - The name of the file using the logger (e.g., 'api/users/+server.ts')
 * @param threshold - Minimum log level to display (default: 'info')
 * @returns Logger instance with PII-safe logging methods
 *
 * @example
 * ```ts
 * import { createServerLogger } from '$lib/utils/logger';
 *
 * const logger = createServerLogger('api/users/+server.ts');
 *
 * // PII is automatically redacted
 * logger.info('User login', { email: 'user@example.com', ip: '192.168.1.1' });
 * // Output: User login { email: '[email@redacted]', ip: '192.xxx.xxx.xxx' }
 *
 * logger.error('Auth failed', { password: 'secret123', userId: '550e8400-e29b-41d4-a716-446655440000' });
 * // Output: Auth failed { password: '[REDACTED]', userId: '550e8400...' }
 * ```
 */
export function createServerLogger(filename: string, threshold: LogLevel = 'info') {
	return {
		/**
		 * Trace level - for detailed debugging (dev only)
		 */
		trace: (message: unknown, ...args: unknown[]) => {
			if (dev && LOG_LEVELS.trace >= LOG_LEVELS[threshold]) {
				formatServerMessage('trace', filename, message, ...args);
			}
		},

		/**
		 * Info level - for general informational messages
		 */
		info: (message: unknown, ...args: unknown[]) => {
			if (LOG_LEVELS.info >= LOG_LEVELS[threshold]) {
				formatServerMessage('info', filename, message, ...args);
			}
		},

		/**
		 * Warning level - for potentially problematic situations
		 */
		warn: (message: unknown, ...args: unknown[]) => {
			if (LOG_LEVELS.warn >= LOG_LEVELS[threshold]) {
				formatServerMessage('warn', filename, message, ...args);
			}
		},

		/**
		 * Error level - for error events (always logged)
		 */
		error: (message: unknown, ...args: unknown[]) => {
			formatServerMessage('error', filename, message, ...args);
		}
	};
}

/**
 * Type for a server logger instance
 */
export type ServerLogger = ReturnType<typeof createServerLogger>;
