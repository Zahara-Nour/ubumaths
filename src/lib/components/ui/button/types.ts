/**
 * Button Component Types
 * Re-exported from button.svelte for better TypeScript compatibility
 */

import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
import type { WithElementRef } from '$lib/utils.js';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';

export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
	WithElementRef<HTMLAnchorAttributes> & {
		variant?: ButtonVariant;
		size?: ButtonSize;
	};
