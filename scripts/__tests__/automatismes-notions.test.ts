import { describe, expect, it } from 'vitest';
import { problemesNotions } from '../fiches/automatismes-notions.ts';

// ============================================================================
// Constantes
// ============================================================================

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';

const NOEUDS = new Map([
	[A, { name: 'Calcul littéral', kind: 'notion', archived: false }],
	[B, { name: 'Équations : premier degré', kind: 'subnotion', archived: false }],
	[C, { name: 'Algèbre', kind: 'branch', archived: false }]
]);

describe('problemesNotions — notions posées par un script d’automatismes', () => {
	it('accepte une ou plusieurs notions connues, non archivées', () => {
		expect(problemesNotions([A], NOEUDS)).toEqual([]);
		expect(problemesNotions([A, B], NOEUDS)).toEqual([]);
	});

	it('refuse une liste vide : une fiche d’automatismes parle toujours de quelque chose', () => {
		expect(problemesNotions([], NOEUDS)).toEqual(['aucune notion']);
	});

	it('refuse un doublon', () => {
		expect(problemesNotions([A, A], NOEUDS)).toEqual([`notion en double : ${A}`]);
	});

	it('refuse un nœud absent de l’arbre', () => {
		const inconnu = '00000000-0000-4000-8000-0000000000ff';
		expect(problemesNotions([A, inconnu], NOEUDS)).toEqual([`nœud introuvable : ${inconnu}`]);
	});

	it('refuse une branche : on classe sous des notions', () => {
		expect(problemesNotions([C], NOEUDS)).toEqual(['« Algèbre » n’est pas une notion']);
	});

	it('refuse une notion archivée', () => {
		const archives = new Map([[A, { name: 'Calcul littéral', kind: 'notion', archived: true }]]);
		expect(problemesNotions([A], archives)).toEqual(['notion archivée : « Calcul littéral »']);
	});
});
