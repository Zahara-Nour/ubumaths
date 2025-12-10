import { browser } from '$app/environment';
import {
	DEFAULT_CONFIG,
	NUMBERING_SCHEMES,
	type ListNumberingConfig,
	type SchemeId
} from '$lib/types/list-numbering';

/**
 * List Numbering Store
 * ====================
 *
 * Manages the global configuration for list numbering schemes.
 * Persisted in localStorage.
 *
 * Usage:
 * - listNumberingStore.config - get current config
 * - listNumberingStore.setScheme('auto' | '1-a-i' | ...) - set scheme
 * - listNumberingStore.reset() - reset to defaults
 */

const STORAGE_KEY = 'listNumberingConfig';

function createListNumberingStore() {
	let config = $state<ListNumberingConfig>({ ...DEFAULT_CONFIG });

	// Initialize from localStorage
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				const parsed = JSON.parse(stored) as Partial<ListNumberingConfig>;
				// Validate and merge with defaults
				config = {
					scheme: isValidScheme(parsed.scheme) ? parsed.scheme : DEFAULT_CONFIG.scheme,
					schemeWithNesting: isValidSchemeId(parsed.schemeWithNesting)
						? parsed.schemeWithNesting
						: DEFAULT_CONFIG.schemeWithNesting,
					schemeWithoutNesting: isValidSchemeId(parsed.schemeWithoutNesting)
						? parsed.schemeWithoutNesting
						: DEFAULT_CONFIG.schemeWithoutNesting
				};
			} catch {
				// Invalid JSON, use defaults
			}
		}
	}

	function isValidSchemeId(id: unknown): id is SchemeId {
		return typeof id === 'string' && id in NUMBERING_SCHEMES;
	}

	function isValidScheme(scheme: unknown): scheme is 'auto' | SchemeId {
		return scheme === 'auto' || isValidSchemeId(scheme);
	}

	function persist() {
		if (browser) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
			} catch (error) {
				console.warn('Failed to persist list numbering config:', error);
				// Continue silently - configuration still works in memory
			}
		}
	}

	function setScheme(scheme: 'auto' | SchemeId) {
		if (isValidScheme(scheme)) {
			config = { ...config, scheme };
			persist();
		}
	}

	function setSchemeWithNesting(schemeId: SchemeId) {
		if (isValidSchemeId(schemeId)) {
			config = { ...config, schemeWithNesting: schemeId };
			persist();
		}
	}

	function setSchemeWithoutNesting(schemeId: SchemeId) {
		if (isValidSchemeId(schemeId)) {
			config = { ...config, schemeWithoutNesting: schemeId };
			persist();
		}
	}

	function reset() {
		config = { ...DEFAULT_CONFIG };
		persist();
	}

	return {
		get config() {
			return config;
		},
		setScheme,
		setSchemeWithNesting,
		setSchemeWithoutNesting,
		reset
	};
}

export const listNumberingStore = createListNumberingStore();
