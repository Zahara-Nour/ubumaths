/**
 * Géométrie, lot 2, PR 1 : LIRE une construction (L2, L3 de
 * `docs/archive/wip/atelier-geometrie-lot2-phase0.md`, validée le 2026-10-18).
 *
 * Le lecteur de l'atelier lit la STRUCTURE d'une ligne du DSL (mot, arguments
 * positionnels et nommés, raccourcis de manuel, séparateurs) ; chaque argument
 * numérique garde son texte, que l'atelier lit comme partout ailleurs. Le
 * lecteur du DSL (`dsl/parser.ts`) n'est pas réutilisé : il refuse `2a`, `√2`,
 * `a²`, `\frac{1}{2}` et `parallèle` (mesuré, voir `construction-read.ts`) — on
 * vérifie ici qu'il donne la MÊME structure sur les lignes qu'il sait lire.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '$lib/geometry-core/dsl/parser';
import type { DslExpr } from '$lib/geometry-core/dsl/types';
import { readConstruction, type ReadArgument, type ReadCall } from '../construction-read';

// =============================================================================
// Outils
// =============================================================================

/** La lecture réussie, ou une erreur parlante. */
function read(text: string, provenance: 'text' | 'keyboard' = 'text'): ReadCall {
	const outcome = readConstruction(text, provenance);
	if (outcome === null) throw new Error(`« ${text} » n'est pas lu comme une construction`);
	if (!outcome.ok) throw new Error(`« ${text} » refusé : ${outcome.message}`);
	return outcome.call;
}

/** Le refus, ou une erreur parlante. */
function refusal(text: string): string {
	const outcome = readConstruction(text, 'text');
	if (outcome === null || outcome.ok) throw new Error(`« ${text} » aurait dû être refusé`);
	return outcome.message;
}

/** Une forme comparable : `droite(A, B)`, `cercle(O, rayon=#2)`. */
function shape(call: ReadCall): string {
	const argument = (a: ReadArgument): string =>
		a.kind === 'call' ? shape(a.call) : a.kind === 'name' ? a.name : `#${a.text.trim()}`;
	const parts = [
		...call.positional.map(argument),
		...[...call.named].map(([key, value]) => `${key}=${argument(value)}`)
	];
	return `${call.word}(${parts.join(', ')})`;
}

/** La même forme, lue par le DSL. */
function dslShape(line: string): string {
	const statement = parse(line).statements[0];
	const expr = statement.kind === 'exprStatement' ? statement.expr : null;
	const argument = (e: DslExpr): string =>
		e.kind === 'identifier'
			? e.name
			: e.kind === 'call'
				? callShape(e)
				: `#${line.slice(e.start, e.end).trim()}`;
	const callShape = (e: Extract<DslExpr, { kind: 'call' }>): string =>
		`${e.name}(${[
			...e.args.map(argument),
			...[...e.namedArgs].map(([key, value]) => `${key}=${argument(value)}`)
		].join(', ')})`;
	if (expr === null || expr.kind !== 'call') throw new Error(`le DSL ne lit pas ${line}`);
	return callShape(expr);
}

// =============================================================================
// L2 : l'écriture du DSL, telle quelle
// =============================================================================

describe('L2 : une ligne du DSL se lit comme le DSL la lit', () => {
	const lines = [
		'droite(A, B)',
		'segment(A, B)',
		'demidroite(A, B)',
		'milieu(A_1, B)',
		'point(1, 2)',
		'projection(M, axe=d)',
		'projection(M, axe=droite(A, B))',
		'parallele(P, A, B)',
		'parallele(P, d)',
		'perpendiculaire(P, A, B)',
		'cercle(O, rayon=3)',
		'cercle(O, rayon=r)',
		'cercle(O, passant=A)',
		'cercle(A, B, C)',
		'cercle(O, 3)'
	];
	for (const line of lines) {
		it(`${line} : même structure que le lecteur du DSL`, () => {
			expect(shape(read(line))).toBe(dslShape(line));
		});
	}
});

