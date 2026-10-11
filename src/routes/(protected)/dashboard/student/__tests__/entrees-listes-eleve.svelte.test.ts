/**
 * Entrées des trois listes de l'espace élève (#1121, décision de David, 2026-10-12).
 *
 * Avant, un élève ne pouvait pas atteindre de lui-même ses fiches, ses contrôles
 * ni les énigmes : aucun lien n'y menait. Désormais :
 * - « Mon travail » mène à toutes les fiches et à tous les contrôles, qui y
 *   reviennent par « Retour à Mon travail » ;
 * - l'accueil élève mène aux énigmes (page-carrefour : pas de bouton retour).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import type { WorkItem } from '$lib/types/student-inbox';
import WorkPage from '../work/+page.svelte';
import WorksheetsPage from '../worksheets/+page.svelte';
import AssessmentsPage from '../assessments/+page.svelte';
import StudentDashboard from '../../StudentDashboard.svelte';

const ID_ELEVE = '00000000-0000-4000-8000-0000000000e1';

function emptyInbox() {
	return { late: [], thisWeek: [], later: [], noDeadline: [], doneRecently: [] };
}

function inboxWithOneItem() {
	const item: WorkItem = {
		source: 'assessment',
		itemId: '00000000-0000-4000-8000-0000000000b1',
		assignmentId: '00000000-0000-4000-8000-0000000000a1',
		title: 'Contrôle de fractions',
		classId: null,
		className: null,
		via: 'direct',
		dueAt: null,
		status: 'todo',
		viewed: false,
		doneAt: null,
		href: '/automaths/test?assignment=00000000-0000-4000-8000-0000000000a1',
		assignedAt: '2026-10-01T08:00:00Z'
	};
	return { ...emptyInbox(), noDeadline: [item] };
}

function linkHref(name: string | RegExp) {
	return page.getByRole('link', { name }).element().getAttribute('href');
}

describe('Mon travail mène à toutes les fiches et à tous les contrôles', () => {
	it('quand rien n’est assigné', async () => {
		await render(WorkPage, { props: { data: { inbox: emptyInbox() } } as never });

		expect(linkHref('Toutes mes fiches')).toBe('/dashboard/student/worksheets');
		expect(linkHref('Tous mes contrôles')).toBe('/dashboard/student/assessments');
	});

	it('quand du travail est assigné', async () => {
		await render(WorkPage, { props: { data: { inbox: inboxWithOneItem() } } as never });

		expect(linkHref('Toutes mes fiches')).toBe('/dashboard/student/worksheets');
		expect(linkHref('Tous mes contrôles')).toBe('/dashboard/student/assessments');
	});
});

describe('Les listes de fiches et de contrôles reviennent à Mon travail', () => {
	it('liste des fiches', async () => {
		await render(WorksheetsPage, {
			props: {
				data: {
					worksheets: [],
					classes: [],
					filters: { classId: '', page: 1 },
					pagination: { total: 0, totalPages: 0, page: 1 }
				}
			} as never
		});

		expect(linkHref('Retour à Mon travail')).toBe('/dashboard/student/work');
	});

	it('liste des contrôles', async () => {
		await render(AssessmentsPage, { props: { data: { assignments: [] } } as never });

		expect(linkHref('Retour à Mon travail')).toBe('/dashboard/student/work');
	});
});

describe('L’accueil élève mène aux énigmes', () => {
	function dashboardData(riddlesSolved: number) {
		return {
			user: null,
			profile: { id: ID_ELEVE, role: 'student' },
			inbox: null,
			progression: null,
			academicPeriods: [],
			riddlesSolved
		};
	}

	function riddlesTileText() {
		return page.getByRole('link', { name: /Énigmes/ }).element().textContent ?? '';
	}

	it('invite à les découvrir tant qu’aucune n’est résolue', async () => {
		await render(StudentDashboard, { props: { data: dashboardData(0) } as never });

		expect(linkHref(/Énigmes/)).toBe('/dashboard/student/riddles');
		expect(riddlesTileText()).toContain('Découvre les énigmes');
	});

	it('accorde le compte des énigmes résolues', async () => {
		const screen = await render(StudentDashboard, { props: { data: dashboardData(1) } as never });
		expect(riddlesTileText()).toMatch(/\b1 résolue\b/);
		expect(riddlesTileText()).not.toContain('résolues');

		await screen.rerender({ data: dashboardData(3) } as never);
		expect(riddlesTileText()).toContain('3 résolues');
	});
});
