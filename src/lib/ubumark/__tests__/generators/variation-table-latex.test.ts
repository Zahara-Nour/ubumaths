/**
 * Variation Table LaTeX Generator Tests
 * ======================================
 *
 * Comprehensive tests for the variation table LaTeX generator.
 *
 * @module ubumark/__tests__/generators/variation-table-latex.test
 */

import { describe, it, expect } from 'vitest';
import { generateVariationTableLatex } from '../../generators/variation-table-latex';
import type { VariationTableNode, SignRow, DomainPoint } from '../../types/variation-table';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a basic variation table node for testing
 */
function createBasicNode(): VariationTableNode {
	const domain: DomainPoint[] = [
		{ expression: '-inf' },
		{ expression: '0' },
		{ expression: '+inf' }
	];

	const signRow: SignRow = {
		type: 'sign',
		label: "f'(x)",
		values: new Map([
			['-inf,0', { type: 'sign', value: '+' }],
			['0', { type: 'marker', marker: 'zero' }],
			['0,+inf', { type: 'sign', value: '-' }]
		])
	};

	return {
		type: 'variation-table',
		variable: 'x',
		domain,
		rows: [signRow]
	};
}

// ============================================================================
// BASIC STRUCTURE TESTS
// ============================================================================

describe('generateVariationTableLatex - Basic Structure', () => {
	it('should generate tikzpicture environment', () => {
		const node = createBasicNode();
		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('\\begin{tikzpicture}');
		expect(latex).toContain('\\end{tikzpicture}');
	});

	it('should generate tkzTabInit with header and domain', () => {
		const node = createBasicNode();
		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('\\tkzTabInit');
		expect(latex).toContain('$x$/1');
		expect(latex).toContain("$f'(x)$/1");
		expect(latex).toContain('$-\\infty$');
		expect(latex).toContain('$0$');
		expect(latex).toContain('$+\\infty$');
	});

	it('should use default options (lgt=3, espcl=1.5)', () => {
		const node = createBasicNode();
		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('[lgt=3,espcl=1.5]');
	});

	it('should use custom options when provided', () => {
		const node = createBasicNode();
		const latex = generateVariationTableLatex(node, {
			lineHeight: 4,
			columnSpacing: 2
		});

		expect(latex).toContain('[lgt=4,espcl=2]');
	});
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('generateVariationTableLatex - Error Handling', () => {
	it('should return error comment for table with no rows', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: []
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('% Error:');
		expect(latex).toContain('no rows');
	});

	it('should return error comment for table with no domain', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map()
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('% Error:');
		expect(latex).toContain('no domain');
	});
});

// ============================================================================
// SIGN LINE TESTS
// ============================================================================

describe('generateVariationTableLatex - Sign Lines', () => {
	it('should generate simple sign line with +/- values', () => {
		const node = createBasicNode();
		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('\\tkzTabLine{,+,z,-}');
	});

	it('should convert zero marker to z', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '+' }],
						['0', { type: 'marker', marker: 'zero' }],
						['0,+inf', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('z');
	});

	it('should convert asymptote marker to d (double barre tkz-tab)', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '+' }],
						['0', { type: 'marker', marker: 'asymptote' }],
						['0,+inf', { type: 'sign', value: '+' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		// `||` s'imprimait en texte dans la ligne de signes ; `d` est la double barre
		expect(latex).toContain('\\tkzTabLine{,+,d,+}');
	});

	it('should convert forbidden marker to h', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '2' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,2', { type: 'sign', value: '+' }],
						['2', { type: 'marker', marker: 'forbidden' }],
						['2,+inf', { type: 'sign', value: '+' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('h');
	});

	it('should convert discontinuity marker to t', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '1' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,1', { type: 'sign', value: '+' }],
						['1', { type: 'marker', marker: 'discontinuity' }],
						['1,+inf', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('t');
	});

	it('garde une colonne vide pour un point intérieur sans marqueur (pas de décalage)', () => {
		// Le point 3 ne sert qu'à la ligne de variation
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [
				{ expression: '-inf' },
				{ expression: '1' },
				{ expression: '3' },
				{ expression: '5' },
				{ expression: '+inf' }
			],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,1', { type: 'sign', value: '-' }],
						['1', { type: 'marker', marker: 'zero' }],
						['1,3', { type: 'sign', value: '+' }],
						['3,5', { type: 'sign', value: '+' }],
						['5', { type: 'marker', marker: 'zero' }],
						['5,+inf', { type: 'sign', value: '-' }]
					])
				}
			]
		};
		expect(generateVariationTableLatex(node)).toContain('\\tkzTabLine{,-,z,+,,+,z,-}');
	});

	it('met le marqueur du premier point en première entrée, sans entrée en trop', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['0', { type: 'marker', marker: 'asymptote' }],
						['0,1', { type: 'sign', value: '-' }],
						['1', { type: 'marker', marker: 'zero' }],
						['1,+inf', { type: 'sign', value: '+' }]
					])
				}
			]
		};
		expect(generateVariationTableLatex(node)).toMatch(/\\tkzTabLine\{[^,]+,-,z,\+\}/);
	});

	it('should handle empty intervals', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [
				{ expression: '-inf' },
				{ expression: '0' },
				{ expression: '1' },
				{ expression: '+inf' }
			],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '+' }],
						['0', { type: 'marker', marker: 'zero' }]
						// 0,1 and 1,+inf are empty
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		// Intervalle 0,1 vide, point 1 sans marqueur (entrée vide), intervalle 1,+inf vide
		expect(latex).toContain('\\tkzTabLine{,+,z,,,}');
	});
});

