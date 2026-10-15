/**
 * Placement des cadres de réponse (ADR 0030, lot 3)
 * =================================================
 *
 * « Cadres : après chaque question / après l'exercice », proposé seulement
 * quand « Réponses sur le sujet » est coché ; le choix remonte en
 * `answer_frames`.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import WorksheetTypeOptions from '../WorksheetTypeOptions.svelte';

describe('cadres de réponse', () => {
	it('sans « Réponses sur le sujet » : pas de choix des cadres', async () => {
		await render(WorksheetTypeOptions, { props: { type: 'assessment', config: {} } });
		await expect.poll(() => document.body.textContent).toContain('Réponses sur le sujet');
		expect(document.body.textContent).not.toContain('Cadres');
	});

	it('avec : « après chaque question » par défaut, « après l’exercice » remonte', async () => {
		const onchange = vi.fn();
		await render(WorksheetTypeOptions, {
			props: { type: 'exam', config: { answers_on_sheet: true }, onchange }
		});
		const trigger = page.getByRole('button', { name: 'Place des cadres de réponse' });
		await expect.element(trigger).toHaveTextContent('Après chaque question');
		await trigger.click();
		await page.getByRole('option', { name: "Après l'exercice" }).click();
		expect(onchange).toHaveBeenCalledWith('answer_frames', 'exercise');
	});
});
