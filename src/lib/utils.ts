import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Snippet } from 'svelte';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, U = HTMLElement> = Omit<T, 'ref'> & {
	ref?: U | null;
};

export type WithChild<T = Snippet> = {
	children?: T;
};

export type WithoutChild<T> = Omit<T, 'children' | 'child'> & {
	children?: Snippet<[unknown?]>;
};

export type WithoutChildren<T> = Omit<T, 'children'>;

export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;

/**
 * Fix malformed URLs by ensuring they have the correct protocol
 * Handles cases where 'h' is missing from 'https://' or missing slashes
 *
 * @param url - The URL to fix
 * @returns The corrected URL
 *
 * @example
 * fixUrl('ttps://example.com') // 'https://example.com'
 * fixUrl('ttps:/example.com') // 'https://example.com'
 * fixUrl('https://example.com') // 'https://example.com'
 * fixUrl('ttp://example.com') // 'http://example.com'
 * fixUrl('ttp:/example.com') // 'http://example.com'
 */
export function fixUrl(url: string | null | undefined): string {
	if (!url) return '';

	// Fix missing 'h' in https:// (with double slash)
	if (url.startsWith('ttps://')) {
		return 'h' + url;
	}

	// Fix missing 'h' in https:/ (with single slash)
	if (url.startsWith('ttps:/')) {
		return 'https://' + url.substring(6);
	}

	// Fix missing 'h' in http:// (with double slash)
	if (url.startsWith('ttp://')) {
		return 'h' + url;
	}

	// Fix missing 'h' in http:/ (with single slash)
	if (url.startsWith('ttp:/')) {
		return 'http://' + url.substring(5);
	}

	return url;
}
