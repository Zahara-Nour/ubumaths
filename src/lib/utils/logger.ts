import { dev } from '$app/environment';

/**
 * Log severity levels
 */
export type LogLevel = 'trace' | 'info' | 'warn' | 'error';

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
		console[level === 'trace' ? 'log' : level](
			`%c${prefix}`,
			COLORS[level].css,
			message,
			...args
		);
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