<script lang="ts">
	import { createLogger } from '$lib/utils/logger';

	// Default logger (threshold: info) - trace messages suppressed
	const defaultLogger = createLogger('LoggerDemo.svelte');

	// Debug logger (threshold: trace) - all messages displayed
	const debugLogger = createLogger('LoggerDemo.svelte', 'trace');

	// Warn logger (threshold: warn) - only warn and error displayed
	const warnLogger = createLogger('LoggerDemo.svelte', 'warn');

	// Error logger (threshold: error) - only errors displayed
	const errorLogger = createLogger('LoggerDemo.svelte', 'error');

	function testDefaultThreshold() {
		defaultLogger.trace('🚫 Trace: Suppressed (below info threshold)');
		defaultLogger.info('✅ Info: Displayed with default threshold');
		defaultLogger.warn('✅ Warn: Displayed with default threshold');
		defaultLogger.error('✅ Error: Displayed with default threshold');
	}

	function testTraceThreshold() {
		debugLogger.trace('✅ Trace: Displayed with trace threshold');
		debugLogger.info('✅ Info: Displayed with trace threshold');
		debugLogger.warn('✅ Warn: Displayed with trace threshold');
		debugLogger.error('✅ Error: Displayed with trace threshold');
	}

	function testWarnThreshold() {
		warnLogger.trace('🚫 Trace: Suppressed (below warn threshold)');
		warnLogger.info('🚫 Info: Suppressed (below warn threshold)');
		warnLogger.warn('✅ Warn: Displayed with warn threshold');
		warnLogger.error('✅ Error: Displayed with warn threshold');
	}

	function testErrorThreshold() {
		errorLogger.trace('🚫 Trace: Suppressed (below error threshold)');
		errorLogger.info('🚫 Info: Suppressed (below error threshold)');
		errorLogger.warn('🚫 Warn: Suppressed (below error threshold)');
		errorLogger.error('✅ Error: Displayed with error threshold');
	}

	function testWithData() {
		defaultLogger.info('User clicked button', {
			timestamp: new Date(),
			buttonId: 'test-btn',
			metadata: { page: 'demo', section: 'logger' }
		});
	}

	function simulateError() {
		try {
			throw new Error('Simulated error for testing');
		} catch (err) {
			defaultLogger.error('Caught error in component:', err);
		}
	}

	// Log component lifecycle
	defaultLogger.info('LoggerDemo component initialized');
</script>

<div class="mx-auto max-w-4xl space-y-6 p-6">
	<div>
		<h2 class="mb-2 text-3xl font-bold">Logger System Demo</h2>
		<p class="text-gray-600 dark:text-gray-400">
			Open your browser console (F12) to see colored log output. Check the
			<code class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">[LoggerDemo.svelte]</code>
			prefix on messages.
		</p>
		<p class="mt-2 text-sm text-gray-500 dark:text-gray-500">
			💡 In production mode, all logs are automatically disabled.
		</p>
	</div>

	<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
		<h3 class="mb-3 text-xl font-semibold">Log Level Colors</h3>
		<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
			<div class="flex items-center space-x-2">
				<div class="h-4 w-4 rounded bg-gray-400"></div>
				<span class="text-sm">Trace (normal)</span>
			</div>
			<div class="flex items-center space-x-2">
				<div class="h-4 w-4 rounded bg-blue-500"></div>
				<span class="text-sm">Info (blue)</span>
			</div>
			<div class="flex items-center space-x-2">
				<div class="h-4 w-4 rounded bg-orange-500"></div>
				<span class="text-sm">Warn (orange)</span>
			</div>
			<div class="flex items-center space-x-2">
				<div class="h-4 w-4 rounded bg-red-500"></div>
				<span class="text-sm">Error (red)</span>
			</div>
		</div>
	</div>

	<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
		<h3 class="mb-3 text-xl font-semibold">Threshold Levels</h3>
		<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
			The threshold determines which messages are displayed:
			<code class="rounded bg-gray-100 px-1 dark:bg-gray-800"
				>trace &lt; info &lt; warn &lt; error</code
			>
		</p>

		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<button
				onclick={testDefaultThreshold}
				class="rounded-lg bg-blue-500 px-4 py-3 text-left text-white transition hover:bg-blue-600"
			>
				<div class="font-semibold">Default (info)</div>
				<div class="text-xs opacity-90">Shows: info, warn, error</div>
			</button>

			<button
				onclick={testTraceThreshold}
				class="rounded-lg bg-gray-500 px-4 py-3 text-left text-white transition hover:bg-gray-600"
			>
				<div class="font-semibold">Debug (trace)</div>
				<div class="text-xs opacity-90">Shows: all messages</div>
			</button>

			<button
				onclick={testWarnThreshold}
				class="rounded-lg bg-orange-500 px-4 py-3 text-left text-white transition hover:bg-orange-600"
			>
				<div class="font-semibold">Warnings (warn)</div>
				<div class="text-xs opacity-90">Shows: warn, error</div>
			</button>

			<button
				onclick={testErrorThreshold}
				class="rounded-lg bg-red-500 px-4 py-3 text-left text-white transition hover:bg-red-600"
			>
				<div class="font-semibold">Errors Only (error)</div>
				<div class="text-xs opacity-90">Shows: error only</div>
			</button>
		</div>
	</div>

	<div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
		<h3 class="mb-3 text-xl font-semibold">Advanced Usage</h3>
		<div class="flex flex-wrap gap-3">
			<button
				onclick={testWithData}
				class="rounded-lg bg-green-500 px-4 py-2 text-white transition hover:bg-green-600"
			>
				Log with Object Data
			</button>

			<button
				onclick={simulateError}
				class="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
			>
				Simulate Error with Stack Trace
			</button>
		</div>
	</div>

	<div
		class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950"
	>
		<h3 class="mb-2 text-lg font-semibold">Usage Example</h3>
		<pre class="overflow-x-auto rounded bg-gray-900 p-3 text-sm text-gray-100"><code
				>import {'{ createLogger }'} from '$lib/utils/logger';

// Default threshold (info)
const logger = createLogger('MyComponent.svelte');

// Custom threshold (trace - shows everything)
const debugLogger = createLogger('Debug.svelte', 'trace');

logger.trace('Not displayed'); // Suppressed
logger.info('Displayed');      // ✅
logger.warn('Warning!');        // ✅
logger.error('Error!');         // ✅</code
			></pre>
	</div>
</div>
