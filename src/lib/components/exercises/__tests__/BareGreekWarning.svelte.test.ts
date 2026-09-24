/**
 * L'avertissement « lettre grecque sans antislash » tel que l'auteur le VOIT
 * dans l'éditeur d'exercices (2026-09-24).
 */

import { page } from '@vitest/browser/context';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BareGreekWarning from '../BareGreekWarning.svelte';
import type { ExerciseVariation } from '$lib/exercises/types';

function variation(statement: string, solution = ''): ExerciseVariation {
	return {
		label: 'default',
		statement_md: statement,
		solution_md: solution
	} as unknown as ExerciseVariation;
}

describe('BareGreekWarning', () => {
	it('signale ~2pi~ et propose \\pi, champ par champ', async () => {
		render(BareGreekWarning, { variation: variation('Calculer ~2pi r~.', '~alpha+1~') });
		await expect.element(page.getByText('Lettre grecque sans antislash')).toBeVisible();
		const liste = page.getByRole('listitem');
		await expect.element(liste.nth(0)).toHaveTextContent('Énoncé : pi → \\pi');
		await expect.element(liste.nth(1)).toHaveTextContent('Solution : alpha → \\alpha');
	});

	it('rien n’est affiché quand les lettres grecques ont leur antislash', async () => {
		render(BareGreekWarning, { variation: variation('~2\\pi r~', '~\\alpha+1~') });
		await expect.element(page.getByText('Lettre grecque sans antislash')).not.toBeInTheDocument();
	});
});
