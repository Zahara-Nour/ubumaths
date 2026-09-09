/**
 * Tests — découpage de la requête `[[`.
 *
 * Ce qui compte ici est la tolérance : la fonction est appelée à CHAQUE frappe,
 * donc sur des requêtes constamment incomplètes. Refuser une saisie en cours
 * serait hostile.
 */

import { describe, it, expect } from 'vitest';
import { parseResourceQuery, prefixHint, KIND_PREFIXES } from '../prefixes';
import { isResourceKind } from '../kinds';

describe('parseResourceQuery', () => {
	it('sans préfixe, cherche partout', () => {
		expect(parseResourceQuery('derivees')).toEqual({
			kind: null,
			text: 'derivees',
			selection: null
		});
	});

	it('reconnaît un préfixe de type', () => {
		expect(parseResourceQuery('exos:derivees')).toEqual({
			kind: 'worksheet',
			text: 'derivees',
			selection: null
		});
	});

	it('distingue `exo:` de `exos:`, qui ne diffèrent que d’une lettre', () => {
		// C'est le deux-points qui lève l'ambiguïté : `exo` est un préfixe de `exos`.
		expect(parseResourceQuery('exo:fractions').kind).toBe('exercise');
		expect(parseResourceQuery('exos:fractions').kind).toBe('worksheet');
	});

	it('extrait la sélection d’exercices', () => {
		expect(parseResourceQuery('exos:derivees#3')).toEqual({
			kind: 'worksheet',
			text: 'derivees',
			selection: '3'
		});
	});

	it('accepte une liste et des plages', () => {
		expect(parseResourceQuery('exos:derivees#3,5-7').selection).toBe('3,5-7');
		expect(parseResourceQuery('exos:derivees#3,4,5').selection).toBe('3-5');
	});

	it('accepte une sélection sans préfixe', () => {
		expect(parseResourceQuery('derivees#12').selection).toBe('12');
	});

	it('ignore `#0` — les exercices sont numérotés à partir de 1', () => {
		const parsed = parseResourceQuery('derivees#0');
		expect(parsed.selection).toBeNull();
		expect(parsed.text).toBe('derivees#0');
	});

	it('ne prend un numéro qu’en FIN de requête', () => {
		// « #3 » au milieu fait partie du titre cherché.
		expect(parseResourceQuery('exos:fiche#3 bis').selection).toBeNull();
	});

	it('laisse un préfixe inconnu au texte plutôt que de refuser', () => {
		// Appelée à chaque frappe : `[[note:` doit chercher « note: », pas planter.
		expect(parseResourceQuery('note:quelque chose')).toEqual({
			kind: null,
			text: 'note:quelque chose',
			selection: null
		});
	});

	it('est insensible à la casse du préfixe', () => {
		expect(parseResourceQuery('EXOS:derivees').kind).toBe('worksheet');
	});

	it('ne prend pas un deux-points en tête pour un préfixe', () => {
		expect(parseResourceQuery(':derivees').kind).toBeNull();
	});

	it('accepte un préfixe seul, sans texte', () => {
		// État transitoire normal : on vient de taper `exos:`.
		expect(parseResourceQuery('exos:')).toEqual({
			kind: 'worksheet',
			text: '',
			selection: null
		});
	});

	it('accepte une requête vide', () => {
		expect(parseResourceQuery('')).toEqual({ kind: null, text: '', selection: null });
	});

	it('l’aide reste courte et ne cite que des préfixes valides', () => {
		// Dix préfixes sur une ligne font un mur qu'on ne lit pas.
		const hint = prefixHint();
		expect(hint.length).toBeLessThan(40);
		for (const prefix of hint.split(' ')) {
			expect(KIND_PREFIXES[prefix.replace(':', '')]).toBeDefined();
		}
	});

	it('ne mappe que des types réellement enregistrés', () => {
		// Un préfixe qui pointerait un type inconnu du registre produirait un 400
		// à la première recherche.
		for (const kind of Object.values(KIND_PREFIXES)) {
			expect(isResourceKind(kind)).toBe(true);
		}
	});
});
