/**
 * AnalyticsModal — component-level tests.
 *
 * Smoke tests sur le rendu : titre, description, liste élèves, état vide.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import AnalyticsModal from './AnalyticsModal.svelte';

describe('AnalyticsModal', () => {
	it('renders title when open', async () => {
		render(AnalyticsModal, {
			open: true,
			title: 'Calculer la somme',
			description: 'Élèves concernés.',
			students: [
				{ student_id: 's1', display_name: 'Alice' },
				{ student_id: 's2', display_name: 'Bob' }
			]
		});
		await expect.element(page.getByText('Calculer la somme')).toBeVisible();
	});

	it('renders the description', async () => {
		render(AnalyticsModal, {
			open: true,
			title: 'Titre',
			description: 'Une description distinctive.',
			students: []
		});
		await expect.element(page.getByText('Une description distinctive.')).toBeVisible();
	});

	it('shows empty state when no students', async () => {
		render(AnalyticsModal, {
			open: true,
			title: 'Vide',
			students: []
		});
		await expect.element(page.getByText('Aucun élève à afficher.')).toBeVisible();
	});

	it('renders student names', async () => {
		render(AnalyticsModal, {
			open: true,
			title: 'Liste',
			students: [
				{ student_id: 's1', display_name: 'Alice Martin' },
				{ student_id: 's2', display_name: 'Bob Dupont' }
			]
		});
		await expect.element(page.getByText('Alice Martin')).toBeVisible();
		await expect.element(page.getByText('Bob Dupont')).toBeVisible();
	});

	it('renders captions when provided', async () => {
		render(AnalyticsModal, {
			open: true,
			title: 'Avec captions',
			students: [{ student_id: 's1', display_name: 'Alice', caption: '🆘 À remédier' }]
		});
		await expect.element(page.getByText('🆘 À remédier')).toBeVisible();
	});
});
