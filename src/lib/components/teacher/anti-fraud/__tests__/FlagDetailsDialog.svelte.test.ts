/**
 * FlagDetailsDialog — component tests.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import FlagDetailsDialog from '../FlagDetailsDialog.svelte';

const sampleFlag = {
	flag_type: 'high_easy_ratio',
	severity: 2 as const,
	score: 0.5,
	sample_size: 25,
	created_at: '2026-06-10T10:00:00Z',
	details: { ratio: 0.95, easy_count: 24, total: 25 },
	capacity: { id: 'cap1', name: 'Additionner' }
};

describe('FlagDetailsDialog', () => {
	it('renders title and capacity when open', async () => {
		render(FlagDetailsDialog, {
			open: true,
			flag: sampleFlag,
			studentName: 'Alice Martin'
		});
		await expect.element(page.getByText('Taux Easy anormal')).toBeVisible();
		await expect.element(page.getByText(/Alice Martin/)).toBeVisible();
		await expect.element(page.getByText(/Additionner/)).toBeVisible();
	});

	it('renders severity / score / sample_size badges', async () => {
		render(FlagDetailsDialog, {
			open: true,
			flag: sampleFlag,
			studentName: 'Alice'
		});
		await expect.element(page.getByText(/Sévérité 2\/5/)).toBeVisible();
		await expect.element(page.getByText(/Score 50\/100/)).toBeVisible();
		await expect.element(page.getByText(/25 reviews/)).toBeVisible();
	});

	it('renders details JSONB entries', async () => {
		render(FlagDetailsDialog, {
			open: true,
			flag: sampleFlag,
			studentName: 'Alice'
		});
		await expect.element(page.getByText('ratio')).toBeVisible();
		await expect.element(page.getByText('easy_count')).toBeVisible();
	});
});
