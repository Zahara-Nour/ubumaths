/**
 * Écran d'une fiche de l'élève : option « mélanger les exercices »
 * ================================================================
 *
 * L'API sert les exercices dans l'ordre de la copie (`shuffled: true`) :
 * l'écran les AFFICHE dans cet ordre, numérotés en continu, sans les retrier
 * par `position` — le même ordre que le PDF. Sans `shuffled`, retri par
 * `position`, comme avant.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { StudentWorksheetView } from '$lib/types/worksheets';
import WorksheetPage from '../+page.svelte';

const SECTION_ID = '00000000-0000-4000-8000-0000000000c1';

function exercise(letter: string, position: number, sectionId: string | null) {
	return {
		id: `00000000-0000-4000-8000-00000000010${letter}`,
		exercise_id: `00000000-0000-4000-8000-00000000020${letter}`,
		title: `Titre ${letter.toUpperCase()}`,
		position,
		points: null,
		custom_instructions: null,
		statement: `Énoncé ${letter}`,
		correction: null,
		correction_visible: false,
		answers: null,
		section_id: sectionId,
		is_essential: false
	};
}

function view(shuffled: boolean | undefined): StudentWorksheetView {
	return {
		assignment_id: '00000000-0000-4000-8000-0000000000a1',
		worksheet_id: '00000000-0000-4000-8000-0000000000f1',
		title: 'Fiche mélangée',
		language: 'fr',
		description: null,
		type: 'worksheet',
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: false,
		class_name: null,
		read_only: false,
		shuffled,
		// Ordre de la copie : C, A, B dans la section, puis E, D hors section
		exercises: [
			exercise('c', 3, SECTION_ID),
			exercise('a', 1, SECTION_ID),
			exercise('b', 2, SECTION_ID),
			exercise('e', 2, null),
			exercise('d', 1, null)
		],
		sections: [{ id: SECTION_ID, title: 'Section 1', instructions: null, position: 1 }]
	};
}

/** Les titres, dans l'ordre où l'écran les affiche */
function renderedTitles(): string[] {
	return [...document.body.textContent!.matchAll(/Titre ([A-E])/g)].map((m) => m[1]);
}

describe('écran de l’élève : ordre des exercices', () => {
	beforeEach(() => {
		// Maîtrise et signalements chargés au montage : réponses vides
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ mastery: [], reports: [] })))
		);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('`shuffled` : l’ordre de la copie, numéroté en continu', async () => {
		await render(WorksheetPage, { props: { data: { worksheet: view(true) } } as never });
		expect(renderedTitles()).toEqual(['C', 'A', 'B', 'E', 'D']);
		expect(document.body.textContent).toMatch(/1\D*Titre C/);
	});

	it('sans `shuffled` : retri par `position`, comme avant', async () => {
		await render(WorksheetPage, { props: { data: { worksheet: view(undefined) } } as never });
		expect(renderedTitles()).toEqual(['A', 'B', 'C', 'D', 'E']);
	});
});
