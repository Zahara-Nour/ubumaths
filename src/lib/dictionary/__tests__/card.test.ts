/**
 * Fiche d'un mot cliquable (lot 2 du lexique, comportements 9 et 10) : ce que
 * l'élève lit en cliquant sur un mot repéré.
 */

import { describe, expect, it } from 'vitest';
import { REFERENCE_DICTIONARY } from '../../../../tests/fixtures/lexique/dictionnaire-reference';
import { createLexicon } from '../runtime';

const { lexiconCard } = createLexicon(REFERENCE_DICTIONARY);

describe('fiche d’un mot cliquable', () => {
	it('10. un homonyme montre chacun de ses sens, avec son étiquette', () => {
		const card = lexiconCard(['carré (puissance)', 'carré (géométrie)'], '5');
		expect(card.map((entry) => entry.sense)).toEqual(['puissance', 'géométrie']);
		expect(card.every((entry) => entry.definitions.length > 0)).toBe(true);
	});

	it('9. seulement les définitions lisibles au niveau de l’élève', () => {
		const [geometrie] = lexiconCard(['carré (géométrie)'], 'CP');
		expect(geometrie.definitions).toHaveLength(1);
		const [suite] = lexiconCard(['terme (suite)'], '1_GEN');
		// Définition du CM1, plus celle de 1re spé partagée avec la 1re générale
		expect(suite.definitions).toHaveLength(2);
	});

	it('9. un renvoi montre la définition de sa cible (« Voir : X »)', () => {
		const [resoudre] = lexiconCard(['résoudre'], '5');
		expect(resoudre.seeTerm).toBe('solution');
		expect(resoudre.definitions.join(' ')).toMatch(/inconnue/);
	});

	it('un identifiant inconnu est ignoré', () => {
		expect(lexiconCard(['zorglub'], '5')).toEqual([]);
	});
});
