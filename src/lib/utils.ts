import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
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

type FlyAndScaleParams = {
	y?: number;
	x?: number;
	start?: number;
	duration?: number;
};

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

export const flyAndScale = (
	node: Element,
	params: FlyAndScaleParams = { y: -8, x: 0, start: 0.95, duration: 150 }
): TransitionConfig => {
	const style = getComputedStyle(node);
	const transform = style.transform === 'none' ? '' : style.transform;

	const scaleConversion = (valueA: number, scaleA: [number, number], scaleB: [number, number]) => {
		const [minA, maxA] = scaleA;
		const [minB, maxB] = scaleB;

		const percentage = (valueA - minA) / (maxA - minA);
		const valueB = percentage * (maxB - minB) + minB;

		return valueB;
	};

	const styleToString = (style: Record<string, number | string | undefined>): string => {
		return Object.keys(style).reduce((str, key) => {
			if (style[key] === undefined) return str;
			return str + `${key}:${style[key]};`;
		}, '');
	};

	return {
		duration: params.duration ?? 200,
		delay: 0,
		css: (t) => {
			const y = scaleConversion(t, [0, 1], [params.y ?? 5, 0]);
			const x = scaleConversion(t, [0, 1], [params.x ?? 0, 0]);
			const scale = scaleConversion(t, [0, 1], [params.start ?? 0.95, 1]);

			return styleToString({
				transform: `${transform} translate3d(${x}px, ${y}px, 0) scale(${scale})`,
				opacity: t
			});
		},
		easing: cubicOut
	};
};
