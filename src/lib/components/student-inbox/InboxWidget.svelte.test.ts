/**
 * InboxWidget Component Tests
 * ============================
 *
 * Covers the four key rendering states of the home-dashboard inbox widget:
 * 1. Header "Mon travail" + "Voir tout (N)" link when items exist
 * 2. maxItems slicing: late items precede thisWeek, total capped at N
 * 3. "Rien d'urgent" message when only non-urgent items exist (totalCount > 0, urgentItems = 0)
 * 4. Empty state when the inbox is completely empty (all sections empty)
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import InboxWidget from './InboxWidget.svelte';
import type { StudentWorkInbox, WorkItem, WorkSource } from '$lib/types/student-inbox';

// =============================================================================
// FIXTURES
// =============================================================================

function makeItem(source: WorkSource, overrides: Partial<WorkItem> = {}): WorkItem {
	const dueAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // due in 2d
	const assignedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1d ago
	return {
		source,
		itemId: `${source}-${Math.random().toString(36).slice(2)}`,
		assignmentId: `assign-${Math.random().toString(36).slice(2)}`,
		title: `Devoir ${source}`,
		classId: null,
		className: null,
		dueAt,
		status: 'todo',
		viewed: false,
		doneAt: null,
		href: '/dashboard/student/foo',
		assignedAt,
		...overrides
	};
}

/** An inbox with every section empty. */
function emptyInbox(): StudentWorkInbox {
	return { late: [], thisWeek: [], later: [], noDeadline: [], doneRecently: [] };
}

// =============================================================================
// 1. Header + "Voir tout" link when items exist
// =============================================================================

describe('InboxWidget - header and "Voir tout" link', () => {
	it('renders the "Mon travail" header', async () => {
		const inbox: StudentWorkInbox = {
			...emptyInbox(),
			thisWeek: [makeItem('exercise')]
		};
		render(InboxWidget, { props: { inbox } });

		await expect.element(page.getByText('Mon travail')).toBeVisible();
	});

	it('shows "Voir tout (N)" link with correct count when items exist', async () => {
		const inbox: StudentWorkInbox = {
			...emptyInbox(),
			late: [makeItem('assessment')],
			thisWeek: [makeItem('exercise'), makeItem('worksheet')]
		};
		render(InboxWidget, { props: { inbox } });

		// Total = 3; "Voir tout (3)" should appear
		await expect.element(page.getByText('Voir tout (3)')).toBeVisible();
	});

	it('hides the "Voir tout" link when totalCount === 0', async () => {
		render(InboxWidget, { props: { inbox: emptyInbox() } });

		await expect.element(page.getByText(/Voir tout/)).not.toBeInTheDocument();
	});
});

// =============================================================================
// 2. maxItems slicing — late items before thisWeek
// =============================================================================

describe('InboxWidget - urgent items ordering and slicing', () => {
	it('shows late items before thisWeek items', async () => {
		const lateItem = makeItem('assessment', { title: 'Devoir en retard' });
		const weekItem = makeItem('exercise', { title: 'Devoir cette semaine' });

		const inbox: StudentWorkInbox = {
			...emptyInbox(),
			late: [lateItem],
			thisWeek: [weekItem]
		};
		render(InboxWidget, { props: { inbox } });

		await expect.element(page.getByText('Devoir en retard')).toBeVisible();
		await expect.element(page.getByText('Devoir cette semaine')).toBeVisible();
	});

	it('slices to maxItems=3 when more urgent items are available', async () => {
		const inbox: StudentWorkInbox = {
			...emptyInbox(),
			late: [
				makeItem('assessment', { title: 'Retard 1' }),
				makeItem('assessment', { title: 'Retard 2' })
			],
			thisWeek: [
				makeItem('exercise', { title: 'Semaine 1' }),
				makeItem('worksheet', { title: 'Semaine 2' }) // should be cut
			]
		};
		render(InboxWidget, { props: { inbox, maxItems: 3 } });

		await expect.element(page.getByText('Retard 1')).toBeVisible();
		await expect.element(page.getByText('Retard 2')).toBeVisible();
		await expect.element(page.getByText('Semaine 1')).toBeVisible();
		// 4th item must not render
		await expect.element(page.getByText('Semaine 2')).not.toBeInTheDocument();
	});
});

// =============================================================================
// 3. "Rien d'urgent" state — work exists but no deadline pressure
// =============================================================================

describe('InboxWidget - non-urgent items only', () => {
	it('shows "Rien d\'urgent" message when only later/noDeadline/done items exist', async () => {
		const inbox: StudentWorkInbox = {
			...emptyInbox(),
			noDeadline: [makeItem('python', { dueAt: null })],
			later: [makeItem('worksheet')]
		};
		render(InboxWidget, { props: { inbox } });

		// Should show calm message, not individual cards
		await expect.element(page.getByText(/Rien d'urgent/)).toBeVisible();
	});

	it('shows correct element count in "Rien d\'urgent" message', async () => {
		const inbox: StudentWorkInbox = {
			...emptyInbox(),
			noDeadline: [makeItem('python', { dueAt: null }), makeItem('exercise', { dueAt: null })]
		};
		render(InboxWidget, { props: { inbox } });

		// 2 elements → plural "éléments"
		await expect.element(page.getByText(/2 éléments en cours/)).toBeVisible();
	});
});

// =============================================================================
// 4. Empty state — nothing assigned at all
// =============================================================================

describe('InboxWidget - empty state', () => {
	it('shows empty state message when totalCount === 0', async () => {
		render(InboxWidget, { props: { inbox: emptyInbox() } });

		await expect.element(page.getByText(/Rien d'assigné/)).toBeVisible();
	});

	it('does NOT show individual work cards when inbox is empty', async () => {
		render(InboxWidget, { props: { inbox: emptyInbox() } });

		// No card titles in the DOM
		await expect.element(page.getByText(/Devoir/)).not.toBeInTheDocument();
	});
});
