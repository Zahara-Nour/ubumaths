/**
 * WorkItemCard Component Tests
 * ============================
 *
 * Covers the source-aware rendering of a single inbox item:
 * 1. Title is rendered
 * 2. Source-specific badge label
 * 3. Source-specific CTA verb
 * 4. Viewed dot indicator (only when viewed && status === 'todo')
 * 5. "Fait <relative>" date label when status === 'done'
 */

import { describe, it, expect } from 'vitest';
import { lore } from '$lib/config/lore';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import WorkItemCard from '../WorkItemCard.svelte';
import type { WorkItem, WorkSource } from '$lib/types/student-inbox';

// =============================================================================
// FIXTURES
// =============================================================================

/**
 * Build a baseline `WorkItem` for a given source. Specific tests override
 * just the fields they care about.
 */
function makeItem(source: WorkSource, overrides: Partial<WorkItem> = {}): WorkItem {
	const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(); // due in 3d
	const assignedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1d ago
	return {
		source,
		itemId: 'item-1',
		assignmentId: 'assign-1',
		title: 'Mon devoir',
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

// =============================================================================
// 1. Title rendering
// =============================================================================

describe('WorkItemCard - title', () => {
	it('renders the item title', async () => {
		const item = makeItem('exercise', { title: 'Théorème de Pythagore' });
		render(WorkItemCard, { props: { item } });

		await expect.element(page.getByText('Théorème de Pythagore')).toBeVisible();
	});
});

// =============================================================================
// 2. Source-specific badge label
// =============================================================================

describe('WorkItemCard - badge per source', () => {
	const cases: ReadonlyArray<[WorkSource, string]> = [
		['assessment', 'Test'],
		['exercise', lore.learning.exercise],
		['worksheet', 'Fiche'],
		['python', 'Python']
	];

	for (const [source, expectedLabel] of cases) {
		it(`renders "${expectedLabel}" badge for source=${source}`, async () => {
			const item = makeItem(source);
			render(WorkItemCard, { props: { item } });

			await expect.element(page.getByText(expectedLabel, { exact: true })).toBeVisible();
		});
	}
});

// =============================================================================
// 3. Source-specific CTA verb
// =============================================================================

describe('WorkItemCard - CTA verb per source', () => {
	const cases: ReadonlyArray<[WorkSource, string]> = [
		['assessment', 'Commencer'],
		['exercise', 'Travailler'],
		['worksheet', 'Consulter'],
		['python', 'Coder']
	];

	for (const [source, expectedCta] of cases) {
		it(`renders "${expectedCta}" CTA for source=${source} (default todo, not viewed)`, async () => {
			const item = makeItem(source);
			render(WorkItemCard, { props: { item } });

			await expect.element(page.getByText(expectedCta, { exact: true })).toBeVisible();
		});
	}
});

// =============================================================================
// 4. Viewed dot indicator
// =============================================================================

describe('WorkItemCard - viewed indicator', () => {
	it('shows viewed dot when viewed=true && status="todo"', async () => {
		const item = makeItem('exercise', { viewed: true, status: 'todo' });
		render(WorkItemCard, { props: { item } });

		// The dot is a <span title="Déjà ouvert"> ; Playwright's getByTitle
		// matches the `title` attribute.
		await expect.element(page.getByTitle('Déjà ouvert')).toBeVisible();
	});

	it('does NOT show viewed dot when viewed=false', async () => {
		const item = makeItem('exercise', { viewed: false, status: 'todo' });
		render(WorkItemCard, { props: { item } });

		await expect.element(page.getByTitle('Déjà ouvert')).not.toBeInTheDocument();
	});

	it('does NOT show viewed dot when status="done" (item lives in "Fait" section)', async () => {
		const doneAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
		const item = makeItem('exercise', { viewed: true, status: 'done', doneAt });
		render(WorkItemCard, { props: { item } });

		await expect.element(page.getByTitle('Déjà ouvert')).not.toBeInTheDocument();
	});
});

// =============================================================================
// 5. "Fait <relative>" date label
// =============================================================================

describe('WorkItemCard - done date label', () => {
	it('shows "Fait <relative>" when status="done"', async () => {
		const doneAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2d ago
		const item = makeItem('worksheet', { status: 'done', doneAt, dueAt: null });
		render(WorkItemCard, { props: { item } });

		// We render "Fait <relative>" via date-fns `formatDistanceToNow` (French
		// locale, addSuffix:true → "il y a 2 jours"). Assert on the prefix; the
		// formatter has its own tests upstream.
		await expect.element(page.getByText(/^Fait il y a /)).toBeVisible();
	});

	it('does NOT show any date line when both dueAt and doneAt are null', async () => {
		const item = makeItem('python', { status: 'todo', dueAt: null, doneAt: null });
		render(WorkItemCard, { props: { item } });

		// The title still renders, but no "Fait" prefix is shown
		await expect.element(page.getByText(/^Fait /)).not.toBeInTheDocument();
	});
});