// ============================================================================
// VARIATION LINE TESTS
// ============================================================================

describe('generateVariationTableLatex - Variation Lines', () => {
	it('should generate variation line with direction and values', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '-inf', position: 'bottom' }],
						['0', { expression: '3', position: 'top' }],
						['+inf', { expression: '-inf', position: 'bottom' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		// Chaque entrée porte sa hauteur, la première comprise (tkz-tab l'exige)
		expect(latex).toContain('\\tkzTabVar{-/$-\\infty$,+/$3$,-/$-\\infty$}');
	});

	it('should determine direction from position changes', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }, { expression: '2' }, { expression: '3' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '0', position: 'bottom' }],
						['1', { expression: '5', position: 'top' }],
						['2', { expression: '2', position: 'center' }],
						['3', { expression: '10', position: 'top' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		// bottom -> top = +, top -> center = -, center -> top = +
		expect(latex).toContain('+/$5$');
		expect(latex).toContain('-/$2$');
		expect(latex).toContain('+/$10$');
	});

	it('préfixe la première entrée selon sa hauteur', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '1', position: 'top' }],
						['1', { expression: '0', position: 'bottom' }]
					])
				}
			]
		};
		expect(generateVariationTableLatex(node)).toContain('\\tkzTabVar{+/$1$,-/$0$}');
	});

	it('écrit une borne sans valeur « +/ » (position seule), pas « $$ »', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '3' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([['3', { expression: '-11', position: 'bottom' }]])
				}
			]
		};
		expect(generateVariationTableLatex(node)).toContain('\\tkzTabVar{+/ ,-/$-11$,+/ }');
	});

	it('écrit une asymptote à une limite en fin de domaine « -D/ » (valeur à gauche)', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '1' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '0', position: 'top' }],
						[
							'1',
							{ expression: '-inf', position: 'bottom', marker: 'asymptote', limitSide: 'left' }
						]
					])
				}
			]
		};
		expect(generateVariationTableLatex(node)).toContain('\\tkzTabVar{+/$0$,-D/$-\\infty$}');
	});

	it('écrit une asymptote à une limite en début de domaine « D+/ » (valeur à droite)', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '+inf', position: 'top', marker: 'asymptote', limitSide: 'right' }],
						['1', { expression: '1', position: 'bottom' }],
						['+inf', { expression: '+inf', position: 'top' }]
					])
				}
			]
		};
		expect(generateVariationTableLatex(node)).toContain(
			'\\tkzTabVar{D+/$+\\infty$,-/$1$,+/$+\\infty$}'
		);
	});

	it('écrit « R/ » pour un point intermédiaire sans valeur (une entrée par colonne)', () => {
		// Domaine partagé avec une ligne de signes : 1 et 5 n'ont de sens que pour les signes
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [
				{ expression: '-inf' },
				{ expression: '1' },
				{ expression: '3' },
				{ expression: '5' },
				{ expression: '+inf' }
			],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([['3', { expression: '8', position: 'top' }]])
				}
			]
		};
		expect(generateVariationTableLatex(node)).toContain('\\tkzTabVar{-/ ,R/,+/$8$,R/,-/ }');
	});

	it('protège par des accolades une valeur qui contient « / » (séparateur tkz-tab)', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1' }, { expression: '2' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '1', position: 'top' }],
						['1', { expression: 'e/2', position: 'bottom' }],
						['2', { expression: '3', position: 'top' }]
					])
				}
			]
		};
		expect(generateVariationTableLatex(node)).toContain('\\tkzTabVar{+/$1$,-/{$e/2$},+/$3$}');
	});

	it('should format infinity values correctly', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '-inf', position: 'bottom' }],
						['+inf', { expression: '+inf', position: 'top' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$-\\infty$');
		expect(latex).toContain('$+\\infty$');
	});

	it('should handle asymptotes without limits as ||', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '0', position: 'center' }],
						['0', { expression: '', position: 'center', marker: 'asymptote' }],
						['+inf', { expression: '0', position: 'center' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('||');
	});

	it('should handle asymptotes with different limits (-D+/)', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '0', position: 'center' }],
						[
							'0',
							{
								expression: '',
								position: 'center',
								marker: 'asymptote',
								limits: [
									{ expression: '-inf', position: 'bottom' },
									{ expression: '+inf', position: 'top' }
								]
							}
						],
						['+inf', { expression: '0', position: 'center' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		// La double barre porte déjà ses hauteurs : aucun préfixe devant
		expect(latex).toContain(',-D+/$-\\infty$/$+\\infty$,');
	});

	it('should handle asymptotes with inverted limits (+D-/)', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '0', position: 'center' }],
						[
							'0',
							{
								expression: '',
								position: 'center',
								marker: 'asymptote',
								limits: [
									{ expression: '+inf', position: 'top' },
									{ expression: '-inf', position: 'bottom' }
								]
							}
						],
						['+inf', { expression: '0', position: 'center' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain(',+D-/$+\\infty$/$-\\infty$,');
	});
});

