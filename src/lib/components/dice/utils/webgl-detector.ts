/**
 * WebGL Detection Utility
 *
 * Detects if the browser supports WebGL for 3D rendering.
 * Used to determine whether to show 3D dice or 2D fallback.
 */

let webglSupported: boolean | undefined = undefined;

/**
 * Checks if WebGL is supported in the current browser
 *
 * @returns true if WebGL is available, false otherwise
 */
export function isWebGLSupported(): boolean {
	// Return cached result if already checked
	if (webglSupported !== undefined) {
		return webglSupported;
	}

	// SSR safety - return false during server-side rendering
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		// Try to create a WebGL context
		const canvas = document.createElement('canvas');
		const gl =
			canvas.getContext('webgl') ||
			canvas.getContext('experimental-webgl') ||
			canvas.getContext('webgl2');

		webglSupported = gl !== null && gl !== undefined;

		// Clean up - properly type as WebGL context
		if (gl && (gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
			const loseContext = gl.getExtension('WEBGL_lose_context');
			if (loseContext) {
				loseContext.loseContext();
			}
		}

		return webglSupported;
	} catch (_e) {
		webglSupported = false;
		return false;
	}
}

/**
 * Gets the maximum supported WebGL version
 *
 * @returns '1' for WebGL 1, '2' for WebGL 2, or null if not supported
 */
export function getWebGLVersion(): '1' | '2' | null {
	if (!isWebGLSupported()) {
		return null;
	}

	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const canvas = document.createElement('canvas');

		// Try WebGL 2 first
		const gl2 = canvas.getContext('webgl2');
		if (gl2) {
			return '2';
		}

		// Fall back to WebGL 1
		const gl1 = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		if (gl1) {
			return '1';
		}

		return null;
	} catch (_e) {
		return null;
	}
}

/**
 * Gets detailed WebGL capabilities
 *
 * @returns Object with WebGL capabilities or null if not supported
 */
export function getWebGLCapabilities() {
	if (!isWebGLSupported() || typeof window === 'undefined') {
		return null;
	}

	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

		// Type guard: ensure we have a WebGL context
		if (!gl || !(gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
			return null;
		}

		return {
			vendor: gl.getParameter(gl.VENDOR),
			renderer: gl.getParameter(gl.RENDERER),
			version: gl.getParameter(gl.VERSION),
			maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
			maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
			maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
			maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
			maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
		};
	} catch (_e) {
		return null;
	}
}

/**
 * Resets the cached WebGL support status (useful for testing)
 */
export function resetWebGLDetection(): void {
	webglSupported = undefined;
}
