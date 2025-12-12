/**
 * Shared Typst Compiler Utility
 *
 * Provides a singleton Typst compiler instance that can be used
 * across different components (PdfPreview, TypstEditor, etc.)
 *
 * Usage:
 * ```typescript
 * import { getTypstCompiler, compileToSvg, compileToPdf } from '$lib/typst/compiler';
 *
 * // Get the compiler instance (loads if needed)
 * const typst = await getTypstCompiler();
 *
 * // Or use convenience functions
 * const svg = await compileToSvg(typstContent);
 * const pdf = await compileToPdf(typstContent);
 * ```
 */

import type { TypstCompiler, TypstCompilerState } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const CDN_BASE = 'https://cdn.jsdelivr.net/npm';
const TYPST_BUNDLE_URL = `${CDN_BASE}/@myriaddreamin/typst.ts/dist/esm/contrib/all-in-one-lite.bundle.js`;
const COMPILER_WASM_URL = `${CDN_BASE}/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm`;
const RENDERER_WASM_URL = `${CDN_BASE}/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm`;

// Window keys for singleton state (survives HMR)
const TYPST_INIT_KEY = '__typst_compiler_initialized__';
const TYPST_SCRIPT_ID = 'typst-compiler-script';

// ============================================================================
// SINGLETON STATE
// ============================================================================

let compilerState: TypstCompilerState = {
	instance: null,
	isLoading: false,
	error: null,
	isInitialized: false
};

// Promise for ongoing load operation (prevents multiple simultaneous loads)
let loadPromise: Promise<TypstCompiler> | null = null;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if Typst compiler is already initialized (survives HMR and navigation)
 */
function isTypstInitialized(): boolean {
	if (typeof window === 'undefined') return false;
	return !!(window as unknown as Record<string, unknown>)[TYPST_INIT_KEY];
}

/**
 * Mark Typst compiler as initialized
 */
function markTypstInitialized(): void {
	if (typeof window === 'undefined') return;
	(window as unknown as Record<string, unknown>)[TYPST_INIT_KEY] = true;
}

/**
 * Get Typst instance from window if available
 */
function getWindowTypst(): TypstCompiler | null {
	if (typeof window === 'undefined') return null;
	return (window as { $typst?: TypstCompiler }).$typst || null;
}

// ============================================================================
// MAIN API
// ============================================================================

/**
 * Get the current compiler state (for reactive UI updates)
 */
export function getCompilerState(): TypstCompilerState {
	return { ...compilerState };
}

/**
 * Load and initialize the Typst compiler
 * Returns a promise that resolves to the compiler instance
 * Uses singleton pattern - subsequent calls return the same instance
 */
export async function getTypstCompiler(): Promise<TypstCompiler> {
	// Check if already loaded
	if (compilerState.instance) {
		return compilerState.instance;
	}

	// Check window for existing instance (survives HMR)
	const windowTypst = getWindowTypst();
	if (windowTypst) {
		initializeCompiler(windowTypst);
		if (compilerState.instance) {
			return compilerState.instance;
		}
	}

	// If already loading, wait for that promise
	if (loadPromise) {
		return loadPromise;
	}

	// Start loading
	loadPromise = loadTypstLibrary();
	return loadPromise;
}

/**
 * Load the Typst library from CDN
 */
async function loadTypstLibrary(): Promise<TypstCompiler> {
	compilerState = { ...compilerState, isLoading: true, error: null };

	return new Promise((resolve, reject) => {
		// Check if script already exists
		const existingScript = document.getElementById(TYPST_SCRIPT_ID);
		if (existingScript) {
			// Wait for $typst to be available
			waitForTypst(resolve, reject);
			return;
		}

		// Create and load script
		const script = document.createElement('script');
		script.type = 'module';
		script.src = TYPST_BUNDLE_URL;
		script.id = TYPST_SCRIPT_ID;

		script.addEventListener('load', () => {
			waitForTypst(resolve, reject);
		});

		script.addEventListener('error', () => {
			const error = 'Failed to load Typst library from CDN';
			compilerState = { ...compilerState, isLoading: false, error };
			loadPromise = null;
			reject(new Error(error));
		});

		document.head.appendChild(script);
	});
}

/**
 * Wait for $typst to be available on window
 */
function waitForTypst(
	resolve: (value: TypstCompiler) => void,
	reject: (reason: Error) => void
): void {
	let attempts = 0;
	const maxAttempts = 50; // 5 seconds max

	const check = () => {
		const typst = getWindowTypst();
		if (typst) {
			try {
				initializeCompiler(typst);
				if (compilerState.instance) {
					resolve(compilerState.instance);
				} else {
					reject(new Error(compilerState.error || 'Failed to initialize Typst'));
				}
			} catch (err) {
				reject(err instanceof Error ? err : new Error(String(err)));
			}
		} else if (attempts < maxAttempts) {
			attempts++;
			setTimeout(check, 100);
		} else {
			const error = 'Typst library not available after loading';
			compilerState = { ...compilerState, isLoading: false, error };
			loadPromise = null;
			reject(new Error(error));
		}
	};

	// Start checking after a small delay
	setTimeout(check, 100);
}

/**
 * Initialize the Typst compiler with WASM modules
 */
function initializeCompiler(typst: TypstCompiler): void {
	try {
		// Only set init options if not already initialized
		if (!isTypstInitialized()) {
			typst.setCompilerInitOptions({
				getModule: () => COMPILER_WASM_URL
			});
			typst.setRendererInitOptions({
				getModule: () => RENDERER_WASM_URL
			});
			markTypstInitialized();
		}

		compilerState = {
			instance: typst,
			isLoading: false,
			error: null,
			isInitialized: true
		};
		loadPromise = null;
	} catch (err) {
		const error = `Initialization error: ${err}`;
		compilerState = { ...compilerState, isLoading: false, error };
		loadPromise = null;
		console.error('Typst initialization error:', err);
		throw new Error(error);
	}
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Compile Typst content to SVG
 * Automatically loads the compiler if needed
 */
export async function compileToSvg(typstContent: string): Promise<string> {
	const typst = await getTypstCompiler();
	return typst.svg({ mainContent: typstContent });
}

/**
 * Compile Typst content to PDF
 * Automatically loads the compiler if needed
 */
export async function compileToPdf(typstContent: string): Promise<Uint8Array> {
	const typst = await getTypstCompiler();
	return typst.pdf({ mainContent: typstContent });
}

/**
 * Check if the compiler is currently loaded and ready
 */
export function isCompilerReady(): boolean {
	return compilerState.instance !== null && compilerState.isInitialized;
}

/**
 * Check if the compiler is currently loading
 */
export function isCompilerLoading(): boolean {
	return compilerState.isLoading;
}

/**
 * Get any error that occurred during loading/initialization
 */
export function getCompilerError(): string | null {
	return compilerState.error;
}

/**
 * Reset the compiler state (useful for error recovery)
 * Note: This doesn't unload the script, just resets the state
 */
export function resetCompilerState(): void {
	compilerState = {
		instance: null,
		isLoading: false,
		error: null,
		isInitialized: false
	};
	loadPromise = null;
}

/**
 * Cleanup function - removes script and resets state
 * Call this when you want to fully unload the compiler
 */
export function cleanupCompiler(): void {
	const script = document.getElementById(TYPST_SCRIPT_ID);
	if (script) {
		script.remove();
	}
	resetCompilerState();
}