// ============================================================================
// DOMAIN TESTS
// ============================================================================

describe('generateVariationTableLatex - Domain', () => {
	it('should format infinity correctly', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([['-inf,+inf', { type: 'sign', value: '+' }]])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$-\\infty$');
		expect(latex).toContain('$+\\infty$');
	});

	it('should handle open bounds with inverted brackets ]a', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0', open: true }, { expression: '2' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([['0,2', { type: 'sign', value: '+' }]])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$]0$');
	});

	it('should handle open bounds with inverted brackets b[', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '2', open: true }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([['0,2', { type: 'sign', value: '+' }]])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$2[$');
	});

	it('should handle open bounds in middle points ]a[', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '1', open: true }, { expression: '2' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['0,1', { type: 'sign', value: '+' }],
						['1,2', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$]1[$');
	});

	it('should preserve LaTeX commands in domain points', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '\\frac{\\pi}{2}' }, { expression: '\\pi' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['0,\\frac{\\pi}{2}', { type: 'sign', value: '+' }],
						['\\frac{\\pi}{2},\\pi', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$\\frac{\\pi}{2}$');
		expect(latex).toContain('$\\pi$');
	});
});

// ============================================================================
// HEADER TESTS
// ============================================================================

describe('generateVariationTableLatex - Header', () => {
	it('should generate header with variable and row labels', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'sign',
					label: "f'(x)",
					values: new Map()
				},
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map()
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$x$/1');
		expect(latex).toContain("$f'(x)$/1");
		expect(latex).toContain('$f(x)$/2');
	});

	it('should assign height 1 to sign rows', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map()
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$f(x)$/1');
	});

	it('should assign height 2 to variation rows', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map()
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$f(x)$/2');
	});

	it('should wrap math-like labels in $ signs', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 't',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'sign',
					label: "g'(t)",
					values: new Map()
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain("$g'(t)$/1");
	});

	it('should preserve existing $ signs in labels', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }],
			rows: [
				{
					type: 'sign',
					label: '$f(x)$',
					values: new Map()
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$f(x)$/1');
	});
});

// ============================================================================
// COMPLEX TABLES
// ============================================================================

