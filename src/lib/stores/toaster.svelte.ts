import { toast } from 'svelte-sonner';

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
	success: (message: string, data?: unknown) => {
		toast.success(message, data);
	},
	error: (message: string, data?: unknown) => {
		toast.error(message, data);
	},
	warning: (message: string, data?: unknown) => {
		toast.warning(message, data);
	},
	info: (message: string, data?: unknown) => {
		toast.info(message, data);
	},
	message: (message: string, data?: unknown) => {
		toast(message, data);
	}
};
