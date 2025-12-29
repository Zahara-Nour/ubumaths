/**
 * Bug Reports Config Store
 *
 * Svelte 5 reactive store for managing bug reports feature configuration.
 * Loads configuration from API and provides reactive getters for each flag.
 *
 * USAGE:
 * ```svelte
 * <script>
 * import { bugReportsConfigStore } from '$lib/stores/bugReportsConfig.svelte';
 *
 * // Load config on mount
 * onMount(() => bugReportsConfigStore.load());
 *
 * // Check if FAB should be shown (reactive)
 * {#if bugReportsConfigStore.fabEnabled}
 *   <BugReportFAB />
 * {/if}
 * </script>
 * ```
 */

import { browser } from '$app/environment';
import type { BugReportsConfig } from '$lib/types/bug-reports';
import { DEFAULT_BUG_REPORTS_CONFIG } from '$lib/types/bug-reports';

// =============================================================================
// Reactive State
// =============================================================================

let _config = $state<BugReportsConfig>(DEFAULT_BUG_REPORTS_CONFIG);
let _loading = $state(false);
let _error = $state<string | null>(null);
let _loaded = $state(false);

// =============================================================================
// API Functions
// =============================================================================

/**
 * Load configuration from API
 * Only admins can load the config; non-admins will use defaults
 */
async function load(): Promise<void> {
	if (!browser) return;
	if (_loading) return;

	_loading = true;
	_error = null;

	try {
		const response = await fetch('/api/bug-reports/config');

		if (response.status === 403) {
			// Non-admin user - use defaults (this is expected)
			_config = DEFAULT_BUG_REPORTS_CONFIG;
			_loaded = true;
			return;
		}

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data: BugReportsConfig = await response.json();
		_config = data;
		_loaded = true;
	} catch (err) {
		console.error('[BugReportsConfigStore] Failed to load config:', err);
		_error = err instanceof Error ? err.message : 'Unknown error';
		// Keep defaults on error
		_config = DEFAULT_BUG_REPORTS_CONFIG;
	} finally {
		_loading = false;
	}
}

/**
 * Update configuration (admin only)
 * Uses optimistic UI - updates local state immediately, reverts on error
 */
async function update(partial: Partial<Omit<BugReportsConfig, 'updatedAt'>>): Promise<boolean> {
	if (!browser) return false;

	const previousConfig = { ..._config };

	// Optimistic update
	_config = {
		..._config,
		...partial,
		updatedAt: new Date().toISOString()
	};

	try {
		const response = await fetch('/api/bug-reports/config', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(partial)
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data: BugReportsConfig = await response.json();
		_config = data;
		return true;
	} catch (err) {
		console.error('[BugReportsConfigStore] Failed to update config:', err);
		// Revert on error
		_config = previousConfig;
		_error = err instanceof Error ? err.message : 'Update failed';
		return false;
	}
}

/**
 * Reset to defaults (local only, does not persist)
 */
function reset(): void {
	_config = DEFAULT_BUG_REPORTS_CONFIG;
	_loaded = false;
	_error = null;
}

// =============================================================================
// Exported Store Object
// =============================================================================

export const bugReportsConfigStore = {
	// Reactive getters
	get config(): BugReportsConfig {
		return _config;
	},
	get fabEnabled(): boolean {
		return _config.fabEnabled;
	},
	get freezeDetectionEnabled(): boolean {
		return _config.freezeDetectionEnabled;
	},
	get freezePromptEnabled(): boolean {
		return _config.freezePromptEnabled;
	},
	get autoReportEnabled(): boolean {
		return _config.autoReportEnabled;
	},
	get loading(): boolean {
		return _loading;
	},
	get error(): string | null {
		return _error;
	},
	get loaded(): boolean {
		return _loaded;
	},

	// Methods
	load,
	update,
	reset
};