describe('generateVariationTableLatex - Complex Tables', () => {
	it('should generate complete table with sign and variation rows', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [
				{ expression: '-inf' },
				{ expression: '-1' },
				{ expression: '0' },
				{ expression: '1' },
				{ expression: '+inf' }
			],
			rows: [
				{
					type: 'sign',
					label: "f'(x)",
					values: new Map([
						['-inf,-1', { type: 'sign', value: '+' }],
						['-1', { type: 'marker', marker: 'zero' }],
						['-1,0', { type: 'sign', value: '-' }],
						['0', { type: 'marker', marker: 'zero' }],
						['0,1', { type: 'sign', value: '+' }],
						['1', { type: 'marker', marker: 'zero' }],
						['1,+inf', { type: 'sign', value: '-' }]
					])
				},
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['-inf', { expression: '-inf', position: 'bottom' }],
						['-1', { expression: '3', position: 'top' }],
						['0', { expression: '0', position: 'bottom' }],
						['1', { expression: '2', position: 'top' }],
						['+inf', { expression: '-inf', position: 'bottom' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		// Verify structure
		expect(latex).toContain('\\begin{tikzpicture}');
		expect(latex).toContain('\\end{tikzpicture}');

		// Verify header
		expect(latex).toContain('$x$/1');
		expect(latex).toContain("$f'(x)$/1");
		expect(latex).toContain('$f(x)$/2');

		// Verify domain
		expect(latex).toContain('$-\\infty$');
		expect(latex).toContain('$-1$');
		expect(latex).toContain('$0$');
		expect(latex).toContain('$1$');
		expect(latex).toContain('$+\\infty$');

		// Verify sign line
		expect(latex).toContain('\\tkzTabLine{,+,z,-,z,+,z,-}');

		// Verify variation line
		expect(latex).toContain('\\tkzTabVar{-/$-\\infty$,+/$3$,-/$0$,+/$2$,-/$-\\infty$}');
	});

	it('should handle multiple sign rows', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '-inf' }, { expression: '0' }, { expression: '+inf' }],
			rows: [
				{
					type: 'sign',
					label: 'f(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '-' }],
						['0', { type: 'marker', marker: 'zero' }],
						['0,+inf', { type: 'sign', value: '+' }]
					])
				},
				{
					type: 'sign',
					label: 'g(x)',
					values: new Map([
						['-inf,0', { type: 'sign', value: '+' }],
						['0', { type: 'marker', marker: 'zero' }],
						['0,+inf', { type: 'sign', value: '-' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('\\tkzTabLine{,-,z,+}');
		expect(latex).toContain('\\tkzTabLine{,+,z,-}');
	});

	it('should preserve complex math expressions', () => {
		const node: VariationTableNode = {
			type: 'variation-table',
			variable: 'x',
			domain: [{ expression: '0' }, { expression: '\\frac{\\pi}{2}' }, { expression: '\\pi' }],
			rows: [
				{
					type: 'variation',
					label: 'f(x)',
					values: new Map([
						['0', { expression: '0', position: 'bottom' }],
						['\\frac{\\pi}{2}', { expression: '\\sqrt{2}', position: 'top' }],
						['\\pi', { expression: '0', position: 'bottom' }]
					])
				}
			]
		};

		const latex = generateVariationTableLatex(node);

		expect(latex).toContain('$\\frac{\\pi}{2}$');
		expect(latex).toContain('$\\sqrt{2}$');
	});
});

// ============================================================================
// INTEGRATION WITH LATEX GENERATOR
// ============================================================================

describe('generateVariationTableLatex - Integration', () => {
	it('should work with default export options', () => {
		const node = createBasicNode();
		const latex = generateVariationTableLatex(node);

		expect(latex).toBeTruthy();
		expect(latex).toContain('tikzpicture');
	});

	it('should be embeddable in full LaTeX document', () => {
		const node = createBasicNode();
		const tableLatex = generateVariationTableLatex(node);

		const fullDoc = `\\documentclass{article}
\\usepackage{tkz-tab}
\\begin{document}

${tableLatex}

\\end{document}`;

		expect(fullDoc).toContain('\\begin{document}');
		expect(fullDoc).toContain('\\begin{tikzpicture}');
		expect(fullDoc).toContain('\\end{document}');
	});
});
