/**
 * Sélection de la vitrine `/demo/blocs` (chantier catalogue-blocs, phase 0 du 2026-10-25) :
 *
 * - primaire : horloge, opération posée, droite graduée ; collège : barres, circulaire, nuage ;
 *   lycée : variations, arbre, courbe ;
 * - chaque item renvoie à un exemple existant d'une fiche (pas de texte recopié).
 */
import { describe, expect, it } from 'vitest';
import { findBlockEntry } from '../index';
import { SHOWCASE_ITEMS, SHOWCASE_SECTIONS, showcaseSource } from '../showcase';

describe('vitrine des blocs', () => {
	it('range les neuf blocs de la phase 0 par niveau', () => {
		const fencesByLevel = SHOWCASE_SECTIONS.map(({ level }) =>
			SHOWCASE_ITEMS.filter((item) => item.level === level).map(
				(item) => showcaseSource(item).split('\n')[0]
			)
		);
		expect(fencesByLevel).toEqual([
			['```horloge', '```operation', '```line'],
			['```barres', '```circulaire', '```nuage'],
			['```variation', '```probtree', '```courbe']
		]);
	});

	it('chaque item reprend le texte d’un exemple de sa fiche', () => {
		for (const item of SHOWCASE_ITEMS) {
			const examples = findBlockEntry(item.slug)?.examples ?? [];
			expect(
				examples.map((e) => e.source),
				`${item.slug} / ${item.example}`
			).toContain(showcaseSource(item));
		}
	});

	it('lève sur un renvoi cassé', () => {
		expect(() =>
			showcaseSource({ ...SHOWCASE_ITEMS[0], example: 'Exemple qui n’existe pas' })
		).toThrow(/introuvable/);
	});
});
