/**
 * VariationTable Component Tests
 * ==============================
 *
 * Tests for the variation table rendering component.
 * Verifies correct rendering of sign rows, variation rows,
 * arrows, markers, and special cases like asymptotes.
 *
 * @module components/markdown/__tests__/VariationTable.svelte.test
 */

import { page } from '@vitest/browser/context';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import VariationTable from '../nodes/VariationTable.svelte';
import type {
	VariationTableNode,
	VariationValue,
	VariationRow
} from '$lib/ubumark/types/variation-table';

// Type-safe render wrapper for Svelte 5 component
const renderTable = (props: { node: VariationTableNode; class?: string }) =>
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	render(VariationTable as any, { props });

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a basic variation table node for testing
 */
function createBasicTable(): VariationTableNode {
	return {
		type: 'variation-table',
		variable: 'x',
		domain: [{ expression: '-\\infty' }, { expression: '0' }, { expression: '+\\infty' }],
		rows: []
	};
}

/**
 * Create a sign row with given values
 */
function createSignRow(
	label: string,
	values: Record<
		string,
		| { type: 'sign'; value: '+' | '-' }
		| { type: 'marker'; marker: 'zero' | 'asymptote' | 'forbidden' | 'discontinuity' }
	>
): {
	type: 'sign';
	label: string;
	values: Map<
		string,
		| { type: 'sign'; value: '+' | '-' }
		| { type: 'marker'; marker: 'zero' | 'asymptote' | 'forbidden' | 'discontinuity' }
	>;
} {
	return {
		type: 'sign',
		label,
		values: new Map(Object.entries(values))
	};
}

/**
 * Create a variation row with given values
 */
function createVariationRow(label: string, values: Record<string, VariationValue>): VariationRow {
	return {
		type: 'variation',
		label,
		values: new Map(Object.entries(values))
	};
}

// =============================================================================
// Tests
// =============================================================================

