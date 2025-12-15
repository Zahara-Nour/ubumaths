/**
 * Custom Link Extension for TipTap
 * =================================
 *
 * Extends the default TipTap Link extension with support for:
 * - title: tooltip/title attribute for links (for markdown roundtrip)
 *
 * The default Link extension doesn't preserve the title attribute,
 * which breaks markdown roundtrip for links like:
 * [text](url "title")
 *
 * @module extensions/link-extension
 */

import Link from '@tiptap/extension-link';

/**
 * Custom Link extension with title attribute support
 */
export const CustomLink = Link.extend({
	addAttributes() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const parentAttrs = (this as any).parent?.() ?? {};
		return {
			...parentAttrs,
			title: {
				default: null,
				parseHTML: (element: HTMLElement) => element.getAttribute('title'),
				renderHTML: (attributes: { title?: string | null }) => {
					if (!attributes.title) {
						return {};
					}
					return { title: attributes.title };
				}
			}
		};
	}
});

export default CustomLink;
