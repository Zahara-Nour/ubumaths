/**
 * PDF d'un exercice seul : corrigé en version détaillée (ADR 0017, revue du lot 3)
 *
 * Pas de fiche, donc pas de réglage : la version détaillée, et jamais un marqueur
 * brut à Typst. Une série d'automatismes enregistrée comme exercice garde ses
 * marqueurs depuis le lot 3 (`scripts/create-automatismes-evolutions-1spe.ts`).
 * Garde-fou : passait aussi avant (le convertisseur Typst garde l'argument de
 * `\detail{…}`) ; il vérifie que le corrigé reste détaillé et sans marqueur.
 */
import { describe, it, expect } from 'vitest';
import { generateExerciseTypst, generateStaticExerciseTypst } from '../exercise-typst-generator';
import type { Exercise } from '$lib/exercises/types';

const SOLUTION = [
	'On obtient $x=2$.',
	'',
	'> [!méthode] On isole la variable.',
	'',
	'$$\\begin{align} 2x+3&=7 \\\\ \\detail{2x&=987 \\\\} x&=2 \\end{align}$$',
	'',
	'C’est [une équation du premier degré]{.rappel} simple.'
].join('\n');

function expectDetailedWithoutMarkers(typst: string) {
	for (const word of ['isole', 'premier degré', '987']) expect(typst).toContain(word);
	expect(typst).not.toContain('detail{');
	expect(typst).not.toContain('[!méthode]');
	expect(typst).not.toContain('{.rappel}');
}

describe('PDF d’un exercice seul : corrigé détaillé, sans marqueur brut', () => {
	it('generateExerciseTypst', async () => {
		const exercise = {
			id: 'ex',
			title: 'Équation',
			category: 'application',
			tags: [],
			variations: [{ label: 'default', statement_md: 'Résoudre $2x+3=7$.', solution_md: SOLUTION }],
			created_at: '',
			updated_at: '',
			created_by: 'test'
		} as unknown as Exercise;
		const result = await generateExerciseTypst({
			exercise,
			includeSolution: true,
			includeMetadata: false
		});
		expect(result.success).toBe(true);
		expectDetailedWithoutMarkers(result.typstContent);
	});

	it('generateStaticExerciseTypst', async () => {
		expectDetailedWithoutMarkers(await generateStaticExerciseTypst('Résoudre $2x+3=7$.', SOLUTION));
	});
});
