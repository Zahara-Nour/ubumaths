import { toast, type ExternalToast } from 'svelte-sonner';
import type { Component } from 'svelte';

/**
 * Toaster Store
 * =============
 *
 * Wrapper around svelte-sonner toast for consistent API
 *
 * Usage:
 * import { toaster } from '$lib/stores/toaster.svelte';
 *
 * toaster.success('Success message');
 * toaster.error('Error message');
 * toaster.warning('Warning message');
 * toaster.info('Info message');
 */

export const toaster = {
	success: (message: string, data?: ExternalToast<Component>) => {
		toast.success(message, data);
	},
	error: (message: string, data?: ExternalToast<Component>) => {
		toast.error(message, data);
	},
	warning: (message: string, data?: ExternalToast<Component>) => {
		toast.warning(message, data);
	},
	info: (message: string, data?: ExternalToast<Component>) => {
		toast.info(message, data);
	},
	message: (message: string, data?: ExternalToast<Component>) => {
		toast(message, data);
	}
};