describe('L2 (a) : les raccourcis de manuel', () => {
	it('(AB) est droite(A, B)', () => {
		const call = read('(AB)');
		expect(shape(call)).toBe('droite(A, B)');
		expect(call.shortcut).toBe('line');
	});

	it('[AB] est segment(A, B), [AB) est demidroite(A, B)', () => {
		expect(shape(read('[AB]'))).toBe('segment(A, B)');
		expect(shape(read('[AB)'))).toBe('demidroite(A, B)');
	});

	it('un raccourci se lit aussi à l’intérieur d’un argument', () => {
		expect(shape(read('parallele(C, (AB))'))).toBe('parallele(C, droite(A, B))');
		expect(shape(read('projection(M, axe=[AB])'))).toBe('projection(M, axe=segment(A, B))');
		expect(shape(read('milieu([AB])'))).toBe('milieu(segment(A, B))');
	});

	it('les indices : (A_1B), [A_1 B_2]', () => {
		expect(shape(read('(A_1B)'))).toBe('droite(A_1, B)');
		expect(shape(read('[A_1 B_2]'))).toBe('segment(A_1, B_2)');
	});
});

describe('L2 : virgule et point-virgule', () => {
	it('« ; » sépare toujours, la virgule y est décimale', () => {
		expect(shape(read('point(1,5 ; 2)'))).toBe('point(#1,5, #2)');
		expect(shape(read('cercle(O ; 2,5)'))).toBe('cercle(O, #2,5)');
	});

	it('« , » sépare quand rien ne peut être un décimal', () => {
		expect(shape(read('milieu(A,B)'))).toBe('milieu(A, B)');
		expect(shape(read('point(1, 2)'))).toBe('point(#1, #2)');
	});

	it('une ambiguïté est refusée : « Sépare avec « ; » »', () => {
		expect(refusal('point(1,5, 2)')).toContain('Sépare les arguments de point avec « ; »');
		expect(refusal('point(1,2)')).toContain('« ; »');
		expect(refusal('cercle(O, 1,5)')).toContain('« ; »');
	});

	it('un argument vide est refusé', () => {
		expect(refusal('milieu(A ; )')).toContain('Il manque un argument');
	});
});

describe('L2 (c) : les accents', () => {
	it('parallèle et parallele se lisent pareil', () => {
		expect(shape(read('parallèle(P ; d)'))).toBe('parallele(P, d)');
		expect(shape(read('demi-droite(A ; B)'))).toBe('demidroite(A, B)');
	});
});

describe('L3 : le catalogue', () => {
	it('un mot du DSL hors catalogue est refusé, avec sa raison', () => {
		expect(refusal('médiatrice(A, B)')).toBe('« médiatrice » n’est pas encore dans l’atelier.');
		expect(refusal('bissectrice(A, B, C)')).toBe(
			'« bissectrice » n’est pas encore dans l’atelier.'
		);
	});

	it('hors catalogue aussi À L’INTÉRIEUR d’une construction', () => {
		expect(refusal('parallele(P, mediatrice(A, B))')).toBe(
			'« mediatrice » n’est pas encore dans l’atelier.'
		);
	});

	it('les autres mots du DSL arrivent plus tard (médiatrice, bissectrice)', () => {
		expect(refusal('mediatrice(A, B)')).toContain('pas encore dans l’atelier');
		expect(refusal('bissectrice(A, B, C)')).toContain('pas encore dans l’atelier');
	});

	it('un argument nommé inconnu est refusé', () => {
		expect(refusal('droite(A, B, couleur="rouge")')).toContain('« couleur »');
	});

	it('ce qui n’est pas une construction n’est pas lu (le calcul suit son chemin)', () => {
		expect(readConstruction('2a + 1', 'text')).toBeNull();
		expect(readConstruction('sqrt(2)', 'text')).toBeNull();
		expect(readConstruction('(1 ; 2)', 'text')).toBeNull();
		expect(readConstruction('a', 'text')).toBeNull();
	});
});

describe('L2 : la carte écrit en LaTeX (MathLive)', () => {
	it('\\operatorname{milieu}\\left(A,B\\right) est milieu(A, B)', () => {
		expect(shape(read('\\operatorname{milieu}\\left(A,B\\right)', 'keyboard'))).toBe(
			'milieu(A, B)'
		);
		expect(shape(read('milieu\\left(A,B\\right)', 'keyboard'))).toBe('milieu(A, B)');
	});

	it('les raccourcis tapés dans le champ', () => {
		expect(shape(read('\\left(AB\\right)', 'keyboard'))).toBe('droite(A, B)');
		expect(shape(read('\\left\\lbrack AB\\right\\rbrack', 'keyboard'))).toBe('segment(A, B)');
		expect(shape(read('\\left\\lbrack AB\\right)', 'keyboard'))).toBe('demidroite(A, B)');
	});

	it('la virgule décimale du champ {,} : cercle(O ; 2{,}5)', () => {
		expect(shape(read('\\operatorname{cercle}\\left(O;2{,}5\\right)', 'keyboard'))).toBe(
			'cercle(O, #2,5)'
		);
	});
});
