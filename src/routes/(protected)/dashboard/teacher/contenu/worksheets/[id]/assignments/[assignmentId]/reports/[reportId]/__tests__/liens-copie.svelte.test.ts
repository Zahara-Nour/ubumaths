/**
 * Page de traitement d'un signalement : la copie de l'élève (décision D6)
 * ======================================================================
 *
 * Le prof lit le numéro que L'ÉLÈVE lit sur sa copie (servi tel quel par
 * l'API, plus de « + 1 »), et dispose de deux liens : « Voir la copie de
 * <prénom> » (aperçu « vue élève » de l'affectation, présélectionné sur cet
 * élève, ancré sur l'exercice signalé) et « Corriger l'exercice » (éditeur
 * de l'exercice d'origine).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { lore } from '$lib/config/lore';
import ReportPage from '../+page.svelte';

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440501';
const WE_ID = '550e8400-e29b-41d4-a716-446655440012';
const EXERCISE_ID = '550e8400-e29b-41d4-a716-4466554402e0';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440030';

function data(copyNumber: number, studentIsRecipient: boolean | null = true) {
	return {
		report: {
			id: REPORT_ID,
			assignment_id: ASSIGNMENT_ID,
			worksheet_exercise_id: WE_ID,
			exercise_position: copyNumber,
			student_id: STUDENT_ID,
			student_first_name: 'Léa',
			student_last_name: 'Martin',
			description: 'Il manque une parenthèse',
			status: 'pending',
			response: null,
			variation_index: 0,
			seed: 12,
			created_at: '2026-10-13T10:00:00Z',
			updated_at: '2026-10-13T10:00:00Z'
		},
		exercise: {
			id: EXERCISE_ID,
			slug: 'derivee',
			variations: [{ label: 'guided', statement_md: 'Dériver $x^2$', solution_md: '$2x$' }],
			shared: null,
			generic_functions: null,
			topic: null
		},
		context: {
			worksheet_title: 'Dérivées',
			student_name: 'Léa Martin',
			exercise_position: copyNumber,
			student_is_recipient: studentIsRecipient
		},
		nextPendingReportId: null,
		worksheetId: WORKSHEET_ID,
		assignmentId: ASSIGNMENT_ID,
		user: { id: '550e8400-e29b-41d4-a716-446655440001' }
	};
}

function link(text: string): HTMLAnchorElement | undefined {
	return [...document.querySelectorAll('a')].find((a) => a.textContent?.includes(text));
}

describe('page d’un signalement : copie de l’élève et exercice d’origine', () => {
	it('« Voir la copie de Léa » : aperçu vue élève présélectionné, ancré, retour au signalement', async () => {
		await render(ReportPage, { props: { data: data(7) } as never });
		const copy = link('Voir la copie de Léa');
		expect(copy).toBeDefined();
		expect(copy!.getAttribute('href')).toBe(
			`/dashboard/teacher/contenu/worksheets/${WORKSHEET_ID}/assignments/${ASSIGNMENT_ID}/preview?studentId=${STUDENT_ID}&depuis=signalement&signalement=${REPORT_ID}#exercice-${WE_ID}`
		);
	});

	it('« Corriger l’exercice » : éditeur de l’exercice d’origine', async () => {
		await render(ReportPage, { props: { data: data(7) } as never });
		const edit = link('Corriger l’exercice');
		expect(edit).toBeDefined();
		expect(edit!.getAttribute('href')).toBe(`/dashboard/teacher/contenu/exercices/${EXERCISE_ID}`);
	});

	it('le numéro affiché est celui de la copie de l’élève, sans « + 1 »', async () => {
		await render(ReportPage, { props: { data: data(7) } as never });
		const text = document.body.textContent ?? '';
		expect(text).toMatch(new RegExp(`${lore.learning.exercise} :\\s*7(?!\\d)`));
		expect(text).not.toMatch(new RegExp(`${lore.learning.exercise} :\\s*8(?!\\d)`));
	});

	it('élève qui a quitté la classe : pas de lien, « Copie de Léa indisponible »', async () => {
		await render(ReportPage, { props: { data: data(7, false) } as never });
		expect(link('Voir la copie')).toBeUndefined();
		expect(document.body.textContent).toContain(
			'Copie de Léa indisponible : n’est plus dans la classe'
		);
	});

	it('destinataire inconnu (lecture en panne) : pas de lien, sans accuser l’élève', async () => {
		await render(ReportPage, { props: { data: data(7, null) } as never });
		expect(link('Voir la copie')).toBeUndefined();
		expect(document.body.textContent).toContain('Copie de Léa indisponible pour le moment');
		expect(document.body.textContent).not.toContain('n’est plus dans la classe');
	});
});
