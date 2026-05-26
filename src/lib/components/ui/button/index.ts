import Root, { buttonVariants } from './button.svelte';

// Re-export types from dedicated types file for better TypeScript compatibility
export type { ButtonProps, ButtonSize, ButtonVariant } from './types.js';
export type { ButtonProps as Props } from './types.js';

// `buttonVariants` is consumed by shadcn-svelte's Calendar (prev/next button
// components) — re-export it here so external imports don't have to reach
// into the .svelte module file directly.
export {
	Root,
	buttonVariants,
	//
	Root as Button
};
