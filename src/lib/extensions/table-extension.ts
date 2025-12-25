/**
 * Custom Table Extensions for TipTap
 * ===================================
 *
 * Extends the default TipTap Table extensions with support for:
 * - textAlign: 'left' | 'center' | 'right' (for markdown roundtrip)
 * - transpose: boolean (for :table-h directive support)
 *
 * The default extensions don't preserve textAlign attribute,
 * which breaks markdown roundtrip for tables with column alignment:
 * |:---|:---:|---:|
 *
 * The transpose attribute is used for horizontal/transposed tables
 * where columns become rows when displayed.
 *
 * @module extensions/table-extension
 */

import { Table, TableHeader, TableCell } from '@tiptap/extension-table';

/**
 * Custom Table extension with transpose attribute support
 * Used for :table-h directive in markdown
 *
 * Note: Visual transposition is only shown in MarkdownRenderer preview,
 * not in TipTap editor (editing remains in original format).
 */
export const CustomTable = Table.extend({
	addAttributes() {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const parentAttrs = (this as any).parent?.() ?? {};
		return {
			...parentAttrs,
			transpose: {
				default: false,
				parseHTML: (element: HTMLElement) => {
					return element.getAttribute('data-transpose') === 'true';
				},
				renderHTML: (attributes: { transpose?: boolean }) => {
					if (!attributes.transpose) return {};
					return {
						'data-transpose': 'true'
					};
				}
			}
		};
	}
});

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
