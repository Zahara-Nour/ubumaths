/**
 * Custom Image Extension for TipTap
 * ==================================
 *
 * Extends the default TipTap Image extension with support for:
 * - sizeClass: 'inline' | 'small' | 'medium' | 'large' | 'full'
 * - widthPercent: 0-100
 * - alignment: 'left' | 'center' | 'right'
 * - caption: string (displayed as figcaption)
 * - href: link URL for clickable images
 * - linkTitle: title attribute for the link
 *
 * @module extensions/image-extension
 */

import Image from '@tiptap/extension-image';

/**
 * Size class to CSS width mapping
 */
const SIZE_CLASS_STYLES: Record<string, { width: string; maxWidth: string }> = {
	inline: { width: '1.5em', maxWidth: '1.5em' },
	small: { width: '25%', maxWidth: '300px' },
	medium: { width: '50%', maxWidth: '600px' },
	large: { width: '75%', maxWidth: '900px' },
	full: { width: '100%', maxWidth: '1200px' }
};

/**
 * Custom Image extension with extended attributes
 *
 * IMPORTANT: We access node.attrs directly in renderHTML because
 * HTMLAttributes contains transformed attribute names (data-*),
 * not the raw attribute values.
 */
export const CustomImage = Image.extend({
	name: 'image',

	addAttributes() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const parentAttrs = (this as any).parent?.() ?? {};
		return {
			...parentAttrs,
			sizeClass: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-size-class'),
				// Don't render here - we handle it in main renderHTML
				renderHTML: () => ({})
			},
			widthPercent: {
				default: null,
				parseHTML: (element: HTMLElement) => {
					const val = element.getAttribute('data-width-percent');
					return val ? parseInt(val, 10) : null;
				},
				renderHTML: () => ({})
			},
			alignment: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-alignment'),
				renderHTML: () => ({})
			},
			caption: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-caption'),
				renderHTML: () => ({})
			},
			href: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-href'),
				renderHTML: () => ({})
			},
			linkTitle: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('data-link-title'),
				renderHTML: () => ({})
			}
		};
	},

	renderHTML({
		node,
		HTMLAttributes
	}: {
		node: { attrs: Record<string, unknown> };
		HTMLAttributes: Record<string, unknown>;
	}) {
		// Access raw attribute values from node.attrs
		const sizeClass = node.attrs.sizeClass as string | null;
		const widthPercent = node.attrs.widthPercent as number | null;
		const alignment = node.attrs.alignment as string | null;
		const caption = node.attrs.caption as string | null;
		const href = node.attrs.href as string | null;
		const linkTitle = node.attrs.linkTitle as string | null;

		// HTMLAttributes contains src, alt, title from parent Image extension
		const { src, alt, title } = HTMLAttributes;

		// Image is always 100% of its wrapper - wrapper controls the size
		const imgStyles = 'width: 100%; height: auto; display: block;';

		// Build wrapper styles for size and alignment
		const wrapperStyles: string[] = ['margin-top: 0.5rem', 'margin-bottom: 0.5rem'];

		// Determine wrapper width from size class or width percent
		if (sizeClass && SIZE_CLASS_STYLES[sizeClass]) {
			wrapperStyles.push(`width: ${SIZE_CLASS_STYLES[sizeClass].width}`);
			wrapperStyles.push(`max-width: ${SIZE_CLASS_STYLES[sizeClass].maxWidth}`);
		} else if (widthPercent !== null && widthPercent !== undefined) {
			wrapperStyles.push(`width: ${widthPercent}%`);
		} else {
			// Default: fit content, max 100%
			wrapperStyles.push('width: fit-content', 'max-width: 100%');
		}

		// Alignment via margins
		if (alignment === 'center') {
			wrapperStyles.push('margin-left: auto', 'margin-right: auto');
		} else if (alignment === 'right') {
			wrapperStyles.push('margin-left: auto', 'margin-right: 0');
		} else {
			// left or default
			wrapperStyles.push('margin-left: 0', 'margin-right: auto');
		}

		// Build img element with data attributes for persistence
		const imgElement: [string, Record<string, unknown>] = [
			'img',
			{
				src,
				alt,
				title,
				class: 'rounded-md',
				style: imgStyles,
				'data-size-class': sizeClass || undefined,
				'data-width-percent': widthPercent ?? undefined,
				'data-alignment': alignment || undefined,
				'data-caption': caption || undefined,
				'data-href': href || undefined,
				'data-link-title': linkTitle || undefined
			}
		];

		// If href exists, wrap img in a link
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let imageContent: any = imgElement;
		if (href) {
			imageContent = [
				'a',
				{
					href,
					title: linkTitle || undefined,
					target: '_blank',
					rel: 'noopener noreferrer'
				},
				imgElement
			];
		}

		// If caption exists, wrap in figure with figcaption
		if (caption) {
			return [
				'figure',
				{
					class: 'image-figure',
					style: wrapperStyles.join('; ')
				},
				imageContent,
				[
					'figcaption',
					{
						class: 'text-sm text-center mt-1 italic',
						style: 'color: var(--muted-foreground, #6b7280);'
					},
					caption
				]
			];
		}

		// No caption - wrap in a div for alignment
		return [
			'div',
			{
				class: 'image-wrapper',
				style: wrapperStyles.join('; ')
			},
			imageContent
		];
	}
});

export default CustomImage;
