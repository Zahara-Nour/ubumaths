/**
 * Structure d'une expression — longueurs de segments (lot 4 du chantier
 * « longueurs de segments », `docs/archive/wip/longueurs-segments-progress.md`)
 * =====================================================================
 *
 * En mode `capitalPairs: 'length'`, `AB` est une longueur : une feuille
 * atomique (comme une lettre), lue « la longueur AB ». Un nom de figure (`ABC`)
 * n'a pas de lecture : `structureFromLatex` rend le message de refus (Q-A).
 * En mode `'product'` (défaut du parseur), rien ne change.
 *
 * Toutes les entrées sont PARSÉES (invariant 4 du module), coefficients ≠ 1.
 */
import { describe, expect, it } from 'vitest';
import { toLatex } from '../../latex-generator';
import { parseLatexSafe } from '../../parser';
import {
	parenthesesAdvice,
	readingOf,
	readingPlainText,
	stripMarkers,
	structureFromLatex,
	type ExpressionStructure,
	type ReadingSegment
} from '..';

// Fonctions
function structureOf(latex: string, capitalPairs: 'length' | 'product'): ExpressionStructure {
	const result = structureFromLatex(latex, { capitalPairs });
	if (result.status !== 'ok') throw new Error(`${latex} : ${result.status}`);
	return result.structure;
}

function readLength(latex: string): string {
	return readingPlainText(readingOf(structureOf(latex, 'length')));
}

function readProduct(latex: string): string {
	return readingPlainText(readingOf(structureOf(latex, 'product')));
}

function wordKeys(segments: readonly ReadingSegment[]): string[] {
	return segments.flatMap((s) => (s.kind === 'word' ? [s.key] : []));
}

describe('lecture des longueurs (spécification, colonne « Lit »)', () => {
	it.each([
		['AB', 'la longueur AB'],
		['AB^2', 'le carré de la longueur AB'],
		['2AB', 'le produit de 2 par la longueur AB'],
		['AB\\times CD', 'le produit de la longueur AB par la longueur CD'],
		['\\frac{AB}{CD}', 'le quotient de la longueur AB par la longueur CD'],
		['AB+BC', 'la somme de la longueur AB et de la longueur BC'],
		['EF', 'la longueur EF']
	])('%s → %s', (latex, expected) => {
		expect(readLength(latex)).toBe(expected);
	});

	it('coefficient ≠ 1 : 3AB^2 → le produit de 3 par le carré de la longueur AB', () => {
		expect(readLength('3AB^2')).toBe('le produit de 3 par le carré de la longueur AB');
	});

	it('Pythagore : accord au féminin (« égal » pour un carré, « égale » pour une longueur)', () => {
		expect(readLength('AB^2=AC^2+BC^2')).toBe(
			'le carré de la longueur AB est égal à la somme du carré de la longueur AC et du carré de la longueur BC'
		);
		expect(readLength('AB=5')).toBe('la longueur AB est égale à 5');
	});

	it('racine, parenthèses, opposé, autre puissance', () => {
		expect(readLength('\\sqrt{AB}')).toBe('la racine carrée de la longueur AB');
		expect(readLength('(AB)^2')).toBe('le carré de la longueur AB');
		expect(readLength('-AB')).toBe("l'opposé de la longueur AB");
		expect(readLength('AB^4')).toBe('la puissance 4 de la longueur AB');
	});

	it('« par » emboîtés (Q20) : le quotient dont le numérateur est A et le dénominateur B', () => {
		expect(readLength('\\frac{2AB}{3CD}')).toBe(
			'le quotient dont le numérateur est le produit de 2 par la longueur AB et le dénominateur le produit de 3 par la longueur CD'
		);
	});

	it('le mot « longueur » est un mot du dictionnaire (clé longueur)', () => {
		const reading = readingOf(structureOf('2AB', 'length'));
		expect(wordKeys(reading.segments)).toEqual(['produit', 'longueur']);
	});

	it('points primés ou indicés : écrits comme le parseur les relit', () => {
		expect(readLength("A'B'")).toBe("la longueur A'B'");
		expect(readLength('A^{\\prime}B^{\\prime}')).toBe("la longueur A'B'");
		expect(readLength('A_1B_1')).toBe('la longueur A_{1}B_{1}');
	});
});

