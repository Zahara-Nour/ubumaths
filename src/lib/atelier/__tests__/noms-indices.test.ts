/**
 * Atelier — les noms indicés (`a_1`, `c_2`, `A_1`) sont des noms comme les autres.
 *
 * Mesuré sur origin/main le 2026-10-19 (relevé dans
 * `docs/wip/atelier-geometrie-progress.md`, « Noms indicés ») : `referencesOf`
 * lisait `a_1` comme sa base `a`, et la substitution remplaçait la base d'un
 * indice. Avec `a = 10`, `a_1` tapé seul répondait « Écriture non reconnue »
 * (`10_1`) ; sans `a`, `b = a_1 + 1` attendait « a », `(c_2 ; 1)` attendait
 * « c », et l'offre de curseur créait `a`, pas `a_1`.
 *
 * Règle : `a_1` vaut l'objet `a_1`, jamais `a`. `u_n` reste la notation d'une
 * suite, et `u_3` (u une suite) son terme de rang 3.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { referencesOf, bareNamesOf } from '../parse';

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine(), seed: () => 1 };
}

type Session = ReturnType<typeof session>;

function withLines(...lines: string[]): Session {
	const s = session();
	for (const line of lines) {
		const done = runInput(s, line);
		if (done.kind !== 'definition') throw new Error(`${line} : ${JSON.stringify(done)}`);
	}
	return s;
}

/** Ce que voit l'élève sur la ligne de Calcul, sans espaces. */
function said(s: Session, line: string): string {
	const r = runInput(s, line);
	const text = r.kind === 'calcul' || r.kind === 'commande' ? r.output : r.kind;
	return text.replace(/\s/g, '');
}

const names = (refs: readonly { name: string }[]) => refs.map((r) => r.name).sort();

describe('lecture : a_1 est un nom, pas sa base', () => {
	it.each([
		['a_1 x', 'text', ['a_1']],
		['a_{1}+1', 'mathfield', ['a_1']],
		['2a_1 + a', 'text', ['a', 'a_1']],
		['a_{12}', 'mathfield', ['a_12']]
	] as const)('referencesOf(%s) = %j', (text, provenance, expected) => {
		expect(names(referencesOf(text, provenance))).toEqual(expected);
	});

	it('u_n reste la notation d’une suite (la base u est citée)', () => {
		expect(names(referencesOf('u_n + 1', 'text', ['u']))).toEqual(['u']);
	});

	it('u_3 avec u une suite : le terme de rang 3, la base u est citée', () => {
		expect(names(referencesOf('u_3 + 1', 'text', ['u']))).toEqual(['u']);
	});

	it('bareNamesOf : a_1 employé comme un nombre, sa base non', () => {
		expect(bareNamesOf('2a_1 x', 'text')).toEqual(['a_1']);
		expect(bareNamesOf('u_n + 1', 'text', ['u'])).toEqual([]);
	});
});

describe('Calcul : a_1 tapé seul vaut sa valeur', () => {
	it('a_1 = 3 : a_1, 2a_1, a_1 + 1', () => {
		const s = withLines('a_1 = 3');
		expect(said(s, 'a_1')).toBe('3');
		expect(said(s, '2a_1')).toBe('6');
		expect(said(s, 'a_1 + 1')).toBe('4');
	});

	it('a = 10 et a_1 = 3 : chacun le sien', () => {
		const s = withLines('a = 10', 'a_1 = 3');
		expect(said(s, 'a_1')).toBe('3');
		expect(said(s, 'a + a_1')).toBe('13');
	});

	it('a_1 + a_2', () => {
		const s = withLines('a_1 = 3', 'a_2 = 4');
		expect(said(s, 'a_1 + a_2')).toBe('7');
	});

	it('c_2 = a_1 + a : c_2 vaut 13', () => {
		const s = withLines('a = 10', 'a_1 = 3', 'c_2 = a_1 + a');
		expect(said(s, 'c_2')).toBe('13');
	});
});

