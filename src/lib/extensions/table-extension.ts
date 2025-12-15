/**
 * Custom Table Cell Extensions for TipTap
 * =======================================
 *
 * Extends the default TipTap Table extensions with support for:
 * - textAlign: 'left' | 'center' | 'right' (for markdown roundtrip)
 *
 * The default extensions don't preserve textAlign attribute,
 * which breaks markdown roundtrip for tables with column alignment:
 * |:---|:---:|---:|
 *
 * @module extensions/table-extension
 */

import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

/**
 * Custom TableHeader extension with textAlign attribute support
 */
export const CustomTableHeader = TableHeader.extend({
	addAttributes() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const parentAttrs = (this as any).parent?.() ?? {};
		return {
			...parentAttrs,
			textAlign: {
				default: 'left',
				parseHTML: (element: HTMLElement) => {
					// Check data attribute first, then style
					const dataAlign = element.getAttribute('data-text-align');
					if (dataAlign) return dataAlign;

					const style = element.style.textAlign;
					if (style === 'center' || style === 'right') return style;
					return 'left';
				},
				renderHTML: (attributes: { textAlign?: string }) => {
					const align = attributes.textAlign || 'left';
					return {
						'data-text-align': align,
						style: align !== 'left' ? `text-align: ${align}` : undefined
					};
				}
			}
		};
	}
});

/**
 * Custom TableCell extension with textAlign attribute support
 */
export const CustomTableCell = TableCell.extend({
	addAttributes() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const parentAttrs = (this as any).parent?.() ?? {};
		return {
			...parentAttrs,
			textAlign: {
				default: 'left',
				parseHTML: (element: HTMLElement) => {
					// Check data attribute first, then style
					const dataAlign = element.getAttribute('data-text-align');
					if (dataAlign) return dataAlign;

					const style = element.style.textAlign;
					if (style === 'center' || style === 'right') return style;
					return 'left';
				},
				renderHTML: (attributes: { textAlign?: string }) => {
					const align = attributes.textAlign || 'left';
					return {
						'data-text-align': align,
						style: align !== 'left' ? `text-align: ${align}` : undefined
					};
				}
			}
		};
	}
});
