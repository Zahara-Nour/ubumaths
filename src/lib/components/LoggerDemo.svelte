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

<div class="p-6 space-y-6 max-w-4xl mx-auto">
	<div>
		<h2 class="text-3xl font-bold mb-2">Logger System Demo</h2>
		<p class="text-gray-600 dark:text-gray-400">
			Open your browser console (F12) to see colored log output. Check the
			<code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">[LoggerDemo.svelte]</code>
			prefix on messages.
		</p>
		<p class="text-sm text-gray-500 dark:text-gray-500 mt-2">
			💡 In production mode, all logs are automatically disabled.
		</p>
	</div>

	<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
		<h3 class="text-xl font-semibold mb-3">Log Level Colors</h3>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
			<div class="flex items-center space-x-2">
				<div class="w-4 h-4 bg-gray-400 rounded"></div>
				<span class="text-sm">Trace (normal)</span>
			</div>
			<div class="flex items-center space-x-2">
				<div class="w-4 h-4 bg-blue-500 rounded"></div>
				<span class="text-sm">Info (blue)</span>
			</div>
			<div class="flex items-center space-x-2">
				<div class="w-4 h-4 bg-orange-500 rounded"></div>
				<span class="text-sm">Warn (orange)</span>
			</div>
			<div class="flex items-center space-x-2">
				<div class="w-4 h-4 bg-red-500 rounded"></div>
				<span class="text-sm">Error (red)</span>
			</div>
		</div>
	</div>

	<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
		<h3 class="text-xl font-semibold mb-3">Threshold Levels</h3>
		<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
			The threshold determines which messages are displayed:
			<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">trace &lt; info &lt; warn &lt; error</code>
		</p>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
			<button
				onclick={testDefaultThreshold}
				class="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-left"
			>
				<div class="font-semibold">Default (info)</div>
				<div class="text-xs opacity-90">Shows: info, warn, error</div>
			</button>

			<button
				onclick={testTraceThreshold}
				class="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-left"
			>
				<div class="font-semibold">Debug (trace)</div>
				<div class="text-xs opacity-90">Shows: all messages</div>
			</button>

			<button
				onclick={testWarnThreshold}
				class="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-left"
			>
				<div class="font-semibold">Warnings (warn)</div>
				<div class="text-xs opacity-90">Shows: warn, error</div>
			</button>

			<button
				onclick={testErrorThreshold}
				class="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-left"
			>
				<div class="font-semibold">Errors Only (error)</div>
				<div class="text-xs opacity-90">Shows: error only</div>
			</button>
		</div>
	</div>

	<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
		<h3 class="text-xl font-semibold mb-3">Advanced Usage</h3>
		<div class="flex flex-wrap gap-3">
			<button
				onclick={testWithData}
				class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
			>
				Log with Object Data
			</button>

			<button
				onclick={simulateError}
				class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
			>
				Simulate Error with Stack Trace
			</button>
		</div>
	</div>

	<div class="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
		<h3 class="text-lg font-semibold mb-2">Usage Example</h3>
		<pre
			class="text-sm bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto"><code>import {'{ createLogger }'} from '$lib/utils/logger';

// Default threshold (info)
const logger = createLogger('MyComponent.svelte');

// Custom threshold (trace - shows everything)
const debugLogger = createLogger('Debug.svelte', 'trace');

logger.trace('Not displayed'); // Suppressed
logger.info('Displayed');      // ✅
logger.warn('Warning!');        // ✅
logger.error('Error!');         // ✅</code></pre>
	</div>
</div>