describe('citations : un objet qui cite a_1 attend a_1, jamais a', () => {
	it('b = a_1 + 1 sans a : b est sain et vaut 4', () => {
		const s = withLines('a_1 = 3', 'b = a_1 + 1');
		expect(s.atelier.get('b')?.status).toBe('ok');
		expect(said(s, 'b')).toBe('4');
	});

	it('f(x) = a_1 x, a_1 défini avant ou après : f(2) = 6', () => {
		expect(said(withLines('a_1 = 3', 'f(x) = a_1 x'), 'f(2)')).toBe('6');
		const later = withLines('f(x) = a_1 x', 'a_1 = 3');
		expect(later.atelier.get('f')?.status).toBe('ok');
		expect(said(later, 'f(2)')).toBe('6');
	});

	it('f(x) = a_1 x sans a_1 : en attente de « a_1 »', () => {
		const s = withLines('f(x) = a_1 x');
		expect(s.atelier.get('f')?.missing?.map((m) => m.name)).toEqual(['a_1']);
	});

	it('une coordonnée qui cite c_2 : le point est sain', () => {
		const s = withLines('c_2 = 5', 'A = (0;0)', 'B = (3;4)', 'P = (AB ; c_2)', 'Q = (c_2 ; 1)');
		expect(s.atelier.get('P')?.status).toBe('ok');
		expect(s.atelier.get('Q')?.status).toBe('ok');
	});

	it('une mesure entre A_1 et B : m = A_1B vaut la longueur', () => {
		const s = withLines('A_1 = (1 ; 2)', 'B = (3 ; 4)', 'm = A_1B');
		expect(s.atelier.get('m')?.status).toBe('ok');
		expect(said(s, 'm')).toBe('2sqrt(2)');
	});

	it('une carte en LaTeX (a_{1}) cite a_1', () => {
		const s = withLines('a_1 = 3');
		s.atelier.create({ kind: 'value', name: 'b', definition: 'a_{1}+1' }, 'mathfield');
		expect(s.atelier.get('b')?.status).toBe('ok');
	});
});

describe('x_1, y_1 : des noms, pas les variables x et y', () => {
	it('x_1 = 2, y_1 = 3 : b = x_1 + y_1 vaut 5, A = (x_1 ; y_1) est sain', () => {
		const s = withLines('x_1 = 2', 'y_1 = 3', 'b = x_1 + y_1', 'A = (x_1 ; y_1)');
		expect(said(s, 'b')).toBe('5');
		expect(s.atelier.get('A')?.status).toBe('ok');
	});
});

describe('dépendances : renommage, suppression, curseur, lien', () => {
	it('b cite a_1, pas a', () => {
		const s = withLines('a = 10', 'a_1 = 3', 'b = a_1 + 1');
		expect(s.atelier.citedNames('b')).toEqual(['a_1']);
		expect(s.atelier.dependents('a_1')).toEqual(['b']);
		expect(s.atelier.dependents('a')).toEqual([]);
	});

	it('supprimer a_1 emporte ce qui le cite', () => {
		const s = withLines('a_1 = 3', 'b = a_1 + 1');
		expect(s.atelier.removalOf('a_1')).toEqual(['b']);
	});

	it('l’offre de curseur de f(x) = a_1 x crée a_1, et le curseur fait bouger f', () => {
		const s = withLines('f(x) = a_1 x');
		expect(s.atelier.createFromOffer('a_1').ok).toBe(true);
		expect(s.atelier.get('f')?.status).toBe('ok');
		expect(s.atelier.slideTo('a_1', 4).ok).toBe(true);
		expect(said(s, 'f(2)')).toBe('8');
	});

	it('restauré (le lien ?a=), f(x) = a_1 x garde sa valeur', () => {
		const s = withLines('a = 10', 'a_1 = 3', 'f(x) = a_1 x');
		const copy = new Atelier();
		copy.restore(JSON.parse(JSON.stringify(s.atelier.serialize())));
		const t = { atelier: copy, engine: new WebReplEngine(), seed: () => 1 };
		expect(said(t, 'f(2)')).toBe('6');
	});
});

describe('la grille : =a_1', () => {
	it('=a_1, =2a_1, =a_1+a', () => {
		const s = withLines('a = 10', 'a_1 = 3');
		s.atelier.editCells([
			{ column: 0, row: 1, text: '=a_1' },
			{ column: 0, row: 2, text: '=2a_1' },
			{ column: 0, row: 3, text: '=a_1+a' }
		]);
		const shown = (row: number) => {
			const v = s.atelier.cellValue(0, row);
			return v.kind === 'number' ? v.shown : v.kind;
		};
		expect([shown(1), shown(2), shown(3)]).toEqual(['3', '6', '13']);
		// a_1 change : les cases qui le citent suivent
		runInput(s, 'a_1 = 5');
		expect([shown(1), shown(2), shown(3)]).toEqual(['5', '10', '15']);
	});

	it('=a_9 sans a_9 : le refus nomme a_9, pas a', () => {
		const s = withLines('a = 10');
		s.atelier.editCells([{ column: 0, row: 1, text: '=a_9' }]);
		const v = s.atelier.cellValue(0, 1);
		expect(v.kind === 'error' && v.message).toBe(
			'a_9 n’est pas défini dans l’atelier : crée-le dans Mes objets (a_9 = 2).'
		);
	});
});
