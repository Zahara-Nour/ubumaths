/**
 * Nommage des objets de l'atelier — comportements du §1 et du §2.2.
 *
 * Chaque `it` porte le numéro du cas de la spécification
 * (`docs/wip/atelier-recherche-eleve-phase0.md`).
 */

import { describe, it, expect } from 'vitest';
import {
	validateName,
	nextName,
	nameRejectionMessage,
	RESERVED_NAMES,
	PREFERRED_NAMES
} from '../names';

describe('validateName', () => {
	it('accepte une lettre libre', () => {
		expect(validateName('f', [])).toBeNull();
		expect(validateName('L', ['f', 'g'])).toBeNull();
	});

	it('accepte une lettre suivie d’un indice numérique', () => {
		expect(validateName('a_1', [])).toBeNull();
		expect(validateName('u_12', [])).toBeNull();
	});

	// §2.2 E1 — nom réservé
	it('refuse les cinq noms réservés', () => {
		for (const reserved of RESERVED_NAMES) {
			expect(validateName(reserved, [])).toBe('reserved');
		}
	});

	// §2.1 E1 — « x est le nom de la variable »
	it('refuse x même quand aucun objet n’existe', () => {
		expect(validateName('x', [])).toBe('reserved');
	});

	// §2.2 E2 — un seul espace de noms, tous types confondus (décision D1)
	it('refuse un nom déjà pris, quel que soit le type qui le porte', () => {
		expect(validateName('u', ['u'])).toBe('taken');
		expect(validateName('f', ['a', 'f', 'L'])).toBe('taken');
	});

	// §2.1 E3 — nom invalide
	it('refuse un nom mal formé', () => {
		expect(validateName('2f', [])).toBe('malformed');
		expect(validateName('f g', [])).toBe('malformed');
		expect(validateName('', [])).toBe('malformed');
		expect(validateName('fg', [])).toBe('malformed');
		expect(validateName('a_', [])).toBe('malformed');
	});

	it('juge la forme avant la disponibilité', () => {
		// Un nom mal formé le reste, même si personne ne le porte
		expect(validateName('2f', ['2f'])).toBe('malformed');
	});
});

describe('nextName', () => {
	it('propose la première lettre d’usage du type', () => {
		expect(nextName('function', [])).toBe('f');
		expect(nextName('sequence', [])).toBe('u');
		expect(nextName('list', [])).toBe('L');
		expect(nextName('value', [])).toBe('a');
	});

	it('passe à la lettre suivante quand la première est prise', () => {
		expect(nextName('function', ['f'])).toBe('g');
		expect(nextName('function', ['f', 'g'])).toBe('h');
	});

	// Décision D1 : l'espace de noms est commun, donc une suite nommée `f`
	// empêche bien une fonction de s'appeler `f`.
	it('tient compte des noms pris par les autres types', () => {
		expect(nextName('function', ['f'])).toBe('g');
	});

	// §2.1 L1 — le défaut à ne pas reproduire
	it('ne rend jamais un nom déjà pris quand toutes les lettres sont prises', () => {
		const all = [...PREFERRED_NAMES.value];
		const proposed = nextName('value', all);
		expect(all).not.toContain(proposed);
		expect(validateName(proposed, all)).toBeNull();
	});

	it('passe aux indices une fois les lettres épuisées', () => {
		const all = [...PREFERRED_NAMES.value];
		expect(nextName('value', all)).toBe('a_1');
		expect(nextName('value', [...all, 'a_1'])).toBe('a_2');
	});

	it('ne propose jamais un nom réservé', () => {
		for (const kind of ['value', 'function', 'sequence', 'list'] as const) {
			expect(RESERVED_NAMES.has(nextName(kind, []))).toBe(false);
		}
	});
});

describe('nameRejectionMessage', () => {
	it('explique en français, en citant le nom', () => {
		expect(nameRejectionMessage('taken', 'g')).toContain('g');
		expect(nameRejectionMessage('reserved', 'x')).toContain('x');
		expect(nameRejectionMessage('malformed', '2f')).toContain('2f');
	});

	it('dit pourquoi x est réservé, pas seulement qu’il l’est', () => {
		expect(nameRejectionMessage('reserved', 'x').toLowerCase()).toContain('variable');
	});
});
