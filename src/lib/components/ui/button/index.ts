import Root from './button.svelte';

// Re-export types from dedicated types file for better TypeScript compatibility
export type { ButtonProps, ButtonSize, ButtonVariant } from './types.js';
export type { ButtonProps as Props } from './types.js';
// Note: buttonVariants is exported from button.svelte and can be imported directly if needed

export {
	Root,
	//
	Root as Button
};
