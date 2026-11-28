/**
 * Atelier — une fonction définie par une condition : `f(x) = x pour x > 2`.
 *
 * Phase 0 du chantier `fonctions-domaines` (validée par David le 2026-11-28) :
 * « pour » suivi d'une condition sur la lettre de la fonction vaut « sur »
 * suivi de l'ensemble ; la carte réaffiche ce qui a été tapé ; une seconde
 * formule (`…, x² pour x ≤ 2`) est refusée, la place reste libre pour les
 * fonctions par morceaux.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { fieldLatexOf } from '../mathfield';
import {
	intervalLabelOf,
	readInterval,
	splitInterval,
	ONLY_FUNCTIONS,
	ONE_FORMULA,
	UNREADABLE_CONDITION
} from '../interval';

// =============================================================================
// Décor
// =============================================================================

function desk(): CalcDesk {
	return new CalcDesk(new Atelier());
}

/** La dernière ligne de Calcul : son texte, et si c'est un refus. */
function last(d: CalcDesk): { text: string; failed: boolean } {
	const entry = d.entries.at(-1);
	if (entry === undefined) throw new Error('aucune ligne');
	return { text: entry.text, failed: entry.failed };
}

// =============================================================================
// Écriture
// =============================================================================

describe('le mot « pour » coupe la définition', () => {
	it.each([
		['x pour x > 2', 'detect', 'x', 'x > 2'],
		['x^2 pour 2 < x < 4', 'detect', 'x^2', '2 < x < 4'],
		['xpourx>2', 'latex', 'x', 'x>2'],
		['x^2\\text{ pour }2\\lt x\\lt 4', 'latex', 'x^2', '2\\lt x\\lt 4'],
		['\\frac{1}{x}\\text{pour}x\\neq0', 'latex', '\\frac{1}{x}', 'x\\neq0']
	] as const)('%s → %s | %s', (typed, mode, body, written) => {
		expect(splitInterval(typed, mode)).toEqual({ body, written });
	});

	it.each([
		['a = 3 pour 4', 'detect'],
		['pourcentage', 'detect'],
		['x\\cdot pour', 'latex']
	] as const)('%s n’est pas coupé (%s) : pas de condition derrière', (typed, mode) => {
		expect(splitInterval(typed, mode).written).toBeNull();
	});
});

describe('les conditions lues', () => {
	it.each([
		['x > 2', ']2 ; +∞['],
		['x>2', ']2 ; +∞['],
		['2 < x < 4', ']2 ; 4['],
		['2 ≤ x < 4', '[2 ; 4['],
		['2\\le x\\lt 4', '[2 ; 4['],
		['x ≠ 0', 'ℝ \\ {0}'],
		['x < 0 ou x > 1', ']−∞ ; 0[ ∪ ]1 ; +∞['],
		['x<0\\text{ ou }x>1', ']−∞ ; 0[ ∪ ]1 ; +∞['],
		['x>2\\text{ et }x\\neq3', ']2 ; +∞[ \\ {3}']
	])('%s → %s', (written, label) => {
		const atelier = new Atelier();
		const created = atelier.create(
			{ kind: 'function', name: 'f', definition: 'x', interval: written },
			'keyboard'
		);
		expect(created.ok).toBe(true);
		expect(intervalLabelOf(atelier.get('f')!)).toBe(label);
	});

	it('une condition illisible a son message', () => {
		expect(readInterval('x >')).toEqual({ ok: false, message: UNREADABLE_CONDITION });
	});

	it('une condition sur une autre lettre est illisible', () => {
		expect(readInterval('t > 2', 'x')).toEqual({ ok: false, message: UNREADABLE_CONDITION });
	});
});

// =============================================================================
// Calcul
// =============================================================================

