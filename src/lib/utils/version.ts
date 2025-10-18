/**
 * Version Utility
 * ===============
 *
 * Provides access to the application version from package.json.
 * The version is injected at build time via Vite's define config.
 *
 * The __APP_VERSION__ global is defined in vite.config.ts
 */

// TypeScript declaration for the global variable injected by Vite
declare const __APP_VERSION__: string;

/**
 * Get the application version from package.json
 * @returns Formatted version string (e.g., "v0.0.1")
 */
export function getVersion(): string {
	return `v${__APP_VERSION__}`;
}

/**
 * Get the raw version number
 * @returns Version string from package.json (e.g., "0.0.1")
 */
export function getRawVersion(): string {
	return __APP_VERSION__;
}