describe('une longueur est une feuille atomique', () => {
	it('AB : un seul nœud, sans enfant, de genre « length »', () => {
		const structure = structureOf('AB', 'length');
		expect(structure.nodes).toHaveLength(1);
		expect(structure.nodes[0].kind).toBe('length');
		expect(structure.nodes[0].children).toEqual([]);
	});

	it('2AB^2 : le facteur est le carré, la base est la longueur entière', () => {
		const structure = structureOf('2AB^2', 'length');
		const lengths = structure.nodes.filter((n) => n.kind === 'length');
		expect(lengths).toHaveLength(1);
		expect(lengths[0].role).toBe('base');
		expect(stripMarkers(lengths[0].latex)).toBe('AB');
	});

	it('tous les segments de la lecture d’une longueur désignent la longueur (sens inverse)', () => {
		const structure = structureOf('3AB', 'length');
		const length = structure.nodes.find((n) => n.kind === 'length');
		if (!length) throw new Error('longueur attendue');
		const reading = readingOf(structure, length.id);
		expect(readingPlainText(reading)).toBe('la longueur AB');
		expect(new Set(reading.segments.map((s) => s.node))).toEqual(new Set([length.id]));
	});

	it.each(['AB', '2AB^2', '\\frac{AB}{CD}', "A'B'+A_1B_1", 'AB^2=AC^2+BC^2', '-AB+3'])(
		'%s : rendu identique à toLatex (la formule ne bouge pas au survol)',
		(latex) => {
			const ast = parseLatexSafe(latex, { capitalPairs: 'length' }).ast;
			if (!ast) throw new Error(`${latex} : pas d'AST`);
			const structure = structureOf(latex, 'length');
			const unbrace = (s: string) => s.replace(/([\^_])\{([^{}\\]|\\[a-zA-Z]+)\}/g, '$1$2');
			expect(unbrace(stripMarkers(structure.latex))).toBe(unbrace(toLatex(ast)));
		}
	);

	it('conseil de parenthèses : la longueur est un bloc, comme une lettre', () => {
		const advice = parenthesesAdvice(structureOf('-AB+3', 'length'));
		expect(advice?.reason).toBe('leading-minus');
		expect(advice?.reason === 'leading-minus' && advice.example).toBe('\\left( -AB \\right) + 3');
	});
});

describe('nom de figure : pas de lecture, le message (Q-A)', () => {
	it('ABC : refus avec le vrai nom', () => {
		expect(structureFromLatex('ABC', { capitalPairs: 'length' })).toEqual({
			status: 'figureName',
			message:
				'ABC n’est pas une longueur : une longueur se nomme avec deux points (AB). Pour un produit, écris A×B×C.'
		});
	});

	it('2EFGH+1 : refus nommant EFGH', () => {
		const result = structureFromLatex('2EFGH+1', { capitalPairs: 'length' });
		expect(result.status).toBe('figureName');
		expect(result.status === 'figureName' && result.message).toBe(
			'EFGH n’est pas une longueur : une longueur se nomme avec deux points (EF). Pour un produit, écris E×F×G×H.'
		);
	});
});

describe('mode produit : rien ne change', () => {
	it('AB, AB^2, ABC lus comme des produits', () => {
		expect(readProduct('AB')).toBe('le produit de A par B');
		expect(readProduct('AB^2')).toBe('le produit de A par le carré de B');
		expect(readProduct('ABC')).toBe('le produit de A, B et C');
	});

	it('sans option : le mode du parseur par défaut (produit)', () => {
		const result = structureFromLatex('AB');
		if (result.status !== 'ok') throw new Error('structure attendue');
		expect(readingPlainText(readingOf(result.structure))).toBe('le produit de A par B');
	});
});
