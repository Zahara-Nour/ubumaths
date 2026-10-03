/**
 * `shared` d'un modèle publié : seul l'ajout de `cleanCoefficients: true` s'écrit
 * ===============================================================================
 *
 * `update-published-questions.ts` n'écrivait jamais `shared` et s'arrêtait au moindre
 * écart. L'option `cleanCoefficients` vit dans `shared` : son AJOUT, et lui seul, est
 * désormais écrit. Tout autre écart (variables, conditions, option retirée ou mise à
 * `false`) arrête le script comme avant.
 */

import { describe, it, expect } from 'vitest';
import { canonique, sharedAEcrire } from '../relecture/shared-clean-coefficients';

const variables = [{ name: 'a', expression: '2..5;±' }];

describe('sharedAEcrire', () => {
	it('rend « identique » quand le fichier et la base concordent', () => {
		expect(sharedAEcrire({ variables }, { variables })).toBe('identique');
		expect(sharedAEcrire(null, undefined)).toBe('identique');
		expect(sharedAEcrire({ cleanCoefficients: true }, { cleanCoefficients: true })).toBe(
			'identique'
		);
	});

	it('écrit l’option quand la base n’a pas de `shared` (null)', () => {
		expect(sharedAEcrire(null, { cleanCoefficients: true })).toEqual({
			valeur: { cleanCoefficients: true }
		});
	});

	it('écrit l’option quand la base a un `shared` vide ({})', () => {
		expect(sharedAEcrire({}, { cleanCoefficients: true })).toEqual({
			valeur: { cleanCoefficients: true }
		});
	});

	it('garde le `shared` de la base et n’y ajoute que l’option', () => {
		const base = { variables, conditions: ['a != 0'] };
		expect(sharedAEcrire(base, { ...base, cleanCoefficients: true })).toEqual({
			valeur: { variables, conditions: ['a != 0'], cleanCoefficients: true }
		});
	});

	it('ignore l’ordre des clés (jsonb les réordonne)', () => {
		const base = { conditions: ['a != 0'], variables };
		expect(
			sharedAEcrire(base, { cleanCoefficients: true, variables, conditions: ['a != 0'] })
		).toEqual({ valeur: { conditions: ['a != 0'], variables, cleanCoefficients: true } });
	});

	it('refuse un autre écart, même accompagné de l’option', () => {
		const fichier = {
			variables: [{ name: 'a', expression: '1..5;±' }],
			cleanCoefficients: true
		};
		expect(sharedAEcrire({ variables }, fichier)).toHaveProperty('refus');
	});

	it('refuse un autre écart sans l’option', () => {
		expect(sharedAEcrire({ variables }, { variables: [] })).toHaveProperty('refus');
		expect(sharedAEcrire(null, { variables })).toHaveProperty('refus');
	});

	it('refuse de retirer l’option ou de la passer à false', () => {
		expect(sharedAEcrire({ cleanCoefficients: true }, {})).toHaveProperty('refus');
		expect(sharedAEcrire({ cleanCoefficients: true }, { cleanCoefficients: false })).toHaveProperty(
			'refus'
		);
		expect(sharedAEcrire({ cleanCoefficients: false }, { cleanCoefficients: true })).toHaveProperty(
			'refus'
		);
	});

	it('refuse une option qui n’est pas exactement `true`', () => {
		expect(sharedAEcrire(null, { cleanCoefficients: 'true' })).toHaveProperty('refus');
		expect(sharedAEcrire(null, { cleanCoefficients: 1 })).toHaveProperty('refus');
	});

	it('refuse un `shared` qui n’est pas un objet', () => {
		expect(sharedAEcrire(null, [{ cleanCoefficients: true }])).toHaveProperty('refus');
		expect(sharedAEcrire(['x'], { cleanCoefficients: true })).toHaveProperty('refus');
	});
});

describe('canonique', () => {
	it('trie les clés et confond null, absent et chaîne vide', () => {
		expect(canonique({ b: 1, a: 2 })).toBe(canonique({ a: 2, b: 1 }));
		expect(canonique(null)).toBe(canonique(undefined));
		expect(canonique('')).toBe('null');
	});
});
