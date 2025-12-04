/// <reference lib="webworker" />

/**
 * Pyodide Web Worker
 *
 * Runs Python code in a separate thread using Pyodide.
 * Handles loading, package management, and code execution.
 */

import type {
	FromWorkerMessage,
	PyodideInterface,
	LoadPyodideFunc
} from '$lib/types/python-worker';
import { PYODIDE_CONFIG, LOADING_STAGES, LoadingStageIndex } from '$lib/types/python-worker';
import { z } from 'zod';

// =============================================================================
// Zod Schema for Message Validation
// =============================================================================

/**
 * Schema for validating messages from the main thread
 */
const toWorkerMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('init') }),
	z.object({ type: z.literal('execute'), code: z.string(), id: z.string() }),
	z.object({ type: z.literal('cancel'), id: z.string() })
]);

// =============================================================================
// Worker Global Declarations
// =============================================================================

declare const self: DedicatedWorkerGlobalScope;
declare const loadPyodide: LoadPyodideFunc;

// =============================================================================
// State
// =============================================================================

let pyodide: PyodideInterface | null = null;
let currentExecutionId: string | null = null;
let executionTimeout: ReturnType<typeof setTimeout> | null = null;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Send a message to the main thread
 */
function postMessage(message: FromWorkerMessage): void {
	self.postMessage(message);
}

/**
 * Send loading progress to main thread
 */
function sendProgress(percent: number, stage: string): void {
	postMessage({ type: 'loading-progress', percent, stage });
}

/**
 * Find and send the appropriate loading stage
 */
function sendLoadingStage(stageIndex: number): void {
	const stage = LOADING_STAGES[stageIndex];
	if (stage) {
		sendProgress(stage.percent, stage.stage);
	}
}

// =============================================================================
// Pyodide Initialization
// =============================================================================

/**
 * Load Pyodide from CDN
 * @throws Error if script loading fails
 */
async function loadPyodideFromCDN(): Promise<void> {
	const pyodideUrl = `${PYODIDE_CONFIG.CDN_URL}pyodide.js`;

	try {
		// Import the script using importScripts
		importScripts(pyodideUrl);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`Échec du chargement du script Pyodide: ${message}`);
	}
}

/**
 * Initialize Pyodide and load required packages
 */
