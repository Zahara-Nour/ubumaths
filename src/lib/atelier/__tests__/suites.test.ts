/**
 * Les suites — lot 5a du passage de `/grapheur` par l'atelier (modèle + Calcul).
 *
 * Phase 0 `docs/archive/wip/atelier-grapheur-phase0.md` §5 et décisions S1 à S4 de
 * David (2026-10-04). Mesuré avant : une suite explicite marchait déjà
 * (`u(5)` = 11 pour `2n+1`) ; une récurrence répondait par une erreur en
 * anglais (« free variables: u », « Unknown function: u ») ; `u(n+1) = …`
 * tapé dans Calcul échouait (« Unexpected token »).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { termsOf } from '../engine';
import { runInput } from '../calcul';
import { isSequence } from '../types';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';

// =============================================================================
// Décor
// =============================================================================

function sequenceOf(atelier: Atelier, name = 'u') {
	const object = atelier.get(name);
	if (!object || !isSequence(object)) throw new Error(`${name} n'est pas une suite`);
	return object;
}

function values(atelier: Atelier, name: string, last: number): number[] | string {
	const result = termsOf(atelier, name, last);
	return result.ok ? result.terms.map((t) => t.value) : result.message;
}

function calc(atelier: Atelier, input: string) {
	return runInput({ atelier, engine: new WebReplEngine() }, input);
}

function output(result: ReturnType<typeof calc>): string {
	return result.kind === 'calcul' || result.kind === 'commande'
		? result.output
		: result.kind === 'refus'
			? result.message
			: '';
}

// =============================================================================
// S4 : le mode
// =============================================================================

describe('le mode d’une suite', () => {
	it.each([
		['0,5u_n + 3', 'recurrence'],
		['0,5u(n) + 3', 'recurrence'],
		['2n + 1', 'explicit']
	])('%s est une suite %s', (definition, mode) => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition }, 'text');

		expect(sequenceOf(atelier).mode).toBe(mode);
	});

	it('une récurrence commence à u₀ = 0, au rang 0, par défaut', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');

		expect(sequenceOf(atelier)).toMatchObject({ firstIndex: 0, firstTerm: '0' });
	});

	// S4 : une suite rangée AVANT ce lot n'a pas de mode
	it('une suite relue sans mode le retrouve', () => {
		const fresh = new Atelier();
		fresh.restore({
			version: 1,
			objects: [{ name: 'u', kind: 'sequence', definition: '0,5u_n + 3' }]
		});

		expect(sequenceOf(fresh, 'u').mode).toBe('recurrence');
	});
});

// =============================================================================
// Les termes
// =============================================================================

describe('les termes', () => {
	it('d’une suite explicite', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2n + 1' }, 'text');

		expect(values(atelier, 'u', 3)).toEqual([1, 3, 5, 7]);
	});

	it.each([['0,5u_n + 3'], ['0,5u(n) + 3']])('d’une récurrence écrite %s (S2)', (definition) => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition }, 'text');
		atelier.setSequence('u', { firstTerm: '2' });

		expect(values(atelier, 'u', 2)).toEqual([2, 4, 5]);
	});

	it('à partir d’un autre rang', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		atelier.setSequence('u', { firstIndex: 1, firstTerm: '3' });

		const result = termsOf(atelier, 'u', 3);

		expect(result.ok && result.terms).toEqual([
			{ n: 1, value: 3 },
			{ n: 2, value: 6 },
			{ n: 3, value: 12 }
		]);
	});

	it('une suite qui cite une valeur la suit', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'q', definition: '3' }, 'text');
		atelier.create({ kind: 'sequence', name: 'u', definition: 'q*u_n' }, 'text');
		atelier.setSequence('u', { firstTerm: '1' });

		expect(values(atelier, 'u', 2)).toEqual([1, 3, 9]);
		atelier.update('q', '2', 'text');
		expect(values(atelier, 'u', 2)).toEqual([1, 2, 4]);
	});
});

// =============================================================================
// S1 : le premier terme, nombre ou valeur
// =============================================================================

describe('le premier terme', () => {
	it('peut être une valeur de l’atelier, que la suite suit', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '4' }, 'text');
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');

		atelier.setSequence('u', { firstTerm: 'a' });
		expect(values(atelier, 'u', 1)).toEqual([4, 5]);

		atelier.slideTo('a', 1);
		expect(values(atelier, 'u', 1)).toEqual([1, 2]);
	});

	it('une valeur absente met la suite en attente', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');

		atelier.setSequence('u', { firstTerm: 'a' });

		expect(sequenceOf(atelier).status).toBe('pending');
		expect(sequenceOf(atelier).message).toContain('a');
	});

	it('renommer la valeur réécrit le premier terme', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '4' }, 'text');
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');
		atelier.setSequence('u', { firstTerm: 'a' });

		atelier.rename('a', 'b');

		expect(sequenceOf(atelier).firstTerm).toBe('b');
		expect(values(atelier, 'u', 1)).toEqual([4, 5]);
	});

	it.each([
		['un premier terme illisible', { firstTerm: '2 + *' }],
		['un rang négatif', { firstIndex: -1 }],
		['un rang non entier', { firstIndex: 1.5 }],
		['un mode inconnu', { mode: 'géométrique' }]
	])('refuse %s', (_, patch) => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');

		expect(atelier.setSequence('u', patch as never).ok).toBe(false);
	});

	it('refuse une suite explicite qui se cite elle-même', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');

		const result = atelier.setSequence('u', { mode: 'explicit' });

		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// S3 : depuis Calcul
// =============================================================================

describe('dans Calcul', () => {
	it('`u(n+1) = 0,5u(n) + 3` crée une suite récurrente', () => {
		const atelier = new Atelier();

		const result = calc(atelier, 'u(n+1) = 0,5u(n) + 3');

		expect(result.kind).toBe('definition');
		expect(sequenceOf(atelier).mode).toBe('recurrence');
		expect(sequenceOf(atelier).firstTerm).toBe('0');
	});

	it('`u(n) = 2n + 1` reste une suite explicite', () => {
		const atelier = new Atelier();

		calc(atelier, 'u(n) = 2n + 1');

		expect(sequenceOf(atelier).mode).toBe('explicit');
	});

	it('`u(5)` donne le terme de rang 5 d’une récurrence', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = 2u(n)');
		atelier.setSequence('u', { firstTerm: '1' });

		expect(output(calc(atelier, 'u(5)'))).toBe('32');
	});

	it('`u(3) + 1` aussi', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = 2u(n)');
		atelier.setSequence('u', { firstTerm: '1' });

		expect(output(calc(atelier, 'u(3) + 1'))).toBe('9');
	});

	it('un rang avant le premier se dit en français', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = 2u(n)');
		atelier.setSequence('u', { firstIndex: 2, firstTerm: '1' });

		const result = calc(atelier, 'u(0)');

		expect(result.kind).toBe('refus');
		expect(output(result)).toContain('rang');
	});

	it('une suite explicite se calcule toujours', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n) = 2n + 1');

		expect(output(calc(atelier, 'u(5)'))).toBe('11');
	});
});

// =============================================================================
// Rangement
// =============================================================================

describe('rangement', () => {
	it('le mode, le rang et le premier terme se rangent et se relisent', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '4' }, 'text');
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');
		atelier.setSequence('u', { firstIndex: 1, firstTerm: 'a' });

		const fresh = new Atelier();
		fresh.restore(atelier.serialize());

		expect(sequenceOf(fresh)).toMatchObject({ mode: 'recurrence', firstIndex: 1, firstTerm: 'a' });
		expect(values(fresh, 'u', 2)).toEqual([4, 5]);
	});

	it('modifier la définition garde le rang et le premier terme', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');
		atelier.setSequence('u', { firstIndex: 1, firstTerm: '7' });

		atelier.update('u', '2u_n', 'text');

		expect(sequenceOf(atelier)).toMatchObject({ firstIndex: 1, firstTerm: '7' });
	});
});

// =============================================================================
// Revue du lot 5a
// =============================================================================

describe('revue du lot 5a', () => {
	// B1 (bloquant) : `u(3)` valait 5 au lieu de 7, sans avertissement
	it('retaper u(n) = 2n + 1 sur une récurrence la remet en explicite', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = u(n) + 2');

		calc(atelier, 'u(n) = 2n + 1');

		expect(sequenceOf(atelier).mode).toBe('explicit');
		expect(output(calc(atelier, 'u(3)'))).toBe('7');
	});

	// Tranché par David (2026-10-04, revue du lot 5b) : le mode CHOISI est
	// gardé — sauf si la définition se met à se citer (→ récurrence). C'est
	// Calcul qui dit le mode par la forme tapée (`u(n) =` / `u(n+1) =`), et le
	// test précédent (B1) le vérifie.
	it('modifier la définition garde le mode choisi', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '3' }, 'text');
		atelier.setSequence('u', { mode: 'recurrence', firstTerm: '1' });

		atelier.update('u', '4', 'text');

		expect(sequenceOf(atelier).mode).toBe('recurrence');
	});

	it('une définition qui se met à se citer devient une récurrence', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2n + 1' }, 'text');

		atelier.update('u', 'u_n + 2', 'text');

		expect(sequenceOf(atelier).mode).toBe('recurrence');
	});

	it('`u(n+1) = 3` reste une récurrence constante', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = 3');
		atelier.setSequence('u', { firstTerm: '1' });

		expect(values(atelier, 'u', 2)).toEqual([1, 3, 3]);
	});

	// C1 : citer une récurrence comme une fonction ne se calcule pas — on le dit
	it('une fonction qui cite une récurrence est en erreur, en français', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = u(n) + 2');
		atelier.create({ kind: 'function', name: 'f', definition: 'u(x) + 1' }, 'text');

		expect(atelier.get('f')?.status).toBe('error');
		expect(atelier.get('f')?.message).toContain('récurrente');
	});

	// C2
	it.each([
		['2u(3)', '12'],
		['u(2)^2', '16']
	])('`%s` se calcule', (input, expected) => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = u(n) + 2');
		atelier.setSequence('u', { firstTerm: '0' });

		expect(output(calc(atelier, input))).toBe(expected);
	});

	it('un rang non entier se dit en français', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = u(n) + 2');

		const result = calc(atelier, 'u(5,5)');

		expect(result.kind).toBe('refus');
		expect(output(result)).toContain('entier');
	});

	// C3
	it('un rang trop lointain dit la limite', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = u(n) + 1');

		expect(output(calc(atelier, 'u(5000)'))).toContain('1000');
	});

	it('une suite qui diverge le dit', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = u(n)^2');
		atelier.setSequence('u', { firstTerm: '10' });

		expect(output(calc(atelier, 'u(20)'))).toContain('diverge');
	});

	// C4 : refusé dès la définition, pas au premier calcul
	it('`u(n+1) = u(n-1) + 1` est en erreur dès sa définition', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = u(n-1) + 1');

		expect(sequenceOf(atelier).status).toBe('error');
	});

	// C5
	it('le premier terme ne peut pas être la suite elle-même', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');

		expect(atelier.setSequence('u', { firstTerm: 'u' }).ok).toBe(false);
	});

	it('un premier terme qui n’est pas une valeur met la suite en erreur', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');

		atelier.setSequence('u', { firstTerm: 'f' });

		expect(sequenceOf(atelier).status).toBe('error');
	});

	// M1 : une grandeur perdrait son unité en silence
	it('une grandeur comme premier terme met la suite en erreur', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'q', definition: '3[m]' }, 'url');
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');

		atelier.setSequence('u', { firstTerm: 'q' });

		expect(sequenceOf(atelier).status).toBe('error');
	});

	// C6 : `.dériver u(2)` rendait « d/dx((u(n)-5)(2)) = 0 »
	it('une commande sur une récurrence est refusée en français', () => {
		const atelier = new Atelier();
		calc(atelier, 'u(n+1) = u(n) + 2');

		const result = calc(atelier, '.dériver u(2)');

		expect(result.kind).toBe('refus');
		expect(output(result)).toContain('récurrente');
	});
});
