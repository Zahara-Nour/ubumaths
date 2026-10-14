/**
 * Aperçu « vue élève » ouvert depuis un signalement (décision D6)
 * ==============================================================
 *
 * Le lien « Voir la copie de <prénom> » de la page d'un signalement ouvre
 * l'aperçu avec `?studentId=<élève>#exercice-<exercice de fiche>` : l'aperçu
 * est présélectionné sur cet élève (sa copie est demandée à l'API) et défile
 * jusqu'à l'exercice signalé, mis en évidence.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { StudentWorksheetView } from '$lib/types/worksheets';

const location = vi.hoisted(() => ({ hash: '', search: '' }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return new URL(`http://localhost:5175/preview${location.search}${location.hash}`);
		}
	}
}));

import PreviewPage from '../+page.svelte';

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440501';
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

const VIEW: StudentWorksheetView & { preview_mode: string; preview_student_name: string } = {
	assignment_id: ASSIGNMENT_ID,
	worksheet_id: WORKSHEET_ID,
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
	sections: [],
	preview_mode: 'student',
	preview_student_name: 'Léa Martin'
};

function data(initialStudentId: string | null, discardedStudent = false) {
	return {
		worksheetId: WORKSHEET_ID,
		assignmentId: ASSIGNMENT_ID,
		students: [
			{ id: STUDENT_ID, first_name: 'Léa', last_name: 'Martin', class_name: '2nde A' },
			{
				id: '550e8400-e29b-41d4-a716-446655440502',
				first_name: 'Tom',
				last_name: 'Durand',
				class_name: '2nde A'
			}
		],
		initialStudentId,
		discardedStudent
	};
}

describe('aperçu vue élève : élève et exercice lus dans l’adresse', () => {
	let requested: string[];
	let scrolled: Element[];

	beforeEach(() => {
		requested = [];
		scrolled = [];
		vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
			scrolled.push(this);
		});
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				requested.push(String(url));
				return new Response(JSON.stringify(VIEW));
			})
		);
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		location.hash = '';
		location.search = '';
	});

	it('`studentId` de l’adresse : la copie de cet élève est demandée et affichée', async () => {
		await render(PreviewPage, { props: { data: data(STUDENT_ID) } as never });
		await expect.poll(() => requested.length).toBeGreaterThan(0);
		expect(new URL(requested[0]).searchParams.get('studentId')).toBe(STUDENT_ID);
		await expect.poll(() => document.body.textContent).toContain('Léa Martin');
	});

	it('ancre de l’exercice : défile jusqu’à lui et le met en évidence', async () => {
		location.hash = `#exercice-${B_ID}`;
		await render(PreviewPage, { props: { data: data(STUDENT_ID) } as never });
		await expect.poll(() => document.getElementById(`exercice-${B_ID}`)).not.toBeNull();
		const target = document.getElementById(`exercice-${B_ID}`)!;
		expect(target.textContent).toContain('Titre B');
		await expect.poll(() => target.getAttribute('data-highlighted')).toBe('true');
		expect(scrolled).toContain(target);
	});

	it('sans élève dans l’adresse : vue prof, comme avant', async () => {
		await render(PreviewPage, { props: { data: data(null) } as never });
		await expect.poll(() => requested.length).toBeGreaterThan(0);
		expect(new URL(requested[0]).searchParams.get('studentId')).toBeNull();
	});

	it('ouvert depuis un signalement (`?depuis=signalement`) : retour à la page du signalement', async () => {
		const reportId = '550e8400-e29b-41d4-a716-446655440030';
		location.search = `?studentId=${STUDENT_ID}&depuis=signalement&signalement=${reportId}`;
		await render(PreviewPage, { props: { data: data(STUDENT_ID) } as never });
		const back = [...document.querySelectorAll('a')].find((a) =>
			a.textContent?.includes('Retour au signalement')
		);
		expect(back?.getAttribute('href')).toBe(
			`/dashboard/teacher/contenu/worksheets/${WORKSHEET_ID}/assignments/${ASSIGNMENT_ID}/reports/${reportId}`
		);
	});

	it('sans origine : retour à la fiche, comme avant', async () => {
		await render(PreviewPage, { props: { data: data(null) } as never });
		const back = [...document.querySelectorAll('a')].find((a) =>
			a.textContent?.includes('Retour à la fiche')
		);
		expect(back?.getAttribute('href')).toBe(
			`/dashboard/teacher/contenu/worksheets/${WORKSHEET_ID}`
		);
	});

	it('élève de l’adresse écarté (plus destinataire) : message explicite, pas d’autre élève en silence', async () => {
		await render(PreviewPage, { props: { data: data(null, true) } as never });
		await expect.poll(() => requested.length).toBeGreaterThan(0);
		expect(document.body.textContent).toContain(
			'L’élève demandé n’est plus destinataire de cette affectation'
		);
	});
});