describe('VariationTable Component', () => {
	// ===========================================================================
	// Basic Structure Tests
	// ===========================================================================

	describe('Basic Structure', () => {
		it('should render a table element', async () => {
			const node = createBasicTable();
			renderTable({ node });

			const table = page.getByRole('table');
			await expect.element(table).toBeInTheDocument();
		});

		it('should render container with variation-table class', async () => {
			const node = createBasicTable();
			renderTable({ node });

			// Use document.querySelector for CSS class selection
			const container = document.querySelector('.variation-table');
			expect(container).not.toBeNull();
		});

		it('should render header row', async () => {
			const node = createBasicTable();
			renderTable({ node });

			const header = document.querySelector('.vt-header');
			expect(header).not.toBeNull();
		});

		it('should render domain cells in header', async () => {
			const node = createBasicTable();
			renderTable({ node });

			const domainCells = document.querySelectorAll('.vt-domain-cell');
			expect(domainCells.length).toBe(3); // -inf, 0, +inf
		});

		it('should apply custom class to container', async () => {
			const node = createBasicTable();
			renderTable({ node, class: 'my-custom-class' });

			const container = document.querySelector('.variation-table.my-custom-class');
			expect(container).not.toBeNull();
		});
	});

	// ===========================================================================
	// Sign Row Tests
	// ===========================================================================

	describe('Sign Rows', () => {
		it('should render sign row', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'-\\infty,0': { type: 'sign', value: '+' },
					'0,+\\infty': { type: 'sign', value: '-' }
				})
			);

			renderTable({ node });

			const signRows = document.querySelectorAll('.vt-sign-row');
			expect(signRows.length).toBe(1);
		});

		it('should render plus sign with correct class', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'-\\infty,0': { type: 'sign', value: '+' }
				})
			);

			renderTable({ node });

			const plusSigns = document.querySelectorAll('.vt-sign-plus');
			expect(plusSigns.length).toBeGreaterThan(0);
			expect(plusSigns[0]?.textContent).toBe('+');
		});

		it('should render minus sign with correct class', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'0,+\\infty': { type: 'sign', value: '-' }
				})
			);

			renderTable({ node });

			const minusSigns = document.querySelectorAll('.vt-sign-minus');
			expect(minusSigns.length).toBeGreaterThan(0);
			expect(minusSigns[0]?.textContent).toBe('-');
		});

		it('should render zero marker', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'0': { type: 'marker', marker: 'zero' }
				})
			);

			renderTable({ node });

			const zeroMarkers = document.querySelectorAll('.vt-zero');
			expect(zeroMarkers.length).toBe(1);
			expect(zeroMarkers[0]?.textContent).toBe('0');
		});

		it('should render double bar for asymptote marker', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'0': { type: 'marker', marker: 'asymptote' }
				})
			);

			renderTable({ node });

			const doubleBars = document.querySelectorAll('.vt-double-bar');
			expect(doubleBars.length).toBe(1);
			expect(doubleBars[0]?.textContent).toBe('||');
		});

		it('should render hatch for forbidden marker', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'0': { type: 'marker', marker: 'forbidden' }
				})
			);

			renderTable({ node });

			const hatches = document.querySelectorAll('.vt-hatch');
			expect(hatches.length).toBeGreaterThan(0);
		});

		it('should render discontinuity marker', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'0': { type: 'marker', marker: 'discontinuity' }
				})
			);

			renderTable({ node });

			const discontinuityMarkers = document.querySelectorAll('.vt-discontinuity');
			expect(discontinuityMarkers.length).toBe(1);
			expect(discontinuityMarkers[0]?.textContent).toBe('d');
		});
	});

	// ===========================================================================
	// Variation Row Tests
	// ===========================================================================

	describe('Variation Rows', () => {
		it('should render variation row', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'-\\infty': { expression: '-\\infty', position: 'bottom' },
					'0': { expression: '3', position: 'top' },
					'+\\infty': { expression: '-\\infty', position: 'bottom' }
				})
			);

			renderTable({ node });

			const variationRows = document.querySelectorAll('.vt-variation-row');
			expect(variationRows.length).toBe(1);
		});

		it('should render value with top position class', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'0': { expression: '3', position: 'top' }
				})
			);

			renderTable({ node });

			const topValues = document.querySelectorAll('.vt-pos-top');
			expect(topValues.length).toBeGreaterThan(0);
		});

		it('should render value with bottom position class', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'-\\infty': { expression: '-\\infty', position: 'bottom' }
				})
			);

			renderTable({ node });

			const bottomValues = document.querySelectorAll('.vt-pos-bottom');
			expect(bottomValues.length).toBeGreaterThan(0);
		});

		it('should render value with center position class', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'0': { expression: '0', position: 'center' }
				})
			);

			renderTable({ node });

			const centerValues = document.querySelectorAll('.vt-pos-center');
			expect(centerValues.length).toBeGreaterThan(0);
		});
	});

	// ===========================================================================
	// Arrow Tests
	// ===========================================================================

	describe('Arrows', () => {
		it('should render ascending arrow when value goes from bottom to top', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'-\\infty': { expression: '-\\infty', position: 'bottom' },
					'0': { expression: '3', position: 'top' }
				})
			);

			renderTable({ node });

			const upArrows = document.querySelectorAll('.vt-arrow-up');
			expect(upArrows.length).toBe(1);
		});

		it('should render descending arrow when value goes from top to bottom', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'0': { expression: '3', position: 'top' },
					'+\\infty': { expression: '-\\infty', position: 'bottom' }
				})
			);

			renderTable({ node });

			const downArrows = document.querySelectorAll('.vt-arrow-down');
			expect(downArrows.length).toBe(1);
		});

		it('should render SVG arrows', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'-\\infty': { expression: '-\\infty', position: 'bottom' },
					'0': { expression: '3', position: 'top' }
				})
			);

			renderTable({ node });

			const svgArrows = document.querySelectorAll('.vt-arrow svg, svg.vt-arrow');
			expect(svgArrows.length).toBeGreaterThan(0);
		});

		it('should not render arrow when both values are at same level', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'-\\infty': { expression: '1', position: 'center' },
					'0': { expression: '1', position: 'center' }
				})
			);

			renderTable({ node });

			const upArrows = document.querySelectorAll('.vt-arrow-up');
			const downArrows = document.querySelectorAll('.vt-arrow-down');
			expect(upArrows.length + downArrows.length).toBe(0);
		});
	});

	// ===========================================================================
	// Asymptote Tests
	// ===========================================================================

	describe('Asymptotes with Limits', () => {
		it('should render asymptote with limits', async () => {
			const node: VariationTableNode = {
				type: 'variation-table',
				variable: 'x',
				domain: [{ expression: '-\\infty' }, { expression: '0' }, { expression: '+\\infty' }],
				rows: [
					createVariationRow('f(x)', {
						'0': {
							expression: '',
							position: 'center',
							marker: 'asymptote',
							limits: [
								{ expression: '-\\infty', position: 'bottom' },
								{ expression: '+\\infty', position: 'top' }
							]
						}
					})
				]
			};

			renderTable({ node });

			const asymptoteLimits = document.querySelectorAll('.vt-asymptote-limits');
			expect(asymptoteLimits.length).toBe(1);

			const asymptoteBar = document.querySelectorAll('.vt-asymptote-bar');
			expect(asymptoteBar.length).toBe(1);
		});

		it('should not render arrow through asymptote', async () => {
			const node: VariationTableNode = {
				type: 'variation-table',
				variable: 'x',
				domain: [{ expression: '-\\infty' }, { expression: '0' }, { expression: '+\\infty' }],
				rows: [
					createVariationRow('f(x)', {
						'-\\infty': { expression: '0', position: 'center' },
						'0': {
							expression: '',
							position: 'center',
							marker: 'asymptote',
							limits: [
								{ expression: '-\\infty', position: 'bottom' },
								{ expression: '+\\infty', position: 'top' }
							]
						},
						'+\\infty': { expression: '0', position: 'center' }
					})
				]
			};

			renderTable({ node });

			// Arrows should be replaced with hatches near asymptotes
			const upArrows = document.querySelectorAll('.vt-arrow-up');
			const downArrows = document.querySelectorAll('.vt-arrow-down');
			expect(upArrows.length + downArrows.length).toBe(0);
		});
	});

	// ===========================================================================
	// Forbidden Zone Tests
	// ===========================================================================

	describe('Forbidden Zones', () => {
		it('should render forbidden zone with hatch', async () => {
			const node: VariationTableNode = {
				type: 'variation-table',
				variable: 'x',
				domain: [{ expression: '-\\infty' }, { expression: '0' }, { expression: '+\\infty' }],
				rows: [
					createVariationRow('f(x)', {
						'0': {
							expression: '',
							position: 'center',
							marker: 'forbidden'
						}
					})
				]
			};

			renderTable({ node });

			const forbiddenCells = document.querySelectorAll('.vt-forbidden-cell');
			expect(forbiddenCells.length).toBe(1);

			const hatches = document.querySelectorAll('.vt-hatch');
			expect(hatches.length).toBeGreaterThan(0);
		});
	});

	// ===========================================================================
	// Open Bound Tests
	// ===========================================================================

	describe('Open Bounds', () => {
		it('should mark open bounds with appropriate class', async () => {
			const node: VariationTableNode = {
				type: 'variation-table',
				variable: 'x',
				domain: [
					{ expression: '0', open: true },
					{ expression: '1' },
					{ expression: '2', open: true }
				],
				rows: []
			};

			renderTable({ node });

			const openBounds = document.querySelectorAll('.vt-open');
			expect(openBounds.length).toBe(2);
		});
	});

	// ===========================================================================
	// Multiple Rows Tests
	// ===========================================================================

	describe('Multiple Rows', () => {
		it('should render both sign and variation rows', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'-\\infty,0': { type: 'sign', value: '+' },
					'0': { type: 'marker', marker: 'zero' },
					'0,+\\infty': { type: 'sign', value: '-' }
				})
			);
			node.rows.push(
				createVariationRow('f(x)', {
					'-\\infty': { expression: '-\\infty', position: 'bottom' },
					'0': { expression: '3', position: 'top' },
					'+\\infty': { expression: '-\\infty', position: 'bottom' }
				})
			);

			renderTable({ node });

			const signRows = document.querySelectorAll('.vt-sign-row');
			const variationRows = document.querySelectorAll('.vt-variation-row');

			expect(signRows.length).toBe(1);
			expect(variationRows.length).toBe(1);
		});

		it('should render multiple sign rows', async () => {
			const node = createBasicTable();
			node.rows.push(
				createSignRow("f'(x)", {
					'-\\infty,0': { type: 'sign', value: '+' }
				})
			);
			node.rows.push(
				createSignRow("f''(x)", {
					'-\\infty,0': { type: 'sign', value: '-' }
				})
			);

			renderTable({ node });

			const signRows = document.querySelectorAll('.vt-sign-row');
			expect(signRows.length).toBe(2);
		});
	});

	// ===========================================================================
	// Limit Position Tests
	// ===========================================================================

	describe('Limit Positions', () => {
		it('should treat limit-top same as top for arrow direction', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'-\\infty': { expression: '0', position: 'bottom' },
					'0': { expression: '+\\infty', position: 'limit-top' }
				})
			);

			renderTable({ node });

			const upArrows = document.querySelectorAll('.vt-arrow-up');
			expect(upArrows.length).toBe(1);
		});

		it('should treat limit-bottom same as bottom for arrow direction', async () => {
			const node = createBasicTable();
			node.rows.push(
				createVariationRow('f(x)', {
					'-\\infty': { expression: '0', position: 'top' },
					'0': { expression: '-\\infty', position: 'limit-bottom' }
				})
			);

			renderTable({ node });

			const downArrows = document.querySelectorAll('.vt-arrow-down');
			expect(downArrows.length).toBe(1);
		});
	});
});
