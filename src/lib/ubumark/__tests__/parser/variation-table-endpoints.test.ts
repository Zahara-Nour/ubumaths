/**
 * Bornes sans valeur d'une ligne de variation
 * ===========================================
 *
 * En 1re, un tableau de variations d'un trinôme ne porte pas de limites :
 * « -inf » et « +inf » n'ont pas de valeur. Sans elles, le PDF plantait
 * (vartable : « array is empty »), l'écran ne dessinait aucune flèche et
 * l'export LaTeX produisait un \tkzTabVar incomplet.
 */
import { describe, it, expect } from 'vitest';
import { withImplicitEndpoints } from '$lib/ubumark/parser/variation-table-parser';
import { parseMarkdown } from '$lib/ubumark';
import { generateVariationTableTypst } from '$lib/ubumark/generators/variation-table-typst';
import { generateVariationTableLatex } from '$lib/ubumark/generators/variation-table-latex';
import type {
	DomainPoint,
	VariationRow,
	VariationTableNode,
	VariationValue
} from '$lib/ubumark/types/variation-table';

const domain: DomainPoint[] = [{ expression: '-inf' }, { expression: '3' }, { expression: '+inf' }];
const row = (values: Record<string, VariationValue>): VariationRow => ({
	type: 'variation',
	label: 'f(x)',
	values: new Map(Object.entries(values))
});

const TABLE_MIN =
	'```variation\nvariable: x\ndomain: -inf, 3, +inf\n\nvariation: f(x)\n  3: -11, bottom\n```\n';

function parseTable(md: string): VariationTableNode {
	const ast = parseMarkdown(md) as unknown as { children: VariationTableNode[] };
	return ast.children[0];
}

describe('withImplicitEndpoints', () => {
	it('place les bornes en haut autour d’un minimum, sans valeur', () => {
		const result = withImplicitEndpoints(
			row({ '3': { expression: '-11', position: 'bottom' } }),
			domain
		);
		expect(result.values.get('-inf')).toEqual({ expression: '', position: 'top' });
		expect(result.values.get('+inf')).toEqual({ expression: '', position: 'top' });
	});

	it('place les bornes en bas autour d’un maximum', () => {
		const result = withImplicitEndpoints(
			row({ '3': { expression: '8', position: 'top' } }),
			domain
		);
		expect(result.values.get('-inf')?.position).toBe('bottom');
		expect(result.values.get('+inf')?.position).toBe('bottom');
	});

	it('déduit la borne du voisin le plus proche qui a une valeur', () => {
		const d: DomainPoint[] = [
			{ expression: '-inf' },
			{ expression: '1' },
			{ expression: '3' },
			{ expression: '+inf' }
		];
		const result = withImplicitEndpoints(row({ '3': { expression: '5', position: 'top' } }), d);
		expect(result.values.get('-inf')?.position).toBe('bottom');
		expect(result.values.has('1')).toBe(false); // un point intermédiaire reste sans valeur
	});

	it('laisse intactes les bornes écrites par l’auteur', () => {
		const explicit = { expression: '-\\infty', position: 'bottom' } as const;
		const result = withImplicitEndpoints(
			row({ '-inf': explicit, '3': { expression: '-11', position: 'bottom' } }),
			domain
		);
		expect(result.values.get('-inf')).toEqual(explicit);
	});

	it('ne devine rien à côté d’une valeur centrée ou d’une asymptote', () => {
		const centered = withImplicitEndpoints(
			row({ '3': { expression: '0', position: 'center' } }),
			domain
		);
		expect(centered.values.has('-inf')).toBe(false);
		const asymptote = withImplicitEndpoints(
			row({ '3': { expression: '', position: 'center', marker: 'asymptote' } }),
			domain
		);
		expect(asymptote.values.has('+inf')).toBe(false);
	});

	it('ne modifie pas la ligne d’origine', () => {
		const original = row({ '3': { expression: '-11', position: 'bottom' } });
		withImplicitEndpoints(original, domain);
		expect(original.values.has('-inf')).toBe(false);
	});
});

describe('Rendus d’un tableau sans valeur aux bornes', () => {
	it('PDF (Typst) : aucune colonne de borne vide', () => {
		const typst = generateVariationTableTypst(parseTable(TABLE_MIN));
		// `()` en première ou dernière colonne fait planter vartable
		expect(typst).toContain('((top, $$), (bottom, $-11$), (top, $$))');
	});

	it('export LaTeX : autant d’entrées \\tkzTabVar que de points du domaine', () => {
		const latex = generateVariationTableLatex(parseTable(TABLE_MIN));
		const line = latex.match(/\\tkzTabVar\{([^\n]*)\}/)?.[1] ?? '';
		expect(line.split(',')).toHaveLength(3);
	});
});