describe('Calcul : f(x) = x pour x > 2', () => {
	it('crée la fonction avec son ensemble, la définition sans « pour »', () => {
		const d = desk();
		d.submit('f(x) = x pour x > 2');

		const f = d.atelier.get('f');
		expect(last(d).failed).toBe(false);
		expect(f?.kind).toBe('function');
		expect(f?.definition).toBe('x');
		expect(intervalLabelOf(f!)).toBe(']2 ; +∞[');
	});

	it('vaut « sur » : f(3) = 3, f(1) refusé', () => {
		const d = desk();
		d.submit('f(x) = x pour x > 2');
		d.submit('f(3)');
		expect(last(d)).toEqual({ text: '3', failed: false });

		d.submit('f(1)');
		expect(last(d).failed).toBe(true);
	});

	it('2 < x < 4 : ]2 ; 4[', () => {
		const d = desk();
		d.submit('f(x) = x pour 2 < x < 4');

		expect(intervalLabelOf(d.atelier.get('f')!)).toBe(']2 ; 4[');
	});

	it('une autre lettre que x : f(t) = t pour t ≥ 0', () => {
		const d = desk();
		d.submit('f(t) = t^2 pour t ≥ 0');

		expect(last(d).failed).toBe(false);
		expect(intervalLabelOf(d.atelier.get('f')!)).toBe('[0 ; +∞[');
	});
});

describe('Calcul : refus', () => {
	it('ensemble vide', () => {
		const d = desk();
		d.submit('f(x) = x pour x > 4 et x < 2');

		expect(last(d)).toEqual({ text: "L'intervalle est vide.", failed: true });
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('hors du domaine : √x pour x > −1, le point fautif est nommé', () => {
		const d = desk();
		d.submit('f(x) = sqrt(x) pour x > -1');

		expect(last(d).failed).toBe(true);
		expect(last(d).text).toContain("n'est pas défini sur tout");
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('la condition porte sur une autre lettre', () => {
		const d = desk();
		d.submit('f(x) = x pour t > 2');

		expect(last(d)).toEqual({ text: UNREADABLE_CONDITION, failed: true });
		expect(d.atelier.get('f')).toBeUndefined();
	});

	// Revue : `sur [k;5]` prend un paramètre, pas encore « pour » — refus au message juste
	it('une borne qui cite un objet : refusée, sans parler de la lettre', () => {
		const d = desk();
		d.submit('k = 3');
		d.submit('f(x) = x pour x > k');

		expect(last(d)).toEqual({ text: UNREADABLE_CONDITION, failed: true });
		expect(UNREADABLE_CONDITION).toContain('à des nombres');
	});

	it('une seconde formule : une seule formule (par morceaux, plus tard)', () => {
		const d = desk();
		d.submit('f(x) = x pour x > 2, x^2 pour x ≤ 2');

		expect(last(d)).toEqual({ text: ONE_FORMULA, failed: true });
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('seule une fonction se définit pour une condition', () => {
		const d = desk();
		d.submit('a = 3 pour x > 2');

		expect(last(d)).toEqual({ text: ONLY_FUNCTIONS, failed: true });
	});
});

// =============================================================================
// La carte
// =============================================================================

describe('la carte réaffiche ce qui a été tapé', () => {
	it('Calcul : « pour » en mot, la condition à la suite', () => {
		const d = desk();
		d.submit('f(x) = x pour x > 2');

		const latex = fieldLatexOf(d.atelier.get('f')!, d.atelier.functionNames);
		expect(latex).toBe('x\\text{ pour }x>2');
		expect(splitInterval(latex, 'latex')).toEqual({ body: 'x', written: 'x>2' });
	});

	it('Calcul : ≤, ≠ et « ou » se relisent depuis le champ', () => {
		for (const typed of ['f(x) = x pour 2 ≤ x < 4', 'f(x) = 1/x pour x < 0 ou x > 1']) {
			const d = desk();
			d.submit(typed);
			const object = d.atelier.get('f')!;
			const { written } = splitInterval(fieldLatexOf(object, []), 'latex');

			expect(written).not.toBeNull();
			const again = new Atelier();
			again.create(
				{ kind: 'function', name: 'g', definition: 'x', interval: written ?? '' },
				'keyboard'
			);
			expect(intervalLabelOf(again.get('g')!)).toBe(intervalLabelOf(object));
		}
	});

	it('la carte (champ de maths) garde son écriture', () => {
		const atelier = new Atelier();
		atelier.create(
			{ kind: 'function', name: 'f', definition: 'x', interval: '2\\lt x\\lt 4' },
			'keyboard'
		);

		expect(fieldLatexOf(atelier.get('f')!, [])).toBe('x\\text{ pour }2\\lt x\\lt 4');
	});

	it('« sur » reste « sur »', () => {
		const d = desk();
		d.submit('f(x) = x sur ]2;+∞[');

		expect(fieldLatexOf(d.atelier.get('f')!, [])).toBe('x\\text{ sur }]2;+\\infty[');
	});
});