async function initializePyodide(): Promise<void> {
	try {
		// Stage 0: Initializing
		sendLoadingStage(LoadingStageIndex.INITIALIZING);

		// Load Pyodide script
		await loadPyodideFromCDN();

		// Stage 1: Downloading Python
		sendLoadingStage(LoadingStageIndex.DOWNLOADING_PYTHON);

		// Initialize Pyodide
		pyodide = await loadPyodide({
			indexURL: PYODIDE_CONFIG.CDN_URL
		});

		// Load all packages in parallel for better performance
		// Stage 2: Loading packages (show NumPy as first visible package)
		sendLoadingStage(LoadingStageIndex.LOADING_NUMPY);

		// Load all packages at once - Pyodide handles dependencies automatically
		await pyodide.loadPackage([...PYODIDE_CONFIG.PACKAGES], {
			messageCallback: (msg: string) => {
				console.log('[Pyodide]', msg);
				// Update progress based on package loading messages
				if (msg.includes('matplotlib')) {
					sendLoadingStage(LoadingStageIndex.LOADING_MATPLOTLIB);
				} else if (msg.includes('sympy')) {
					sendLoadingStage(LoadingStageIndex.LOADING_SYMPY);
				}
			}
		});

		// Configure matplotlib for non-interactive use
		await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io
import base64
import sys
import gc
from io import StringIO

# Helper function to get plot as base64
def _ubumaths_get_plot_base64():
    """Extract current matplotlib figure as base64 PNG."""
    if len(plt.get_fignums()) == 0:
        return None
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='white')
    buf.seek(0)
    result = base64.b64encode(buf.read()).decode('utf-8')
    plt.close('all')
    return result

# Helper function to clean up after execution
def _ubumaths_cleanup():
    """Clean up matplotlib figures and run garbage collection."""
    plt.close('all')
    gc.collect()
`);

		// Stage 5: Ready
		sendLoadingStage(LoadingStageIndex.READY);
		postMessage({ type: 'pyodide-ready' });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		postMessage({
			type: 'error',
			message: `Échec du chargement de Pyodide: ${errorMessage}`,
			id: ''
		});
	}
}

// =============================================================================
// Code Execution
// =============================================================================

/**
 * Extract line number from Python traceback
 */
function extractLineNumber(errorMessage: string): number | undefined {
	// Match patterns like "line 5" or "File \"<exec>\", line 3"
	const lineMatch = errorMessage.match(/line\s+(\d+)/i);
	if (lineMatch) {
		return parseInt(lineMatch[1], 10);
	}
	return undefined;
}

/**
 * Execute Python code and capture output
 */
async function executeCode(code: string, id: string): Promise<void> {
	if (!pyodide) {
		postMessage({
			type: 'error',
			message: 'Pyodide non initialisé',
			id
		});
		return;
	}

	// Validate execution ID
	if (!id || typeof id !== 'string') {
		console.error('[Pyodide Worker] Invalid execution ID:', id);
		return;
	}

	currentExecutionId = id;
	const startTime = performance.now();

	// Set up timeout
	executionTimeout = setTimeout(() => {
		if (currentExecutionId === id) {
			postMessage({ type: 'timeout', id });
			currentExecutionId = null;
		}
	}, PYODIDE_CONFIG.TIMEOUT_MS);

	try {
		// Set up stdout/stderr capture
		await pyodide.runPythonAsync(`
import sys
from io import StringIO

_ubumaths_stdout = StringIO()
_ubumaths_stderr = StringIO()
_ubumaths_old_stdout = sys.stdout
_ubumaths_old_stderr = sys.stderr
sys.stdout = _ubumaths_stdout
sys.stderr = _ubumaths_stderr
`);

		// Execute the user code
		await pyodide.runPythonAsync(code);

		// Check if this execution was cancelled
		if (currentExecutionId !== id) {
			return;
		}

		// Capture stdout
		const stdout = pyodide.runPython(`
_stdout_value = _ubumaths_stdout.getvalue()
sys.stdout = _ubumaths_old_stdout
_stdout_value
`) as string;

		if (stdout && stdout.trim()) {
			postMessage({ type: 'stdout', data: stdout, id });
		}

		// Capture stderr
		const stderr = pyodide.runPython(`
_stderr_value = _ubumaths_stderr.getvalue()
sys.stderr = _ubumaths_old_stderr
_stderr_value
`) as string;

		if (stderr && stderr.trim()) {
			postMessage({ type: 'stderr', data: stderr, id });
		}

		// Check for plots
		const plotData = pyodide.runPython('_ubumaths_get_plot_base64()') as string | null;
		if (plotData) {
			postMessage({ type: 'plot', imageData: plotData, id });
		}

		// Clean up
		pyodide.runPython('_ubumaths_cleanup()');

		// Calculate duration and send completion
		const duration = Math.round(performance.now() - startTime);
		postMessage({ type: 'complete', id, duration });
	} catch (error) {
		// Check if this execution was cancelled
		if (currentExecutionId !== id) {
			return;
		}

		// Restore stdout/stderr
		try {
			pyodide.runPython(`
sys.stdout = _ubumaths_old_stdout
sys.stderr = _ubumaths_old_stderr
_ubumaths_cleanup()
`);
		} catch (cleanupError) {
			// Log cleanup errors for debugging but don't fail
			console.warn('[Pyodide Worker] Cleanup error:', cleanupError);
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		const lineNumber = extractLineNumber(errorMessage);

		postMessage({
			type: 'error',
			message: errorMessage,
			line: lineNumber,
			id
		});
	} finally {
		// Clear timeout
		if (executionTimeout) {
			clearTimeout(executionTimeout);
			executionTimeout = null;
		}
		currentExecutionId = null;
	}
}

/**
 * Cancel the current execution
 */
function cancelExecution(id: string): void {
	if (currentExecutionId === id) {
		currentExecutionId = null;
		if (executionTimeout) {
			clearTimeout(executionTimeout);
			executionTimeout = null;
		}
	}
}

// =============================================================================
// Message Handler
// =============================================================================

self.onmessage = async (event: MessageEvent<unknown>) => {
	// Validate message with Zod
	const validation = toWorkerMessageSchema.safeParse(event.data);
	if (!validation.success) {
		console.error('[Pyodide Worker] Invalid message:', validation.error.issues);
		return;
	}

	const message = validation.data;

	switch (message.type) {
		case 'init':
			await initializePyodide();
			break;

		case 'execute':
			await executeCode(message.code, message.id);
			break;

		case 'cancel':
			cancelExecution(message.id);
			break;
	}
};

// Log that the worker is ready to receive messages
console.log('[Pyodide Worker] Worker initialized and ready');
