/**
 * Fiche de l'élève : arrivée sur l'exercice signalé (décision D6, 2026-10-13)
 * ===========================================================================
 *
 * La notification d'un signalement traité mène à la fiche avec une ancre
 * `#exercice-<id de l'exercice de fiche>` : la page défile jusqu'à cet
 * exercice et le met brièvement en évidence. Sans ancre : rien de tel.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { StudentWorksheetView } from '$lib/types/worksheets';

const location = vi.hoisted(() => ({ hash: '' }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return new URL(`http://localhost:5175/dashboard/student/worksheets/a1${location.hash}`);
		}
	}
}));

import WorksheetPage from '../+page.svelte';

const A_ID = '00000000-0000-4000-8000-00000000010a';
const B_ID = '00000000-0000-4000-8000-00000000010b';

function exercise(id: string, letter: string, position: number) {
	return {
		id,
		exercise_id: `00000000-0000-4000-8000-00000000020${letter}`,
		title: `Titre ${letter.toUpperCase()}`,
		position,
		points: null,
		custom_instructions: null,
		statement: `Énoncé ${letter}`,
		correction: null,
		correction_visible: false,
		answers: null,
		section_id: null,
		is_essential: false
	};
}

const VIEW: StudentWorksheetView = {
	assignment_id: '00000000-0000-4000-8000-0000000000a1',
	worksheet_id: '00000000-0000-4000-8000-0000000000f1',
	title: 'Fiche',
	language: 'fr',
	description: null,
	type: 'worksheet',
	instructions: null,
	available_from: null,
	closes_at: null,
	show_corrections: false,
	class_name: null,
	read_only: false,
	exercises: [exercise(A_ID, 'a', 1), exercise(B_ID, 'b', 2)],
	sections: []
};

describe('fiche de l’élève : ancre d’un exercice', () => {
	let scrolled: Element[];

	beforeEach(() => {
		scrolled = [];
		vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
			scrolled.push(this);
		});
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ mastery: [], reports: [] })))
		);
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		location.hash = '';
	});

	it('ancre présente : défile jusqu’à l’exercice et le met en évidence', async () => {
		location.hash = `#exercice-${B_ID}`;
		await render(WorksheetPage, { props: { data: { worksheet: VIEW } } as never });
		const target = document.getElementById(`exercice-${B_ID}`);
		expect(target).not.toBeNull();
		expect(target!.textContent).toContain('Titre B');
		await expect.poll(() => target!.getAttribute('data-highlighted')).toBe('true');
		expect(scrolled).toContain(target);
		// L'autre exercice n'est pas mis en évidence
		expect(document.getElementById(`exercice-${A_ID}`)!.getAttribute('data-highlighted')).not.toBe(
			'true'
		);
	});

	it('sans ancre : aucun défilement, aucune mise en évidence', async () => {
		await render(WorksheetPage, { props: { data: { worksheet: VIEW } } as never });
		expect(document.getElementById(`exercice-${A_ID}`)).not.toBeNull();
		expect(document.querySelector('[data-highlighted="true"]')).toBeNull();
		expect(scrolled).toHaveLength(0);
	});
});
