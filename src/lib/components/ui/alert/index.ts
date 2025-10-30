import Root from './alert.svelte';
import Description from './alert-description.svelte';
import Title from './alert-title.svelte';

// Re-export types from dedicated types file for better TypeScript compatibility
export type { AlertVariant } from './types.js';
// Note: alertVariants is exported from alert.svelte and can be imported directly if needed

export {
	Root,
	Description,
	Title,
	//
	Root as Alert,
	Description as AlertDescription,
	Title as AlertTitle
};
