/**
 * Onglet « Signalements » de l'élève : le numéro de SA copie (D6)
 * ==============================================================
 *
 * L'API sert le numéro de l'exercice dans la copie de l'élève, ou `null`
 * s'il est inconnu : l'onglet affiche ce numéro, et n'en affiche AUCUN
 * plutôt qu'un numéro faux (ni « null », ni « 0 »).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { lore } from '$lib/config/lore';
import StudentReportsPanel from '../StudentReportsPanel.svelte';

const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';

function report(id: string, exercisePosition: number | null, description: string) {
	return {
		id,
		worksheet_exercise_id: '550e8400-e29b-41d4-a716-446655440012',
		exercise_position: exercisePosition,
		description,
		status: 'pending',
		response: null,
		created_at: '2026-10-13T10:00:00Z',
		updated_at: '2026-10-13T10:00:00Z',
		assignment_id: ASSIGNMENT_ID,
		worksheet_id: '550e8400-e29b-41d4-a716-446655440011',
		worksheet_title: 'Dérivées',
		assignment_title: null
	};
}

/** La carte d'un signalement : le plus petit bloc qui porte sa description et la fiche */
function cardOf(description: string): Element {
	// Le plus profond des éléments qui portent la description, puis on remonte
	let element = [...document.querySelectorAll('p, span, div')]
		.filter((e) => e.textContent?.includes(description))
		.at(-1)!;
	while (element.parentElement && !element.textContent?.includes('Dérivées')) {
		element = element.parentElement;
	}
	return element;
}

describe('onglet « Signalements » de l’élève', () => {
	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				Response.json({
					reports: [
						report('550e8400-e29b-41d4-a716-446655440031', 4, 'Parenthèse manquante'),
						report('550e8400-e29b-41d4-a716-446655440032', null, 'Signe faux')
					],
					pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
				})
			)
		);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('affiche le numéro de sa copie, et aucun numéro quand il est inconnu', async () => {
		await render(StudentReportsPanel, { props: { assignmentId: ASSIGNMENT_ID } });
		await expect.poll(() => document.body.textContent).toContain('Signe faux');
		const text = document.body.textContent ?? '';
		expect(text).toMatch(new RegExp(`${lore.learning.exercise}\\s+4(?!\\d)`));
		expect(text).not.toContain('null');
		expect(text).not.toMatch(new RegExp(`${lore.learning.exercise}\\s+0(?!\\d)`));
		// La carte au numéro inconnu ne nomme pas d'exercice sans numéro
		expect(cardOf('Signe faux').textContent).not.toContain(lore.learning.exercise);
		expect(cardOf('Parenthèse manquante').textContent).toContain(`${lore.learning.exercise} 4`);
	});
});
