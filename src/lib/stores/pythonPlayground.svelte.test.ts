/**
 * Python Playground Store Tests
 * =============================
 *
 * Tests for the Python Playground store, including:
 * - State management
 * - Worker communication (mocked)
 * - localStorage persistence
 * - Code execution flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock browser environment before importing the store
vi.mock('$app/environment', () => ({
	browser: true,
	building: false,
	dev: true,
	version: '1.0.0'
}));

// Mock Worker class
class MockWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	private terminated = false;

	constructor(_url: URL, _options?: WorkerOptions) {
		// Store reference to allow simulation
		MockWorker.instance = this;
	}

	postMessage(message: unknown): void {
		if (this.terminated) return;
		// Store messages for verification
		MockWorker.lastMessage = message;
		MockWorker.messages.push(message);
	}

	terminate(): void {
		this.terminated = true;
	}

	// Helper for simulating worker responses
	simulateMessage(data: unknown): void {
		if (this.onmessage && !this.terminated) {
			this.onmessage({ data } as MessageEvent);
		}
	}

	simulateError(message: string): void {
		if (this.onerror && !this.terminated) {
			this.onerror({ message } as ErrorEvent);
		}
	}

	// Static helpers for test verification
	static lastMessage: unknown = null;
	static messages: unknown[] = [];
	static instance: MockWorker | null = null;

	static reset(): void {
		MockWorker.lastMessage = null;
		MockWorker.messages = [];
		MockWorker.instance = null;
	}
}

// Store the original Worker
const OriginalWorker = globalThis.Worker;

// =============================================================================
// Test Setup
// =============================================================================

describe('PythonPlaygroundStore', () => {
	let pythonStore: typeof import('./pythonPlayground.svelte').pythonStore;

	beforeEach(async () => {
		// Reset mocks first
		MockWorker.reset();
		vi.clearAllMocks();

		// Mock localStorage
		const localStorageData: Record<string, string> = {};
		const localStorageMock = {
			getItem: vi.fn((key: string) => localStorageData[key] || null),
			setItem: vi.fn((key: string, value: string) => {
				localStorageData[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete localStorageData[key];
			}),
			clear: vi.fn(() => {
				Object.keys(localStorageData).forEach((key) => delete localStorageData[key]);
			}),
			key: vi.fn(),
			length: 0
		};
		Object.defineProperty(globalThis, 'localStorage', {
			value: localStorageMock,
			writable: true
		});

		// Mock Worker - must be done before importing module
		globalThis.Worker = vi.fn().mockImplementation((url: URL, options?: WorkerOptions) => {
			return new MockWorker(url, options);
		}) as unknown as typeof Worker;

		// Re-import to get fresh store instance
		vi.resetModules();
		const module = await import('./pythonPlayground.svelte');
		pythonStore = module.pythonStore;

		// Reset messages again after module import (constructor might trigger things)
		MockWorker.messages = [];
	});

	afterEach(() => {
		// Clean up store
		if (pythonStore) {
			pythonStore.destroy();
		}

		// Restore Worker
		globalThis.Worker = OriginalWorker;

		vi.useRealTimers();
	});

	// ===========================================================================
	// 1. Initial State Tests
	// ===========================================================================

	describe('Initial State', () => {
		it('should have initial state values', () => {
			expect(pythonStore.state).toBe('initial');
			expect(pythonStore.stdout).toBe('');
			expect(pythonStore.stderr).toBe('');
			expect(pythonStore.plotData).toBe(null);
			expect(pythonStore.loadingProgress).toBe(0);
			expect(pythonStore.showPedagogicErrors).toBe(true);
			expect(pythonStore.executionTime).toBe(0);
			expect(pythonStore.errorLine).toBe(null);
		});

		it('should have default code', () => {
			expect(pythonStore.code).toContain('Python Playground');
			expect(pythonStore.code).toContain('numpy');
			expect(pythonStore.code).toContain('matplotlib');
		});

		it('should have correct derived states for initial state', () => {
			expect(pythonStore.isReady).toBe(false);
			expect(pythonStore.isExecuting).toBe(false);
			expect(pythonStore.isLoading).toBe(false);
			expect(pythonStore.hasError).toBe(false);
			expect(pythonStore.hasOutput).toBe(false);
		});

		it('should have packagesLoading initialized to empty array', () => {
			expect(pythonStore.packagesLoading).toEqual([]);
		});

		it('should have loadedPackages initialized to empty array', () => {
			expect(pythonStore.loadedPackages).toEqual([]);
		});

		it('should have plotlyData initialized to null', () => {
			expect(pythonStore.plotlyData).toBe(null);
		});

		it('should have isLoadingPackages false when packagesLoading is empty', () => {
			expect(pythonStore.isLoadingPackages).toBe(false);
		});
	});

	// ===========================================================================
	// 2. Pyodide Initialization Tests
	// ===========================================================================

	describe('Pyodide Initialization', () => {
		it('should create worker on initPyodide', () => {
			pythonStore.initPyodide();

			expect(globalThis.Worker).toHaveBeenCalled();
			expect(MockWorker.instance).not.toBeNull();
		});

		it('should send init message to worker', () => {
			pythonStore.initPyodide();

			expect(MockWorker.messages).toContainEqual({ type: 'init' });
		});

		it('should set loading state on initPyodide', () => {
			pythonStore.initPyodide();

			expect(pythonStore.state).toBe('loading-pyodide');
			expect(pythonStore.isLoading).toBe(true);
		});

		it('should not reinitialize if already initializing', () => {
			pythonStore.initPyodide();
			const firstWorker = MockWorker.instance;
			const callCount = (globalThis.Worker as ReturnType<typeof vi.fn>).mock.calls.length;

			pythonStore.initPyodide();

			expect(MockWorker.instance).toBe(firstWorker);
			expect(globalThis.Worker).toHaveBeenCalledTimes(callCount);
		});

		it('should handle pyodide-ready message', () => {
			pythonStore.initPyodide();

			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });

			expect(pythonStore.state).toBe('ready');
			expect(pythonStore.isReady).toBe(true);
			expect(pythonStore.loadingProgress).toBe(100);
		});

		it('should handle loading-progress messages', () => {
			pythonStore.initPyodide();

			MockWorker.instance?.simulateMessage({
				type: 'loading-progress',
				percent: 50,
				stage: 'Chargement de NumPy...'
			});

			expect(pythonStore.loadingProgress).toBe(50);
			expect(pythonStore.loadingStage).toBe('Chargement de NumPy...');
		});

		it('should transition to loading-packages state after 20% progress', () => {
			pythonStore.initPyodide();

			MockWorker.instance?.simulateMessage({
				type: 'loading-progress',
				percent: 25,
				stage: 'Chargement de NumPy...'
			});

			expect(pythonStore.state).toBe('loading-packages');
		});

		it('should handle worker error during initialization', () => {
			pythonStore.initPyodide();

			MockWorker.instance?.simulateError('Worker crashed');

			expect(pythonStore.state).toBe('error');
			expect(pythonStore.stderr).toContain('Worker crashed');
		});

		it('should handle loading error from worker', () => {
			pythonStore.initPyodide();

			// Loading errors from worker use empty id
			MockWorker.instance?.simulateMessage({
				type: 'error',
				message: 'Failed to load Pyodide',
				id: ''
			});

			expect(pythonStore.state).toBe('error');
			expect(pythonStore.stderr).toBe('Failed to load Pyodide');
		});
	});

	// ===========================================================================
	// 3. Code Execution Tests
	// ===========================================================================

	describe('Code Execution', () => {
		beforeEach(() => {
			// Initialize and set to ready state
			pythonStore.initPyodide();
			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });
			// Clear init messages
			MockWorker.messages = [];
		});

		it('should not execute if not ready', () => {
			// Destroy to reset state to initial
			pythonStore.destroy();
			expect(pythonStore.state).toBe('initial');

			// Clear messages before test
			MockWorker.messages = [];

			// Try to execute without being ready
			pythonStore.execute();

			// Should not have sent execute message (not ready)
			const executeMessages = MockWorker.messages.filter(
				(m) => (m as { type: string }).type === 'execute'
			);
			expect(executeMessages).toHaveLength(0);

			// Re-initialize for other tests
			pythonStore.initPyodide();
			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });
		});

		it('should not execute empty code', () => {
			pythonStore.code = '   ';
			pythonStore.execute();

			expect(pythonStore.state).toBe('ready');
			const executeMessages = MockWorker.messages.filter(
				(m) => (m as { type: string }).type === 'execute'
			);
			expect(executeMessages).toHaveLength(0);
		});

		it('should send execute message with code and id', () => {
			pythonStore.code = 'print("Hello")';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { type: string; code: string; id: string } | undefined;

			expect(executeMessage).toBeDefined();
			expect(executeMessage?.code).toBe('print("Hello")');
			expect(executeMessage?.id).toMatch(/^exec-\d+-[a-z0-9]+$/);
		});

		it('should set executing state', () => {
			pythonStore.code = 'print("Hello")';
			pythonStore.execute();

			expect(pythonStore.state).toBe('executing');
			expect(pythonStore.isExecuting).toBe(true);
		});

		it('should clear previous output before execution', () => {
			// First, execute and receive some output
			pythonStore.code = 'print("First")';
			pythonStore.execute();

			const firstExecMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'stdout',
				data: 'previous output',
				id: firstExecMessage?.id
			});
			MockWorker.instance?.simulateMessage({
				type: 'complete',
				id: firstExecMessage?.id,
				duration: 100
			});

			expect(pythonStore.stdout).toBe('previous output');

			// Now execute again - previous output should be cleared
			pythonStore.code = 'print("Hello")';
			pythonStore.execute();

			expect(pythonStore.stdout).toBe('');
			expect(pythonStore.stderr).toBe('');
			expect(pythonStore.plotData).toBe(null);
		});

		it('should handle stdout message', () => {
			pythonStore.code = 'print("Hello")';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'stdout',
				data: 'Hello\n',
				id: executeMessage?.id
			});

			expect(pythonStore.stdout).toBe('Hello\n');
		});

		it('should handle stderr message', () => {
			pythonStore.code = 'print(x)';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'stderr',
				data: "NameError: name 'x' is not defined",
				id: executeMessage?.id
			});

			expect(pythonStore.stderr).toBe("NameError: name 'x' is not defined");
		});

		it('should handle plot message', () => {
			pythonStore.code = 'plt.plot([1,2,3])';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'plot',
				imageData: 'iVBORw0KGgo=',
				id: executeMessage?.id
			});

			expect(pythonStore.plotData).toBe('data:image/png;base64,iVBORw0KGgo=');
		});

		it('should handle complete message', () => {
			pythonStore.code = 'print("Hello")';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'complete',
				id: executeMessage?.id,
				duration: 150
			});

			expect(pythonStore.state).toBe('ready');
			expect(pythonStore.executionTime).toBe(150);
		});

		it('should handle execution error with line number', () => {
			pythonStore.code = 'print(x)';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'error',
				message: "NameError: name 'x' is not defined",
				line: 3,
				id: executeMessage?.id
			});

			expect(pythonStore.stderr).toBe("NameError: name 'x' is not defined");
			expect(pythonStore.errorLine).toBe(3);
			expect(pythonStore.state).toBe('ready');
		});

		it('should ignore messages from old execution', () => {
			pythonStore.code = 'print("First")';
			pythonStore.execute();

			const firstMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;
			const firstId = firstMessage?.id;

			// Complete the first execution so we can start a new one
			MockWorker.instance?.simulateMessage({
				type: 'complete',
				id: firstId,
				duration: 100
			});

			// Verify state is back to ready
			expect(pythonStore.state).toBe('ready');

			// Start new execution
			pythonStore.code = 'print("Second")';
			pythonStore.execute();

			const secondMessage = MockWorker.messages.filter(
				(m) => (m as { type: string }).type === 'execute'
			)[1] as { id: string } | undefined;
			const secondId = secondMessage?.id;

			// Verify IDs are different
			expect(firstId).not.toBe(secondId);

			// Simulate message from first execution (should be ignored because currentExecutionId is secondId)
			MockWorker.instance?.simulateMessage({
				type: 'stdout',
				data: 'Old message\n',
				id: firstId
			});

			// Should not have received the old stdout (current execution ID is secondId)
			expect(pythonStore.stdout).toBe('');

			// But message from current execution should work
			MockWorker.instance?.simulateMessage({
				type: 'stdout',
				data: 'Second\n',
				id: secondId
			});

			expect(pythonStore.stdout).toBe('Second\n');
		});

		it('should handle timeout message', () => {
			pythonStore.code = 'while True: pass';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'timeout',
				id: executeMessage?.id
			});

			expect(pythonStore.stderr).toContain('30 secondes');
			expect(pythonStore.state).toBe('ready');
		});

		it('should handle packages-loading message', () => {
			pythonStore.code = 'import pandas';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'packages-loading',
				packages: ['pandas', 'numpy'],
				id: executeMessage?.id
			});

			expect(pythonStore.packagesLoading).toEqual(['pandas', 'numpy']);
			expect(pythonStore.isLoadingPackages).toBe(true);
			expect(pythonStore.loadingStage).toContain('pandas');
			expect(pythonStore.loadingStage).toContain('numpy');
		});

		it('should ignore packages-loading message with wrong ID', () => {
			pythonStore.code = 'import scipy';
			pythonStore.execute();

			// Get the correct execution ID
			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			// Record current state before sending wrong ID message
			const packagesBeforeWrongId = [...pythonStore.packagesLoading];

			// Send packages-loading with wrong ID - should be ignored
			MockWorker.instance?.simulateMessage({
				type: 'packages-loading',
				packages: ['wrong-package-1', 'wrong-package-2'],
				id: 'wrong-id'
			});

			// State should not have changed
			expect(pythonStore.packagesLoading).toEqual(packagesBeforeWrongId);
			expect(pythonStore.packagesLoading).not.toContain('wrong-package-1');
			expect(pythonStore.packagesLoading).not.toContain('wrong-package-2');

			// But with correct ID it would work
			MockWorker.instance?.simulateMessage({
				type: 'packages-loading',
				packages: ['scipy'],
				id: executeMessage?.id
			});

			expect(pythonStore.packagesLoading).toEqual(['scipy']);
		});

		it('should handle packages-loaded message', () => {
			pythonStore.code = 'import pandas';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			// First simulate packages-loading
			MockWorker.instance?.simulateMessage({
				type: 'packages-loading',
				packages: ['pandas', 'numpy'],
				id: executeMessage?.id
			});

			expect(pythonStore.packagesLoading).toEqual(['pandas', 'numpy']);

			// Then simulate packages-loaded
			MockWorker.instance?.simulateMessage({
				type: 'packages-loaded',
				packages: ['pandas', 'numpy'],
				id: executeMessage?.id
			});

			expect(pythonStore.packagesLoading).toEqual([]);
			expect(pythonStore.isLoadingPackages).toBe(false);
			expect(pythonStore.loadedPackages).toContain('pandas');
			expect(pythonStore.loadedPackages).toContain('numpy');
		});

		it('should ignore packages-loaded message with wrong ID', () => {
			pythonStore.code = 'import pandas';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			// First simulate packages-loading with correct ID
			MockWorker.instance?.simulateMessage({
				type: 'packages-loading',
				packages: ['pandas'],
				id: executeMessage?.id
			});

			// Then simulate packages-loaded with wrong ID
			MockWorker.instance?.simulateMessage({
				type: 'packages-loaded',
				packages: ['pandas'],
				id: 'wrong-id'
			});

			// packagesLoading should not be cleared
			expect(pythonStore.packagesLoading).toEqual(['pandas']);
		});

		it('should accumulate loadedPackages across multiple executions', () => {
			pythonStore.code = 'import pandas';
			pythonStore.execute();

			const firstExecMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'packages-loaded',
				packages: ['pandas'],
				id: firstExecMessage?.id
			});

			MockWorker.instance?.simulateMessage({
				type: 'complete',
				id: firstExecMessage?.id,
				duration: 100
			});

			// Second execution
			pythonStore.code = 'import scipy';
			pythonStore.execute();

			const secondExecMessage = MockWorker.messages.filter(
				(m) => (m as { type: string }).type === 'execute'
			)[1] as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'packages-loaded',
				packages: ['scipy'],
				id: secondExecMessage?.id
			});

			// Should have both packages
			expect(pythonStore.loadedPackages).toContain('pandas');
			expect(pythonStore.loadedPackages).toContain('scipy');
		});

		it('should not duplicate packages in loadedPackages', () => {
			pythonStore.code = 'import pandas';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			// Load pandas twice
			MockWorker.instance?.simulateMessage({
				type: 'packages-loaded',
				packages: ['pandas'],
				id: executeMessage?.id
			});

			MockWorker.instance?.simulateMessage({
				type: 'packages-loaded',
				packages: ['pandas', 'numpy'],
				id: executeMessage?.id
			});

			// pandas should only appear once
			const pandasCount = pythonStore.loadedPackages.filter((p) => p === 'pandas').length;
			expect(pandasCount).toBe(1);
		});

		it('should handle plotly message', () => {
			pythonStore.code =
				'import plotly.express as px; fig = px.scatter(x=[1,2], y=[3,4]); fig.show()';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			const plotlySpec = JSON.stringify({ data: [], layout: { title: 'Test' } });

			MockWorker.instance?.simulateMessage({
				type: 'plotly',
				jsonSpec: plotlySpec,
				id: executeMessage?.id
			});

			expect(pythonStore.plotlyData).toBe(plotlySpec);
		});

		it('should ignore plotly message with wrong ID', () => {
			pythonStore.code = 'import plotly';
			pythonStore.execute();

			const plotlySpec = JSON.stringify({ data: [], layout: {} });

			MockWorker.instance?.simulateMessage({
				type: 'plotly',
				jsonSpec: plotlySpec,
				id: 'wrong-id'
			});

			expect(pythonStore.plotlyData).toBe(null);
		});
	});

	// ===========================================================================
	// 4. Cancel Execution Tests
	// ===========================================================================

	describe('Cancel Execution', () => {
		beforeEach(() => {
			pythonStore.initPyodide();
			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });
			MockWorker.messages = [];
		});

		it('should send cancel message to worker', () => {
			pythonStore.code = 'while True: pass';
			pythonStore.execute();

			const executeMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			pythonStore.cancel();

			const cancelMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'cancel'
			) as { id: string } | undefined;

			expect(cancelMessage).toBeDefined();
			expect(cancelMessage?.id).toBe(executeMessage?.id);
		});

		it('should return to ready state after cancel', () => {
			pythonStore.code = 'while True: pass';
			pythonStore.execute();

			pythonStore.cancel();

			expect(pythonStore.state).toBe('ready');
			expect(pythonStore.isExecuting).toBe(false);
		});

		it('should not cancel if not executing', () => {
			const messagesBefore = MockWorker.messages.length;

			pythonStore.cancel();

			const cancelMessages = MockWorker.messages
				.slice(messagesBefore)
				.filter((m) => (m as { type: string }).type === 'cancel');
			expect(cancelMessages).toHaveLength(0);
		});
	});

	// ===========================================================================
	// 5. Clear Output Tests
	// ===========================================================================

	describe('Clear Output', () => {
		beforeEach(() => {
			pythonStore.initPyodide();
			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });
			MockWorker.messages = [];
		});

		it('should clear all output', () => {
			// First generate some output via execution
			pythonStore.code = 'print("test")';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'stdout',
				data: 'some output',
				id: execMessage?.id
			});
			MockWorker.instance?.simulateMessage({
				type: 'error',
				message: 'some error',
				line: 5,
				id: execMessage?.id
			});

			expect(pythonStore.stdout).toBe('some output');
			expect(pythonStore.stderr).toBe('some error');
			expect(pythonStore.errorLine).toBe(5);

			pythonStore.clearOutput();

			expect(pythonStore.stdout).toBe('');
			expect(pythonStore.stderr).toBe('');
			expect(pythonStore.plotData).toBe(null);
			expect(pythonStore.executionTime).toBe(0);
			expect(pythonStore.errorLine).toBe(null);
		});

		it('should clear plotlyData when clearOutput is called', () => {
			pythonStore.code = 'import plotly';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'plotly',
				jsonSpec: JSON.stringify({ data: [], layout: {} }),
				id: execMessage?.id
			});

			expect(pythonStore.plotlyData).not.toBe(null);

			pythonStore.clearOutput();

			expect(pythonStore.plotlyData).toBe(null);
		});

		it('should clear all output types including plotlyData', () => {
			pythonStore.code = 'test';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			// Simulate receiving all output types
			MockWorker.instance?.simulateMessage({
				type: 'stdout',
				data: 'output',
				id: execMessage?.id
			});
			MockWorker.instance?.simulateMessage({
				type: 'plot',
				imageData: 'abc',
				id: execMessage?.id
			});
			MockWorker.instance?.simulateMessage({
				type: 'plotly',
				jsonSpec: JSON.stringify({ data: [], layout: {} }),
				id: execMessage?.id
			});
			MockWorker.instance?.simulateMessage({
				type: 'latex',
				latex: '\\frac{1}{2}',
				id: execMessage?.id
			});

			pythonStore.clearOutput();

			expect(pythonStore.stdout).toBe('');
			expect(pythonStore.stderr).toBe('');
			expect(pythonStore.plotData).toBe(null);
			expect(pythonStore.plotlyData).toBe(null);
			expect(pythonStore.latexOutput).toBe(null);
		});
	});

	// ===========================================================================
	// 6. Reset Code Tests
	// ===========================================================================

	describe('Reset Code', () => {
		beforeEach(() => {
			pythonStore.initPyodide();
			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });
			MockWorker.messages = [];
		});

		it('should reset code to default', () => {
			pythonStore.code = 'custom code';

			pythonStore.resetCode();

			expect(pythonStore.code).toContain('Python Playground');
		});

		it('should clear output on reset', () => {
			// Generate some output first
			pythonStore.code = 'print("test")';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'stdout',
				data: 'some output',
				id: execMessage?.id
			});

			expect(pythonStore.stdout).toBe('some output');

			pythonStore.resetCode();

			expect(pythonStore.stdout).toBe('');
			expect(pythonStore.stderr).toBe('');
		});

		it('should update isModified to false', () => {
			pythonStore.code = 'custom code';
			expect(pythonStore.isModified).toBe(true);

			pythonStore.resetCode();

			expect(pythonStore.isModified).toBe(false);
		});
	});

	// ===========================================================================
	// 7. Pedagogic Errors Toggle Tests
	// ===========================================================================

	describe('Pedagogic Errors Toggle', () => {
		it('should toggle pedagogic errors', () => {
			expect(pythonStore.showPedagogicErrors).toBe(true);

			pythonStore.togglePedagogicErrors();

			expect(pythonStore.showPedagogicErrors).toBe(false);

			pythonStore.togglePedagogicErrors();

			expect(pythonStore.showPedagogicErrors).toBe(true);
		});
	});

	// ===========================================================================
	// 8. localStorage Persistence Tests
	// ===========================================================================

	describe('localStorage Persistence', () => {
		it('should save state to localStorage with debounce', async () => {
			vi.useFakeTimers();

			pythonStore.setCode('new code');

			// Should not save immediately
			expect(localStorage.setItem).not.toHaveBeenCalled();

			// Fast-forward past debounce
			await vi.advanceTimersByTimeAsync(600);

			expect(localStorage.setItem).toHaveBeenCalledWith(
				'ubumaths-python-playground',
				expect.stringContaining('new code')
			);
		});

		it('should save showPedagogicErrors to localStorage', async () => {
			vi.useFakeTimers();

			pythonStore.togglePedagogicErrors();

			// Fast-forward past debounce
			await vi.advanceTimersByTimeAsync(600);

			expect(localStorage.setItem).toHaveBeenCalledWith(
				'ubumaths-python-playground',
				expect.stringContaining('"showPedagogicErrors":false')
			);
		});

		it('should save immediately with saveCode() method', () => {
			pythonStore.code = 'immediate save test';

			const success = pythonStore.saveCode();

			expect(success).toBe(true);
			expect(localStorage.setItem).toHaveBeenCalledWith(
				'ubumaths-python-playground',
				expect.stringContaining('immediate save test')
			);
		});

		it('should update isModified after saveCode()', () => {
			pythonStore.code = 'modified code';
			expect(pythonStore.isModified).toBe(true);

			pythonStore.saveCode();

			expect(pythonStore.isModified).toBe(false);
		});

		it('should clear pending debounce timeout on saveCode()', async () => {
			vi.useFakeTimers();

			pythonStore.setCode('debounced save');

			// Should not save immediately
			expect(localStorage.setItem).not.toHaveBeenCalled();

			// Call saveCode before debounce finishes
			pythonStore.saveCode();

			// Should save immediately
			expect(localStorage.setItem).toHaveBeenCalled();

			// Fast-forward to ensure no duplicate save
			const callCount = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls.length;
			await vi.advanceTimersByTimeAsync(1000);

			// Should not have been called again
			expect(localStorage.setItem).toHaveBeenCalledTimes(callCount);
		});

		it('should return false if saveCode fails', () => {
			// Make localStorage throw an error
			vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
				throw new Error('localStorage is full');
			});

			pythonStore.code = 'error test';
			const success = pythonStore.saveCode();

			expect(success).toBe(false);
		});
	});

	// ===========================================================================
	// 9. Derived State Tests
	// ===========================================================================

	describe('Derived States', () => {
		beforeEach(() => {
			pythonStore.initPyodide();
			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });
			MockWorker.messages = [];
		});

		it('should have hasOutput true when stdout is set', () => {
			expect(pythonStore.hasOutput).toBe(false);

			pythonStore.code = 'print("test")';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'stdout',
				data: 'output',
				id: execMessage?.id
			});

			expect(pythonStore.hasOutput).toBe(true);
		});

		it('should have hasOutput true when stderr is set', () => {
			pythonStore.clearOutput();
			expect(pythonStore.hasOutput).toBe(false);

			pythonStore.code = 'x';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'stderr',
				data: 'error',
				id: execMessage?.id
			});

			expect(pythonStore.hasOutput).toBe(true);
		});

		it('should have hasOutput true when plotData is set', () => {
			pythonStore.clearOutput();
			expect(pythonStore.hasOutput).toBe(false);

			pythonStore.code = 'plt.plot()';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'plot',
				imageData: 'abc',
				id: execMessage?.id
			});

			expect(pythonStore.hasOutput).toBe(true);
		});

		it('should have hasOutput true when plotlyData is set', () => {
			pythonStore.clearOutput();
			expect(pythonStore.hasOutput).toBe(false);

			pythonStore.code = 'import plotly';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'plotly',
				jsonSpec: JSON.stringify({ data: [], layout: {} }),
				id: execMessage?.id
			});

			expect(pythonStore.hasOutput).toBe(true);
		});

		it('should have hasOutput true when latexOutput is set', () => {
			pythonStore.clearOutput();
			expect(pythonStore.hasOutput).toBe(false);

			pythonStore.code = 'import sympy';
			pythonStore.execute();

			const execMessage = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'execute'
			) as { id: string } | undefined;

			MockWorker.instance?.simulateMessage({
				type: 'latex',
				latex: '\\frac{1}{2}',
				id: execMessage?.id
			});

			expect(pythonStore.hasOutput).toBe(true);
		});

		it('should have isModified true when code changes from default', () => {
			// Reset to default first
			pythonStore.resetCode();
			expect(pythonStore.isModified).toBe(false);

			pythonStore.code = 'custom code';

			expect(pythonStore.isModified).toBe(true);
		});
	});

	// ===========================================================================
	// 10. Destroy Tests
	// ===========================================================================

	describe('Destroy', () => {
		it('should reset state on destroy', () => {
			pythonStore.initPyodide();
			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });

			pythonStore.destroy();

			expect(pythonStore.state).toBe('initial');
		});

		it('should clear timeouts on destroy', () => {
			vi.useFakeTimers();

			pythonStore.initPyodide();
			MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });

			pythonStore.code = 'print("Hello")';
			pythonStore.execute();

			pythonStore.destroy();

			// Should not throw when timers fire
			expect(() => vi.runAllTimers()).not.toThrow();
		});
	});

	// ===========================================================================
	// 11. Worker Not Supported Tests
	// ===========================================================================

	describe('Worker Not Supported', () => {
		it('should handle Worker constructor error', async () => {
			// Make Worker throw an error
			globalThis.Worker = vi.fn().mockImplementation(() => {
				throw new Error('Worker is not supported');
			}) as unknown as typeof Worker;

			vi.resetModules();
			const module = await import('./pythonPlayground.svelte');
			const freshStore = module.pythonStore;

			freshStore.initPyodide();

			expect(freshStore.state).toBe('error');
			expect(freshStore.stderr).toContain('Worker');

			freshStore.destroy();
		});
	});
});
